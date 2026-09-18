import { z } from "zod";
const short=z.string().trim().min(1).max(160);
const money=z.number().int().min(0).max(100000000000);
const positiveMoney=z.number().int().min(1).max(100000000000);
export const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,"Use a valid date");
export const workspaceInput=z.object({name:short,currency:z.enum(["INR","USD","EUR","GBP"]),demo:z.boolean().default(false)}).strict();
export const projectInput=z.object({name:short,client:short,client_email:z.string().trim().email().max(254),scope:z.string().trim().min(10).max(10000),budget:money,rate:z.number().int().min(1).max(100000000),due_date:date}).strict();
export const projectActionInput=z.discriminatedUnion("action",[
 z.object({action:z.literal("archive"),id:short}).strict(),
 z.object({action:z.literal("restore"),id:short}).strict(),
 z.object({action:z.literal("amend"),id:short,scope:z.string().trim().min(10).max(10000),budget:money,rate:z.number().int().min(1).max(100000000),due_date:date,reason:z.string().trim().min(10).max(2000)}).strict()
]);
export const lineItemInput=z.object({description:short,quantity:z.number().positive().max(100000),unit:z.enum(["hour","item"]),unit_price:z.number().int().min(0).max(100000000)}).strict();
const proposalTerms={title:short,description:z.string().trim().min(10).max(10000),source:z.string().trim().min(3).max(4000),minutes:z.number().int().min(1).max(600000),delay_days:z.number().int().min(0).max(3650),due_date:date,pricing_mode:z.enum(["hourly","fixed","itemized"]).default("hourly"),fixed_fee:money.optional(),line_items:z.array(lineItemInput).max(50).default([]),exclusions:z.string().trim().max(4000).default("")};
export const changeInput=z.object({project_id:short,...proposalTerms,status:z.enum(["draft","pending"]).default("pending")}).strict().superRefine((v,ctx)=>{if(v.pricing_mode==="fixed"&&v.fixed_fee===undefined)ctx.addIssue({code:"custom",path:["fixed_fee"],message:"Fixed fee is required"});if(v.pricing_mode==="itemized"&&!v.line_items.length)ctx.addIssue({code:"custom",path:["line_items"],message:"At least one line item is required"});});
export const changeEditInput=z.object({id:short,version:z.number().int().positive(),action:z.enum(["save_draft","submit","revise"]),...proposalTerms}).strict().superRefine((v,ctx)=>{if(v.pricing_mode==="fixed"&&v.fixed_fee===undefined)ctx.addIssue({code:"custom",path:["fixed_fee"],message:"Fixed fee is required"});if(v.pricing_mode==="itemized"&&!v.line_items.length)ctx.addIssue({code:"custom",path:["line_items"],message:"At least one line item is required"});});
export const decisionInput=z.object({id:short,version:z.number().int().positive(),status:z.enum(["approved","rejected","withdrawn","delivered"]),approver:z.string().trim().max(254).default(""),evidence:z.string().trim().min(10).max(4000)}).strict().superRefine((v,ctx)=>{if(v.status==="approved"&&!z.string().email().safeParse(v.approver).success)ctx.addIssue({code:"custom",path:["approver"],message:"Client approver email is required"});});
export const financeActionInput=z.discriminatedUnion("action",[
 z.object({action:z.literal("invoice"),change_id:short,version:z.number().int().positive(),amount:positiveMoney,reference:z.string().trim().max(160).default(""),due_date:z.union([date,z.literal("")]).default("")}).strict(),
 z.object({action:z.literal("payment"),change_id:short,version:z.number().int().positive(),invoice_id:short,amount:positiveMoney,reference:z.string().trim().max(160).default("")}).strict(),
 z.object({action:z.literal("void_invoice"),change_id:short,version:z.number().int().positive(),invoice_id:short,reason:z.string().trim().min(10).max(2000)}).strict(),
 z.object({action:z.literal("reverse_payment"),change_id:short,version:z.number().int().positive(),payment_id:short,reason:z.string().trim().min(10).max(2000)}).strict()
]);
export const memberInput=z.object({email:z.string().trim().email().max(254).transform(x=>x.toLowerCase()),role:z.enum(["editor","reviewer","viewer"])}).strict();
export const invitationInput=z.object({email:z.string().trim().email().max(254).transform(x=>x.toLowerCase()),role:z.enum(["editor","reviewer","viewer"]),expires_hours:z.number().int().min(1).max(168).default(72)}).strict();
export const clientLinkInput=z.object({change_id:short,version:z.number().int().positive(),expires_hours:z.number().int().min(1).max(168).default(72)}).strict();
export const clientDecisionInput=z.object({token:z.string().min(32).max(512),proposal_version:z.number().int().positive(),client_email:z.string().trim().email().max(254).transform(x=>x.toLowerCase()),decision:z.enum(["approved","rejected","clarification"]),confirmation:z.boolean(),message:z.string().trim().max(4000).default("")}).strict().superRefine((v,ctx)=>{if((v.decision==="approved"||v.decision==="rejected")&&!v.confirmation)ctx.addIssue({code:"custom",path:["confirmation"],message:"Confirm the scope, fee and schedule impact"});if(v.decision==="clarification"&&v.message.length<3)ctx.addIssue({code:"custom",path:["message"],message:"Tell the team what needs clarification"});});
export const deletionRequestInput=z.object({action:z.literal("request"),workspace_name:short,confirmation:z.literal("DELETE")}).strict();
export const deletionCancelInput=z.object({action:z.literal("cancel"),request_id:short}).strict();
export const deletionFinalizeInput=z.object({request_id:short,workspace_name:short,confirmation:z.literal("DELETE PERMANENTLY")}).strict();
export type Role="owner"|"editor"|"reviewer"|"viewer";
export function canTransition(role:Role,from:string,to:string){return from==="pending"&&((to==="approved"||to==="rejected")&&(role==="owner"||role==="reviewer")||to==="withdrawn"&&(role==="owner"||role==="editor"))||from==="approved"&&to==="delivered"&&(role==="owner"||role==="editor");}
export function estimateAmount(minutes:number,rate:number){return Math.round(minutes*rate/60);}
export function proposalAmount(input:{pricing_mode:string;fixed_fee?:number;line_items?:{quantity:number;unit_price:number}[];minutes:number},rate:number){if(input.pricing_mode==="fixed")return input.fixed_fee||0;if(input.pricing_mode==="itemized")return (input.line_items||[]).reduce((sum,item)=>sum+Math.round(item.quantity*item.unit_price),0);return estimateAmount(input.minutes,rate);}
export function csvCell(value:unknown){let s=String(value??"");if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export type Workspace={id:string;name:string;currency:string;demo:number;role:Role};
export type Project={id:string;name:string;client:string;client_email:string;scope:string;budget:number;rate:number;due_date:string;created_at:string;archived_at:string};
export type ProjectAmendment={id:string;project_id:string;version:number;scope:string;budget:number;rate:number;due_date:string;reason:string;created_by:string;created_at:string};
export type Change={id:string;project_id:string;title:string;description:string;source:string;minutes:number;rate:number;amount:number;delay_days:number;due_date:string;status:string;approver:string;evidence:string;created_by:string;created_at:string;updated_at:string;version:number;pricing_mode:string;line_items:string;exclusions:string;proposal_version:number;approved_proposal_version:number;decision_source:string;decided_at:string;approved_amount:number;delivered_amount:number;invoiced_amount:number;paid_amount:number};
export type AuditEvent={id:string;entity_id:string;action:string;actor:string;detail:string;created_at:string};
export type Member={id:string;email:string;role:Role};
export type WorkspaceData={user:{email:string;displayName:string};workspaces:Workspace[];workspace:Workspace|null;projects:Project[];project_amendments:ProjectAmendment[];changes:Change[];events:AuditEvent[];members:Member[]};
