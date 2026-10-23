import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {localUrl,localHeaders} from './local-client.mjs';
const url=localUrl();url.pathname='/api/records';url.search='?export=1';
const response=await fetch(url,{headers:localHeaders});if(!response.ok)throw Error('Start the local workspace before backing up');
const body=await response.json();if(!Array.isArray(body.records))throw Error('Invalid backup response');
mkdirSync('backups',{recursive:true});const filename=path.resolve('backups',new Date().toISOString().replace(/[:.]/g,'-')+'.json');
writeFileSync(filename,JSON.stringify({format:'all-for-one-v1',exportedAt:new Date().toISOString(),records:body.records},null,2));console.log(`Saved ${body.records.length} records to ${filename}`);
