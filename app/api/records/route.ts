import { getChatGPTUser } from "../../chatgpt-auth";
import { initialize, listRecords, upsertRecords, workspaceRecords, exportRecords } from "../../../lib/store";
export const dynamic = "force-dynamic";
const fail=(message:string,status=400)=>Response.json({error:message},{status});
export async function GET(request:Request) {
 const user=await getChatGPTUser();if(!user)return fail("请先登录。",401);
 try {await initialize(user.userId);const params=new URL(request.url).searchParams;return Response.json({records:params.has('export')?await exportRecords(user.userId):await workspaceRecords(user.userId,params.get('date')||undefined)});}catch{return fail("读取记录失败，请重试。",500);}
}
export async function POST(request:Request) {
 const user=await getChatGPTUser();if(!user)return fail("请先登录。",401);
 const origin=request.headers.get("origin");if(origin && origin!==new URL(request.url).origin)return fail("请求来源不受信任。",403);
 if(Number(request.headers.get("content-length")||0)>500000)return fail("导入内容过大。",413);
 try {const body=await request.json() as {records:unknown[]};return Response.json(await upsertRecords(user.userId,body.records,new URL(request.url).searchParams.has("compact")));}catch(e){return fail(e instanceof Error?e.message:"保存失败。");}
}
