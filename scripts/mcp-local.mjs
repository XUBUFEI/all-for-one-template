// MCP stdio bridge. Standard output is reserved for one JSON-RPC message per line.
import {createInterface} from 'node:readline';
import {localUrl,localHeaders} from './local-client.mjs';
const url=localUrl();url.pathname='/mcp';url.search='';
const reply=value=>process.stdout.write(JSON.stringify(value)+'\n');
async function handle(line){
 let message;try{message=JSON.parse(line);}catch{return reply({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON'}});}
 if(message.id===undefined)return;
 if(message.method==='initialize')return reply({jsonrpc:'2.0',id:message.id,result:{protocolVersion:message.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'all-for-one-local',version:'0.1.0'}}});
 if(message.method==='ping')return reply({jsonrpc:'2.0',id:message.id,result:{}});
 try{const response=await fetch(url,{method:'POST',headers:localHeaders,body:JSON.stringify(message)});if(!response.ok)throw Error(`Local workspace returned HTTP ${response.status}`);reply(await response.json());}
 catch(e){reply({jsonrpc:'2.0',id:message.id,error:{code:-32000,message:`${e.message}. Start the local workspace first.`}});}
}
let pending=Promise.resolve();createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{pending=pending.then(()=>handle(line)).catch(e=>console.error(e));});
