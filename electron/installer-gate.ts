import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {coreFs as fs} from './core-io';
import {CoreStore,CoreInstaller,fileHash} from './core-store';
import {downloadCore} from './core-download';
import type {CoreTarget} from './core-updater';
// Full-runtime fallback must not bypass the launcher's independent release key.
export class InstallerGate{
 private allowed:{version:string;installer:CoreInstaller}|undefined;
 constructor(private store:CoreStore,private download=downloadCore){}
 async authorize(target:CoreTarget|undefined){
  this.allowed=undefined;if(!target||target.manifest.size>16384)return false;
  let temporary='';try{
   this.store.prepare();temporary=path.join(this.store.root,randomUUID()+'.installer.json.next');await this.download(target.manifest,temporary);
   const m:unknown=JSON.parse(fs.readFileSync(temporary,'utf8'));
   if(!this.store.authentic(m)||m.version!==target.version||m.runtime.platform!=='win32'||m.runtime.arch!==this.store.runtime.arch||m.sha256!==target.archive.sha256||m.size!==target.archive.size||!m.installer)return false;
   this.allowed={version:m.version,installer:m.installer};return true;
  }catch{return false;}finally{if(temporary)try{fs.unlinkSync(temporary);}catch{}}
 }
 verify(files:string[],version:string){const a=this.allowed;if(!a||a.version!==version||files.length!==1||path.basename(files[0])!==a.installer.name)throw Error('Installer not authorized');const s=fs.lstatSync(files[0]);if(!s.isFile()||s.isSymbolicLink()||s.size!==a.installer.size||fileHash(files[0])!==a.installer.sha256)throw Error('Installer signature digest mismatch');}
}
