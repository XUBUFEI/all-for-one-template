import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
await build({entryPoints:['app/workspace.tsx','app/work-system.tsx','app/locale.tsx','lib/i18n.ts','lib/health.ts','lib/work.ts','lib/content.ts','lib/model.ts','lib/travel.ts'],outdir:'.sites-runtime/i18n-tests',outbase:'.',bundle:true,platform:'node',format:'esm',jsx:'automatic',external:['react','react-dom','react/jsx-runtime','lucide-react'],splitting:true,logLevel:'silent'});
const W=await import('../.sites-runtime/i18n-tests/app/workspace.js');const S=await import('../.sites-runtime/i18n-tests/app/work-system.js');const {LocaleProvider}=await import('../.sites-runtime/i18n-tests/app/locale.js');const I=await import('../.sites-runtime/i18n-tests/lib/i18n.js');const H=await import('../.sites-runtime/i18n-tests/lib/health.js');const Work=await import('../.sites-runtime/i18n-tests/lib/work.js');
const row=(id,kind,data={})=>({id,kind,date:'2026-10-19',source:'manual',sourceKey:id,createdAt:'2026-10-19T09:00:00Z',updatedAt:'2026-10-19T09:00:00Z',data:{title:id,...data}});
const project=row('Example project','project',{projectStatus:'testing'});const task=row('Motor selection','task',{status:'doing',importance:'High',projectId:project.id,dueDate:'2026-10-21'});const records=[project,task,row('Lunch','meal',{protein:90,fat:75,estimated:true}),row('Targets','settings',{protein:120,fat:60}),row('Sample workout','exercise',{duration:35.4})];
const render=(Component,props={},locale='en')=>renderToStaticMarkup(React.createElement(LocaleProvider,{initialLocale:locale},React.createElement(Component,props)));
const visible=html=>html.replace(/<[^>]*>/g,' ');
const base={records,date:'2026-10-19',onEdit(){},onToggle(){},onReport(){},onSave(){},busy:false};
test('Locale selection preserves explicit URL choice, saved choice and Chinese default',()=>{
 assert.equal(I.preferredLocale('en','zh'),'en');assert.equal(I.preferredLocale('zh','en'),'zh');assert.equal(I.preferredLocale(null,'en'),'en');assert.equal(I.preferredLocale('fr','en'),'en');assert.equal(I.preferredLocale(null,null),'zh');assert.equal(I.translate('en','已保存 {0} 条记录',3),'Saved 3 records');
 assert.equal(I.translate('zh','已保存 {0} 条记录',3),'已保存 3 条记录');assert.equal(I.translate('en','任意用户原文'),'任意用户原文');
 assert.match(I.translate('en','[{"message":"日期无效"}]'),/Invalid date/);
});
test('English navigation, editors, health and record forms have translated UI and canonical stored options',()=>{
 const views=[['Workspace',W.default,{initialLocale:'en'}],['WorkBoard',S.default,base],['TaskCard',S.TaskCard,{...base,entry:task}],['TaskEditor',S.WorkEditor,{...base,kind:'task',entry:task}],['ProjectEditor',S.WorkEditor,{...base,kind:'project',entry:project}],['WorkReview',S.WorkReview,base],['HealthStatus',W.HealthStatusCard,base],['Import',W.ImportPanel,{...base,onExport(){}}],['Time',W.TimeBreakdown,{entries:[]}],['Weight',W.WeightHistory,{entries:[],onEdit(){}}],['Review',W.Review,base],...['meal','exercise','time','body','trip','worklog','settings','note'].map(kind=>[kind,W.RecordForm,{...base,kind}])];
 for(const [name,component,props] of views){const html=render(component,props);assert.doesNotMatch(visible(html).replace('中',''),/[\u3400-\u9fff]/,name);}
 const exercise=render(W.RecordForm,{...base,kind:'exercise'});assert.ok(exercise.includes('value="力量"'));assert.ok(exercise.includes('Strength training'));assert.ok(exercise.includes('value="有氧"'));
 const time=render(W.RecordForm,{...base,kind:'time'});assert.ok(time.includes('value="工作"'));assert.ok(time.includes('value="生活"'));
 const zh=render(S.default,base,'zh');assert.ok(visible(zh).includes('工作台'));assert.ok(!visible(zh).includes('New task'));
});
test('Language changes preserve original titles, notes, project names and numbers',()=>{
 const p=row('原始项目','project');const task=row('原始标题','task',{projectId:p.id,status:'doing',description:'用户原文笔记',dueDate:'2026-10-21',importance:'High'});const input=[p,task];const before=JSON.stringify(input);
 const card=render(S.TaskCard,{...base,entry:task,records:input});for(const text of ['原始标题','原始项目','用户原文笔记','In progress','2 days left'])assert.ok(card.includes(text),text);assert.equal(JSON.stringify(input),before);
 const zh=Work.deadlineLabel(task,'2026-10-19','zh'),en=Work.deadlineLabel(task,'2026-10-19','en');assert.equal(zh,'剩余 2 天');assert.equal(en,'2 days left');
 const report=Work.workReport(input,'2026-10-19','2026-10-25','en');assert.ok(report.includes('# Work review'));assert.ok(report.includes('原始标题'));assert.ok(report.includes('原始项目'));
});
test('English health status preserves facts and reference percentages, including over-target fat',()=>{
 const state=H.healthStatus(records,'2026-10-19','en');assert.match(state.diet,/75%/);assert.match(state.diet,/15g above/);assert.match(state.training,/35 minutes/);assert.match(state.confidence,/midpoint estimates/);
 const totals=[1440,90,100,75],targets=[2000,120,250,60];const stats=Object.fromEntries(['calories','protein','carbs','fat'].map((k,i)=>[k,{total:totals[i],target:targets[i],remaining:targets[i]-totals[i],complete:true,missing:0}]));const html=render(W.MacroBars,{stats,compact:true});for(const s of ['Calories','Protein','Carbs','Fat','72%','75%','40%','125%'])assert.ok(html.includes(s),s);assert.doesNotMatch(visible(html),/[\u3400-\u9fff]/);
});
test('Every literal translation key in the UI has an English catalog entry',()=>{
 const source=readFileSync(new URL('../lib/translations.ts',import.meta.url),'utf8');const dictionary=JSON.parse(source.slice(source.indexOf('{'),source.lastIndexOf('}')+1));
 for(const file of ['app/workspace.tsx','app/work-system.tsx','app/travel.tsx']){const sf=ts.createSourceFile(file,readFileSync(new URL('../'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(sf)==='tx'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&/[\u3400-\u9fff]/.test(n.arguments[0].text))assert.ok(dictionary[n.arguments[0].text],n.arguments[0].text);ts.forEachChild(n,visit)}visit(sf);}
});

const C=await import('../.sites-runtime/i18n-tests/lib/content.js');
const M=await import('../.sites-runtime/i18n-tests/lib/model.js');
const bilingual=(data,english)=>({...data,contentTranslations:JSON.stringify(Object.fromEntries(Object.entries(english).map(([k,en])=>[k,{source:String(data[k]??''),en}])))});
test('Task and travel cards, editors and project labels show translated content without changing originals',()=>{
 const p=row('机械臂适配','project',bilingual({title:'机械臂适配'},{title:'Robot Arm Adaptation'}));
 const t=row('task','task',bilingual({title:'转接件设计',description:'核对安装接口',nextAction:'确认空间',status:'waiting',waitingFor:'等数模',projectId:p.id,dueDate:'2026-10-21'},{title:'Adapter design',description:'Check mounting interfaces',nextAction:'Confirm clearance',waitingFor:'CAD models'}));
 const trip=row('trip','trip',bilingual({title:'示例山地',location:'示例地区',notes:'徒步三小时',status:'visited',startDate:'2026-10-16',endDate:'2026-10-18'},{title:'Example Mountains',location:'Example region',notes:'Three hours of hiking'}));
 const before=JSON.stringify([p,t,trip]);
 for(const [component,props,expected] of [[S.TaskCard,{...base,records:[p,t],entry:t},['Adapter design','Check mounting interfaces','Confirm clearance','CAD models','Robot Arm Adaptation','2 days left']],[W.TripCard,{entry:trip,onEdit(){}},['Example Mountains','Example region','Three hours of hiking','2026-10-18']],[S.WorkEditor,{...base,records:[p,t],kind:'task',entry:t},['Adapter design','Check mounting interfaces','Robot Arm Adaptation']],[W.RecordForm,{...base,kind:'trip',entry:trip},['Example Mountains','Example region','Three hours of hiking']]]){
  const html=render(component,props);for(const text of expected)assert.ok(html.includes(text),text);assert.doesNotMatch(visible(html),/[\u3400-\u9fff]/);
 }
 assert.ok(render(S.TaskCard,{...base,entry:t,records:[p,t]},'zh').includes('转接件设计'));
 assert.ok(render(W.TripCard,{entry:trip,onEdit(){}},'zh').includes('徒步三小时'));
 assert.equal(JSON.stringify([p,t,trip]),before);
 const report=Work.workReport([p,t],'2026-10-19','2026-10-25','en');assert.match(report,/Adapter design/);assert.match(report,/Robot Arm Adaptation/);
});
test('English edits preserve canonical text, statuses, dates and unsubmitted translations',()=>{
 const original=bilingual({title:'任务原文',description:'原描述',notes:'原备注',status:'todo',dueDate:'2026-10-21'},{title:'Original task',description:'Original description',notes:'Original notes'});
 const next=C.saveContentEdits(original,{...original,title:'Updated English title',description:'Updated description',status:'doing'},'en',['title','description','status']);
 assert.equal(next.title,original.title);assert.equal(next.description,original.description);assert.equal(next.notes,original.notes);assert.equal(next.status,'doing');assert.equal(next.dueDate,original.dueDate);
 assert.equal(C.contentText(next,'title','en'),'Updated English title');assert.equal(C.contentText(next,'notes','en'),'Original notes');
 const unchanged=C.saveContentEdits(original,{...original,title:'Original task'},'en',['title']);assert.deepEqual(unchanged,original);
 const waiting=C.saveContentEdits(original,{...original,waitingFor:'Supplier CAD models',status:'waiting'},'en',['waitingFor','status']);assert.equal(waiting.waitingFor,'Supplier CAD models');assert.equal(waiting.status,'waiting');
});
test('Changed originals invalidate stale translations; malformed translation metadata is rejected safely',()=>{
 const data=bilingual({title:'旧标题'},{title:'Old title'});assert.equal(C.contentText({...data,title:'新标题'},'title','en'),'新标题');assert.equal(C.contentText(data,'title','zh'),'旧标题');assert.equal(C.contentText({...data,contentTranslations:'bad'},'title','en'),'旧标题');
 assert.ok(M.dataSchema.safeParse(data).success);assert.ok(!M.dataSchema.safeParse({...data,contentTranslations:'bad'}).success);assert.ok(!M.dataSchema.safeParse({...data,contentTranslations:JSON.stringify({status:{source:'todo',en:'done'}})}).success);
});

test('The work board opens in four quadrants, retains unrated tasks separately and excludes completed work',()=>{
 const tasks=[row('Urgent important','task',{status:'todo',importance:'High',externalPriority:'P3',dueDate:'2026-10-20'}),row('Long term','task',{status:'doing',importance:'High',externalPriority:'P0',dueDate:'2026-11-19'}),row('Urgent support','task',{status:'waiting',importance:'Low',waitingFor:'Supplier',dueDate:'2026-10-21'}),row('Later','task',{status:'todo',importance:'Low'}),row('Needs rating','task',{status:'todo',dueDate:'2026-10-20'}),row('Finished','task',{status:'done',importance:'High',dueDate:'2026-10-20'})];
 const before=JSON.stringify(tasks);const html=render(S.default,{...base,records:tasks});
 assert.ok(html.includes(`aria-selected="true" class="selected">${I.translate('en','四象限')}</button>`));
 const sections=[...html.matchAll(/<section class="panel quadrant-section (q[1-4])"[\s\S]*?<\/section>/g)];assert.equal(sections.length,4);
 for(const [i,name]of ['Urgent important','Long term','Urgent support','Later'].entries()){assert.equal(sections[i][1],`q${i+1}`);assert.ok(sections[i][0].includes(name));assert.match(sections[i][0],/class="quadrant-task-list" tabindex="0" role="region"/);}
 assert.match(html,/<details class="panel unrated-tasks"><summary>/);assert.ok(html.includes('Needs rating'));assert.ok(!html.includes('Finished'));assert.equal((html.match(/class="work-task compact-task /g)||[]).length,5);
 assert.equal(JSON.stringify(tasks),before);
 const card=render(S.TaskCard,{...base,entry:tasks[2]});assert.match(card,/<details class="task-context-details"><summary/);assert.match(card,/Waiting/);assert.match(card,/2 days left/);
});

const T=await import('../.sites-runtime/i18n-tests/lib/travel.js');
const journalFixture={version:1,sourceNotes:'09:00 Train departure. Original logistics.',sourceStartDate:'2030-01-01',sourceEndDate:'2030-01-03',summary:{zh:'公园、花园和山路。',en:'Parks, gardens and mountain trails.'},days:[{date:'2030-01-01',title:{zh:'古村',en:'Village'},places:{zh:['示例公园'],en:['Sample Park']},caption:{zh:'到达后的行程。',en:'The arrival-day itinerary.'},basis:'itinerary'},{date:'2030-01-02',title:{zh:'登高',en:'Uphill'},places:{zh:['示例山顶'],en:['Sample Summit']},caption:{zh:'山景路线。',en:'A mountain route.'},basis:'itinerary'},{date:'2030-01-03',title:{zh:'花园',en:'Gardens'},places:{zh:['示例花园'],en:['Sample Garden']},caption:{zh:'花园路线。',en:'The garden route.'},basis:'itinerary'}],memories:[{zh:'示例旅行记忆。',en:'A sample travel memory.'}]};
const journalRecord=()=>row('Mountain trip','trip',{startDate:'2030-01-01',endDate:'2030-01-03',notes:journalFixture.sourceNotes,travelJournal:JSON.stringify(journalFixture),status:'visited'});
test('Curated travel shows three daily place routes; timetable remains only in collapsed source details',()=>{
 const entry=journalRecord();const before=JSON.stringify(entry);const html=render(W.TripCard,{entry,onEdit(){}});const main=html.slice(0,html.indexOf('<details class="journal-original"'));
 for(const text of ['Sample Park','Sample Summit','Sample Garden','A sample travel memory.','actual visits are still to be confirmed'])assert.ok(main.includes(text),text);
 assert.equal((main.match(/class="journal-day"/g)||[]).length,3);assert.ok(!main.includes('09:00'));assert.match(html,/<details class="journal-original"><summary>/);assert.ok(html.includes('09:00'));assert.doesNotMatch(visible(main),/[\u3400-\u9fff]/);assert.equal(JSON.stringify(entry),before);
 const zh=render(W.TripCard,{entry,onEdit(){}},'zh');assert.ok(zh.includes('示例公园'));assert.ok(zh.includes('示例旅行记忆。'));
 const editor=render(W.RecordForm,{...base,entry,kind:'trip'});assert.match(editor,/name="journal.summary"/);assert.match(editor,/name="journal.2.places"/);assert.ok(editor.includes('Sample Summit'));
});
test('Travel journals do not silently show stale curation or accept invalid day order and mismatched routes',()=>{
 const entry=journalRecord();assert.ok(T.readTravelJournal(entry.data));assert.equal(T.readTravelJournal({...entry.data,notes:'Changed source'}),null);assert.equal(T.readTravelJournal({...entry.data,endDate:'2030-01-04'}),null);assert.equal(T.readTravelJournal({...entry.data,travelJournal:'invalid'}),null);
 assert.ok(M.dataSchema.safeParse(entry.data).success);assert.ok(!M.dataSchema.safeParse({...entry.data,travelJournal:'invalid'}).success);
 assert.ok(!T.travelJournalSchema.safeParse({...journalFixture,days:[journalFixture.days[1],journalFixture.days[0]]}).success);
 assert.ok(!T.travelJournalSchema.safeParse({...journalFixture,days:[{...journalFixture.days[0],places:{zh:['一站'],en:['One','Two']}}]}).success);
});
test('Travel editing preserves original logistics and the other language; changed Chinese routes clear stale English routes',()=>{
 const entry=journalRecord();const formFor=locale=>{const f=new FormData();f.set('journal.summary',T.journalText(journalFixture.summary,locale));journalFixture.days.forEach((d,i)=>{f.set(`journal.${i}.title`,T.journalText(d.title,locale));f.set(`journal.${i}.places`,T.journalPlaces(d,locale).join('\n'));f.set(`journal.${i}.caption`,T.journalText(d.caption,locale));});journalFixture.memories.forEach((m,i)=>f.set(`journal.memory.${i}`,T.journalText(m,locale)));return f;};
 const en=formFor('en');en.set('journal.summary','A revised English overview.');const saved=T.editTravelJournal(entry.data,en,'en');const journal=T.readTravelJournal(saved);assert.equal(journal.summary.en,'A revised English overview.');assert.equal(journal.summary.zh,journalFixture.summary.zh);assert.equal(saved.notes,entry.data.notes);assert.equal(saved.startDate,entry.data.startDate);assert.equal(saved.status,'visited');
 const zh=formFor('zh');zh.set('journal.0.places','示例公园\n新增地点');const changed=T.readTravelJournal(T.editTravelJournal(entry.data,zh,'zh'));assert.equal(changed.days[0].places.en,undefined);assert.deepEqual(changed.days[0].places.zh,['示例公园','新增地点']);assert.deepEqual(changed.days[1],journalFixture.days[1]);
});
