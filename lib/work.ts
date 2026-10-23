import {contentText,localizedContent} from './content';
import {translate,type Locale} from './i18n';
import type { Entry, RecordData } from './model';
import { shiftDate, todayShanghai, weekRange } from './model';
export const TASK_TYPES=['Task','Issue','Risk','Lesson','Meeting'] as const;
export const PRIORITIES=['P0','P1','P2','P3'] as const;
export const IMPORTANCE=['Critical','High','Medium','Low'] as const;
export const STAGES=['Requirements','Design','Review','Prototype','Testing','Production Support','ECN/ECR','Supplier','Coordination','Knowledge'] as const;
export const STAGE_LABEL:Record<string,string>={Requirements:'需求',Design:'设计',Review:'评审',Prototype:'样机',Testing:'测试','Production Support':'生产支持','ECN/ECR':'变更',Supplier:'供应商',Coordination:'协同',Knowledge:'知识沉淀'};
export const TYPE_LABEL:Record<string,string>={Task:'任务',Issue:'问题',Risk:'风险',Lesson:'经验',Meeting:'会议'};
export const IMPORTANCE_LABEL:Record<string,string>={Critical:'关键',High:'高',Medium:'中',Low:'低'};
export const TASK_STATUS:Record<string,string>={todo:'待开始',doing:'进行中',waiting:'等待中',done:'已完成',cancelled:'已取消'};
export const PROJECT_STATUS:Record<string,string>={planning:'规划',design:'设计',testing:'测试',waiting:'等待',production:'生产支持',done:'技术完成',closed:'已归档'};
export type Quadrant='Q1'|'Q2'|'Q3'|'Q4'|'U';
export const QUADRANTS:Record<Quadrant,{title:string;hint:string}>={Q1:{title:'紧急且重要',hint:'近期优先推进'},Q2:{title:'重要不紧急',hint:'主动安排一段时间'},Q3:{title:'紧急不重要',hint:'集中处理或协同'},Q4:{title:'不紧急不重要',hint:'留待空档或重新取舍'},U:{title:'待定级',hint:'先补充重要性判断'}};
export function isActiveTask(e:Entry){return e.kind==='task'&&!['done','cancelled'].includes(String(e.data.status));}
export function daysLeft(due:unknown,today=todayShanghai()):number|null {if(typeof due!=='string'||!due)return null;const ms=Date.parse(due+'T00:00:00Z')-Date.parse(today+'T00:00:00Z');return Number.isFinite(ms)?Math.round(ms/86400000):null;}
export function deadlineLabel(e:Pick<Entry,'data'>,today=todayShanghai(),locale:Locale='zh') {const n=daysLeft(e.data.dueDate,today);if(locale==='en'){if(e.data.status==='done')return e.data.completedOn?`Completed ${e.data.completedOn}`:'Done';if(e.data.status==='cancelled')return 'Cancelled';return n===null?'No due date':n<0?`Overdue by ${-n} days`:n===0?'Due today':n===1?'Due tomorrow':`${n} days left`;}if(e.data.status==='done')return e.data.completedOn?`${e.data.completedOn} 完成`:'已完成';if(e.data.status==='cancelled')return '已取消';return n===null?'未设截止日期':n<0?`逾期 ${-n} 天`:n===0?'今天到期':n===1?'明天到期':`剩余 ${n} 天`;}
export function quadrant(e:Entry,today=todayShanghai()):Quadrant {if(!IMPORTANCE.includes(e.data.importance as any))return 'U';const important=['Critical','High'].includes(String(e.data.importance));const days=daysLeft(e.data.dueDate,today);const urgent=days!==null&&days<=7;return important?(urgent?'Q1':'Q2'):(urgent?'Q3':'Q4');}
export function sortTasks(tasks:Entry[],today=todayShanghai()){const order={Q1:0,Q2:1,Q3:2,Q4:3,U:4};return [...tasks].sort((a,b)=>order[quadrant(a,today)]-order[quadrant(b,today)]||String(a.data.dueDate||'9999').localeCompare(String(b.data.dueDate||'9999'))||(PRIORITIES.indexOf(a.data.externalPriority as any)<0?9:PRIORITIES.indexOf(a.data.externalPriority as any))-(PRIORITIES.indexOf(b.data.externalPriority as any)<0?9:PRIORITIES.indexOf(b.data.externalPriority as any))||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));}
export function projectPath(entry:Entry|undefined,records:Entry[],locale:Locale='zh'){if(!entry)return '';const names:string[]=[];let p:Entry|undefined=entry;const visited=new Set<string>();while(p&&!visited.has(p.id)){visited.add(p.id);names.unshift(contentText(p.data,'title',locale));p=records.find(e=>e.id===p?.data.parentProjectId&&e.kind==='project');}return names.join(' / ');}
export function descendantProjects(id:string,records:Entry[]){const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const r of records.filter(e=>e.kind==='project'))if(ids.has(String(r.data.parentProjectId))&&!ids.has(r.id)){ids.add(r.id);changed=true;}}return ids;}
export function projectTasks(project:Entry,records:Entry[]){const ids=descendantProjects(project.id,records);return records.filter(e=>e.kind==='task'&&(ids.has(String(e.data.projectId))||(!e.data.projectId&&e.data.project===project.data.title)));}
export function workHealth(records:Entry[],today=todayShanghai()){const active=records.filter(isActiveTask);return {q1:active.filter(e=>quadrant(e,today)==='Q1').length,q2:active.filter(e=>quadrant(e,today)==='Q2').length,waiting:active.filter(e=>e.data.status==='waiting').length,overdue:active.filter(e=>(daysLeft(e.data.dueDate,today)??0)<0).length,unrated:active.filter(e=>quadrant(e,today)==='U').length};}
export type WorkEvent={id:string;entityId:string;date:string;timestamp:string;eventType:string;title:string;changes:{field:string;from:unknown;to:unknown}[];snapshot:RecordData};
export function workEvents(records:Entry[],entityId?:string):WorkEvent[]{return records.filter(e=>e.kind==='work_event'&&(!entityId||e.data.entityId===entityId)).flatMap(e=>{try{return [{id:e.id,entityId:String(e.data.entityId),date:e.date,timestamp:e.createdAt,eventType:String(e.data.eventType),title:e.data.title,changes:JSON.parse(String(e.data.changesJson||'[]')),snapshot:JSON.parse(String(e.data.snapshotJson||'{}'))}]}catch{return []}}).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||Number(b.snapshot.workRevision||0)-Number(a.snapshot.workRevision||0)||b.id.localeCompare(a.id));}
export function reviewData(records:Entry[],from:string,to:string){
 const allEvents=workEvents(records);
 const completions:WorkEvent[]=allEvents.filter(e=>e.eventType==='completed').map(e=>{
  let latest=e.snapshot;
  const followups=allEvents.filter(x=>x.entityId===e.entityId&&Number(x.snapshot.workRevision)>Number(e.snapshot.workRevision||0)).sort((a,b)=>Number(a.snapshot.workRevision)-Number(b.snapshot.workRevision));
  for(const x of followups){if(x.snapshot.status!=='done'||x.eventType==='completed')break;latest=x.snapshot;}
  return {...e,date:String(latest.completedOn||e.date),snapshot:{...e.snapshot,completedOn:latest.completedOn,outcome:latest.outcome,lesson:latest.lesson,acceptance:latest.acceptance}};
 }).filter(e=>e.date>=from&&e.date<=to);
 const events=allEvents.filter(e=>e.date>=from&&e.date<=to);const known=new Set(completions.map(e=>e.entityId));
 const legacy=records.filter(e=>e.kind==='task'&&e.data.status==='done'&&e.data.completedOn&&String(e.data.completedOn)>=from&&String(e.data.completedOn)<=to&&!known.has(e.id)&&!allEvents.some(x=>x.entityId===e.id&&x.eventType==='completed'));
 const logs=records.filter(e=>e.kind==='worklog'&&e.date>=from&&e.date<=to);
 const lessons=records.filter(e=>(e.kind==='task'&&e.data.taskType==='Lesson'||e.kind==='note')&&e.date>=from&&e.date<=to);
 return {events,completed:completions,legacy,logs,lessons,reschedules:events.filter(e=>e.changes.some(c=>c.field==='dueDate')),waiting:records.filter(e=>isActiveTask(e)&&e.data.status==='waiting'),active:sortTasks(records.filter(isActiveTask),to),projects:records.filter(e=>e.kind==='project')};
}
export function workReport(records:Entry[],from:string,to:string,locale:Locale='zh'){if(locale==='en')return englishWorkReport(records,from,to);const r=reviewData(records,from,to);let out=`# 工作回顾 · ${from} — ${to}\n\n`;
 out+='## 项目与里程碑\n';const ps=r.projects.filter(p=>projectTasks(p,records).length>0||['design','testing','production','waiting'].includes(String(p.data.projectStatus)));out+=ps.length?ps.map(p=>`- ${projectPath(p,records)}\n  - 目标：${p.data.goal||'待填写'}\n  - 下一里程碑：${p.data.milestone||'待明确'}；目标日期：${p.data.targetDate||'未设置'}；健康度：${p.data.health||'待评估'}\n  - 风险：${p.data.riskNotes||'未记录'}`).join('\n'):'暂无项目记录。';
 const completions=[...r.completed.map(e=>({data:e.snapshot,date:e.date})),...r.legacy];out+='\n\n## 完成与结果\n';out+=completions.length?completions.map(e=>`- ${e.data.title}（${e.date}）\n  - 结果：${e.data.outcome||'结果待补充'}\n  - 验收依据：${e.data.acceptance||'未记录'}\n  - 经验：${e.data.lesson||'未提炼'}`).join('\n'):'本期暂无完成记录。';
 out+='\n\n## 工作进展\n'+(r.logs.map(e=>`- ${e.data.project||'未关联项目'} · ${e.data.title}：${e.data.notes||'暂无补充'}${e.data.hours!=null?`（实际 ${e.data.hours}h）`:''}`).join('\n')||'本期暂无进展日志。');
 out+='\n\n## 等待与改期\n'+(r.waiting.map(e=>`- ${e.data.title}：等待 ${e.data.waitingFor||'待补充'}；下一步 ${e.data.nextAction||'待明确'}`).join('\n')||'暂无等待事项。');out+=r.reschedules.map(e=>`\n- ${e.title} · ${e.date}：${e.changes.filter(c=>c.field==='dueDate').map(c=>`${c.from||'未设置'} → ${c.to||'未设置'}`).join('；')}；原因 ${e.snapshot.rescheduleReason||'未记录'}`).join('');
 out+='\n\n## 下一步与重要事项\n'+r.active.map(e=>`- ${quadrant(e,to)} · ${e.data.title} · ${deadlineLabel(e,to)}\n  - 外部优先级 ${e.data.externalPriority||'待定'} / 重要性 ${e.data.importance||'待定'}；下一步 ${e.data.nextAction||'待明确'}`).join('\n');
 out+='\n\n## 工程经验\n'+(r.lessons.map(e=>`- ${e.data.title}：${e.data.lesson||e.data.notes||'待提炼'}`).join('\n')||'本期尚未沉淀独立经验。');return out+'\n\n历史变更从系统升级后开始留存，未倒推或补造旧记录。';
}

// Task labels have one source of truth: the linked project, never title keywords.
export function taskProjectLabel(task:Entry,records:Entry[],locale:Locale='zh'){
 const project=records.find(e=>e.kind==='project'&&e.id===task.data.projectId);
 if(!project)return task.data.project?String(task.data.project):translate(locale,'未关联项目');
 const path:Entry[]=[];const visited=new Set<string>();let current:Entry|undefined=project;
 while(current&&!visited.has(current.id)){visited.add(current.id);path.unshift(current);current=records.find(e=>e.kind==='project'&&e.id===current?.data.parentProjectId);}
 const short=(title:string)=>title.includes('·')?title.split('·').slice(1).join('·').trim():title.split(' / ')[0].trim();
 const core=path.length>2?path[1]:undefined;
 return core&&core.id!==project.id?`${short(contentText(core.data,'title',locale))} / ${short(contentText(project.data,'title',locale))}`:short(contentText(project.data,'title',locale));
}

function englishWorkReport(records:Entry[],from:string,to:string){
 records=records.map(e=>({...e,data:localizedContent(e.data,'en')}));
 const r=reviewData(records,from,to);const completions=[...r.completed.map(e=>({data:e.snapshot,date:e.date})),...r.legacy];const sections:string[]=[`# Work review · ${from} — ${to}`];
 const ps=r.projects.filter(p=>projectTasks(p,records).length>0||['design','testing','production','waiting'].includes(String(p.data.projectStatus)));
 sections.push('## Projects & milestones\n'+(ps.map(p=>`- ${projectPath(p,records)}\n  - Goal: ${p.data.goal||'To be defined'}\n  - Next milestone: ${p.data.milestone||'To be defined'}; target date: ${p.data.targetDate||'Not set'}; health: ${p.data.health||'Not assessed'}\n  - Risks: ${p.data.riskNotes||'Not recorded'}`).join('\n')||'No project records.'));
 sections.push('## Completed work & outcomes\n'+(completions.map(e=>`- ${e.data.title} (${e.date})\n  - Outcome: ${e.data.outcome||'To be added'}\n  - Acceptance: ${e.data.acceptance||'Not recorded'}\n  - Lesson: ${e.data.lesson||'To be extracted'}`).join('\n')||'No completed work in this period.'));
 sections.push('## Work progress\n'+(r.logs.map(e=>`- ${e.data.project||'Unassigned project'} · ${e.data.title}: ${e.data.notes||'No additional details'}${e.data.hours!=null?` (actual ${e.data.hours}h)`:''}`).join('\n')||'No progress logs in this period.'));
 sections.push('## Waiting & reschedules\n'+(r.waiting.map(e=>`- ${e.data.title}: waiting for ${e.data.waitingFor||'To be defined'}; next: ${e.data.nextAction||'To be defined'}`).join('\n')||'Nothing currently waiting.')+r.reschedules.map(e=>`\n- ${e.title} · ${e.date}: ${e.changes.filter(c=>c.field==='dueDate').map(c=>`${c.from||'Not set'} → ${c.to||'Not set'}`).join('; ')}; reason: ${e.snapshot.rescheduleReason||'Not recorded'}`).join(''));
 sections.push('## Next steps & important work\n'+r.active.map(e=>`- ${quadrant(e,to)} · ${e.data.title} · ${deadlineLabel(e,to,'en')}\n  - External priority: ${e.data.externalPriority||'Unrated'} / importance: ${e.data.importance||'Unrated'}; next: ${e.data.nextAction||'To be defined'}`).join('\n'));
 sections.push('## Engineering lessons\n'+(r.lessons.map(e=>`- ${e.data.title}: ${e.data.lesson||e.data.notes||'To be extracted'}`).join('\n')||'No standalone lessons yet in this period.'));
 sections.push('History starts with the system upgrade. Earlier changes are not reconstructed.');return sections.join('\n\n');
}
