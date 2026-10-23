import {promises as fs,createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {newerVersion} from './updates';
type Entry={kind:'download'|'portable';file:string;version:string;target:string;installDirectory:string;sha256:string};
const validVersion=(v:unknown):v is string=>typeof v==='string'&&/^\d+\.\d+\.\d+$/.test(v)&&newerVersion(v,'0.0.0');
async function digest(file:string){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
async function regular(file:string){const s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size<2||s.size>512*1024*1024)throw Error('Invalid managed executable');if(await fs.realpath(file)!==path.resolve(file))throw Error('Linked managed executable');return s;}
export class ManagedUpdateFiles{
 private pending:Promise<void>=Promise.resolve();
 readonly record:string;
 readonly installDirectory:string;
 readonly cacheDirectory:string;
 readonly root:string;
 constructor(private userData:string,localData:string){
  this.record=path.join(userData,'managed-update-files.json');
  this.root=path.join(localData,'KeyboardCat');
  this.installDirectory=path.join(this.root,'app');
  this.cacheDirectory=path.join(this.root,'keyboard-cat-updater','pending');
 }
 async checkInstallDirectory(){
  for(let dir=this.installDirectory;;dir=path.dirname(dir)){
   try{const s=await fs.lstat(dir);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Linked install directory');}
   catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
   if(path.dirname(dir)===dir)break;
  }
  try{await fs.lstat(this.installDirectory);if(!(await fs.readdir(this.installDirectory)).length)return;await regular(path.join(this.installDirectory,'Keyboard Cat.exe'));await regular(path.join(this.installDirectory,'resources','app.asar'));await regular(path.join(this.installDirectory,'Uninstall Keyboard Cat.exe'));}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
   // Missing root is fine, an existing unrelated/incomplete directory is not.
   try{await fs.lstat(this.installDirectory);}catch(missing){if((missing as NodeJS.ErrnoException).code==='ENOENT')return;throw missing;}
   throw Error('Existing destination is not a complete Keyboard Cat installation');
  }
 }
 private valid(e:Entry){
  if(!e||!validVersion(e.version)||!validVersion(e.target)||typeof e.file!=='string'||!path.isAbsolute(e.file)||typeof e.installDirectory!=='string'||!path.isAbsolute(e.installDirectory)||!/^[a-f0-9]{64}$/.test(e.sha256))return false;
  const name=path.basename(e.file);
  if(e.kind==='download')return path.dirname(e.file)===this.cacheDirectory&&name===`Keyboard-Cat-${e.version}-setup.exe`&&e.target===e.version;
  return e.kind==='portable'&&e.installDirectory===this.installDirectory&&newerVersion(e.target,e.version)&&[ `Keyboard-Cat-${e.version}-portable.exe`,`Keyboard Cat ${e.version}.exe`].includes(name);
 }
 private async read():Promise<Entry[]>{
  try{const s=await fs.lstat(this.record);if(!s.isFile()||s.isSymbolicLink()||s.size>65536)throw Error('Invalid update file record');const entries=JSON.parse(await fs.readFile(this.record,'utf8'));if(!Array.isArray(entries)||entries.length>100||!entries.every(e=>this.valid(e)))throw Error('Invalid update file entries');return entries;}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
 }
 private async write(entries:Entry[]){
  if(entries.length>100)throw Error('Too many retained update files');
  const temporary=this.record+'.'+randomUUID()+'.next';await fs.writeFile(temporary,JSON.stringify(entries),{flag:'wx'});await fs.rename(temporary,this.record);
 }
 private serial<T>(work:()=>Promise<T>){const next=this.pending.then(work,work);this.pending=next.then(()=>{},()=>{});return next;}
 rememberDownload(files:string[],version:string,installDirectory:string){return this.serial(()=>this.addDownload(files,version,installDirectory));}
 private async addDownload(files:string[],version:string,installDirectory:string){
  if(files.length!==1)throw Error('Unexpected downloaded package count');
  const file=path.resolve(files[0]);await regular(file);
  const entry:Entry={kind:'download',file,version,target:version,installDirectory,sha256:await digest(file)};
  if(!this.valid(entry))throw Error('Unexpected download location');
  const entries=await this.read();await this.write([...entries.filter(e=>e.file!==file),entry]);
 }
 rememberPortable(file:string,current:string,target:string){return this.serial(()=>this.addPortable(file,current,target));}
 private async addPortable(file:string,current:string,target:string){
  // Capture only the running portable executable supplied by the main process.
  // Unknown/renamed downloads stay untouched; there is no disk-wide filename scan.
  const entry:Entry={kind:'portable',file:path.resolve(file),version:current,target,installDirectory:this.installDirectory,sha256:''};
  await regular(entry.file);entry.sha256=await digest(entry.file);
  if(!this.valid(entry))throw Error('Portable filename does not identify the current version');
  const entries=await this.read();await this.write([...entries.filter(e=>e.file!==entry.file),entry]);
 }
 confirm(current:string,installDirectory:string){return this.serial(()=>this.clean(current,installDirectory));}
 private async clean(current:string,installDirectory:string){
  const result={removed:0,retained:0};if(!validVersion(current))return result;
  const entries=await this.read(),remaining:Entry[]=[];
  for(const e of entries){
   // Keep the newest installer; remove all recorded older installers after health checks.
   if(e.installDirectory!==installDirectory||(current!==e.target&&!newerVersion(current,e.target))||!newerVersion(current,e.version)){remaining.push(e);continue;}
   try{await regular(e.file);if(await digest(e.file)!==e.sha256)throw Error('Managed executable changed');await fs.unlink(e.file);result.removed++;}
   catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'){remaining.push(e);result.retained++;}}
  }
  await this.write(remaining);return result;
 }
}
