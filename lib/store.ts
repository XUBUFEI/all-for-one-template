import { env } from 'cloudflare:workers';
import { inputSchema, type Entry, type RecordData, type Kind, todayShanghai, shiftDate } from './model';
import { PRIORITIES, descendantProjects } from './work';
import { SEED } from './seed';
import { projectSeeds,projectSeedId,LEGACY_TASK_META } from './work-seed';
type Row={id:string;owner:string;kind:Kind;happened_on:string;data:string;source:string;source_key:string;created_at:string;updated_at:string};
const db=()=>{if(!env.DB)throw new Error('数据存储暂不可用，请稍后重试。');return env.DB;};
const decode=(r:Row):Entry=>({id:r.id,kind:r.kind,date:r.happened_on,data:JSON.parse(r.data),source:r.source,sourceKey:r.source_key,createdAt:r.created_at,updatedAt:r.updated_at});
function insert(e:Entry,owner:string){return db().prepare('INSERT INTO records (id,owner,kind,happened_on,data,source,source_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(e.id,owner,e.kind,e.date,JSON.stringify(e.data),e.source,e.sourceKey,e.createdAt,e.updatedAt);}
export async function initialize(owner:string){
 const now=new Date().toISOString();const seeds=[...SEED,...projectSeeds(owner)];
 if(seeds.length)await db().batch(seeds.map(e=>db().prepare('INSERT OR IGNORE INTO records (id,owner,kind,happened_on,data,source,source_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(e.kind==='project'?projectSeedId(owner,e.sourceKey.replace('project-','')):`${owner}:seed:${e.sourceKey}`,owner,e.kind,e.date,JSON.stringify(e.data),e.source,e.sourceKey,now,now)));
 const rows=await listRecords(owner,{kind:'task'});const updates:D1PreparedStatement[]=[];
 for(const e of rows){if(Number(e.data.workSchemaVersion||0)>=3)continue;const known=LEGACY_TASK_META[e.sourceKey];const data:RecordData={...e.data,workSchemaVersion:3};
  if(known){if(!data.projectId)data.projectId=projectSeedId(owner,known.project);if(Array.isArray(data.tags)&&JSON.stringify([...data.tags].sort())===JSON.stringify([...known.legacyTags].sort()))delete data.tags;if(!data.engineeringStage)data.engineeringStage=known.engineeringStage;if(!data.taskType)data.taskType='Task';}
  if(!data.description&&data.notes)data.description=data.notes;if(data.dueDate&&!data.originalDueDate)data.originalDueDate=data.dueDate;
  updates.push(db().prepare('UPDATE records SET data=? WHERE owner=? AND id=? AND data=?').bind(JSON.stringify(data),owner,e.id,JSON.stringify(e.data)));
 }
 if(updates.length)await db().batch(updates);
}
export async function listRecords(owner:string,filter:{kind?:string;from?:string;to?:string}={}){
 let sql='SELECT * FROM records WHERE owner = ?';const values:string[]=[owner];
 for(const [field,value] of [['kind',filter.kind],['happened_on >=',filter.from],['happened_on <=',filter.to]])if(value){sql+=field==='kind'?' AND kind = ?':` AND ${field} ?`;values.push(value);}
 sql+=' ORDER BY happened_on DESC, created_at DESC LIMIT 10000';const {results}=await db().prepare(sql).bind(...values).all<Row>();return results.map(decode);
}
// Time history is loaded around the selected date; work and health remain available.
export async function workspaceRecords(owner:string,date=todayShanghai()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(new Date(date+'T00:00:00Z').valueOf())||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new Error('日期无效');
 const {results}=await db().prepare("SELECT * FROM records WHERE owner=? AND (kind!='time' OR happened_on BETWEEN ? AND ?) ORDER BY happened_on DESC,created_at DESC").bind(owner,shiftDate(date,-35),shiftDate(date,35)).all<Row>();
 return results.map(decode);
}
export async function exportRecords(owner:string){
 const entries:Entry[]=[];
 for(let offset=0;;offset+=2000){const {results}=await db().prepare('SELECT * FROM records WHERE owner=? ORDER BY happened_on DESC,id LIMIT 2000 OFFSET ?').bind(owner,offset).all<Row>();entries.push(...results.map(decode));if(results.length<2000)return entries;}
}
async function writeContext(owner:string,parsed:{id?:string;source:string;sourceKey:string}[]){
 // Look up incoming source keys without the read limit, including old imports.
 const {results}=await db().prepare("SELECT * FROM records WHERE owner=? AND (kind IN ('task','project','note') OR id IN (SELECT value FROM json_each(?)) OR (source || ':' || source_key) IN (SELECT value FROM json_each(?)))").bind(owner,JSON.stringify(parsed.flatMap(v=>v.id?[v.id]:[])),JSON.stringify(parsed.map(v=>v.source+':'+v.sourceKey))).all<Row>();
 return results.map(decode);
}
export async function upsertRecords(owner:string,raw:unknown[],compact=false){
 if(!Array.isArray(raw)||raw.length<1||raw.length>100)throw new Error('每次请写入 1–100 条记录。');
 const parsed=raw.map(v=>inputSchema.parse(v));const old=await writeContext(owner,parsed);const candidates=new Map(old.map(e=>[e.id,e]));const now=new Date().toISOString();const today=todayShanghai();
 const prepared:{next:Entry;previous?:Entry}[]=[];const keys=new Set<string>();const sources=new Set<string>();
 for(const v of parsed){
  const sourceIdentity=v.source+':'+v.sourceKey;if(sources.has(sourceIdentity))throw new Error('同一批次不能重复写入同一来源键。');sources.add(sourceIdentity);
  const previous=v.id?old.find(e=>e.id===v.id):old.find(e=>e.source===v.source&&e.sourceKey===v.sourceKey);
  if(v.id&&!previous)throw new Error('记录不存在或无权修改。');
  if(v.expectedUpdatedAt&&previous?.updatedAt!==v.expectedUpdatedAt)throw new Error('记录已在其他位置更新，请刷新后再编辑。');
  if(previous&&previous.kind!==v.kind)throw new Error('不能改变已有记录的类别。');
  const id=previous?.id||crypto.randomUUID();if(keys.has(id))throw new Error('同一批次不能重复修改同一记录。');keys.add(id);
  const data:RecordData={...v.data};
  if(v.kind==='task'||v.kind==='project')data.workRevision=Number(previous?.data.workRevision||0)+1;
  if(v.kind==='task'){
   data.workSchemaVersion=3;
   if(data.status==='done'){if(!data.completedOn)data.completedOn=previous?.data.status==='done'?previous.data.completedOn||today:today;}else delete data.completedOn;
   if(data.status==='cancelled')data.cancelledOn=data.cancelledOn||today;else delete data.cancelledOn;
   const count=Number(previous?.data.rescheduleCount||0);data.rescheduleCount=count;data.originalDueDate=previous?.data.originalDueDate||previous?.data.dueDate||data.dueDate||null;
   if(previous&&(previous.data.originalDueDate||previous.data.dueDate)&&(previous.data.dueDate||null)!==(data.dueDate||null)){
    if(!data.rescheduleReason?.toString().trim())throw new Error('修改已有截止日期时，请填写改期原因。');
    data.rescheduleCount=count+1;
    if(count+1>3)throw new Error('这项任务已改期 3 次，请拆分新任务或明确等待事项，不能继续修改截止日期。');
    if(count+1===3){
     if(data.rescheduleAction==='downgrade'){
      const from=PRIORITIES.indexOf(previous.data.externalPriority as any),to=PRIORITIES.indexOf(data.externalPriority as any);
      if(from<0||to<=from)throw new Error('第 3 次改期选择降优先级时，外部优先级必须实际降低。');
     }else if(data.rescheduleAction==='waiting'){
      if(data.status!=='waiting'||!data.waitingFor?.toString().trim())throw new Error('第 3 次改期选择等待时，必须设为 Waiting 并写明等待对象。');
     }else if(data.rescheduleAction!=='split')throw new Error('第 3 次改期必须同时降外部优先级、拆出子任务或明确等待事项。');
    }
   }
  }
  const next:Entry={id,kind:v.kind,date:v.date,data,source:previous?.source||v.source,sourceKey:previous?.sourceKey||v.sourceKey,createdAt:previous?.createdAt||now,updatedAt:now};
  prepared.push({next,previous});candidates.set(id,next);
 }
 const all=[...candidates.values()];
 const ref=(id:unknown,kind:Kind)=>{if(typeof id!=='string'||!id)return undefined;const r=candidates.get(id);if(!r||r.kind!==kind)throw new Error(`关联的${kind==='project'?'项目':kind==='note'?'笔记':'任务'}不存在或无权访问。`);return r;};
 for(const {next:e,previous} of prepared){
  if(e.data.projectId){const p=ref(e.data.projectId,'project')!;e.data.project=p.data.title;if(p.data.projectStatus==='closed'&&e.kind==='task'&&!['done','cancelled'].includes(String(e.data.status)))throw new Error('项目已经归档，请先重新打开项目再添加或重开任务。');}
  if(e.data.parentTaskId){const parent=ref(e.data.parentTaskId,'task')!;if(parent.id===e.id)throw new Error('任务不能成为自己的上级。');if(parent.data.projectId!==e.data.projectId)throw new Error('父子任务必须属于同一项目。');if(parent.data.status==='done'&&!['done','cancelled'].includes(String(e.data.status)))throw new Error('请先重新打开上级任务，再添加或重开未完成的子任务。');}
  if(e.data.parentProjectId){const p=ref(e.data.parentProjectId,'project')!;if(p.data.projectStatus==='closed'&&e.data.projectStatus!=='closed')throw new Error('上级项目已归档，请先重新打开上级项目。');}
  for(const id of e.data.relatedNoteIds as string[]||[])ref(id,'note');
  if(e.data.taskId)ref(e.data.taskId,'task');
  for(const parentField of ['parentTaskId','parentProjectId']){let id=e.id;const visited=new Set<string>();while(id){if(visited.has(id))throw new Error('项目或任务的上下级关系不能形成循环。');visited.add(id);id=String(candidates.get(id)?.data[parentField]||'');}}
  const children=all.filter(r=>r.kind==='task'&&r.data.parentTaskId===e.id);
  if(e.kind==='task'&&e.data.status==='done'&&children.some(r=>!['done','cancelled'].includes(String(r.data.status))))throw new Error('还有未完成的子任务，请先完成或取消子任务。');
  if(e.kind==='task'&&Number(e.data.rescheduleCount)===3&&previous?.data.dueDate!==e.data.dueDate&&e.data.rescheduleAction==='split'&&!children.some(r=>!['done','cancelled'].includes(String(r.data.status))))throw new Error('请先创建一个真实的子任务，再选择拆分完成第 3 次改期。');
  if(e.kind==='project'&&e.data.projectStatus==='closed'){
   const ids=descendantProjects(e.id,all);
   if(all.some(r=>r.kind==='task'&&ids.has(String(r.data.projectId))&&!['done','cancelled'].includes(String(r.data.status))))throw new Error('项目及子项目还有遗留任务，不能 Closed 归档。');
   if(all.some(r=>r.kind==='project'&&r.id!==e.id&&ids.has(r.id)&&r.data.projectStatus!=='closed'))throw new Error('请先归档子项目，再归档上级项目。');
  }
 }
 const statements:D1PreparedStatement[]=[];
 for(const {next:e,previous} of prepared){
  const fields=new Set([...Object.keys(previous?.data||{}),...Object.keys(e.data)]);
  const changes=[...fields].filter(k=>!['rescheduleReason','rescheduleAction','rescheduleCount','workSchemaVersion','workRevision','originalDueDate'].includes(k)&&JSON.stringify(previous?.data[k]??null)!==JSON.stringify(e.data[k]??null)).map(field=>({field,from:previous?.data[field]??null,to:e.data[field]??null}));
  if(previous&&previous.date!==e.date)changes.push({field:'date',from:previous.date,to:e.date});
  if(previous&&changes.length===0)continue;
  if(previous)statements.push(db().prepare('UPDATE records SET happened_on=?,data=?,updated_at=? WHERE id=? AND owner=?').bind(e.date,JSON.stringify(e.data),now,e.id,owner));else statements.push(insert(e,owner));
  if(e.kind==='task'||e.kind==='project'){
   const eventType=e.kind==='task'&&e.data.status==='done'&&previous?.data.status!=='done'?'completed':e.kind==='task'&&e.data.status==='cancelled'&&previous?.data.status!=='cancelled'?'cancelled':!previous?'created':'updated';
   const eventDate=eventType==='completed'?String(e.data.completedOn):today;
   const event:Entry={id:crypto.randomUUID(),kind:'work_event',date:eventDate,source:'context',sourceKey:crypto.randomUUID(),createdAt:now,updatedAt:now,data:{title:e.data.title,entityId:e.id,eventType,changesJson:JSON.stringify(changes),snapshotJson:JSON.stringify(e.data),projectId:e.kind==='project'?e.id:e.data.projectId}};
   statements.push(insert(event,owner));
  }
 }
 if(statements.length)await db().batch(statements);
 return {saved:parsed.length,records:compact?[]:await workspaceRecords(owner)};
}
export async function updateTask(owner:string,id:string,status:string,details:Partial<RecordData>={}){
 if(!['todo','doing','waiting','done','cancelled'].includes(status))throw new Error('任务状态无效。');
 const row=await db().prepare("SELECT * FROM records WHERE id=? AND owner=? AND kind='task'").bind(id,owner).first<Row>();if(!row)throw new Error('任务不存在。');
 const e=decode(row);const allowed:RecordData={...e.data};for(const key of ['waitingFor','nextAction','outcome','lesson'])if(details[key]!==undefined)allowed[key]=details[key];allowed.status=status;
 return upsertRecords(owner,[{id,kind:e.kind,date:e.date,data:allowed,source:e.source,sourceKey:e.sourceKey,expectedUpdatedAt:e.updatedAt}]);
}
