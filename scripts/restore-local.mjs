import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {initLocalDatabase,wrangler,root} from './init-local-db.mjs';
if(!process.argv[2])throw Error('Usage: node scripts/restore-local.mjs path/to/backup.json');
const input=JSON.parse(readFileSync(process.argv[2],'utf8'));if(!Array.isArray(input.records))throw Error('Backup must contain records');
const quote=v=>"'"+String(v??'').replaceAll("'","''")+"'";
const statements=input.records.map(r=>{
 if(typeof r.id!=='string'||typeof r.sourceKey!=='string'||typeof r.kind!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!r.data||typeof r.data!=='object'||!r.data.title)throw Error('Invalid record in backup');
 return 'INSERT OR REPLACE INTO records VALUES ('+[r.id,'local_workspace',r.kind,r.date,JSON.stringify(r.data),r.source,r.sourceKey,r.createdAt,r.updatedAt].map(quote).join(',')+');';
});
initLocalDatabase();writeFileSync(path.join(root,'.sites-runtime/restore.sql'),statements.join('\n'));
if(statements.length)wrangler(['d1','execute','DB','--local','--config','.sites-runtime/wrangler.json','--persist-to','.wrangler/state','--file','.sites-runtime/restore.sql','--json']);
console.log(`Restored ${statements.length} local records. Existing matching IDs/source keys were replaced; other records were preserved.`);
