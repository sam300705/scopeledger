import { authorize,db,json,failure } from "@/lib/server";

export async function GET(request:Request){try{
 const url=new URL(request.url),wid=url.searchParams.get("workspace")||"";
 const {w}=await authorize(wid);
 const today=new Date().toISOString().slice(0,10);
 const results=await db().batch([
  db().prepare("SELECT COUNT(*) AS project_count,SUM(CASE WHEN archived_at='' THEN 1 ELSE 0 END) AS active_project_count FROM projects WHERE workspace_id=?").bind(wid),
  db().prepare("SELECT COUNT(*) AS change_count,SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_count,COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) AS pending_value,COALESCE(SUM(CASE WHEN status IN ('approved','delivered') THEN approved_amount ELSE 0 END),0) AS approved_value,COALESCE(SUM(CASE WHEN status='delivered' THEN delivered_amount ELSE 0 END),0) AS delivered_value,COALESCE(SUM(invoiced_amount),0) AS invoiced_value,COALESCE(SUM(paid_amount),0) AS paid_value,SUM(CASE WHEN status='pending' AND due_date<? THEN 1 ELSE 0 END) AS overdue_count,COALESCE(SUM(CASE WHEN status='pending' AND due_date<? THEN amount ELSE 0 END),0) AS overdue_value FROM changes WHERE workspace_id=?").bind(today,today,wid),
  db().prepare("SELECT c.id,c.project_id,c.title,c.description,c.source,c.minutes,c.rate,c.amount,c.delay_days,c.due_date,c.status,c.approver,c.evidence,c.created_by,c.created_at,c.updated_at,c.version,c.pricing_mode,c.line_items,c.exclusions,c.proposal_version,c.approved_proposal_version,c.decision_source,c.decided_at,c.approved_amount,c.delivered_amount,c.invoiced_amount,c.paid_amount,p.name AS project_name,p.client FROM changes c JOIN projects p ON p.id=c.project_id AND p.workspace_id=c.workspace_id WHERE c.workspace_id=? AND c.status='pending' ORDER BY c.due_date ASC,c.created_at ASC LIMIT 5").bind(wid),
  db().prepare("SELECT p.id,p.name,p.client,p.client_email,p.scope,p.budget,p.rate,p.due_date,p.created_at,p.archived_at,COUNT(c.id) AS change_count,COALESCE(SUM(CASE WHEN c.status IN ('approved','delivered') THEN c.approved_amount ELSE 0 END),0) AS approved_additions FROM projects p LEFT JOIN changes c ON c.project_id=p.id AND c.workspace_id=p.workspace_id WHERE p.workspace_id=? GROUP BY p.id ORDER BY p.created_at DESC LIMIT 3").bind(wid),
  db().prepare("SELECT id,entity_id,action,actor,detail,created_at FROM events WHERE workspace_id=? ORDER BY created_at DESC,id DESC LIMIT 4").bind(wid)
 ]);
 const projects=(results[0].results[0]||{}) as Record<string,unknown>,changes=(results[1].results[0]||{}) as Record<string,unknown>;
 return json({
  currency:w.currency,
  metrics:{
   project_count:Number(projects.project_count||0),
   active_project_count:Number(projects.active_project_count||0),
   change_count:Number(changes.change_count||0),
   pending_count:Number(changes.pending_count||0),
   pending_value:Number(changes.pending_value||0),
   approved_value:Number(changes.approved_value||0),
   delivered_value:Number(changes.delivered_value||0),
   invoiced_value:Number(changes.invoiced_value||0),
   paid_value:Number(changes.paid_value||0),
   overdue_count:Number(changes.overdue_count||0),
   overdue_value:Number(changes.overdue_value||0)
  },
  pending_preview:results[2].results,
  project_preview:results[3].results,
  recent_activity:results[4].results
 });
}catch(e){return failure(e);}}
