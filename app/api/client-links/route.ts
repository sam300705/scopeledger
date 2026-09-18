import { authorize,requireRole,db,body,json,failure,audit,ApiError,randomToken,hashToken,expiresIn } from "@/lib/server";
import { clientLinkInput } from "@/lib/domain";

export async function GET(request:Request){try{
 const url=new URL(request.url),wid=url.searchParams.get("workspace")||"";
 const {w}=await authorize(wid);requireRole(w.role,["owner","editor","reviewer"]);
 const rawLimit=Number(url.searchParams.get("limit")||100),limit=Number.isFinite(rawLimit)?Math.min(Math.max(Math.trunc(rawLimit),1),200):100;
 const rows=await db().prepare("SELECT l.id,l.change_id,l.proposal_version,l.client_email,l.expires_at,l.revoked_at,l.used_at,l.created_by,l.created_at,c.title,c.status,p.name AS project_name,p.client FROM client_access_links l JOIN changes c ON c.id=l.change_id AND c.workspace_id=l.workspace_id JOIN projects p ON p.id=c.project_id AND p.workspace_id=c.workspace_id WHERE l.workspace_id=? ORDER BY l.created_at DESC LIMIT ?").bind(wid,limit).all();
 return json({links:rows.results,limit});
}catch(e){return failure(e);}}

export async function POST(request:Request){try{
 const wid=new URL(request.url).searchParams.get("workspace")||"";
 const {w,u}=await authorize(wid);requireRole(w.role,["owner","editor","reviewer"]);
 const v=clientLinkInput.parse(await body(request));
 const c=await db().prepare("SELECT c.id,c.status,c.version,c.proposal_version,c.title,p.client_email FROM changes c JOIN projects p ON p.id=c.project_id AND p.workspace_id=c.workspace_id WHERE c.id=? AND c.workspace_id=?").bind(v.change_id,wid).first<{id:string;status:string;version:number;proposal_version:number;title:string;client_email:string}>();
 if(!c)throw new ApiError(404,"Change request not found.");
 if(c.version!==v.version)throw new ApiError(409,"Someone updated this request. Refresh before creating a client link.");
 if(c.status!=="pending")throw new ApiError(409,"Client approval links can only be created for submitted proposals awaiting a decision.");
 const proposal=await db().prepare("SELECT id FROM proposals WHERE change_id=? AND workspace_id=? AND version=?").bind(c.id,wid,c.proposal_version).first();
 if(!proposal)throw new ApiError(409,"The current proposal snapshot is missing. Revise or resubmit the proposal first.");
 const token=randomToken(),tokenHash=await hashToken(token),id=crypto.randomUUID(),now=new Date().toISOString(),expires=expiresIn(v.expires_hours);
 await db().batch([
  db().prepare("INSERT INTO client_access_links(id,workspace_id,change_id,proposal_version,token_hash,client_email,expires_at,revoked_at,used_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,'','',?,?)").bind(id,wid,c.id,c.proposal_version,tokenHash,c.client_email.toLowerCase(),expires,u.email,now),
  audit(wid,c.id,"Client approval link created",u.email,`${c.title} — proposal v${c.proposal_version}; expires ${expires}`)
 ]);
 return json({id,token,path:"/client-approval?token="+encodeURIComponent(token),expires_at:expires,client_email:c.client_email,proposal_version:c.proposal_version},201);
}catch(e){return failure(e);}}

export async function DELETE(request:Request){try{
 const wid=new URL(request.url).searchParams.get("workspace")||"";
 const {w,u}=await authorize(wid);requireRole(w.role,["owner","editor","reviewer"]);
 const raw=await body(request) as {id?:unknown},id=typeof raw.id==="string"?raw.id:"";
 if(!id)throw new ApiError(400,"Link id is required.");
 const link=await db().prepare("SELECT id,change_id,revoked_at,used_at FROM client_access_links WHERE id=? AND workspace_id=?").bind(id,wid).first<{id:string;change_id:string;revoked_at:string;used_at:string}>();
 if(!link)throw new ApiError(404,"Client approval link not found.");
 if(link.used_at)throw new ApiError(409,"A used client link cannot be revoked retroactively.");
 if(link.revoked_at)return json({ok:true});
 const now=new Date().toISOString();
 const result=await db().batch([
  db().prepare("UPDATE client_access_links SET revoked_at=? WHERE id=? AND workspace_id=? AND revoked_at='' AND used_at=''").bind(now,id,wid),
  audit(wid,link.change_id,"Client approval link revoked",u.email,id)
 ]);
 if(result[0].meta.changes!==1)throw new ApiError(409,"This client link changed before it could be revoked.");
 return json({ok:true});
}catch(e){return failure(e);}}
