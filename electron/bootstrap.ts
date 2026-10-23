// Stable installed launcher: downloaded code runs only in a supervised worker.
import {app,dialog} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {CoreStore} from './core-store';
import {coreRuntime} from './core-runtime';
import {CoreSupervisor} from './core-supervisor';
import {useSupervisor} from './launcher-policy';
const worker=process.argv.includes('--keyboard-cat-core-worker');
const installed=fs.existsSync(path.join(path.dirname(process.execPath),'Uninstall Keyboard Cat.exe'));
if(!useSupervisor(process.platform,app.isPackaged,process.argv.includes('--smoke-test'),!!process.env.PORTABLE_EXECUTABLE_FILE,installed))require('./main');
else{
 const runtime=coreRuntime(process.execPath,process.resourcesPath,process.platform,process.arch,process.versions.electron);
 const base=app.getVersion(),profile=app.getPath('userData'),store=new CoreStore(profile,base,runtime);
 if(worker){
  if(!process.send||!process.connected)app.exit(1);
  else try{
   const hash=process.env.KEYBOARD_CAT_CORE_CANDIDATE;
   const selected=hash?store.workerCandidate(hash):store.active();
   if(selected){const archive=store.verify(selected),pkg=JSON.parse(fs.readFileSync(path.join(archive,'package.json'),'utf8'));if(pkg.version!==selected.version)throw Error('Core version mismatch');require(path.join(archive,'dist-electron','main.js'));}
   else require('./main');
  }catch(error){console.error('Keyboard Cat core startup failed:',error);app.exit(1);}
 }else{
  const launcherProfile=path.join(profile,'launcher');fs.mkdirSync(launcherProfile,{recursive:true});app.setPath('userData',launcherProfile);
  if(!app.requestSingleInstanceLock())app.quit();
  else{
   const supervisor=new CoreSupervisor(store,(candidate,rollback)=>{
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.KEYBOARD_CAT_CORE_CANDIDATE;delete env.KEYBOARD_CAT_CORE_ROLLBACK;
    if(candidate)env.KEYBOARD_CAT_CORE_CANDIDATE=candidate.sha256;
    if(rollback)env.KEYBOARD_CAT_CORE_ROLLBACK='1';
    const child=spawn(process.execPath,['--keyboard-cat-core-worker'],{env,windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});
    let bytes=0;child.stderr?.on('data',(chunk:Buffer)=>{if(bytes<16384)process.stderr.write(chunk.subarray(0,16384-bytes));bytes+=chunk.length;});return child;
   },()=>app.quit(),message=>dialog.showErrorBox('Keyboard Cat 실행 확인',message));
   app.on('second-instance',()=>supervisor.activate());app.on('activate',()=>supervisor.activate());
   app.on('window-all-closed',()=>{});app.on('before-quit',()=>supervisor.stop());
   app.whenReady().then(()=>{if(process.platform==='darwin')app.dock?.hide();supervisor.start();}).catch(()=>app.quit());
  }
 }
}
