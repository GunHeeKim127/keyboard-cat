const {spawn,execFileSync}=require('node:child_process');const path=require('node:path');
const exe=path.resolve(process.platform==='darwin'?'native/KeyCounter-mac':'native/KeyCounter.exe');
execFileSync(exe,['--self-test'],{stdio:'inherit',windowsHide:true});
if(process.platform==='darwin'){console.log('Parser self-test passed; Input Monitoring permission and real typing require an interactive Mac session.');process.exit(0);}
const child=spawn(exe,[String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});let ready=false;
child.stderr.on('data',b=>{if(String(b).includes('RAW_INPUT_READY'))ready=true;});
child.on('error',()=>{process.exitCode=1;});
// Physical Raw Input is not the same as injected keystrokes; do not pretend SendInput proves it.
setTimeout(()=>{child.kill();console.log(JSON.stringify({registration:ready?'PASS':'FAIL',physicalKeyTest:'manual'}));if(!ready)process.exitCode=1;},500);
