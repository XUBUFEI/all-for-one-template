import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_big_bishop.sql',import.meta.url),'utf8'));
class Statement {
 constructor(sql,values=[]){this.sql=sql;this.values=values;}
 bind(...values){return new Statement(this.sql,values);}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.values)};}
 async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}
 run(){return sqlite.prepare(this.sql).run(...this.values);}
}
globalThis.__testDatabase={prepare:(sql)=>new Statement(sql),batch:async(statements)=>{if(!statements.length)throw Error('Empty D1 batch');sqlite.exec('BEGIN');try{const out=statements.map(s=>s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
await build({entryPoints:['lib/store.ts','lib/model.ts','lib/work.ts','lib/health.ts'],bundle:true,platform:'node',format:'esm',outdir:'.sites-runtime/tests',plugins:[{name:'test-cloudflare',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test-env'}));b.onLoad({filter:/.*/,namespace:'test-env'},()=>({contents:'export const env={DB:globalThis.__testDatabase};',loader:'js'}));}}],logLevel:'silent'});
const store=await import('../.sites-runtime/tests/store.js');
const model=await import('../.sites-runtime/tests/model.js');
const work=await import('../.sites-runtime/tests/work.js');
const health=await import('../.sites-runtime/tests/health.js');
let firstId;
test('Shanghai date handles UTC rollover; week boundaries are Monday–Sunday',()=>{
 assert.equal(model.todayShanghai(new Date('2026-10-18T17:00:00Z')),'2026-10-19');
 assert.deepEqual(model.weekRange('2026-10-19'),{start:'2026-10-19',end:'2026-10-25'});
 assert.equal(model.shiftDate('2026-03-01',-1),'2026-02-28');
});
test('Blank initialization stays empty and isolated',async()=>{
 await store.initialize('alice');await store.initialize('alice');await store.initialize('bob');
 assert.equal((await store.listRecords('alice')).length,0);assert.equal((await store.listRecords('bob')).length,0);
 await store.upsertRecords('alice',[{kind:'task',date:'2026-10-19',source:'manual',sourceKey:'fixture-task',data:{title:'Example task',status:'todo'}}]);
});

test('3x3 repeated source keys update one original record on the actual date',async()=>{
 const input={kind:'time',date:'2026-10-18',data:{title:'工程设计',duration:30,category:'工作',originalTag:'结构'},source:'3x3',sourceKey:'2026-10-18-09:00-结构'};
 await store.upsertRecords('alice',[input]);await store.upsertRecords('alice',[{...input,data:{...input.data,duration:45}}]);
 const entries=await store.listRecords('alice',{kind:'time'});
 assert.equal(entries.length,1);assert.equal(entries[0].data.duration,45);assert.equal(entries[0].date,'2026-10-18');firstId=entries[0].id;
});
test('Another user cannot overwrite a record by guessing its id',async()=>{
 await assert.rejects(store.upsertRecords('bob',[{id:firstId,kind:'time',date:'2026-10-18',data:{title:'Wrong user',duration:1},source:'manual',sourceKey:'guess'}]),/无权/);
 assert.equal((await store.listRecords('alice',{kind:'time'}))[0].data.duration,45);
});
test('Editing preserves original import source identity',async()=>{
 await store.upsertRecords('alice',[{id:firstId,kind:'time',date:'2026-10-18',data:{title:'结构设计',duration:40},source:'manual',sourceKey:'changed'}]);
 const entry=(await store.listRecords('alice',{kind:'time'}))[0];assert.equal(entry.source,'3x3');assert.equal(entry.sourceKey,'2026-10-18-09:00-结构');
});
test('Task completion date is tracked and reopening clears completion',async()=>{
 const task=(await store.listRecords('alice',{kind:'task'}))[0];
 await store.updateTask('alice',task.id,'done');let entry=(await store.listRecords('alice',{kind:'task'})).find(e=>e.id===task.id);
 assert.equal(entry.data.status,'done');assert.equal(entry.data.completedOn,model.todayShanghai());
 await store.updateTask('alice',task.id,'todo');entry=(await store.listRecords('alice',{kind:'task'})).find(e=>e.id===task.id);assert.equal(entry.data.completedOn,undefined);
});
test('Missing nutrition is null; partial meals never give misleading remaining budgets',()=>{
 const base={id:'x',source:'manual',sourceKey:'x',createdAt:'',updatedAt:'',date:'2026-10-19'};
 const entries=[{...base,kind:'meal',data:{title:'蛋白',calories:34,protein:7}},{...base,id:'y',kind:'meal',data:{title:'午餐'}},{...base,id:'s',kind:'settings',data:{title:'目标',calories:2000,protein:120}}];
 const partial=model.summarize(entries,'2026-10-19');assert.equal(partial.nutrients.calories.total,34);assert.equal(partial.nutrients.calories.remaining,null);assert.equal(partial.nutrients.calories.missing,1);assert.equal(partial.nutrients.carbs.total,null);
 entries[1].data.calories=500;entries[1].data.protein=30;
 const complete=model.summarize(entries,'2026-10-19');assert.equal(complete.nutrients.calories.remaining,1466);assert.equal(complete.nutrients.protein.remaining,83);
});
test('Invalid dates, negative hours, oversized batches and incomplete time entries are rejected before writing',async()=>{
 const input={kind:'time',date:'2026-10-19',data:{title:'test',duration:10},source:'manual',sourceKey:'invalid'};
 await assert.rejects(store.upsertRecords('alice',[{...input,date:'2026-02-30'}]));
 await assert.rejects(store.upsertRecords('alice',[{...input,data:{title:'test',duration:-1}}]));
 await assert.rejects(store.upsertRecords('alice',[{...input,data:{title:'test'}}]));
 await assert.rejects(store.upsertRecords('alice',Array.from({length:101},()=>input)));
 assert.equal((await store.listRecords('alice',{kind:'time'})).length,1);
});

async function createWork(kind,data,key=crypto.randomUUID()) {
 await store.upsertRecords('alice',[{kind,date:'2026-10-19',data,source:'manual',sourceKey:key}]);
 return (await store.listRecords('alice',{kind})).find(e=>e.sourceKey===key);
}
async function editWork(e,patch,extra={}) {
 await store.upsertRecords('alice',[{id:e.id,kind:e.kind,date:e.date,data:{...e.data,...patch},source:e.source,sourceKey:e.sourceKey,...extra}]);
 return (await store.listRecords('alice',{kind:e.kind})).find(r=>r.id===e.id);
}

test('Quadrants use independent importance and inclusive 7 calendar days, not P level',()=>{
 const e=(data,id='x')=>({id,kind:'task',date:'2026-10-19',data:{title:id,status:'todo',...data},createdAt:'',updatedAt:'',source:'manual',sourceKey:id});
 assert.equal(work.quadrant(e({importance:'High',dueDate:'2026-10-26',externalPriority:'P3'}),'2026-10-19'),'Q1');
 assert.equal(work.quadrant(e({importance:'High',dueDate:'2026-10-27',externalPriority:'P0'}),'2026-10-19'),'Q2');
 assert.equal(work.quadrant(e({importance:'Low',dueDate:'2026-10-18',externalPriority:'P0'}),'2026-10-19'),'Q3');
 assert.equal(work.quadrant(e({importance:'Low',dueDate:'2026-11-18'}),'2026-10-19'),'Q4');
 assert.equal(work.quadrant(e({importance:'Critical'}),'2026-10-19'),'Q2');
 assert.equal(work.quadrant(e({priority:'high',dueDate:'2026-10-19'}),'2026-10-19'),'U');
 const q2=e({importance:'High',dueDate:'2026-11-01',externalPriority:'P3'},'Q2');const q3=e({importance:'Low',dueDate:'2026-10-19',externalPriority:'P0'},'Q3');
 assert.deepEqual(work.sortTasks([q3,q2],'2026-10-19').map(e=>e.id),['Q2','Q3']);
 assert.equal(work.deadlineLabel(e({dueDate:'2026-10-21'}),'2026-10-19'),'剩余 2 天');assert.equal(work.deadlineLabel(e({dueDate:'2026-10-19'}),'2026-10-19'),'今天到期');assert.equal(work.deadlineLabel(e({dueDate:'2026-10-18'}),'2026-10-19'),'逾期 1 天');
});
test('Waiting requires a real waiting-for value; cancelled work is excluded from active totals',async()=>{
 await assert.rejects(createWork('task',{title:'等待未明确',status:'waiting'}),/Waiting/);
 const t=await createWork('task',{title:'等待供应商',status:'todo',importance:'Low',externalPriority:'P0'});
 await assert.rejects(store.updateTask('alice',t.id,'waiting'),/Waiting/);
 await store.updateTask('alice',t.id,'waiting',{waitingFor:'供应商尺寸图',nextAction:'周三跟进'});
 let r=(await store.listRecords('alice',{kind:'task'})).find(e=>e.id===t.id);assert.equal(r.data.waitingFor,'供应商尺寸图');
 await store.updateTask('alice',t.id,'cancelled');r=(await store.listRecords('alice',{kind:'task'})).find(e=>e.id===t.id);assert.equal(work.isActiveTask(r),false);
});
test('Source-key upsert is idempotent and cannot silently duplicate change events',async()=>{
 const raw={kind:'task',date:'2026-10-19',data:{title:'幂等导入',status:'todo',importance:'High'},source:'chat',sourceKey:'stable-task'};
 await store.upsertRecords('alice',[raw]);const first=(await store.listRecords('alice',{kind:'task'})).find(e=>e.sourceKey==='stable-task');
 let events=work.workEvents(await store.listRecords('alice'),first.id);assert.equal(events.length,1);
 await store.upsertRecords('alice',[raw]);events=work.workEvents(await store.listRecords('alice'),first.id);assert.equal(events.length,1);
});
test('Deadline changes require reasons; third change requires an actual mitigation; fourth is blocked',async()=>{
 let t=await createWork('task',{title:'改期验证',status:'todo',dueDate:'2026-10-20',externalPriority:'P1',importance:'High'});
 await assert.rejects(editWork(t,{dueDate:'2026-10-21'}),/原因/);
 t=await editWork(t,{dueDate:'2026-10-21',rescheduleReason:'首次调整'});assert.equal(t.data.rescheduleCount,1);
 t=await editWork(t,{dueDate:'2026-10-22',rescheduleReason:'再次调整'});assert.equal(t.data.rescheduleCount,2);
 await assert.rejects(editWork(t,{dueDate:'2026-10-23',rescheduleReason:'三次调整'}),/第 3 次/);
 await assert.rejects(editWork(t,{dueDate:'2026-10-23',rescheduleReason:'三次调整',rescheduleAction:'downgrade'}),/实际降低/);
 t=await editWork(t,{dueDate:'2026-10-23',rescheduleReason:'范围调整，降低优先级',rescheduleAction:'downgrade',externalPriority:'P2'});assert.equal(t.data.rescheduleCount,3);
 await assert.rejects(editWork(t,{dueDate:'2026-10-24',rescheduleReason:'继续延期'}),/3 次/);
 const events=work.workEvents(await store.listRecords('alice'),t.id);assert.equal(events.filter(e=>e.changes.some(c=>c.field==='dueDate'&&c.from)).length,3);
});
test('Project and task relations reject cross-user IDs, cycles and premature closure',async()=>{
 const parent=await createWork('project',{title:'父项目',projectStatus:'design'});const child=await createWork('project',{title:'子项目',parentProjectId:parent.id,projectStatus:'design'});
 await assert.rejects(editWork(parent,{parentProjectId:child.id}),/循环/);
 await store.upsertRecords('bob',[{kind:'project',date:'2026-10-19',source:'manual',sourceKey:'foreign-project',data:{title:'Foreign project'}}]);const foreign=(await store.listRecords('bob',{kind:'project'}))[0];await assert.rejects(createWork('task',{title:'跨用户关联',projectId:foreign.id}),/无权/);
 const t=await createWork('task',{title:'遗留任务',status:'todo',projectId:child.id});
 await assert.rejects(editWork(parent,{projectStatus:'closed'}),/遗留/);
 const done=await editWork(parent,{projectStatus:'done'});assert.equal(done.data.projectStatus,'done');
 await store.updateTask('alice',t.id,'done');await assert.rejects(editWork(done,{projectStatus:'closed'}),/子项目/);
 await editWork(child,{projectStatus:'closed'});await editWork(done,{projectStatus:'closed'});
 await assert.rejects(createWork('task',{title:'归档后新任务',status:'todo',projectId:child.id}),/已.*归档/);
});
test('Parent task cannot complete while a child is unfinished; completed parent must reopen first',async()=>{
 const project=await createWork('project',{title:'装配验证'});let p=await createWork('task',{title:'装配体',status:'todo',projectId:project.id});
 const c=await createWork('task',{title:'零件',status:'todo',projectId:project.id,parentTaskId:p.id});
 await assert.rejects(store.updateTask('alice',p.id,'done'),/子任务/);
 await assert.rejects(editWork(p,{parentTaskId:c.id}),/循环/);
 await store.updateTask('alice',c.id,'done');await store.updateTask('alice',p.id,'done');
 await assert.rejects(store.updateTask('alice',c.id,'todo'),/重新打开上级/);
});
test('Completion snapshots survive reopening and later results/actual-date corrections feed the proper review',async()=>{
 let t=await createWork('task',{title:'设计评审',status:'todo',acceptance:'评审通过',importance:'High'});
 t=await editWork(t,{status:'done',completedOn:'2026-10-18'});
 t=await editWork(t,{outcome:'评审通过，完成出图',lesson:'先明确接口再设计',completedOn:'2026-10-19'});
 let entries=await store.listRecords('alice');let review=work.reviewData(entries,'2026-10-19','2026-10-19');
 assert.equal(review.completed.find(e=>e.entityId===t.id).snapshot.outcome,'评审通过，完成出图');assert.equal(work.reviewData(entries,'2026-10-18','2026-10-18').completed.some(e=>e.entityId===t.id),false);
 await store.updateTask('alice',t.id,'todo');entries=await store.listRecords('alice');review=work.reviewData(entries,'2026-10-19','2026-10-19');
 assert.equal(review.completed.find(e=>e.entityId===t.id).snapshot.lesson,'先明确接口再设计');assert.match(work.workReport(entries,'2026-10-19','2026-10-19'),/评审通过，完成出图/);
});
test('Audit records are immutable through public write tools and stale edits are rejected',async()=>{
 await assert.rejects(createWork('work_event',{title:'伪造历史'}),/自动保存/);
 const t=await createWork('task',{title:'版本冲突',status:'todo'});await editWork(t,{title:'最新标题'});
 await assert.rejects(editWork(t,{title:'过期覆盖'},{expectedUpdatedAt:'2000-01-01T00:00:00Z'}),/刷新/);
});

test('Task classification labels come only from project relations and follow project changes',()=>{
 const base={date:'2026-10-19',createdAt:'',updatedAt:'',source:'manual',sourceKey:''};
 const root={...base,id:'root',kind:'project',data:{title:'Example workspace'}};
 const core={...base,id:'sample-project',kind:'project',data:{title:'Example project',parentProjectId:'root'}};
 const arm={...base,id:'module',kind:'project',data:{title:'Example module · 示例模块',parentProjectId:'sample-project'}};
 const task={...base,id:'t',kind:'task',data:{title:'电机选型',projectId:'module',tags:['电机','选型']}};
 assert.equal(work.taskProjectLabel(task,[root,core,arm]),'Example project / 示例模块');
 assert.equal(work.taskProjectLabel({...task,data:{...task.data,title:'完全不同的标题'}},[root,core,arm]),'Example project / 示例模块');
 assert.equal(work.taskProjectLabel(task,[root,core,{...arm,data:{...arm.data,title:'Example module · 扩展示例'}}]),'Example project / 扩展示例');
});
test('Initialization preserves user metadata while upgrading old records',async()=>{
 const t=await createWork('task',{title:'Legacy example',status:'todo',tags:['User category']});
 sqlite.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify({...t.data,workSchemaVersion:2}),t.id);await store.initialize('alice');
 const current=(await store.listRecords('alice',{kind:'task'})).find(e=>e.id===t.id);assert.deepEqual(current.data.tags,['User category']);assert.equal(current.data.workSchemaVersion,3);
});

test('Large history remains idempotent outside the latest 10,000 records and never hides work',async()=>{
 const owner='history';await store.initialize(owner);await store.upsertRecords(owner,[{kind:'task',date:'2026-10-19',source:'manual',sourceKey:'history-task',data:{title:'Old task',status:'todo'}}]);
 const insert=sqlite.prepare('INSERT INTO records (id,owner,kind,happened_on,data,source,source_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
 sqlite.exec('BEGIN');
 for(let i=0;i<10020;i++)insert.run(`history-${i}`,owner,'time','2026-10-19',JSON.stringify({title:'History',duration:1}),'3x3',`history-${i}`,'2026-10-19T00:00:00Z','2026-10-19T00:00:00Z');
 insert.run('old-history',owner,'time','2023-07-10',JSON.stringify({title:'Old',duration:1}),'3x3','old-history','2023-07-10T00:00:00Z','2023-07-10T00:00:00Z');sqlite.exec('COMMIT');
 await store.upsertRecords(owner,[{kind:'time',date:'2023-07-10',source:'3x3',sourceKey:'old-history',data:{title:'Old corrected',duration:2}}],true);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM records WHERE owner=? AND source_key=?').get(owner,'old-history').n,1);
 const old=await store.workspaceRecords(owner,'2023-07-10');assert.equal(old.filter(e=>e.kind==='time').length,1);assert.equal(old.find(e=>e.kind==='time').data.duration,2);assert.equal(old.filter(e=>e.kind==='task').length,1);
 assert.equal((await store.exportRecords(owner)).length,10023);
 await assert.rejects(store.workspaceRecords(owner,'2026-02-30'),/日期无效/);
 const input={kind:'time',date:'2026-10-19',source:'3x3',sourceKey:'duplicate',data:{title:'One',duration:1}};
 await assert.rejects(store.upsertRecords(owner,[input,input],true),/同一来源键/);
});
test('Time totals union simultaneous intervals and clip cross-midnight records by Shanghai day',()=>{
 const row=(id,date,start,end,duration)=>({id,kind:'time',date,data:{title:id,duration,originalStartedAt:start,originalEndedAt:end}});
 const rows=[row('ride','2026-10-19','2026-10-19T09:00:00+08:00','2026-10-19T10:00:00+08:00',60),row('reading','2026-10-19','2026-10-19T09:30:00+08:00','2026-10-19T10:30:00+08:00',60)];
 assert.deepEqual(model.timeTotals(rows),{timeMinutes:90,activityMinutes:120,timeOverlapMinutes:30,unpositionedMinutes:0});
 const sleep=row('sleep','2026-10-19','2026-10-18T23:00:00+08:00','2026-10-19T07:00:00+08:00',420);
 assert.equal(model.timeTotals([sleep]).timeMinutes,420);
 assert.equal(model.timeTotals([{...sleep,data:{title:'Manual',duration:30}}]).unpositionedMinutes,30);
});

test('One-time historical import stays closed after completion',async()=>{
 await build({entryPoints:['app/api/import-3x3/route.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/import3x3-route.js',logLevel:'silent'});
 const route=await import('../.sites-runtime/tests/import3x3-route.js');
 assert.equal((await route.GET()).status,410);assert.equal((await route.POST()).status,410);
});

test('Nutrient percentages keep over-target values and handle missing or zero goals',()=>{
 assert.equal(health.nutrientProgress(1440,2000),72);assert.equal(health.nutrientProgress(75,60),125);
 assert.equal(health.nutrientProgress(0,100),0);assert.equal(health.nutrientProgress(null,100),null);assert.equal(health.nutrientProgress(10,0),null);assert.equal(health.nutrientProgress(10,null),null);
});
test('Health status uses the selected day and prior seven days without inventing activity or weight loss',()=>{
 const entry=(id,kind,date,data)=>({id,kind,date,data:{title:id,...data},source:'chat',sourceKey:id,createdAt:'',updatedAt:''});
 const rows=[entry('reference','settings','2026-10-15',{protein:120,fat:60}),entry('meal','meal','2026-10-19',{protein:90,fat:75,estimated:true}),entry('示例力量训练','exercise','2026-10-19',{duration:35.4}),entry('hike','exercise','2026-10-18',{duration:120}),entry('future','exercise','2026-10-20',{duration:300}),entry('old','exercise','2026-10-12',{duration:300})];
 const state=health.healthStatus(rows,'2026-10-19');assert.match(state.diet,/75%/);assert.match(state.diet,/约15g/);assert.match(state.training,/示例力量训练/);assert.match(state.training,/35 分钟/);assert.equal(state.activeDays,2);assert.match(state.confidence,/中值估算/);assert.match(state.suggestion,/酱汁分开/);
 const empty=health.healthStatus(rows,'2026-10-16');assert.match(empty.diet,/还没有饮食记录/);assert.match(empty.training,/没有运动记录/);assert.doesNotMatch(empty.heading,/训练已/);
 const partial=health.healthStatus([...rows,entry('unknown','meal','2026-10-19',{})],'2026-10-19');assert.match(partial.diet,/至少达到/);assert.match(partial.diet,/尚缺/);assert.doesNotMatch(partial.diet,/比参考目标多/);
});
