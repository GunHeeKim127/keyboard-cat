import type {NsisUpdater} from 'electron-updater';
import {newerVersion} from './updates';
export type InstallState={phase:'idle'|'checking'|'downloading'|'ready'|'installing'|'error';progress:number;message:string;mode?:'core'};
export type UpdaterClient=Pick<NsisUpdater,'autoDownload'|'autoInstallOnAppQuit'|'allowPrerelease'|'allowDowngrade'|'disableWebInstaller'|'disableDifferentialDownload'|'setFeedURL'|'on'|'checkForUpdates'|'downloadUpdate'|'quitAndInstall'>;
export function isUpdaterResource(value:string){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return false;
  if(['release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(u.hostname))return true;
  if(u.hostname==='api.github.com')return u.pathname==='/repos/GunHeeKim127/keyboard-cat/releases/latest';
  if(u.hostname!=='github.com')return false;
  const p=decodeURIComponent(u.pathname),base='/GunHeeKim127/keyboard-cat/releases';
  return p===base+'.atom'||p===base+'/latest'||new RegExp('^'+base+'/tag/v?\\d+\\.\\d+\\.\\d+$').test(p)||new RegExp('^'+base+'/download/v?\\d+\\.\\d+\\.\\d+/[^/]+$').test(p);
 }catch{return false;}
}
// Metadata must identify exactly the installer already selected from the fixed repository.
export function validInstallerInfo(value:unknown,version:string,asset:string){
 if(!value||typeof value!=='object')return false;
 const info=value as {version?:unknown;files?:unknown};
 if(info.version!==version||!Array.isArray(info.files)||info.files.length!==1)return false;
 const file=info.files[0] as {url?:unknown;sha512?:unknown;size?:unknown}|null;
 if(!file||typeof file.url!=='string'||typeof file.sha512!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(file.sha512)||typeof file.size!=='number'||!Number.isSafeInteger(file.size)||file.size<=0||file.size>512*1024*1024)return false;
 try{return decodeURIComponent(file.url)===asset&&/\.exe$/i.test(asset)&&!/[\\/]/.test(asset);}catch{return false;}
}
export class InstalledUpdater {
 state:InstallState={phase:'idle',progress:0,message:''};
 private pending:Promise<boolean>|undefined;
 private prepared='';
 constructor(private client:UpdaterClient,private current:string,private recover:()=>void=()=>{},private prepareInstall:(target:string)=>Promise<void>=async()=>{},private downloaded:(files:string[],version:string)=>Promise<void>=async()=>{}){
  client.autoDownload=false;client.autoInstallOnAppQuit=false;client.allowPrerelease=false;client.allowDowngrade=false;
  client.disableWebInstaller=true;client.disableDifferentialDownload=true;
  client.setFeedURL({provider:'github',owner:'GunHeeKim127',repo:'keyboard-cat',releaseType:'release'});
  client.on('download-progress',value=>{if(this.state.phase==='downloading')this.state={phase:'downloading',progress:Math.max(0,Math.min(100,Number.isFinite(value.percent)?value.percent:0)),message:'업데이트를 다운로드하고 있어요.'};});
  client.on('error',()=>this.fail());
 }
 private fail(){this.state={phase:'error',progress:0,message:'업데이트를 적용하지 못했어요. 현재 앱은 계속 사용할 수 있어요. 다시 확인하거나 파일을 직접 받아 설치해 주세요.'};this.recover();return false;}
 private failed(){return this.state.phase==='error';}
 startupConfirmed(result:{removed:number;retained:number}){if(this.state.phase==='idle')this.state={phase:'idle',progress:0,message:result.retained?'새 앱이 시작됐지만 확인이 필요한 이전 보관본은 남겨 두었어요.':result.removed?'새 버전의 정상 시작을 확인하고 이전 실행파일과 보관본을 정리했어요.':''};}
 invalidate(version?:string,asset?:string){if(this.state.phase==='ready'&&this.prepared!==version+'/'+asset){this.prepared='';this.state={phase:'idle',progress:0,message:''};}}
 download(version:string,asset:string){
  if(this.pending)return this.pending;
  if(this.state.phase==='installing')return Promise.resolve(false);
  if(this.state.phase==='ready')return Promise.resolve(this.prepared===version+'/'+asset);
  if(!newerVersion(version,this.current))return Promise.resolve(false);
  this.pending=this.prepare(version,asset).finally(()=>{this.pending=undefined;});return this.pending;
 }
 private async prepare(version:string,asset:string){
  try{
   this.state={phase:'checking',progress:0,message:'설치 파일 정보를 확인하고 있어요.'};
   const result=await this.client.checkForUpdates();
   if(!result||!validInstallerInfo(result.updateInfo,version,asset))return this.fail();
   this.state={phase:'downloading',progress:0,message:'업데이트를 다운로드하고 있어요.'};
   const files=await this.client.downloadUpdate();
   if(this.state.phase==='error'||!files.length)return this.fail();
   await this.downloaded(files,version);
   this.prepared=version+'/'+asset;this.state={phase:'ready',progress:100,message:'준비됐어요. 설치하면 앱이 종료되고 새 버전으로 다시 시작해요.'};return true;
  }catch{return this.fail();}
 }
 async update(version:string,asset:string,beforeQuit:(version:string,asset:string)=>void){
  if(!await this.download(version,asset)||this.prepared!==version+'/'+asset)return false;
  return this.install(beforeQuit);
 }
 async install(beforeQuit:(version:string,asset:string)=>void){
  if(this.state.phase!=='ready')return false;
  this.state={phase:'installing',progress:100,message:'이전 버전을 보관하고 설치를 준비하고 있어요.'};
  try{const [version,asset]=this.prepared.split('/');await this.prepareInstall(version);if(this.failed())return false;beforeQuit(version,asset);this.client.quitAndInstall(true,true);return !this.failed();}catch{return this.fail();}
 }
}
