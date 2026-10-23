import { getChatGPTUser } from "../../chatgpt-auth";
import { updateTask } from "../../../lib/store";
export async function POST(request:Request) {
 const user=await getChatGPTUser();if(!user)return Response.json({error:"请先登录。"},{status:401});
 const origin=request.headers.get("origin");if(origin && origin!==new URL(request.url).origin)return Response.json({error:"请求来源不受信任。"},{status:403});
 try {const {id,status,details}=await request.json() as {id:string;status:string;details?:Record<string,string>};return Response.json(await updateTask(user.userId,id,status,details));}catch(e){return Response.json({error:e instanceof Error?e.message:"保存失败"},{status:400});}
}
