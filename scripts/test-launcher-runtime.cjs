// Integration fixture: real Electron processes and production launcher/store,
// ephemeral trust key and worker fixture. Never uses the user's app/profile.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,execFileSync}=require('node:child_process'),asar=require('@electron/asar');
const {CoreStore,coreSigningData,fileHash}=require('../dist-electron/core-store');
const {coreRuntime}=require('../dist-electron/core-runtime');
async function run(){
 const source=path.resolve(process.argv[2]||'release/win-unpacked'),root=path.resolve('work/launcher-runtime-'+process.platform+'-'+process.arch+'-'+Date.now());fs.mkdirSync(root,{recursive:true});
 const copy=path.join(root,process.platform==='darwin'?'Keyboard Cat.app':'app');fs.cpSync(source,copy,{recursive:true});
 const resources=process.platform==='darwin'?path.join(copy,'Contents/Resources'):path.join(copy,'resources'),exe=process.platform==='darwin'?path.join(copy,'Contents/MacOS/Keyboard Cat'):path.join(copy,'Keyboard Cat.exe'),archive=path.join(resources,'app.asar');
 const unpack=path.join(root,'unpack');asar.extractAll(archive,unpack);const keys=crypto.generateKeyPairSync('ed25519'),pub=keys.publicKey.export({type:'spki',format:'pem'});
 fs.writeFileSync(path.join(unpack,'dist-electron/core-trust.js'),'exports.CORE_PUBLIC_KEY='+JSON.stringify(pub)+';');
 const profile=path.join(root,'profile'),events=path.join(root,'events.jsonl');
 fs.writeFileSync(path.join(unpack,'fixture-entry.cjs'),`require('electron').app.setPath('userData',${JSON.stringify(profile)});require('./dist-electron/bootstrap.js');`);
 const pkg=JSON.parse(fs.readFileSync(path.join(unpack,'package.json'),'utf8'));pkg.version='2.1.1';pkg.main='fixture-entry.cjs';fs.writeFileSync(path.join(unpack,'package.json'),JSON.stringify(pkg));
 const worker=`const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path');const version=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8')).version;app.whenReady().then(async()=>{fs.appendFileSync(${JSON.stringify(events)},JSON.stringify({version,pid:process.pid,parent:process.ppid,rollback:process.env.KEYBOARD_CAT_CORE_ROLLBACK==='1'})+'\\n');if(version!=='2.1.1'&&process.env.KC_QA_MODE==='crash'){app.exit(19);return;}const w=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});await w.loadFile(path.join(__dirname,'../dist/launcher-qa.html'));const screen=await w.webContents.executeJavaScript("new Promise(resolve=>{const i=document.querySelector('img');if(i.complete)resolve(i.naturalWidth>0);else{i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);}setTimeout(()=>resolve(false),5000);})");if(version!=='2.1.1'&&process.env.KC_QA_MODE==='permission'){process.send({type:'core-health',screen,input:'permission'});return;}process.send({type:'core-ready',screen,input:true});setTimeout(()=>app.quit(),1000);});`;
 fs.writeFileSync(path.join(unpack,'dist-electron/main.js'),worker);fs.writeFileSync(path.join(unpack,'dist/launcher-qa.html'),'<!doctype html><meta charset="utf-8"><img src="./sprites/IDLE-0.png">');
 fs.unlinkSync(archive);await asar.createPackage(unpack,archive);
 if(process.platform==='darwin'){
  execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',copy],{stdio:'inherit'});
  const hostFile=path.join(resources,'core-host.json'),host=JSON.parse(fs.readFileSync(hostFile,'utf8'));host.helperBinarySha256=fileHash(path.join(resources,'../MacOS/KeyCounter-mac'));fs.writeFileSync(hostFile,JSON.stringify(host));
  execFileSync('/usr/bin/codesign',['--force','--sign','-',copy],{stdio:'inherit'});
 }
 const runtime=coreRuntime(exe,resources,process.platform,process.arch,require('electron/package.json').version),store=new CoreStore(profile,'2.1.1',runtime,pub);store.prepare();
 pkg.version='2.1.2';fs.writeFileSync(path.join(unpack,'package.json'),JSON.stringify(pkg));const candidate=path.join(root,'candidate.asar');await asar.createPackage(unpack,candidate);
 const m={format:1,version:'2.1.2',runtime,size:fs.statSync(candidate).size,sha256:fileHash(candidate)};m.signature=crypto.sign(null,coreSigningData(m),keys.privateKey).toString('base64');
 const outcomes=[];
 for(const mode of ['healthy','crash','permission','interrupted']){
  // Each scenario has its own known isolated state, never the real application.
  if(fs.existsSync(store.record))fs.unlinkSync(store.record);fs.copyFileSync(candidate,store.file(m));store.stage(m);if(mode==='interrupted')store.candidate();
  fs.writeFileSync(events,'');const started=Date.now();
  await new Promise((resolve,reject)=>{const p=spawn(exe,[],{env:{...process.env,KC_QA_MODE:mode},windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>{p.kill();reject(Error('Launcher scenario timed out: '+mode));},90000);p.on('error',reject);p.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Launcher exit '+code+' in '+mode));});});
  const runs=fs.readFileSync(events,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),j=JSON.parse(fs.readFileSync(store.record,'utf8'));
  if(mode==='healthy'){if(j.active?.version!=='2.1.2'||runs.length!==1||runs[0].version!=='2.1.2')throw Error('Healthy promotion failed');}
  else {if(j.active||j.pending||!j.failure||runs.at(-1)?.version!=='2.1.1')throw Error('Rollback failed: '+mode);if(mode==='permission'&&j.failure.code!=='permission')throw Error('Permission explanation missing');if(mode==='interrupted'&&j.failure.code!=='interrupted')throw Error('Interruption explanation missing');const reopened=new CoreStore(profile,'2.1.1',runtime,pub);if(!reopened.failure())throw Error('Failure history lost');reopened.cancel();if(!reopened.failure().cancelled||fs.existsSync(store.file(m)))throw Error('Cancellation did not preserve old version');}
  outcomes.push({mode,elapsedMs:Date.now()-started,runs,failure:j.failure?.code,promoted:!!j.active});console.log('LAUNCHER_SCENARIO_OK '+mode);
 }
 const report={platform:process.platform,arch:process.arch,realElectronProcesses:true,productionLauncher:true,testWorkerAndEphemeralKey:true,physicalInputPermissionNotClaimed:true,outcomes};fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));fs.mkdirSync('work/launcher-reports',{recursive:true});fs.writeFileSync(`work/launcher-reports/${process.platform}-${process.arch}.json`,JSON.stringify(report,null,2));console.log('LAUNCHER_RUNTIME_OK '+root);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
