import { db,json,failure } from "@/lib/server";
export async function GET(){try{await db().prepare("SELECT 1 AS ok").first();return json({status:"ok",database:"reachable"});}catch(e){return failure(e);}}
