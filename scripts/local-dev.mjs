import {initLocalDatabase,root} from './init-local-db.mjs';
import {spawn} from 'node:child_process';
import path from 'node:path';
initLocalDatabase();
const child=spawn(process.execPath,[path.join(root,'scripts/run-framework.mjs'),'dev','--host','127.0.0.1',...process.argv.slice(2)],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',e=>{console.error(e);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
