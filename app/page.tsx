import { requireChatGPTUser } from "./chatgpt-auth";
import Workspace from "./workspace";
export const dynamic = "force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{lang?:string}>}){const params=(await searchParams)||{};const locale=params.lang==='en'?'en':'zh';await requireChatGPTUser(locale==='en'?'/?lang=en':'/');return <Workspace initialLocale={locale}/>;}
