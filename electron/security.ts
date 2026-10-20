import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpathSync,openSync,readSync,closeSync} from 'node:fs';

export function isAppDocument(url:string,indexFile:string){
 try{const u=new URL(url);return u.protocol==='file:'&&!u.host&&!u.hash&&
  (u.search===''||u.search==='?panel=1')&&path.resolve(fileURLToPath(u))===path.resolve(indexFile);}catch{return false;}
}
export function isAppResource(url:string,distRoot:string){
 try{
  const u=new URL(url);if(u.protocol!=='file:'||u.host)return false;
  const root=realpathSync(distRoot),file=realpathSync(fileURLToPath(u)),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))return false;
  return relative==='index.html'||/^(assets[\\/][^\\/]+\.(js|css)|sprites[\\/][^\\/]+\.png)$/.test(relative);
 }catch{return false;}
}
export function isTrustedFrame(sender:{mainFrame:unknown},frame:{url:string}|null,indexFile:string){
 return !!frame&&frame===sender.mainFrame&&isAppDocument(frame.url,indexFile);
}
export function readSettings(file:string):{x?:number;y?:number;options?:unknown}{
 let fd:number|undefined;
 try{
  fd=openSync(file,'r');const buffer=Buffer.alloc(65537);let bytes=0,n=0;
  while(bytes<buffer.length&&(n=readSync(fd,buffer,bytes,buffer.length-bytes,null))>0)bytes+=n;
  if(bytes>65536)return {};
  const parsed:unknown=JSON.parse(buffer.subarray(0,bytes).toString('utf8'));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  const p=parsed as Record<string,unknown>;
  return {x:typeof p.x==='number'?p.x:undefined,y:typeof p.y==='number'?p.y:undefined,options:p.options};
 }catch{return {};}finally{if(fd!==undefined)closeSync(fd);}
}
