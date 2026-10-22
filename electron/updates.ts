import https from 'node:https';
import type {InstallState} from './installed-updater';
export const releasesURL='https://github.com/GunHeeKim127/keyboard-cat/releases';
const apiURL='https://api.github.com/repos/GunHeeKim127/keyboard-cat/releases/latest';
export type UpdateInfo={status:'available'|'current'|'empty'|'error';version?:string;notes?:string;downloadReady?:boolean;message:string;installation?:InstallState};
type Release={version:string;notes:string;page:string;download?:string};
function versionParts(value:string){return /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)?value.replace(/^v/,'').split('.').map(Number):null;}
export function newerVersion(candidate:string,current:string){const a=versionParts(candidate),b=versionParts(current);if(!a||!b||[...a,...b].some(v=>!Number.isSafeInteger(v)))return false;for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
const canonical=(name:string)=>name.toLowerCase().replace(/[ ._]+/g,'-');
export function parseRelease(value:unknown,platform:string,arch:string,portable:boolean):Release|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const r=value as Record<string,unknown>,tag=r.tag_name;
 if(r.draft!==false||r.prerelease!==false||typeof tag!=='string'||!versionParts(tag))return null;
 const version=tag.replace(/^v/,''),page=releasesURL+'/tag/'+tag;
 const windowsPortable=[`Keyboard Cat ${version}.exe`,`Keyboard-Cat-${version}-portable.exe`],windowsSetup=[`Keyboard Cat Setup ${version}.exe`,`Keyboard-Cat-${version}-setup.exe`];
 const preferred=platform==='win32'?(portable?[...windowsPortable,...windowsSetup]:[...windowsSetup,...windowsPortable]):platform==='darwin'&&['arm64','x64'].includes(arch)?[`Keyboard-Cat-${version}-mac-${arch}.dmg`]:[];
 const assets=Array.isArray(r.assets)?r.assets.slice(0,100):[];let download:string|undefined;
 for(const name of preferred){
  for(const candidate of assets){
   if(!candidate||typeof candidate!=='object')continue;
   const a=candidate as Record<string,unknown>;
   if(typeof a.name!=='string'||canonical(a.name)!==canonical(name)||a.state!=='uploaded'||typeof a.size!=='number'||a.size<=0||typeof a.browser_download_url!=='string')continue;
   try{const url=new URL(a.browser_download_url);if(url.origin==='https://github.com'&&!url.username&&!url.password&&!url.search&&!url.hash&&decodeURIComponent(url.pathname)===`/GunHeeKim127/keyboard-cat/releases/download/${tag}/${a.name}`){download=url.href;break;}}catch{/* Reject malformed URLs. */}
  }
  if(download)break;
 }
 return {version,notes:typeof r.body==='string'?r.body.slice(0,4000):'',page,download};
}
// Main process only. No credentials, settings, paths, or input counts are sent.
export function fetchLatestRelease():Promise<unknown>{
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>request.destroy(new Error('timeout')),10000);
  const request=https.get(apiURL,{headers:{'User-Agent':'Keyboard-Cat-update-check','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}},response=>{
   if(response.statusCode===404){response.resume();clearTimeout(timer);resolve(null);return;}
   if(response.statusCode!==200){response.resume();clearTimeout(timer);reject(new Error('release unavailable'));return;}
   let size=0;const chunks:Buffer[]=[];
   response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>1024*1024){request.destroy(new Error('response too large'));return;}chunks.push(chunk);});
   response.on('error',error=>{clearTimeout(timer);reject(error);});
   response.on('end',()=>{clearTimeout(timer);try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new Error('invalid response'));}});
  });
  request.on('error',error=>{clearTimeout(timer);reject(error);});
 });
}
export class UpdateChecker{
 private result:UpdateInfo|undefined;private release:Release|null=null;private checked=0;private pending:Promise<UpdateInfo>|undefined;
 constructor(private current:string,private platform:string,private arch:string,private portable:boolean,private fetchRelease=fetchLatestRelease,private open:(url:string)=>Promise<void>=async()=>{}){}
 selectedInstaller(){return this.result?.status==='available'&&this.release?.download?{version:this.release.version,asset:decodeURIComponent(new URL(this.release.download).pathname.split('/').pop()!)}:undefined;}
 check():Promise<UpdateInfo>{
  if(this.pending)return this.pending;
  if(this.result&&Date.now()-this.checked<60000)return Promise.resolve(this.result);
  this.pending=this.perform().finally(()=>{this.pending=undefined;});return this.pending;
 }
 private async perform():Promise<UpdateInfo>{
  this.release=null;
  try{
   const raw=await this.fetchRelease(),r=parseRelease(raw,this.platform,this.arch,this.portable);this.release=r;
   this.result=!r?{status:'empty',message:'아직 확인할 수 있는 정식 릴리스가 없어요.'}:newerVersion(r.version,this.current)?{status:'available',version:r.version,notes:r.notes,downloadReady:!!r.download,message:r.download?'새 버전을 다운로드할 수 있어요.':'새 버전이 있지만 이 PC용 파일이 아직 없어요. 릴리스 내용을 확인해 주세요.'}:{status:'current',message:'현재 버전보다 새로운 정식 릴리스가 없어요.'};
  }catch{this.result={status:'error',message:'업데이트를 확인하지 못했어요. 인터넷 연결을 확인하고 잠시 후 다시 눌러 주세요.'};}
  this.checked=Date.now();return this.result;
 }
 async download(){if(this.result?.status!=='available'||!this.release?.download)return false;await this.open(this.release.download);return true;}
 async openNotes(){await this.open(this.release?.page??releasesURL);return true;}
}
