import { ApiError } from "./server";

export type PageCursor={createdAt:string;id:string};

export function pageLimit(url:URL,defaultValue=50,maxValue=100){
 const raw=url.searchParams.get("limit");
 if(!raw)return defaultValue;
 const value=Number(raw);
 if(!Number.isInteger(value)||value<1)throw new ApiError(400,"limit must be a positive integer.");
 return Math.min(value,maxValue);
}

export function optionalDate(value:string|null,name:string){
 if(!value)return "";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value)))throw new ApiError(400,`${name} must be YYYY-MM-DD.`);
 return value;
}

export function optionalSearch(value:string|null){
 const search=(value||"").trim();
 if(search.length>80)throw new ApiError(400,"search is too long.");
 return search;
}

export function encodeCursor(cursor:PageCursor){
 return btoa(JSON.stringify([cursor.createdAt,cursor.id])).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
}

export function decodeCursor(raw:string|null):PageCursor|null{
 if(!raw)return null;
 try{
  const base=raw.replaceAll("-","+").replaceAll("_","/");
  const padded=base+"=".repeat((4-base.length%4)%4);
  const value=JSON.parse(atob(padded));
  if(!Array.isArray(value)||value.length!==2||typeof value[0]!=="string"||typeof value[1]!=="string"||!value[0]||!value[1]||value[0].length>64||value[1].length>200||Number.isNaN(Date.parse(value[0])))throw new Error("bad cursor");
  return {createdAt:value[0],id:value[1]};
 }catch{throw new ApiError(400,"cursor is invalid.");}
}

export function pageResult<T extends {id:string;created_at:string}>(rows:T[],limit:number){
 const hasMore=rows.length>limit,items=hasMore?rows.slice(0,limit):rows,next=hasMore?items[items.length-1]:null;
 return {items,next_cursor:next?encodeCursor({createdAt:next.created_at,id:next.id}):null,has_more:hasMore};
}
