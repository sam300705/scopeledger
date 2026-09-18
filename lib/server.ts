import { env } from "cloudflare:workers";
import { chatGPTSitesIdentityProvider } from "./identity";
import { ZodError } from "zod";
import type { Role } from "./domain";
export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
export function db(){if(!env.DB)throw new ApiError(503,"Records are temporarily unavailable. Please try again.");return env.DB;}
export async function identity(){const u=await chatGPTSitesIdentityProvider.getUser();if(!u)throw new ApiError(401,"Sign in with ChatGPT to open your workspace.");return u;}
export async function authorize(id:string){const u=await identity();const w=await db().prepare("SELECT w.*,m.id AS member_id,m.user_id AS member_user_id,CASE WHEN w.owner_id=? THEN 'owner' ELSE m.role END AS role FROM workspaces w LEFT JOIN members m ON m.workspace_id=w.id AND (m.user_id=? OR (m.user_id IS NULL AND m.email=?)) WHERE w.id=? AND (w.owner_id=? OR m.id IS NOT NULL) ORDER BY CASE WHEN m.user_id=? THEN 0 ELSE 1 END LIMIT 1").bind(u.userId,u.userId,u.email,id,u.userId,u.userId).first<{id:string;owner_id:string;name:string;currency:string;demo:number;role:Role;member_id:string|null;member_user_id:string|null}>();if(!w)throw new ApiError(404,"Workspace not found or access was removed.");if(w.role!=="owner"&&w.member_id&&!w.member_user_id){const now=new Date().toISOString();const result=await db().batch([db().prepare("UPDATE members SET user_id=? WHERE id=? AND workspace_id=? AND user_id IS NULL").bind(u.userId,w.member_id,id),db().prepare("INSERT INTO events(id,workspace_id,entity_id,action,actor,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),id,w.member_id,"Team identity bound",u.email,"Legacy email-based membership bound to the authenticated account.",now)]);if(result[0].meta.changes!==1)throw new ApiError(409,"Workspace membership changed while signing in. Please retry.");w.member_user_id=u.userId;}return {u,w};}
export function requireRole(role:Role,roles:Role[]){if(!roles.includes(role))throw new ApiError(403,"Your workspace role does not allow this action.");}
export async function body(request:Request){const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new ApiError(403,"Cross-origin changes are not allowed.");if(request.headers.get("sec-fetch-site")==="cross-site")throw new ApiError(403,"Cross-site changes are not allowed.");if(!request.headers.get("content-type")?.includes("application/json"))throw new ApiError(415,"Use JSON for this request.");const raw=await request.text();if(raw.length>30000)throw new ApiError(413,"This request is too large.");try{return JSON.parse(raw);}catch{throw new ApiError(400,"Invalid JSON.");}}
export function audit(workspace:string,entity:string,action:string,actor:string,detail:string){return db().prepare("INSERT INTO events(id,workspace_id,entity_id,action,actor,detail,created_at) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(),workspace,entity,action,actor,detail,new Date().toISOString());}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY","Permissions-Policy":"camera=(), microphone=(), geolocation=()"}});}
export function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
export async function hashToken(token:string){const bytes=new TextEncoder().encode(token);const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");}
export function expiresIn(hours:number){return new Date(Date.now()+hours*60*60*1000).toISOString();}
export async function rateLimit(bucketKey:string,limit:number,windowSeconds:number){const now=Math.floor(Date.now()/1000),threshold=now-windowSeconds,updatedAt=new Date().toISOString();await db().batch([db().prepare("INSERT INTO rate_limits(bucket_key,window_start,count,updated_at) VALUES(?,?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET count=CASE WHEN rate_limits.window_start<? THEN 1 ELSE rate_limits.count+1 END,window_start=CASE WHEN rate_limits.window_start<? THEN excluded.window_start ELSE rate_limits.window_start END,updated_at=excluded.updated_at").bind(bucketKey,now,updatedAt,threshold,threshold)]);const row=await db().prepare("SELECT count FROM rate_limits WHERE bucket_key=?").bind(bucketKey).first<{count:number}>();if((row?.count||0)>limit)throw new ApiError(429,"Too many attempts. Please wait before trying again.");}
export async function cleanupRateLimits(maxAgeSeconds=86400){const cutoff=new Date(Date.now()-maxAgeSeconds*1000).toISOString();await db().batch([db().prepare("DELETE FROM rate_limits WHERE updated_at<?").bind(cutoff)]);}
export async function publicRateLimit(request:Request,namespace:string,token:string,limit=30,windowSeconds=60){
 const tokenHash=await hashToken(token),tokenPart=tokenHash.slice(0,24),cfIp=request.headers.get("cf-connecting-ip")||"",ipPart=cfIp?(await hashToken(cfIp)).slice(0,16):"no-ip";
 await rateLimit(`${namespace}:token:${tokenPart}`,Math.max(limit*2,limit+1),windowSeconds);
 await rateLimit(`${namespace}:ip:${ipPart}`,Math.max(limit*4,limit+1),windowSeconds);
 await rateLimit(`${namespace}:pair:${ipPart}:${tokenPart}`,limit,windowSeconds);
 await cleanupRateLimits(Math.max(86400,windowSeconds*20));
}
export type IdempotencyClaim={kind:"none"}|{kind:"claimed";id:string;requestHash:string}|{kind:"replay";response:Response};
export async function beginIdempotency(request:Request,workspaceId:string,actorId:string,operation:string,payload:unknown):Promise<IdempotencyClaim>{
 const requestKey=(request.headers.get("idempotency-key")||"").trim();
 if(!requestKey)return {kind:"none"};
 if(!/^[A-Za-z0-9._:-]{8,128}$/.test(requestKey))throw new ApiError(400,"Idempotency-Key must be 8-128 safe characters.");
 const requestHash=await hashToken(JSON.stringify(payload)),id=crypto.randomUUID(),now=new Date().toISOString();
 const completedCutoff=new Date(Date.now()-24*60*60*1000).toISOString(),pendingCutoff=new Date(Date.now()-15*60*1000).toISOString();
 const result=await db().batch([
  db().prepare("DELETE FROM idempotency_keys WHERE (status_code<>0 AND created_at<?) OR (status_code=0 AND created_at<?)").bind(completedCutoff,pendingCutoff),
  db().prepare("INSERT OR IGNORE INTO idempotency_keys(id,workspace_id,actor_id,operation,request_key,request_hash,response_json,status_code,created_at) VALUES(?,?,?,?,?,?,'',0,?)").bind(id,workspaceId,actorId,operation,requestKey,requestHash,now)
 ]);
 if(result[1].meta.changes===1)return {kind:"claimed",id,requestHash};
 const existing=await db().prepare("SELECT id,request_hash,response_json,status_code FROM idempotency_keys WHERE workspace_id=? AND actor_id=? AND operation=? AND request_key=?").bind(workspaceId,actorId,operation,requestKey).first<{id:string;request_hash:string;response_json:string;status_code:number}>();
 if(!existing)throw new ApiError(409,"This idempotent request could not be resolved. Retry with a new key.");
 if(existing.request_hash!==requestHash)throw new ApiError(409,"This Idempotency-Key was already used with a different request.");
 if(existing.status_code===0)throw new ApiError(409,"An identical request with this Idempotency-Key is already processing.");
 try{return {kind:"replay",response:json(JSON.parse(existing.response_json),existing.status_code)};}catch{throw new ApiError(409,"The stored idempotent response is unavailable. Retry with a new key.");}
}
export function completeIdempotency(claim:IdempotencyClaim,payload:unknown,status:number){
 if(claim.kind!=="claimed")return null;
 return db().prepare("UPDATE idempotency_keys SET response_json=?,status_code=? WHERE id=? AND request_hash=? AND status_code=0").bind(JSON.stringify(payload),status,claim.id,claim.requestHash);
}
export async function releaseIdempotency(claim:IdempotencyClaim){
 if(claim.kind!=="claimed")return;
 await db().batch([db().prepare("DELETE FROM idempotency_keys WHERE id=? AND request_hash=? AND status_code=0").bind(claim.id,claim.requestHash)]);
}
export function failure(error:unknown){if(error instanceof ZodError)return json({error:error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join("; ")},400);if(error instanceof ApiError)return json({error:error.message},error.status);const reference=crypto.randomUUID();console.error("ScopeLedger operation failed",{reference,message:error instanceof Error?error.message:"Unknown failure"});return json({error:"We could not save or load these records. Your input is still here; please try again.",reference},503);}
