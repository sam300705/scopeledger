import { authorize,db,json,failure,ApiError } from "@/lib/server";
import { decodeCursor,optionalSearch,pageLimit,pageResult } from "@/lib/pagination";

export async function GET(request:Request){try{
 const url=new URL(request.url),wid=url.searchParams.get("workspace")||"";
 await authorize(wid);
 const limit=pageLimit(url),cursor=decodeCursor(url.searchParams.get("cursor")),search=optionalSearch(url.searchParams.get("search")),change=url.searchParams.get("change")||"",project=url.searchParams.get("project")||"";
 if(change.length>200||project.length>200)throw new ApiError(400,"proposal filter is too long.");
 const prefix=search.replace(/[\\%_]/g,"\\$&")+"%",cursorAt=cursor?.createdAt||"",cursorId=cursor?.id||"";
 const rows=await db().prepare("SELECT pr.id,pr.change_id,pr.version,pr.title,pr.description,pr.pricing_mode,pr.line_items,pr.exclusions,pr.minutes,pr.rate,pr.amount,pr.delay_days,pr.due_date,pr.scope_snapshot,pr.project_budget,pr.project_due_date,pr.project_amendment_version,pr.created_by,pr.created_at,c.project_id,p.name AS project_name,p.client FROM proposals pr JOIN changes c ON c.id=pr.change_id AND c.workspace_id=pr.workspace_id JOIN projects p ON p.id=c.project_id AND p.workspace_id=c.workspace_id WHERE pr.workspace_id=? AND (?='' OR pr.change_id=?) AND (?='' OR c.project_id=?) AND (?='' OR pr.title LIKE ? ESCAPE '\\' OR p.client LIKE ? ESCAPE '\\') AND (?='' OR pr.created_at<? OR (pr.created_at=? AND pr.id<?)) ORDER BY pr.created_at DESC,pr.id DESC LIMIT ?").bind(wid,change,change,project,project,search,prefix,prefix,cursorAt,cursorAt,cursorAt,cursorId,limit+1).all<{id:string;created_at:string}>();
 return json(pageResult(rows.results as ({id:string;created_at:string}&Record<string,unknown>)[],limit));
}catch(e){return failure(e);}}
