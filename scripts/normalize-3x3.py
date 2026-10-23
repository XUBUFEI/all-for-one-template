"""Normalize a Today3x3 ZIP locally. Never infer work tasks, calories, or project links.
Usage: python scripts/normalize-3x3.py INPUT.zip OUTPUT.json
"""
import collections, datetime as dt, json, sys, unicodedata, zipfile
from zoneinfo import ZoneInfo
TZ = ZoneInfo('Asia/Shanghai')
WORKOUT = 'ED632D2A-B777-4B09-8723-28FB28E178AD'
ROOTS = {'E7CF3E49-661C-4702-83A6-C5404B684BB5':'学习','18C17079-926A-432E-ABE3-B556BF05A9EB':'健康与运动','72DE6CF7-9865-4FCB-BC45-B3CAE8A251DB':'日常生活','97BF4132-D4D8-4F76-9039-63E70BEB65BD':'阅读与思考','A64FD173-3FFA-47C0-B342-2053BF40CCDA':'工作与事务','D55B2A58-F76F-4DFD-93BC-997A64577384':'休闲','9C0516D6-3782-40A1-B021-EFE8B7726E9E':'社交'}
def normalize(path):
 with zipfile.ZipFile(path) as z:
  def read(name):
   matches=[n for n in z.namelist() if n.rsplit('/',1)[-1]==name and not n.startswith('__MACOSX/')]
   if len(matches)!=1: raise ValueError('备份必须含一个 '+name)
   return json.loads(z.read(matches[0]))
  tags={x['tag_id']:x for x in read('tag.json')['all_tags']}
  tasks={x['task_id']:x for x in read('task.json')['all_tasks']}
  source=read('schedule.json')['schedules']
 def tagpath(tagid):
  chain=[];seen=set()
  while tagid and tagid not in seen:
   seen.add(tagid);tag=tags.get(tagid,{});chain.insert(0,tag.get('tag_name','未识别标签 '+tagid));tagid=tag.get('parent_id')
  return chain
 grouped=collections.defaultdict(list)
 for s in source:grouped[s['schedule_id']].append(s)
 records=[];exceptions=[];duplicates=0;moments=0;templates=0;valid=0;workouts=0;overlap=0;frontier=0
 def add(kind,date,data,key):records.append(dict(kind=kind,date=date,data=data,source='3x3',sourceKey=key))
 for sid,variants in sorted(grouped.items(),key=lambda v:min(s['create_date'] for s in v[1])):
  duplicates+=len(variants)-1
  # Duplicate variants with the same interval can safely enrich missing metadata.
  if len({(s['create_date'],s['end_date'],s['schedule_type'],s['is_moment']) for s in variants})!=1:
   exceptions.append({'id':sid,'reason':'同一 ID 的时间范围冲突','variants':variants});continue
  s=dict(max(variants,key=lambda s:sum(bool(v) for v in s.values())))
  s['tag_ids']=list(dict.fromkeys(t for v in variants for t in v['tag_ids']))
  for field in ['schedule_title','schedule_comment','task_id']:
   s[field]=next((v.get(field) for v in variants if v.get(field)),s.get(field,''))
  if s['schedule_type']!=0:templates+=1;continue
  start=dt.datetime.fromtimestamp(s['create_date'],TZ);end=dt.datetime.fromtimestamp(s['end_date'],TZ)
  chains=[tagpath(t) for t in s['tag_ids']]; paths=[' / '.join(c) for c in chains]
  leaf='、'.join(tags.get(t,{}).get('tag_name',t) for t in s['tag_ids'])
  task=tasks.get(s.get('task_id'),{}).get('task_name','')
  title=next((v for v in (unicodedata.normalize('NFKC',x).strip() for x in [s['schedule_title'],task,leaf,'未分类活动']) if v),'未分类活动')
  metadata={'originalScheduleId':sid,'originalTagIds':s['tag_ids'],'originalTagPaths':paths,'originalStartedAt':start.isoformat(),'originalEndedAt':end.isoformat(),'timeZone':'Asia/Shanghai'}
  if s.get('task_id'):metadata['originalTaskId']=s['task_id']
  notes=s.get('schedule_comment','')
  if s['schedule_title'] and title!=s['schedule_title']:notes+='\n原始标题：'+s['schedule_title']
  if task:notes+='\n3x3 关联待办：'+task
  if s['is_moment']:
   moments+=1;add('note',start.date().isoformat(),{'title':title,'notes':notes.strip(),**metadata},'schedule:'+sid+':moment');continue
  if end<=start or (end-start).total_seconds()>86400:
   exceptions.append({'id':sid,'reason':'结束不晚于开始' if end<=start else '单次超过24小时，待核对','record':s});continue
  valid+=1
  if s['create_date']<frontier:overlap+=1
  frontier=max(frontier,s['end_date'])
  roots=[]
  for tagid in s['tag_ids']:
   seen=set()
   while tagid in tags and tags[tagid].get('parent_id') and tagid not in seen:seen.add(tagid);tagid=tags[tagid]['parent_id']
   roots.append(ROOTS.get(tagid,'未分类'))
  category=' / '.join(dict.fromkeys(roots)) or '未分类'
  cursor=start
  while cursor<end:
   midnight=dt.datetime.combine(cursor.date()+dt.timedelta(days=1),dt.time(),TZ)
   stop=min(end,midnight);day=cursor.date().isoformat()
   add('time',day,{'title':title,'duration':(stop-cursor).total_seconds()/60,'category':category,'originalTag':leaf[:200],'startTime':cursor.strftime('%H:%M'),'endTime':stop.strftime('%H:%M'),'notes':notes.strip(),**metadata},'schedule:'+sid+':'+day)
   cursor=stop
  if WORKOUT in s['tag_ids']:
   workouts+=1
   # Only the explicit Workout tag generates an exercise, not all health or walk tags.
   data={'title':title if task or s['schedule_title'] else '训练','duration':(end-start).total_seconds()/60,'category':'训练','notes':notes.strip(),**metadata}
   if sid=='C19C04C7-5CCE-49B2-B468-FF7730D2CF36':data.update(title='背部力量训练',category='力量训练')
   add('exercise',start.date().isoformat(),data,'schedule:'+sid+':exercise')
 summary={'sourceSchedules':len(source),'uniqueScheduleIds':len(grouped),'duplicatesMerged':duplicates,'validActivities':valid,'timeRows':sum(r['kind']=='time' for r in records),'exerciseRows':workouts,'moments':moments,'templatesExcluded':templates,'exceptions':len(exceptions),'overlappingActivities':overlap,'dateFrom':min(r['date'] for r in records),'dateTo':max(r['date'] for r in records)}
 return {'summary':summary,'exceptions':exceptions,'records':records}
if __name__=='__main__':
 result=normalize(sys.argv[1]);open(sys.argv[2],'w').write(json.dumps(result,ensure_ascii=False));print(json.dumps(result['summary'],ensure_ascii=False))
