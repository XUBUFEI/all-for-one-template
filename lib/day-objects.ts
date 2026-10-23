import type {Entry} from './model';
export type ObjectKind='dumbbell'|'shoe'|'coffee'|'matcha'|'burger'|'banana'|'bowl'|'shake'|'laptop'|'check';
export type DayObject={kind:ObjectKind;records:Entry[]};
const order:ObjectKind[]=['dumbbell','coffee','burger','bowl','matcha','shake','banana','laptop','check','shoe'];
export function dayObjects(records:Entry[],date:string):DayObject[]{
 const groups=new Map<ObjectKind,Entry[]>();const seen=new Set<string>();
 for(const e of [...records].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id))){
  if(seen.has(e.id))continue;seen.add(e.id);
  let kind:ObjectKind|undefined;
  if(e.kind==='task') {if(e.data.status==='done'&&e.data.completedOn===date)kind='check';}
  else if(e.date===date){
   const title=String(e.data.title||'');
   if(e.kind==='exercise')kind=/力量|卧推|哑铃|杠铃|胸|背|肩|深蹲|硬拉|strength|weight|dumbbell|bench|workout/i.test(title)?'dumbbell':'shoe';
   if(e.kind==='worklog')kind='laptop';
   if(e.kind==='meal')kind=/咖啡|美式|拿铁|coffee|espresso|latte|americano/i.test(title)?'coffee':/抹茶|matcha/i.test(title)?'matcha':/汉堡|burger/i.test(title)?'burger':/蛋白粉|蛋白饮|protein|shake/i.test(title)?'shake':/香蕉|banana/i.test(title)?'banana':'bowl';
  }
  if(kind)groups.set(kind,[...(groups.get(kind)||[]),e]);
 }
 return order.filter(kind=>groups.has(kind)).map(kind=>({kind,records:groups.get(kind)!}));
}
