'use client';
import {useState} from 'react';
import type {Entry} from '../lib/model';
import {dayObjects,type ObjectKind} from '../lib/day-objects';
import {contentText} from '../lib/content';
import {useLocale} from './locale';

// Integer-grid sprites stay crisp at every display size; no remote image requests.
type Block=[number,number,number,number,string];
const palette:Record<string,string>={o:'#514536',d:'#687075',m:'#929B9B',l:'#C4CECA',w:'#F9F1D9',b:'#AD7951',t:'#E3B674',y:'#F4CE71',r:'#BE785C',g:'#82965F',v:'#B9C78C',p:'#D5A58C'};
const sprites:Record<ObjectKind,Block[]>={
 shoe:[[5,10,8,3,'o'],[5,13,11,8,'o'],[16,17,6,4,'o'],[22,20,6,3,'o'],[3,21,27,7,'o'],[6,13,6,8,'g'],[12,17,6,4,'v'],[17,20,8,3,'g'],[4,23,25,3,'w'],[4,26,25,1,'b'],[10,17,5,1,'w'],[12,19,5,1,'w']],
 dumbbell:[[2,12,4,10,'o'],[6,8,5,18,'o'],[11,15,10,4,'o'],[21,8,5,18,'o'],[26,12,4,10,'o'],[7,9,3,15,'d'],[8,10,1,12,'l'],[22,9,3,15,'d'],[23,10,1,12,'l'],[12,16,8,2,'m'],[3,13,2,7,'m'],[27,13,2,7,'d']],
 coffee:[[8,5,17,3,'o'],[6,8,21,3,'o'],[8,11,17,15,'o'],[10,26,13,3,'o'],[9,11,15,6,'w'],[9,17,15,5,'b'],[10,22,13,4,'w'],[11,26,11,1,'t'],[9,6,15,2,'m'],[7,9,19,1,'l'],[16,18,3,3,'w'],[21,12,2,4,'t']],
 matcha:[[18,1,2,9,'o'],[19,1,1,9,'b'],[7,8,18,3,'o'],[8,11,16,16,'o'],[10,27,12,2,'o'],[9,12,14,5,'v'],[9,17,14,6,'g'],[10,23,12,4,'w'],[11,13,3,3,'w'],[19,12,2,10,'v'],[8,9,16,1,'w']],
 burger:[[10,6,12,2,'o'],[6,8,20,3,'o'],[4,11,24,6,'o'],[5,12,22,4,'t'],[7,9,18,3,'y'],[10,7,12,2,'t'],[10,10,2,1,'w'],[18,10,2,1,'w'],[14,13,2,1,'w'],[4,17,24,3,'g'],[6,19,20,3,'r'],[4,22,24,4,'o'],[6,23,20,2,'b'],[5,26,22,3,'o'],[6,26,20,2,'t']],
 banana:[[22,4,3,4,'o'],[21,8,5,8,'o'],[18,16,7,5,'o'],[13,21,10,4,'o'],[7,24,12,4,'o'],[4,22,4,4,'o'],[22,9,3,7,'y'],[19,16,5,4,'y'],[14,20,8,4,'y'],[8,24,10,2,'t'],[5,22,3,3,'y'],[22,11,1,5,'w'],[19,17,2,2,'w'],[14,21,4,1,'w']],
 bowl:[[5,13,22,3,'o'],[6,16,20,6,'o'],[9,22,14,4,'o'],[12,26,8,2,'o'],[6,14,20,2,'w'],[7,17,18,5,'p'],[10,22,12,3,'b'],[9,10,15,3,'w'],[12,8,9,2,'w'],[9,12,3,2,'g'],[20,10,4,3,'r'],[15,9,3,2,'y'],[8,17,2,3,'w']],
 shake:[[11,3,10,3,'o'],[8,6,16,4,'o'],[7,10,18,16,'o'],[10,26,12,3,'o'],[10,7,12,2,'m'],[8,11,16,14,'l'],[9,13,14,9,'g'],[13,16,7,3,'w'],[15,14,3,7,'w'],[10,11,2,3,'w'],[11,26,10,1,'d']],
 laptop:[[5,5,23,17,'o'],[7,7,19,12,'d'],[9,9,15,8,'v'],[11,11,2,2,'w'],[14,13,7,2,'g'],[3,22,26,5,'o'],[5,23,22,2,'m'],[12,23,7,1,'l'],[7,27,18,1,'d']],
 check:[[8,4,18,25,'o'],[6,6,3,21,'b'],[10,6,14,21,'w'],[13,9,9,2,'t'],[13,13,9,1,'t'],[12,19,3,3,'g'],[15,22,3,2,'g'],[18,19,3,3,'g'],[21,16,2,3,'g'],[9,6,1,21,'p']]
};
const labels:Record<ObjectKind,[string,string]>={dumbbell:['力量训练','Strength training'],shoe:['动起来','Getting moving'],coffee:['咖啡','Coffee'],matcha:['抹茶','Matcha'],burger:['汉堡','Burger'],banana:['香蕉','Banana'],bowl:['好好吃饭','A good meal'],shake:['蛋白补给','Protein'],laptop:['工作进展','Work in progress'],check:['完成的事','Things done']};
const positions=[[13,62],[75,58],[137,65],[199,61],[42,12],[108,5],[174,13],[8,2],[229,5],[232,64]];
export default function DayPixels({records,date,onOpen}:{records:Entry[];date:string;onOpen:(e:Entry)=>void}){
 const {locale}=useLocale();const [hovered,setHovered]=useState<string|null>(null);const objects=dayObjects(records,date);const en=locale==='en';
 return <section className="day-pixels" aria-label={en?'Little pieces of this day':'这一天的生活碎片'}>
  <div className="pixel-still-life" data-empty={!objects.length}>
   <span className="pixel-ground" aria-hidden="true"/>
   {objects.map(({kind,records:entries},i)=>{const label=labels[kind][en?1:0];const [x,y]=positions[i];const hint=en?`${label} · ${entries.length} record${entries.length===1?'':'s'} · Open latest`:`${label} · ${entries.length}条记录 · 查看最近一条`;return <button type="button" key={kind} className="pixel-object" data-edge={x>130?"end":"start"} style={{left:`${x/296*100}%`,top:y,zIndex:y}} aria-label={hint} onClick={()=>onOpen(entries[0])} onMouseEnter={()=>setHovered(kind)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(kind)} onBlur={()=>setHovered(null)}>
    <svg viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">{sprites[kind].map(([a,b,w,h,c],n)=><rect key={n} x={a} y={b} width={w} height={h} fill={palette[c]}/>)}</svg>
    {entries.length>1&&<span className="pixel-count">×{entries.length}</span>}
    <span role="tooltip" className="pixel-tooltip" hidden={hovered!==kind}><strong>{label}{entries.length>1?` ×${entries.length}`:''}</strong><span>{contentText(entries[0].data,'title',locale)}</span><small>{en?'Open latest record ↗':'查看最近一条 ↗'}</small></span>
   </button>})}
   {!objects.length&&<span className="pixel-empty">{en?'A little day, waiting to unfold.':'这一天的碎片，等你慢慢收集。'}</span>}
  </div>
  <div className="pixel-caption"><i aria-hidden="true"/>{en?'A day, in little things':'把一天，收集成小小的日常'}<i aria-hidden="true"/></div>
 </section>;
}
