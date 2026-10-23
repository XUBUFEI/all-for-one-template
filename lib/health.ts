import {translate,type Locale} from './i18n';
import {type Entry,shiftDate,summarize} from './model';
// Percentages describe the configured reference, not a score or a medical goal.
export function nutrientProgress(total:unknown,target:unknown){
 if(typeof total!=='number'||!Number.isFinite(total)||total<0||typeof target!=='number'||!Number.isFinite(target)||target<=0)return null;
 return Math.round(total/target*100);
}
const amount=(n:number)=>Math.round(n).toLocaleString('zh-CN');
export function healthStatus(entries:Entry[],date:string,locale:Locale='zh'){
 const day=entries.filter(e=>e.date===date);const meals=day.filter(e=>e.kind==='meal');const exercise=day.filter(e=>e.kind==='exercise');const stats=summarize(entries,date);const n=stats.nutrients;
 const recent=entries.filter(e=>e.kind==='exercise'&&e.date>=shiftDate(date,-6)&&e.date<=date);const activeDays=new Set(recent.map(e=>e.date)).size;
 const minutes=exercise.reduce((s,e)=>s+Number(e.data.duration||0),0);const estimated=meals.some(e=>e.data.estimated);
 const protein=n.protein;const fat=n.fat;const proteinPercent=nutrientProgress(protein.total,protein.target);
 let diet='还没有饮食记录，先留下一餐，就能慢慢看清自己的搭配。';
 if(meals.length){
  const parts:string[]=[];
  if(protein.total!==null)parts.push(`已记录蛋白质${estimated?'约':''}${amount(protein.total)}g${proteinPercent!==null?`，${protein.complete?'达到':'至少达到'}参考目标的 ${proteinPercent}%`:''}`);
  if(fat.complete&&fat.target!==null&&fat.target>0&&fat.total!==null&&fat.total>fat.target)parts.push(`脂肪${estimated?'估算':''}比参考目标多${estimated?'约':''}${amount(fat.total-fat.target)}g`);
  else if(fat.total!==null)parts.push(`脂肪${estimated?'约':''}${amount(fat.total)}g`);
  diet=parts.length?parts.join('；')+'。':`已记录 ${meals.length} 餐，补上营养数值后就能看清搭配。`;
  if(!protein.complete||!fat.complete)diet+='部分餐食数值尚缺，先看已记录的部分。';
 }
 let training=exercise.length?`${exercise.length===1?exercise[0].data.title:`已记录 ${exercise.length} 次运动`}${minutes>0?`，累计约 ${amount(minutes)} 分钟`:''}。`:'这一天还没有运动记录；练过的话，把它补进来就好。';
 if(activeDays)training+=`近 7 天有 ${activeDays} 天留下了运动记录。`;
 let suggestion='先把已经吃过、练过的内容留下来，再安排下一次小行动。';
 if(meals.length){
  if(fat.complete&&fat.target!==null&&fat.target>0&&fat.total!==null&&fat.total>fat.target)suggestion='下次饭堂选餐，可以优先选清淡的蛋白质菜肴，酱汁分开放。';
  else if(protein.complete&&proteinPercent!==null&&proteinPercent<100)suggestion='下一餐留一份鱼、蛋、瘦肉或豆制品，再搭配主食和蔬菜。';
  else suggestion='继续把蛋白质、主食和蔬菜搭配起来，烹调油与酱汁适量就好。';
 }
 const confidence=meals.length?`基于已记录的 ${meals.length} 餐${estimated?'，包含中值估算':''}；份量补充后会更新。`:'目前依据已保存记录生成，尚未记录的饮食和运动不作推断。';
 if(locale==='en'){
  const tx=(key:string)=>translate(locale,key);const approx=estimated?'about ':'';let food=tx('还没有饮食记录，先留下一餐，就能慢慢看清自己的搭配。');
  if(meals.length){const parts:string[]=[];if(protein.total!==null)parts.push(`Protein logged: ${approx}${amount(protein.total)}g${proteinPercent!==null?`, ${protein.complete?'':'at least '}${proteinPercent}% of your reference`:''}`);if(fat.complete&&fat.target!==null&&fat.target>0&&fat.total!==null&&fat.total>fat.target)parts.push(`fat is ${approx}${amount(fat.total-fat.target)}g above your reference${estimated?' (estimated)':''}`);else if(fat.total!==null)parts.push(`fat: ${approx}${amount(fat.total)}g`);food=parts.length?parts.join('; ')+'.':`${meals.length} meals logged. Add nutrition values to understand the mix.`;if(!protein.complete||!fat.complete)food+=' '+tx('部分餐食数值尚缺，先看已记录的部分。');}
  let movement=exercise.length?`${exercise.length===1?exercise[0].data.title:`${exercise.length} exercise sessions logged`}${minutes>0?` · about ${amount(minutes)} minutes in total`:''}.`:tx('这一天还没有运动记录；练过的话，把它补进来就好。');if(activeDays)movement+=` Activity recorded on ${activeDays} of the past 7 days.`;
  const note=meals.length?`Based on ${meals.length} logged meals${estimated?', including midpoint estimates':''}. Updates when portions are clarified.`:tx('目前依据已保存记录生成，尚未记录的饮食和运动不作推断。');
  return {heading:tx(exercise.length?'训练已留下，日常也在稳稳积累。':meals.length?'认真记下一餐，也是在照顾自己。':'从一条记录开始，慢慢找到节奏。'),diet:food,training:movement,suggestion:tx(suggestion),confidence:note,activeDays,minutes,estimated};
 }
 return {heading:exercise.length?'训练已留下，日常也在稳稳积累。':meals.length?'认真记下一餐，也是在照顾自己。':'从一条记录开始，慢慢找到节奏。',diet,training,suggestion,confidence,activeDays,minutes,estimated};
}
