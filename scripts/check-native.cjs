const {spawn,spawnSync,execFileSync}=require('node:child_process');const path=require('node:path');
const exe=path.resolve(process.platform==='darwin'?'native/KeyCounter-mac':'native/KeyCounter.exe');
execFileSync(exe,['--self-test'],{stdio:'inherit',windowsHide:true});
if(process.platform==='darwin'){
 const probe=spawnSync(exe,[String(process.pid),'--no-prompt'],{encoding:'utf8',timeout:2000});
 const status=probe.stderr.includes('INPUT_READY')?'ready':probe.status===77&&probe.stderr.includes('PERMISSION_REQUIRED')?'permission-required':probe.status===78&&probe.stderr.includes('EVENT_TAP_UNAVAILABLE')?'tap-unavailable':'failed';
 console.log(JSON.stringify({noPromptProbe:status,physicalKeyTest:'manual'}));
 if(status==='failed'){console.error(probe.stderr,probe.error?.message||probe.status);process.exit(1);}
 console.log('Parser and no-prompt startup passed; real typing and interactive permission changes remain manual.');process.exit(0);
}
const {InputMonitor}=require('../dist-electron/input-monitor.js');let ready=false;
const monitor=new InputMonitor(process.platform,()=>spawn(exe,[String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']}),()=>{},status=>{if(status==='ready')ready=true;if(status==='error')process.exitCode=1;});
monitor.start();
// Physical Raw Input is not the same as injected keystrokes; do not pretend SendInput proves it.
setTimeout(()=>{monitor.stop();console.log(JSON.stringify({registration:ready?'PASS':'FAIL',physicalKeyTest:'manual'}));if(!ready)process.exitCode=1;},500);
