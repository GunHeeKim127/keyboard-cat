const {spawn,execFileSync}=require('node:child_process');const path=require('node:path');
const exe=path.resolve('native/KeyCounter.exe');
execFileSync(exe,['--self-test'],{stdio:'inherit',windowsHide:true});
const child=spawn(exe,[String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});let ready=false;
child.stderr.on('data',b=>{if(String(b).includes('RAW_INPUT_READY'))ready=true;});
child.on('error',()=>{process.exitCode=1;});
// Physical Raw Input is not the same as injected keystrokes; do not pretend SendInput proves it.
setTimeout(()=>{child.kill();console.log(JSON.stringify({registration:ready?'PASS':'FAIL',physicalKeyTest:'manual'}));if(!ready)process.exitCode=1;},500);
