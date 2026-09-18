import { authorize,requireRole,db,body,json,failure,ApiError } from "@/lib/server";
import { financeActionInput } from "@/lib/domain";

type ChangeFinanceRow={status:string;version:number;title:string;approved_amount:number;invoiced_amount:number;paid_amount:number};

async function loadChange(changeId:string,workspaceId:string){
 return db().prepare("SELECT status,version,title,approved_amount,invoiced_amount,paid_amount FROM changes WHERE id=? AND workspace_id=?").bind(changeId,workspaceId).first<ChangeFinanceRow>();
}

export async function GET(request:Request){try{
 const url=new URL(request.url),wid=url.searchParams.get("workspace")||"",changeId=url.searchParams.get("change")||"";
 await authorize(wid);
 const invoices=await db().prepare(changeId?
  "SELECT id,change_id,reference,amount,status,due_date,issued_at,created_by,created_at,voided_at,void_reason FROM invoices WHERE workspace_id=? AND change_id=? ORDER BY created_at DESC":
  "SELECT id,change_id,reference,amount,status,due_date,issued_at,created_by,created_at,voided_at,void_reason FROM invoices WHERE workspace_id=? ORDER BY created_at DESC LIMIT 500"
 ).bind(...(changeId?[wid,changeId]:[wid])).all();
 const payments=await db().prepare(changeId?
  "SELECT id,change_id,invoice_id,reference,amount,status,received_at,created_by,created_at,reversed_at,reversal_reason FROM payments WHERE workspace_id=? AND change_id=? ORDER BY created_at DESC":
  "SELECT id,change_id,invoice_id,reference,amount,status,received_at,created_by,created_at,reversed_at,reversal_reason FROM payments WHERE workspace_id=? ORDER BY created_at DESC LIMIT 1000"
 ).bind(...(changeId?[wid,changeId]:[wid])).all();
 return json({invoices:invoices.results,payments:payments.results});
}catch(e){return failure(e);}}

export async function POST(request:Request){try{
 const wid=new URL(request.url).searchParams.get("workspace")||"";
 const {w,u}=await authorize(wid);requireRole(w.role,["owner","editor"]);
 const v=financeActionInput.parse(await body(request));
 const c=await loadChange(v.change_id,wid);
 if(!c)throw new ApiError(404,"Change request not found.");
 if(c.version!==v.version)throw new ApiError(409,"Someone updated this request. Refresh before recording finance activity.");
 if(!["approved","delivered"].includes(c.status))throw new ApiError(409,"Only approved work can have invoice or payment records.");
 const now=new Date().toISOString();

 if(v.action==="invoice"){
  if(c.invoiced_amount+v.amount>c.approved_amount)throw new ApiError(400,"Invoice total cannot exceed the approved amount.");
  const id=crypto.randomUUID();
  const result=await db().batch([
   db().prepare("UPDATE changes SET invoiced_amount=invoiced_amount+?,updated_at=?,version=version+1 WHERE id=? AND workspace_id=? AND version=? AND status IN ('approved','delivered')").bind(v.amount,now,v.change_id,wid,v.version),
   db().prepare("INSERT INTO invoices(id,workspace_id,change_id,reference,amount,status,due_date,issued_at,created_by,created_at,voided_at,void_reason) SELECT ?,?,?,?,?, 'issued',?,?,?,?, '', '' WHERE changes()=1").bind(id,wid,v.change_id,v.reference,v.amount,v.due_date,now,u.email,now),
   db().prepare("INSERT INTO events(id,workspace_id,entity_id,action,actor,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),wid,v.change_id,"Invoice recorded",u.email,`${c.title} — invoice ${v.amount}${v.reference?`; reference ${v.reference}`:""}`,now)
  ]);
  if(result[0].meta.changes!==1)throw new ApiError(409,"This change request changed before the invoice was recorded.");
  return json({id,change_id:v.change_id,invoiced_amount:c.invoiced_amount+v.amount,paid_amount:c.paid_amount,version:v.version+1},201);
 }

 if(v.action==="payment"){
  const invoice=await db().prepare("SELECT id,change_id,amount,status FROM invoices WHERE id=? AND workspace_id=?").bind(v.invoice_id,wid).first<{id:string;change_id:string;amount:number;status:string}>();
  if(!invoice||invoice.change_id!==v.change_id)throw new ApiError(404,"Invoice not found for this change request.");
  if(invoice.status!=="issued")throw new ApiError(409,"Payments cannot be recorded against a void invoice.");
  const invoicePaid=await db().prepare("SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE invoice_id=? AND workspace_id=? AND status='received'").bind(invoice.id,wid).first<{n:number}>();
  if((invoicePaid?.n||0)+v.amount>invoice.amount)throw new ApiError(400,"Payment total cannot exceed this invoice amount.");
  if(c.paid_amount+v.amount>c.invoiced_amount)throw new ApiError(400,"Paid total cannot exceed invoiced value.");
  const id=crypto.randomUUID();
  const result=await db().batch([
   db().prepare("UPDATE changes SET paid_amount=paid_amount+?,updated_at=?,version=version+1 WHERE id=? AND workspace_id=? AND version=? AND status IN ('approved','delivered')").bind(v.amount,now,v.change_id,wid,v.version),
   db().prepare("INSERT INTO payments(id,workspace_id,change_id,invoice_id,reference,amount,status,received_at,created_by,created_at,reversed_at,reversal_reason) SELECT ?,?,?,?,?,?,'received',?,?,?,'','' WHERE changes()=1").bind(id,wid,v.change_id,invoice.id,v.reference,v.amount,now,u.email,now),
   db().prepare("INSERT INTO events(id,workspace_id,entity_id,action,actor,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),wid,v.change_id,"Payment recorded",u.email,`${c.title} — payment ${v.amount}${v.reference?`; reference ${v.reference}`:""}`,now)
  ]);
  if(result[0].meta.changes!==1)throw new ApiError(409,"This change request changed before the payment was recorded.");
  return json({id,change_id:v.change_id,invoiced_amount:c.invoiced_amount,paid_amount:c.paid_amount+v.amount,version:v.version+1},201);
 }

 if(v.action==="void_invoice"){
  const invoice=await db().prepare("SELECT id,change_id,amount,status FROM invoices WHERE id=? AND workspace_id=?").bind(v.invoice_id,wid).first<{id:string;change_id:string;amount:number;status:string}>();
  if(!invoice||invoice.change_id!==v.change_id)throw new ApiError(404,"Invoice not found for this change request.");
  if(invoice.status!=="issued")throw new ApiError(409,"This invoice is already void.");
  const activePayments=await db().prepare("SELECT COUNT(*) AS n FROM payments WHERE invoice_id=? AND workspace_id=? AND status='received'").bind(invoice.id,wid).first<{n:number}>();
  if((activePayments?.n||0)>0)throw new ApiError(409,"Reverse received payments before voiding this invoice.");
  const result=await db().batch([
   db().prepare("UPDATE changes SET invoiced_amount=invoiced_amount-?,updated_at=?,version=version+1 WHERE id=? AND workspace_id=? AND version=? AND invoiced_amount>=?").bind(invoice.amount,now,v.change_id,wid,v.version,invoice.amount),
   db().prepare("UPDATE invoices SET status='void',voided_at=?,void_reason=? WHERE id=? AND workspace_id=? AND status='issued' AND changes()=1").bind(now,v.reason,invoice.id,wid),
   db().prepare("INSERT INTO events(id,workspace_id,entity_id,action,actor,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),wid,v.change_id,"Invoice voided",u.email,`${c.title} — invoice ${invoice.amount}; ${v.reason}`,now)
  ]);
  if(result[0].meta.changes!==1||result[1].meta.changes!==1)throw new ApiError(409,"This invoice or change request changed before the void was saved.");
  return json({id:invoice.id,change_id:v.change_id,invoiced_amount:c.invoiced_amount-invoice.amount,paid_amount:c.paid_amount,version:v.version+1});
 }

 const payment=await db().prepare("SELECT id,change_id,invoice_id,amount,status FROM payments WHERE id=? AND workspace_id=?").bind(v.payment_id,wid).first<{id:string;change_id:string;invoice_id:string;amount:number;status:string}>();
 if(!payment||payment.change_id!==v.change_id)throw new ApiError(404,"Payment not found for this change request.");
 if(payment.status!=="received")throw new ApiError(409,"This payment is already reversed.");
 const result=await db().batch([
  db().prepare("UPDATE changes SET paid_amount=paid_amount-?,updated_at=?,version=version+1 WHERE id=? AND workspace_id=? AND version=? AND paid_amount>=?").bind(payment.amount,now,v.change_id,wid,v.version,payment.amount),
  db().prepare("UPDATE payments SET status='reversed',reversed_at=?,reversal_reason=? WHERE id=? AND workspace_id=? AND status='received' AND changes()=1").bind(now,v.reason,payment.id,wid),
  db().prepare("INSERT INTO events(id,workspace_id,entity_id,action,actor,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),wid,v.change_id,"Payment reversed",u.email,`${c.title} — payment ${payment.amount}; ${v.reason}`,now)
 ]);
 if(result[0].meta.changes!==1||result[1].meta.changes!==1)throw new ApiError(409,"This payment or change request changed before the reversal was saved.");
 return json({id:payment.id,change_id:v.change_id,invoiced_amount:c.invoiced_amount,paid_amount:c.paid_amount-payment.amount,version:v.version+1});
}catch(e){return failure(e);}}
