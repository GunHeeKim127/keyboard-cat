import https from 'node:https';
import {coreFs as fs} from './core-io';
import type {WriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {isUpdaterResource} from './installed-updater';
import type {IncomingMessage} from 'node:http';
export type CoreAsset={url:string;size:number;sha256:string};
// A bounded stream; redirects remain on GitHub's release infrastructure.
export function downloadCore(asset:CoreAsset,file:string,progress:(percent:number)=>void=()=>{}):Promise<void>{
 return new Promise((resolve,reject)=>{
  let request:ReturnType<typeof https.get>|undefined,responseStream:IncomingMessage|undefined,output:WriteStream|undefined,done=false,owned=false;
  const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);if(error){request?.destroy();responseStream?.destroy();const clean=()=>{if(owned)try{fs.unlinkSync(file);}catch{}reject(error);};if(output&&!output.closed){output.once('close',clean);output.destroy();}else clean();}else if(output&&!output.closed)output.once('close',resolve);else resolve();};
  const timer=setTimeout(()=>finish(Error('Core download timeout')),180000);
  const visit=(url:string,redirects:number)=>{
   if(!isUpdaterResource(url)||redirects>5){finish(Error('Unexpected core origin'));return;}
   request=https.get(url,{headers:{'User-Agent':'Keyboard-Cat-core-update','Accept-Encoding':'identity'}},response=>{
    if(done){response.destroy();return;}responseStream=response;
    if([301,302,303,307,308].includes(response.statusCode??0)&&response.headers.location){response.resume();try{visit(new URL(response.headers.location,url).href,redirects+1);}catch{finish(Error('Bad redirect'));}return;}
    if(response.statusCode!==200||response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'){response.resume();finish(Error('Core unavailable'));return;}
    const declared=response.headers['content-length'];if(declared&&Number(declared)!==asset.size){response.resume();finish(Error('Core size mismatch'));return;}
    let received=0;const hash=createHash('sha256');try{const fd=fs.openSync(file,'wx');owned=true;output=fs.createWriteStream(file,{fd,autoClose:true});}catch(error){response.destroy();finish(error as Error);return;}output.on('error',finish);
    response.on('data',(chunk:Buffer)=>{received+=chunk.length;if(received>asset.size){finish(Error('Core too large'));return;}hash.update(chunk);progress(received/asset.size*100);});
    response.on('error',finish);response.on('aborted',()=>finish(Error('Core interrupted')));
    output.on('finish',()=>{if(received!==asset.size||hash.digest('hex')!==asset.sha256)finish(Error('Core digest mismatch'));else finish();});response.pipe(output);
   });request.on('error',finish);
  };
  if(!Number.isSafeInteger(asset.size)||asset.size<=0||asset.size>256*1024*1024||!/^[a-f0-9]{64}$/.test(asset.sha256)){finish(Error('Invalid core asset'));return;}visit(asset.url,0);
 });
}
