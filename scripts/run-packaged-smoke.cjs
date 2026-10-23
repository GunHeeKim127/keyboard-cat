const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(process.argv[2]),exe=process.platform==='darwin'?path.join(root,'Contents/MacOS/Keyboard Cat'):path.join(root,'Keyboard Cat.exe');
fs.mkdirSync('work/launcher-reports',{recursive:true});const output=fs.createWriteStream(`work/launcher-reports/smoke-${process.platform}-${process.arch}.log`);
const p=spawn(exe,['--smoke-test'],{windowsHide:true,stdio:['ignore','pipe','pipe']});let report='';p.stdout.on('data',d=>{report+=d;output.write(d);});p.stderr.on('data',d=>output.write(d));
const timer=setTimeout(()=>{p.kill();console.error('Packaged smoke timed out');process.exitCode=1;},180000);
p.on('error',e=>{clearTimeout(timer);console.error(e.message);process.exitCode=1;output.end();});p.on('exit',code=>{clearTimeout(timer);output.end();if(code!==0||!report.includes('SMOKE_OK ')){console.error('Packaged smoke failed: '+code);process.exitCode=1;}else console.log('PACKAGED_SMOKE_OK '+process.platform+' '+process.arch);});
