'use client';
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {LOCALE_KEY,preferredLocale,translate,type Locale} from '../lib/i18n';
type Context={locale:Locale;setLocale:(locale:Locale)=>void;t:(key:string,...values:unknown[])=>string};
const LocaleContext=createContext<Context>({locale:'zh',setLocale:()=>{},t:(key,...values)=>translate('zh',key,...values)});
export function LocaleProvider({children,initialLocale='zh'}:{children:ReactNode;initialLocale?:Locale}){
 const [locale,setLanguage]=useState<Locale>(initialLocale);
 useEffect(()=>{const query=new URLSearchParams(window.location.search).get('lang');let saved:string|null=null;try{saved=localStorage.getItem(LOCALE_KEY)}catch{}setLanguage(preferredLocale(query,saved,initialLocale));},[initialLocale]);
 useEffect(()=>{document.documentElement.lang=locale==='en'?'en':'zh-CN';document.title=locale==='en'?"All for One · Personal workspace":'All for One · 个人工作站';},[locale]);
 const setLocale=useCallback((value:Locale)=>{setLanguage(value);try{localStorage.setItem(LOCALE_KEY,value)}catch{}const url=new URL(window.location.href);url.searchParams.set('lang',value);window.history.replaceState(null,'',url.pathname+url.search+url.hash);},[]);
 const t=useCallback((key:string,...values:unknown[])=>translate(locale,key,...values),[locale]);
 return <LocaleContext.Provider value={{locale,setLocale,t}}>{children}</LocaleContext.Provider>;
}
export const useLocale=()=>useContext(LocaleContext);
export function LanguageSwitch(){const {locale,setLocale}=useLocale();return <div className="language-switch" role="group" aria-label={locale==='en'?'Interface language':'界面语言'}><button type="button" lang="zh-CN" aria-pressed={locale==='zh'} onClick={()=>setLocale('zh')}>中</button><span aria-hidden="true">/</span><button type="button" lang="en" aria-pressed={locale==='en'} onClick={()=>setLocale('en')}>EN</button></div>;}
