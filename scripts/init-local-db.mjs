import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const root=fileURLToPath(new URL('../',import.meta.url));
export function wrangler(args){
 const result=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),...args],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'},windowsHide:true});
 if(result.error)throw result.error;if(result.status!==0)throw Error('Local database command failed');
}
export function initLocalDatabase(){
 mkdirSync(path.join(root,'.sites-runtime'),{recursive:true});
 const sql=readFileSync(path.join(root,'drizzle/0000_big_bishop.sql'),'utf8').replaceAll('--> statement-breakpoint','').replace('CREATE TABLE','CREATE TABLE IF NOT EXISTS').replaceAll('CREATE UNIQUE INDEX','CREATE UNIQUE INDEX IF NOT EXISTS').replaceAll('CREATE INDEX','CREATE INDEX IF NOT EXISTS');
 writeFileSync(path.join(root,'.sites-runtime/schema.sql'),sql);
 writeFileSync(path.join(root,'.sites-runtime/wrangler.json'),JSON.stringify({name:'all-for-one-local',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}]}));
 wrangler(['d1','execute','DB','--local','--config','.sites-runtime/wrangler.json','--persist-to','.wrangler/state','--file','.sites-runtime/schema.sql']);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))initLocalDatabase();
