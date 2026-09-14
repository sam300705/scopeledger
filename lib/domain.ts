import { z } from "zod";
const short=z.string().trim().min(1).max(160);
export const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,"Use a valid date");
export const workspaceInput=z.object({name:short,currency:z.enum(["INR","USD","EUR","GBP"]),demo:z.boolean().default(false)}).strict();
export const projectInput=z.object({name:short,client:short,client_email:z.string().trim().email().max(254),scope:z.string().trim().min(10).max(10000),budget:z.number().int().min(0).max(100000000000),rate:z.number().int().min(1).max(100000000),due_date:date}).strict();
export const changeInput=z.object({project_id:short,title:short,description:z.string().trim().min(10).max(10000),source:z.string().trim().min(3).max(4000),minutes:z.number().int().min(1).max(600000),delay_days:z.number().int().min(0).max(3650),due_date:date}).strict();
export const decisionInput=z.object({id:short,version:z.number().int().positive(),status:z.enum(["approved","rejected","withdrawn","delivered"]),approver:z.string().trim().max(254).default(""),evidence:z.string().trim().min(10).max(4000)}).strict().superRefine((v,ctx)=>{if(v.status==="approved"&&!z.string().email().safeParse(v.approver).success)ctx.addIssue({code:"custom",path:["approver"],message:"Client approver email is required"});});
export const memberInput=z.object({email:z.string().trim().email().max(254).transform(x=>x.toLowerCase()),role:z.enum(["editor","reviewer","viewer"])}).strict();
export type Role="owner"|"editor"|"reviewer"|"viewer";
export function canTransition(role:Role,from:string,to:string){return from==="pending"&&((to==="approved"||to==="rejected")&&(role==="owner"||role==="reviewer")||to==="withdrawn"&&(role==="owner"||role==="editor"))||from==="approved"&&to==="delivered"&&(role==="owner"||role==="editor");}
export function estimateAmount(minutes:number,rate:number){return Math.round(minutes*rate/60);}
export function csvCell(value:unknown){let s=String(value??"");if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export type Workspace={id:string;name:string;currency:string;demo:number;role:Role};
export type Project={id:string;name:string;client:string;client_email:string;scope:string;budget:number;rate:number;due_date:string;created_at:string};
export type Change={id:string;project_id:string;title:string;description:string;source:string;minutes:number;rate:number;amount:number;delay_days:number;due_date:string;status:string;approver:string;evidence:string;created_by:string;created_at:string;updated_at:string;version:number};
export type AuditEvent={id:string;entity_id:string;action:string;actor:string;detail:string;created_at:string};
export type Member={id:string;email:string;role:Role};
export type WorkspaceData={user:{email:string;displayName:string};workspaces:Workspace[];workspace:Workspace|null;projects:Project[];changes:Change[];events:AuditEvent[];members:Member[]};
