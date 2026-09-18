import { authorize,db,json,failure,ApiError } from "@/lib/server";
import { decodeCursor,optionalDate,optionalSearch,pageLimit,pageResult } from "@/lib/pagination";

export async function GET(request:Request){try{
 const url=new URL(request.url),wid=url.searchParams.get("workspace")||"";
 await authorize(wid);
 const limit=pageLimit(url),cursor=decodeCursor(url.searchParams.get("cursor")),search=optionalSearch(url.searchParams.get("search")),entity=url.searchParams.get("entity")||"",from=optionalDate(url.searchParams.get("from"),"from"),to=optionalDate(url.searchParams.get("to"),"to");
 if(entity.length>200)throw new ApiError(400,"entity filter is too long.");
 const prefix=search.replace(/[\\%_]/g,"\\$&")+"%",fromAt=from?from+"T00:00:00.000Z":"",toAt=to?to+"T23:59:59.999Z":"",cursorAt=cursor?.createdAt||"",cursorId=cursor?.id||"";
 const rows=await db().prepare("SELECT id,entity_id,action,actor,detail,created_at FROM events WHERE workspace_id=? AND (?='' OR entity_id=?) AND (?='' OR action LIKE ? ESCAPE '\\' OR actor LIKE ? ESCAPE '\\') AND (?='' OR created_at>=?) AND (?='' OR created_at<=?) AND (?='' OR created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT ?").bind(wid,entity,entity,search,prefix,prefix,fromAt,fromAt,toAt,toAt,cursorAt,cursorAt,cursorAt,cursorId,limit+1).all<{id:string;created_at:string}>();
 return json(pageResult(rows.results as ({id:string;created_at:string}&Record<string,unknown>)[],limit));
}catch(e){return failure(e);}}
