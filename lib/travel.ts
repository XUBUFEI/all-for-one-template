import {z} from 'zod';
import type {RecordData} from './model';
import type {Locale} from './i18n';
const text=z.object({zh:z.string().max(1600),en:z.string().max(2400).optional()}).strict();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v});
export const travelJournalSchema=z.object({
 version:z.literal(1),sourceNotes:z.string().max(12000),sourceStartDate:z.string().max(10),sourceEndDate:z.string().max(10),summary:text,
 days:z.array(z.object({date,title:text,places:z.object({zh:z.array(z.string().min(1).max(160)).min(1).max(20),en:z.array(z.string().min(1).max(200)).min(1).max(20).optional()}).strict(),caption:text,basis:z.enum(['itinerary','confirmed'])}).strict()).min(1).max(31),
 memories:z.array(text).max(12)
}).strict().superRefine((v,c)=>{for(let i=0;i<v.days.length;i++){const day=v.days[i];if((v.sourceStartDate&&day.date<v.sourceStartDate)||(v.sourceEndDate&&day.date>v.sourceEndDate)||(i>0&&day.date<=v.days[i-1].date))c.addIssue({code:'custom',message:'Journal days must be in order and within the trip dates'});if(day.places.en&&day.places.en.length!==day.places.zh.length)c.addIssue({code:'custom',message:'Place translations must match the source route'});}});
export type TravelJournal=z.infer<typeof travelJournalSchema>;
export const travelJournalStringSchema=z.string().max(100000).refine(value=>{try{return travelJournalSchema.safeParse(JSON.parse(value)).success}catch{return false}},'Invalid travel journal');
export function readTravelJournal(data:RecordData):TravelJournal|null{try{const j=travelJournalSchema.parse(JSON.parse(String(data.travelJournal||'')));return j.sourceNotes===String(data.notes||'')&&j.sourceStartDate===String(data.startDate||'')&&j.sourceEndDate===String(data.endDate||'')?j:null}catch{return null}}
export const journalText=(value:{zh:string;en?:string},locale:Locale)=>locale==='en'?value.en??value.zh:value.zh;
export function journalPlaces(day:TravelJournal['days'][number],locale:Locale){return locale==='en'?day.places.en??day.places.zh:day.places.zh;}
// Only edit the active language; original notes and the other language remain intact.
export function editTravelJournal(data:RecordData,form:FormData,locale:Locale):RecordData{
 const current=readTravelJournal(data);if(!current)return data;const next:TravelJournal=JSON.parse(JSON.stringify(current));
 const value=(key:string)=>String(form.get(key)??'');next.summary[locale]=value('journal.summary');
 next.days.forEach((day,i)=>{day.title[locale]=value(`journal.${i}.title`);day.caption[locale]=value(`journal.${i}.caption`);const places=value(`journal.${i}.places`).split(/\n|→/).map(s=>s.trim()).filter(Boolean);day.places[locale]=places;
  // A changed source route cannot retain an English route aligned to the old stops.
  if(locale==='zh'&&JSON.stringify(places)!==JSON.stringify(current.days[i].places.zh))delete day.places.en;
 });
 next.memories.forEach((memory,i)=>{memory[locale]=value(`journal.memory.${i}`)});
 if(locale==='zh'){if(next.summary.zh!==current.summary.zh)delete next.summary.en;next.days.forEach((day,i)=>{if(day.title.zh!==current.days[i].title.zh)delete day.title.en;if(day.caption.zh!==current.days[i].caption.zh)delete day.caption.en;});next.memories.forEach((memory,i)=>{if(memory.zh!==current.memories[i].zh)delete memory.en;});}
 return {...data,travelJournal:JSON.stringify(travelJournalSchema.parse(next))};
}
