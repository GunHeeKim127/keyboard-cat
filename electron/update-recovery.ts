import {promises as fs,createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {newerVersion} from './updates';
type Entry={name:string;size:number;sha256:string};
type RecordFile={schema:1;previous:string;target:string;installDirectory:string;files:Entry[]};
const version=(v:unknown):v is string=>typeof v==='string'&&/^\d+\.\d+\.\d+$/.test(v)&&newerVersion(v,'0.0.0');
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function isBundlePath(name:string){
 if(!name||name.includes('\\')||name.includes(':')||name.split('/').some(p=>!p||p==='.'||p==='..'))return false;
 const parts=name.split('/');
 if(parts.length===1)return name==='Keyboard Cat.exe'||name==='vk_swiftshader_icd.json'||/\.(dll|pak|bin|dat)$/.test(name);
 if(parts.length===2&&parts[0]==='locales')return parts[1].endsWith('.pak');
 if(parts.length===2&&parts[0]==='resources')return ['app.asar','app-update.yml','KeyCounter.exe','elevate.exe'].includes(parts[1]);
 return parts.length>=3&&parts[0]==='resources'&&parts[1]==='app.asar.unpacked';
}
async function hash(file:string){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
async function exists(file:string){try{await fs.lstat(file);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}}
async function directory(file:string){const s=await fs.lstat(file);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Recovery directory is not a regular directory');}
async function tree(root:string,prefix=''):Promise<{files:string[];dirs:string[]}>{
 const files:string[]=[],dirs:string[]=[];await directory(root);
 for(const name of await fs.readdir(root)){
  const full=path.join(root,name),relative=prefix?prefix+'/'+name:name,s=await fs.lstat(full);
  if(s.isSymbolicLink())throw Error('Linked recovery entry');
  if(s.isDirectory()){const next=await tree(full,relative);files.push(...next.files);dirs.push(...next.dirs,relative);}
  else if(s.isFile())files.push(relative);else throw Error('Unexpected recovery entry');
 }
 return {files,dirs};
}
async function bundleFiles(root:string){
 const files:string[]=[];
 for(const name of await fs.readdir(root)){
  if(isBundlePath(name)){const s=await fs.lstat(path.join(root,name));if(!s.isFile()||s.isSymbolicLink())throw Error('Linked application binary');files.push(name);}
 }
 for(const folder of ['locales','resources']){
  const dir=path.join(root,folder);if(!await exists(dir))continue;await directory(dir);
  for(const name of await fs.readdir(dir)){
   const relative=folder+'/'+name,full=path.join(dir,name);
   if(isBundlePath(relative)){const s=await fs.lstat(full);if(!s.isFile()||s.isSymbolicLink())throw Error('Linked application resource');files.push(relative);}
   else if(relative==='resources/app.asar.unpacked'){const all=await tree(full,relative);files.push(...all.files);}
  }
 }
 return files;
}
export class UpdateRecovery {
 readonly root:string;
 constructor(private userData:string){this.root=path.join(userData,'update-recovery');}
 private async safeRoot(create=false){
  if(create)await fs.mkdir(this.root,{recursive:true});
  await directory(this.root);
  const actual=await fs.realpath(this.root),parent=await fs.realpath(this.userData);
  if(path.dirname(actual)!==parent)throw Error('Recovery root escaped application data');
 }
 private async read(id:string):Promise<RecordFile>{
  if(!idPattern.test(id))throw Error('Invalid recovery identifier');
  const dir=path.join(this.root,id);await directory(dir);
  const file=path.join(dir,'record.json'),s=await fs.lstat(file);
  if(!s.isFile()||s.isSymbolicLink()||s.size>65536)throw Error('Invalid recovery record');
  const r=JSON.parse(await fs.readFile(file,'utf8')) as RecordFile;
  if(r.schema!==1||!version(r.previous)||!version(r.target)||!newerVersion(r.target,r.previous)||typeof r.installDirectory!=='string'||!path.isAbsolute(r.installDirectory)||!Array.isArray(r.files)||!r.files.length||r.files.length>512)throw Error('Invalid recovery data');
  const names=new Set<string>();for(const entry of r.files){if(!entry||typeof entry.name!=='string'||!isBundlePath(entry.name)||names.has(entry.name)||!Number.isSafeInteger(entry.size)||entry.size<0||typeof entry.sha256!=='string'||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid backup entry');names.add(entry.name);}
  if(!names.has('Keyboard Cat.exe')||!names.has('resources/app.asar'))throw Error('Incomplete recovery bundle');
  return r;
 }
 private async verify(id:string,r:RecordFile,missingAllowed=false){
  const dir=path.join(this.root,id),names=await fs.readdir(dir);
  if(names.some(n=>n!=='app'&&n!=='record.json'))throw Error('Unexpected recovery files');
  const app=path.join(dir,'app'),allowed=new Map(r.files.map(f=>[f.name,f]));
  if(missingAllowed&&!await exists(app))return {files:[],dirs:[]};
  const all=await tree(app),allowedDirs=new Set(r.files.flatMap(f=>f.name.split('/').slice(0,-1).map((_p,i)=>f.name.split('/').slice(0,i+1).join('/'))));
  if(all.files.some(f=>!allowed.has(f)))throw Error('Untracked backup file');
  if(all.dirs.some(d=>!allowedDirs.has(d)))throw Error('Untracked backup directory');
  if(!missingAllowed&&all.files.length!==r.files.length)throw Error('Missing backup files');
  for(const name of all.files){const file=path.join(app,...name.split('/')),entry=allowed.get(name)!;if((await fs.stat(file)).size!==entry.size||await hash(file)!==entry.sha256)throw Error('Backup changed');}
  return all;
 }
 async prepare(installDirectory:string,current:string,target:string){
  if(!version(current)||!version(target)||!newerVersion(target,current)||!path.isAbsolute(installDirectory))throw Error('Invalid update versions');
  await this.safeRoot(true);await directory(installDirectory);
  const source=await fs.realpath(installDirectory);
  if(source===await fs.realpath(this.root)||source.startsWith((await fs.realpath(this.root))+path.sep))throw Error('Cannot update a recovery copy');
  // A retry keeps the already verified snapshot instead of deleting it first.
  const names=await fs.readdir(this.root),records=names.filter(id=>idPattern.test(id)),selected=await bundleFiles(source);
  for(const id of records){
   const r=await this.read(id);
   if(r.previous!==current||r.installDirectory!==source)continue;
   await this.verify(id,r);
   if(selected.length!==r.files.length||selected.some(name=>!r.files.some(f=>f.name===name)))throw Error('Installed bundle files changed');
   for(const entry of r.files){const file=path.join(source,...entry.name.split('/'));if(await hash(file)!==entry.sha256)throw Error('Installed bundle changed since backup');}
   r.target=target;const next=path.join(this.root,id,'record.next');
   await fs.writeFile(next,JSON.stringify(r),{flag:'wx'});await fs.rename(next,path.join(this.root,id,'record.json'));return;
  }
  if(names.filter(n=>idPattern.test(n)||(/^\.staging-/).test(n)).length>=3)throw Error('Previous recovery copies still need confirmation');
  if(selected.length>512)throw Error('Installed bundle exceeds recovery limit');
  if(!selected.includes('Keyboard Cat.exe')||!selected.includes('resources/app.asar'))throw Error('Installed bundle incomplete');
  let bytes=0;for(const name of selected){bytes+=(await fs.stat(path.join(source,...name.split('/')))).size;if(bytes>1024*1024*1024)throw Error('Recovery bundle exceeds size limit');}
  const id=randomUUID(),dest=path.join(this.root,'.staging-'+id),app=path.join(dest,'app');await fs.mkdir(app,{recursive:true});
  const files:Entry[]=[];
  try{
  // Only application binaries are copied; settings and user downloads stay outside.
  for(const name of selected){
   const input=path.join(source,...name.split('/')),output=path.join(app,...name.split('/'));await fs.mkdir(path.dirname(output),{recursive:true});
   const before=await hash(input);await fs.copyFile(input,output);const s=await fs.stat(output);
   if(await hash(output)!==before)throw Error('Backup copy failed verification');files.push({name,size:s.size,sha256:before});
  }
  const r:RecordFile={schema:1,previous:current,target,installDirectory:source,files};
  await fs.writeFile(path.join(dest,'record.json'),JSON.stringify(r),{flag:'wx'});
  await fs.rename(dest,path.join(this.root,id));await this.verify(id,r);
  }catch(error){
   // Remove only this attempt's private staging copy; never the source or a prior backup.
   try{await this.safeRoot();if(await exists(dest)){
    await directory(dest);const all=await tree(dest),allowed=new Set(selected.map(f=>'app/'+f));allowed.add('record.json');
    if(all.files.some(f=>!allowed.has(f)))throw Error('Untracked staging file');
    if(path.dirname(await fs.realpath(dest))!==await fs.realpath(this.root))throw Error('Staging escaped recovery root');
    for(const name of all.files)await fs.unlink(path.join(dest,...name.split('/')));
    for(const name of all.dirs)await fs.rmdir(path.join(dest,...name.split('/')));await fs.rmdir(dest);
   }}catch{/* Preserve unexpected content for manual inspection. */}
   throw error;
  }
 }
 // Called only after the new installed app has passed its local startup checks.
 async confirm(current:string,installDirectory:string){
  const result={removed:0,retained:0};if(!version(current)||!await exists(this.root))return result;
  await this.safeRoot();const source=await fs.realpath(installDirectory);
  for(const id of (await fs.readdir(this.root)).filter(id=>idPattern.test(id))){
   try{
    const r=await this.read(id);
    if(r.installDirectory!==source||(current!==r.target&&!newerVersion(current,r.target))){result.retained++;continue;}
    const all=await this.verify(id,r,true),dir=path.join(this.root,id),app=path.join(dir,'app');
    for(const name of all.files)await fs.unlink(path.join(app,...name.split('/')));
    for(const name of all.dirs)await fs.rmdir(path.join(app,...name.split('/')));
    if(await exists(app))await fs.rmdir(app);await fs.unlink(path.join(dir,'record.json'));await fs.rmdir(dir);result.removed++;
   }catch{result.retained++;}
  }
  return result;
 }
}
