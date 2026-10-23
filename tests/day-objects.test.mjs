import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
await build({entryPoints:['lib/day-objects.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/day-objects.js',logLevel:'silent'});
const {dayObjects}=await import('../.sites-runtime/tests/day-objects.js');
const date='2026-10-22';
const entry=(id,kind,title,extra={})=>({id,kind,date,data:{title,...extra},source:'chat',sourceKey:id,createdAt:date,updatedAt:date});
test('Only actual selected-day records produce objects; notes and future plans do not',()=>{
 const records=[entry('1','meal','冰美式'),entry('2','exercise','卧推胸部训练'),entry('3','note','明天喝coffee、备餐汉堡'),entry('4','task','健身',{status:'todo'}),{...entry('5','meal','汉堡'),date:'2026-10-21'}];
 assert.deepEqual(dayObjects(records,date).map(x=>x.kind),['dumbbell','coffee']);
 assert.deepEqual(dayObjects(records,'2026-10-23'),[]);
});
test('Completion uses actual completion date, while duplicate records cannot inflate counts',()=>{
 const coffee=entry('1','meal','Coffee');const task={...entry('2','task','已完成',{status:'done',completedOn:date}),date:'2026-10-01'};
 const result=dayObjects([coffee,coffee,entry('3','meal','拿铁'),task],date);
 assert.equal(result.find(x=>x.kind==='coffee').records.length,2);
 assert.equal(result.find(x=>x.kind==='check').records[0].id,'2');
 task.data.status='doing';assert.equal(dayObjects([task],date).length,0);
});
test('Walking is a shoe, meals have a fallback, and groups have deterministic order',()=>{
 const records=[entry('1','exercise','示例山地徒步'),entry('2','meal','午餐'),entry('3','meal','抹茶牛奶')];
 assert.deepEqual(dayObjects(records,date).map(x=>x.kind),['bowl','matcha','shoe']);
 assert.deepEqual(dayObjects([...records].reverse(),date),dayObjects(records,date));
});
