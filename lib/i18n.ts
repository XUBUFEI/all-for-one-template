import {EN} from './translations';
export type Locale='zh'|'en';
export const LOCALE_KEY='all-for-one-language';
export function resolveLocale(value:string|null|undefined):Locale{return value==='en'?'en':'zh';}
export function preferredLocale(query:string|null,saved:string|null,fallback:Locale='zh'):Locale{return query==='en'||query==='zh'?query:saved==='en'||saved==='zh'?saved:fallback;}
export function translate(locale:Locale,key:string,...values:unknown[]):string{
 let text=locale==='en'?(EN[key]??key):key;
 if(locale==='en'&&!EN[key]&&key.startsWith('[')){try{const issues=JSON.parse(key);if(Array.isArray(issues)&&issues.length&&issues.every((x:any)=>typeof x.message==='string'))text=issues.map((x:any)=>EN[x.message]||x.message).join('; ');}catch{}}
 return text.replace(/\{(\d+)\}/g,(match,index)=>values[Number(index)]===undefined?match:String(values[Number(index)]));
}
