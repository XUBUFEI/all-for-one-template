import type { Metadata } from "next";
import "./serif-font.css";
import "./globals.css";
export const metadata: Metadata = {title:"All for One · 个人工作站",description:"工作、健康、旅行与时间，持续积累每一天。",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><head><link rel="preload" href="/fonts/source-han-serif-sc-vf-ui.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>;}
