import { z } from "zod";
import {travelJournalStringSchema} from "./travel";
import {contentTranslationsSchema} from "./content";
export const KINDS = ["task", "worklog", "meal", "exercise", "body", "trip", "time", "note", "settings", "project", "work_event"] as const;
export type Kind = typeof KINDS[number];
export type RecordData = { title: string; [key: string]: string | number | boolean | string[] | null | undefined };
export type Entry = { id: string; kind: Kind; date: string; data: RecordData; source: string; sourceKey: string; createdAt: string; updatedAt: string };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {const d = new Date(`${v}T00:00:00Z`);return !isNaN(d.valueOf()) && d.toISOString().slice(0,10) === v;}, "日期无效");
const short = z.string().max(200);
const nullableNumber = z.number().finite().nonnegative().max(100000).nullable().optional();
export const dataSchema = z.object({
  contentTranslations: contentTranslationsSchema.optional(),
  travelJournal: travelJournalStringSchema.optional(),
  title: z.string().trim().min(1).max(200), notes: z.string().max(12000).optional(),
  project: short.optional(), status: z.enum(["todo","doing","waiting","done","planned","visited","cancelled"]).optional(),
  priority: z.enum(["high","medium","low"]).optional(), dueDate: date.nullable().optional(), completedOn: date.nullable().optional(),
  taskType: z.enum(["Task","Issue","Risk","Lesson","Meeting"]).optional(),
  externalPriority: z.enum(["P0","P1","P2","P3"]).nullable().optional(),
  importance: z.enum(["Critical","High","Medium","Low"]).nullable().optional(),
  engineeringStage: z.enum(["Requirements","Design","Review","Prototype","Testing","Production Support","ECN/ECR","Supplier","Coordination","Knowledge"]).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(15).transform(a=>[...new Set(a)]).optional(),
  description: z.string().max(12000).optional(), acceptance: z.string().max(6000).optional(),
  nextAction: z.string().max(2000).optional(), waitingFor: z.string().max(2000).optional(),
  outcome: z.string().max(6000).optional(), lesson: z.string().max(6000).optional(),
  ownerName: short.optional(), projectId: z.string().max(300).optional(),
  parentTaskId: z.string().max(300).optional(), parentProjectId: z.string().max(300).optional(),
  relatedNoteIds: z.array(z.string().max(300)).max(20).optional(), taskId: z.string().max(300).optional(),
  startedOn: date.nullable().optional(), cancelledOn: date.nullable().optional(),
  estimatedHours: z.number().finite().nonnegative().max(10000).nullable().optional(),
  originalDueDate: date.nullable().optional(), rescheduleCount: z.number().int().min(0).max(1000).optional(),
  rescheduleReason: z.string().max(2000).optional(), rescheduleAction: z.enum(["downgrade","split","waiting"]).optional(),
  workSchemaVersion: z.number().int().optional(), workRevision: z.number().int().nonnegative().optional(),
  projectPriority: z.enum(["P1","P2","P3"]).optional(),
  projectStatus: z.enum(["planning","design","testing","waiting","production","done","closed"]).optional(),
  health: z.enum(["Green","Yellow","Red"]).optional(),
  goal: z.string().max(6000).optional(), milestone: z.string().max(2000).optional(),
  targetDate: date.nullable().optional(), milestoneDate: date.nullable().optional(), riskNotes: z.string().max(6000).optional(), closureNotes: z.string().max(6000).optional(),
  entityId: z.string().max(300).optional(), eventType: short.optional(),
  changesJson: z.string().max(50000).optional(), snapshotJson: z.string().max(50000).optional(),
  hours: z.number().finite().nonnegative().max(24).nullable().optional(),
  period: z.enum(["breakfast","lunch","dinner","snack"]).optional(),
  calories: nullableNumber, protein: nullableNumber, carbs: nullableNumber, fat: nullableNumber,
  estimated: z.boolean().optional(), duration: z.number().finite().nonnegative().max(1440).nullable().optional(),
  steps: z.number().int().nonnegative().max(200000).nullable().optional(),
  category: short.optional(), originalTag: short.optional(),
  originalScheduleId: short.optional(), originalTaskId: short.optional(),
  originalTagIds: z.array(short).max(104).optional(), originalTagPaths: z.array(z.string().max(2000)).max(104).optional(),
  originalStartedAt: z.string().datetime({offset:true}).optional(), originalEndedAt: z.string().datetime({offset:true}).optional(),
  timeZone: z.enum(['Asia/Shanghai']).optional(),
  weight: z.number().finite().positive().max(500).nullable().optional(),
  location: short.optional(), startDate: date.nullable().optional(), endDate: date.nullable().optional(),
  image: z.enum(["/assets/wuyi.jpg"]).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
}).strict();
export const inputSchema = z.object({
  expectedUpdatedAt: z.string().max(100).optional(), id: z.string().max(300).optional(), kind: z.enum(KINDS), date,
  data: dataSchema,
  source: z.enum(["chat", "3x3", "manual", "import", "context"]).default("chat"),
  sourceKey: z.string().trim().min(1).max(300),
}).strict().superRefine((v,c) => {
  if(v.kind === "task" && v.data.status && !["todo","doing","waiting","done","cancelled"].includes(v.data.status)) c.addIssue({code:"custom",message:"任务状态无效",path:["data","status"]});
  if(v.kind === "work_event") c.addIssue({code:"custom",message:"变更历史由系统自动保存，不能手动写入。"});
  if(v.kind === "task" && v.data.status === "waiting" && !v.data.waitingFor?.trim()) c.addIssue({code:"custom",message:"Waiting 必须写清在等谁或等什么。",path:["data","waitingFor"]});
  if(v.kind === "trip" && v.data.startDate && v.data.endDate && v.data.endDate < v.data.startDate) c.addIssue({code:"custom",message:"结束日期不能早于开始日期",path:["data","endDate"]});
  if(v.kind === "time" && v.data.duration == null) c.addIssue({code:"custom",message:"时间记录需要时长",path:["data","duration"]});
  if(v.kind === "body" && v.data.weight == null) c.addIssue({code:"custom",message:"体重记录需要体重",path:["data","weight"]});
});
export type EntryInput = z.infer<typeof inputSchema>;
export function todayShanghai(now = new Date()) { return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Shanghai", year:"numeric",month:"2-digit",day:"2-digit"}).format(now); }
export function shiftDate(value:string, offset:number) {const d = new Date(value+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
export function weekRange(date:string) {const weekday = new Date(date+"T00:00:00Z").getUTCDay(); const start = shiftDate(date,-((weekday+6)%7));return {start,end:shiftDate(start,6)};}
export function timeTotals(entries:Entry[]){
 const spans:[number,number][]=[];let unpositioned=0;let activityMinutes=0;
 for(const e of entries.filter(e=>e.kind==='time')){
  const duration=Number(e.data.duration||0);activityMinutes+=duration;
  const start=Date.parse(String(e.data.originalStartedAt||'')),end=Date.parse(String(e.data.originalEndedAt||''));
  const dayStart=Date.parse(e.date+'T00:00:00+08:00'),dayEnd=dayStart+86400000;
  if(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&Math.min(end,dayEnd)>Math.max(start,dayStart))spans.push([Math.max(start,dayStart),Math.min(end,dayEnd)]);else unpositioned+=duration;
 }
 spans.sort((a,b)=>a[0]-b[0]);let covered=0;let left=0,right=0;
 for(const [start,end] of spans){if(start>right){covered+=right-left;left=start;right=end;}else right=Math.max(right,end);}covered+=right-left;
 const timeMinutes=covered/60000+unpositioned;
 return {timeMinutes,activityMinutes,timeOverlapMinutes:Math.max(0,Math.round((activityMinutes-timeMinutes)*1000000)/1000000),unpositionedMinutes:unpositioned};
}
export function summarize(entries:Entry[], date:string) {
  const day = entries.filter(e=>e.date===date);
  const meals = day.filter(e=>e.kind==="meal");
  const tasks = entries.filter(e=>e.kind==="task");
  const time = day.filter(e=>e.kind==="time");
  const settings = entries.find(e=>e.kind==="settings")?.data;
  const nutrients = Object.fromEntries(["calories","protein","carbs","fat"].map(key=> {
    const known = meals.filter(e=>typeof e.data[key]==="number");
    const total = known.reduce((sum,e)=>sum+Number(e.data[key]),0);
    const target = typeof settings?.[key]==="number" ? Number(settings[key]) : null;
    const complete = meals.length>0 && known.length===meals.length;
    return [key,{total:known.length?Math.round(total*10)/10:null, target, remaining:complete&&target!==null?Math.round((target-total)*10)/10:null, complete, missing:meals.length-known.length}];
  }));
  return {date, meals:meals.length, exercises:day.filter(e=>e.kind==="exercise").length, activeTasks:tasks.filter(e=>!["done","cancelled"].includes(String(e.data.status))).length, completedTasks:tasks.filter(e=>e.data.status==="done").length, ...timeTotals(time), nutrients};
}
