import {coreFs as fs} from './core-io';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {CoreStore,validCoreManifest,sameCoreRuntime} from './core-store';
import {downloadCore,CoreAsset} from './core-download';
import type {InstallState} from './installed-updater';
export type CoreTarget={version:string;manifest:CoreAsset;archive:CoreAsset};
export class CoreUpdater{
 state:InstallState={phase:'idle',progress:0,message:'',mode:'core'};
 private pending:Promise<'applied'|'fallback'|'error'>|undefined;
 constructor(private store:CoreStore,private apply:()=>void,private download=downloadCore){}
 retry(beforeSwitch:()=>void){if(this.pending||this.state.phase==='installing')return false;try{const m=this.store.retryManifest();this.store.stage(m);try{beforeSwitch();this.state={phase:'installing',progress:100,mode:'core',message:'보관된 파일을 다시 확인하고 전환하고 있어요.'};this.apply();return true;}catch{this.store.reject('switch');throw Error('Switch failed');}}catch{return false;}}
 update(target:CoreTarget,beforeSwitch:()=>void){if(this.pending)return this.pending;this.pending=this.perform(target,beforeSwitch).finally(()=>{this.pending=undefined;});return this.pending;}
 private async perform(target:CoreTarget,beforeSwitch:()=>void):Promise<'applied'|'fallback'|'error'>{
  const temporary:string[]=[];let staged=false,code:'download'|'verification'|'switch'='download';
  try{
   this.state={phase:'checking',progress:0,mode:'core',message:'이 PC에서 사용할 수 있는 기능 묶음인지 확인하고 있어요.'};
   if(target.manifest.size>16384)throw Error('Oversized manifest');
   this.store.prepare();
   const manifestFile=path.join(this.store.root,randomUUID()+'.json.next');temporary.push(manifestFile);await this.download(target.manifest,manifestFile);
   code='verification';
   const m:unknown=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
   if(!validCoreManifest(m)||!this.store.authentic(m)||m.version!==target.version||m.sha256!==target.archive.sha256||m.size!==target.archive.size)throw Error('Unexpected core metadata');
   if(!sameCoreRuntime(m.runtime,this.store.runtime)){this.state={phase:'idle',progress:0,mode:'core',message:'실행 환경 변경이 필요해 전체 설치 방식으로 업데이트해요.'};return 'fallback';}
   const file=this.store.file(m),partial=path.join(this.store.root,randomUUID()+'.asar.next');temporary.push(partial);
   this.state={phase:'downloading',progress:0,mode:'core',message:'앱을 사용하는 동안 새 기능과 이미지를 받고 있어요.'};
   code='download';
   await this.download(target.archive,partial,progress=>{this.state={...this.state,progress};});
   code='verification';
   // The destination is content-addressed. Never overwrite a loaded archive.
   if(fs.existsSync(file))this.store.verify(m);else fs.renameSync(partial,file);
   this.store.stage(m);staged=true;code='switch';beforeSwitch();
   this.state={phase:'installing',progress:100,mode:'core',message:'런처를 유지하고 새 앱으로 전환해요. 잠시 후 다시 나타나요.'};this.apply();return 'applied';
  }catch{try{if(staged)this.store.reject(code);else this.store.noteFailure(target.version,code);}catch{}this.state={phase:'error',progress:0,mode:'core',message:'기능 묶음을 적용하지 못했어요. 현재 앱과 이전 파일은 유지돼요. 업데이트 기록에서 이유를 확인해 주세요.'};return 'error';}
  finally{for(const f of temporary)try{fs.unlinkSync(f);}catch{}}
 }
}
