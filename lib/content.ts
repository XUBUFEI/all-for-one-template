import {z} from 'zod';
import type {RecordData} from './model';
import type {Locale} from './i18n';
export const CONTENT_FIELDS=['title','description','notes','location','acceptance','nextAction','waitingFor','outcome','lesson','goal','milestone','riskNotes','closureNotes','rescheduleReason'] as const;
export const contentMapSchema=z.object(Object.fromEntries(CONTENT_FIELDS.map(key=>[key,z.object({source:z.string().max(12000),en:z.string().max(key==='title'||key==='location'?200:12000)}).strict().optional()]))).strict();
export const contentTranslationsSchema=z.string().max(200000).refine(value=>{try{return contentMapSchema.safeParse(JSON.parse(value)).success}catch{return false}},'Invalid content translations');
type ContentMap=Partial<Record<typeof CONTENT_FIELDS[number],{source:string;en:string}>>;
export function contentMap(data:RecordData):ContentMap{try{const value=JSON.parse(String(data.contentTranslations||'{}'));return contentMapSchema.parse(value)}catch{return {}}}
export function contentText(data:RecordData,key:string,locale:Locale='zh'):string{const original=String(data[key]??'');if(locale!=='en')return original;const value=contentMap(data)[key as keyof ContentMap];return value&&value.source===original?value.en:original;}
export function localizedContent(data:RecordData,locale:Locale):RecordData{return {...data,...Object.fromEntries(CONTENT_FIELDS.filter(key=>typeof data[key]==='string'||(locale==='en'&&contentMap(data)[key]?.source==='')).map(key=>[key,contentText(data,key,locale)]))};}
// Existing English edits update the parallel translation, never overwrite the source.
export function saveContentEdits(original:RecordData,next:RecordData,locale:Locale,submitted:Iterable<string>=CONTENT_FIELDS):RecordData{
 if(locale!=='en')return next;
 const result:RecordData={...next};const map=contentMap(original);const fields=new Set(submitted);
 for(const key of CONTENT_FIELDS){if(!fields.has(key))continue;const value=String(next[key]??'');if(!original[key]&&value){result[String(key)]=value;delete map[key];continue;}if(value!==contentText(original,key,'en'))map[key]={source:String(original[key]??''),en:value};if(original[key]===undefined)delete result[key];else result[String(key)]=original[key];}
 if(Object.keys(map).length)result.contentTranslations=JSON.stringify(map);return result;
}
