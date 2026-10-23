import {coreFs as fs} from './core-io';
import path from 'node:path';
import {createHash,randomUUID,verify} from 'node:crypto';
import {newerVersion} from './updates';
import {CORE_PUBLIC_KEY} from './core-trust';
export type CoreRuntime={electron:string;platform:string;arch:string;engineSha256:string;nativeSha256:string};
export type CoreManifest={format:1;version:string;runtime:CoreRuntime;sha256:string;size:number;signature:string};
export type CoreFailureCode='permission'|'input'|'screen'|'crash'|'interrupted'|'verification'|'download'|'switch';
export type CoreFailure={version:string;code:CoreFailureCode;at:string;cancelled:boolean;resolved:boolean;manifest?:CoreManifest};
type Journal={active?:CoreManifest;pending?:CoreManifest;attempted?:boolean;failure?:CoreFailure};
const failureCodes=['permission','input','screen','crash','interrupted','verification','download','switch'];
const version=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v)&&newerVersion(v,'0.0.0');
const sha=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function validCoreManifest(value:unknown):value is CoreManifest{
 if(!value||typeof value!=='object')return false;
 const m=value as CoreManifest,r=m.runtime;
 return m.format===1&&version(m.version)&&sha(m.sha256)&&Number.isSafeInteger(m.size)&&m.size>0&&m.size<=256*1024*1024&&typeof m.signature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(m.signature)&&!!r&&typeof r.electron==='string'&&/^\d+\.\d+\.\d+$/.test(r.electron)&&['win32','darwin'].includes(r.platform)&&['x64','arm64'].includes(r.arch)&&sha(r.engineSha256)&&sha(r.nativeSha256);
}
export function coreSigningData(m:Omit<CoreManifest,'signature'>){return Buffer.from(JSON.stringify([m.format,m.version,m.runtime.electron,m.runtime.platform,m.runtime.arch,m.runtime.engineSha256,m.runtime.nativeSha256,m.sha256,m.size]));}
export function signedCore(m:unknown,key=CORE_PUBLIC_KEY):m is CoreManifest{try{return validCoreManifest(m)&&verify(null,coreSigningData(m),key,Buffer.from(m.signature,'base64'));}catch{return false;}}
export function sameCoreRuntime(a:CoreRuntime,b:CoreRuntime){return a.electron===b.electron&&a.platform===b.platform&&a.arch===b.arch&&a.engineSha256===b.engineSha256&&a.nativeSha256===b.nativeSha256;}
export function fileHash(file:string){const h=createHash('sha256'),fd=fs.openSync(file,'r'),buffer=Buffer.allocUnsafe(1024*1024);try{let n;while((n=fs.readSync(fd,buffer,0,buffer.length,null))>0)h.update(buffer.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}}
function safeAncestors(file:string){for(let p=path.resolve(file);;p=path.dirname(p)){try{if(fs.lstatSync(p).isSymbolicLink())throw Error('Linked core path');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}if(path.dirname(p)===p)break;}}
export class CoreStore{
 readonly root:string;readonly record:string;
 constructor(userData:string,readonly baseVersion:string,readonly runtime:CoreRuntime,private key=CORE_PUBLIC_KEY){this.root=path.join(userData,'core-updates');this.record=path.join(this.root,'state.json');}
 prepare(){safeAncestors(this.root);fs.mkdirSync(this.root,{recursive:true});}
 authentic(m:unknown):m is CoreManifest{return signedCore(m,this.key);}
 file(m:CoreManifest){if(!validCoreManifest(m))throw Error('Invalid core manifest');return path.join(this.root,m.version+'-'+m.sha256+'.asar');}
 private read():Journal{
  safeAncestors(this.record);
  try{const s=fs.lstatSync(this.record);if(!s.isFile()||s.size>16384)throw Error('Invalid core state');const j=JSON.parse(fs.readFileSync(this.record,'utf8')) as Journal;
   const f=j?.failure;
   if(!j||typeof j!=='object'||Array.isArray(j)||(j.active&&!this.authentic(j.active))||(j.pending&&!this.authentic(j.pending))||(j.attempted!==undefined&&typeof j.attempted!=='boolean')||(f&&(!version(f.version)||!failureCodes.includes(f.code)||typeof f.at!=='string'||!/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(f.at)||typeof f.cancelled!=='boolean'||typeof f.resolved!=='boolean'||(f.manifest&&!this.authentic(f.manifest)))))throw Error('Invalid core state');return j;
  }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {};throw e;}
 }
 private write(j:Journal){safeAncestors(this.record);fs.mkdirSync(this.root,{recursive:true});const tmp=this.record+'.'+randomUUID()+'.next';try{fs.writeFileSync(tmp,JSON.stringify(j),{flag:'wx'});fs.renameSync(tmp,this.record);}finally{try{fs.unlinkSync(tmp);}catch{}}}
 private verifyPhysical(m:CoreManifest){if(!this.authentic(m))throw Error('Unsigned core');const file=this.file(m);safeAncestors(file);const s=fs.lstatSync(file);if(!s.isFile()||s.size!==m.size||fileHash(file)!==m.sha256)throw Error('Damaged core');return file;}
 verify(m:CoreManifest){if(!sameCoreRuntime(m.runtime,this.runtime))throw Error('Incompatible core');return this.verifyPhysical(m);}
 workerCandidate(hash:string){const j=this.read();if(!j.attempted||j.pending?.sha256!==hash||!newerVersion(j.pending.version,this.active()?.version??this.baseVersion))throw Error('Unexpected candidate');this.verify(j.pending);return j.pending;}
 active(){const j=this.read(),m=j.active;if(m&&newerVersion(m.version,this.baseVersion)){this.verify(m);return m;}return undefined;}
 stage(m:CoreManifest){this.verify(m);const j=this.read(),current=this.active()?.version??this.baseVersion;if(!newerVersion(m.version,current))throw Error('Core downgrade');if(j.pending)throw Error('Core switch already pending');this.write({...j,pending:m,attempted:false});}
 candidate(){const j=this.read();if(!j.pending)return undefined;if(j.attempted){this.reject('interrupted');return undefined;}if(!newerVersion(j.pending.version,this.active()?.version??this.baseVersion)){this.write({active:j.active,failure:j.failure});return undefined;}this.verify(j.pending);this.write({...j,attempted:true});return j.pending;}
 confirm(m:CoreManifest){const j=this.read();if(!j.pending||j.pending.sha256!==m.sha256||j.pending.version!==m.version||!j.attempted)throw Error('Unexpected core confirmation');this.verify(m);this.write({active:m});if(j.active&&this.file(j.active)!==this.file(m))this.remove(j.active);if(j.failure?.manifest&&j.failure.manifest.sha256!==m.sha256)this.remove(j.failure.manifest);}
 confirmBundled(){const j=this.read();if(j.pending||j.active&&newerVersion(j.active.version,this.baseVersion))return false;const clearFailure=j.failure&&(j.failure.version===this.baseVersion||newerVersion(this.baseVersion,j.failure.version));if(!j.active&&!clearFailure)return false;this.write({failure:clearFailure?undefined:j.failure});if(j.active)this.remove(j.active);if(clearFailure&&j.failure?.manifest)this.remove(j.failure.manifest);return true;}
 reject(code:CoreFailureCode='crash'){const j=this.read();const failure=j.pending?{version:j.pending.version,code,at:new Date().toISOString(),cancelled:false,resolved:false,manifest:j.pending}:j.failure;this.write({active:j.active,failure});}
 failure(){return this.read().failure;}
 noteFailure(target:string,code:CoreFailureCode){if(!version(target))return;const j=this.read();this.write({...j,failure:{version:target,code,at:new Date().toISOString(),cancelled:false,resolved:false}});}
 retryManifest(){const f=this.read().failure;if(!f?.manifest||f.resolved||!newerVersion(f.manifest.version,this.active()?.version??this.baseVersion))throw Error('No cached retry');this.verify(f.manifest);return f.manifest;}
 cancel(){const j=this.read();if(j.pending)throw Error('Core switch in progress');if(!j.failure)return;this.write({...j,failure:{...j.failure,cancelled:true}});if(j.failure.manifest&&j.failure.manifest.sha256!==j.active?.sha256)this.remove(j.failure.manifest);}
 recoverActive(){
  let j:Journal;
  try{j=this.read();}catch{
   safeAncestors(this.record);try{fs.renameSync(this.record,this.record+'.invalid-'+randomUUID());}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   this.write({failure:{version:this.baseVersion,code:'verification',at:new Date().toISOString(),cancelled:false,resolved:false}});return;
  }
  if(j.active&&newerVersion(j.active.version,this.baseVersion))try{this.verify(j.active);}catch{this.write({pending:j.pending,attempted:j.attempted,failure:{version:j.active.version,code:'verification',at:new Date().toISOString(),cancelled:false,resolved:false}});}
 }
 private remove(m:CoreManifest){try{this.verifyPhysical(m);fs.unlinkSync(this.file(m));}catch{/* Retain unknown or changed files. Never scan user folders. */}}
}
