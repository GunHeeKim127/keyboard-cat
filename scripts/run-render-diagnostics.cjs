const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const mode=process.argv[2]??'baseline',flags={baseline:[],warm:['--timing-warm-start'],reverse:['--timing-reverse-order'],hidden:['--timing-hidden-pet']}[mode];if(!flags)throw Error('Unknown timing mode');
const prefix=`work/render-diagnostics/${process.platform}-${process.arch}-${mode}`;
fs.mkdirSync('work/render-diagnostics',{recursive:true});const out=fs.createWriteStream(prefix+'.log');let report='';
const child=spawn(require('electron'),[path.resolve('.'),'--smoke-test','--typing-diagnostics',...flags],{stdio:['ignore','pipe','pipe'],windowsHide:true});
child.stdout.on('data',b=>{report+=b;out.write(b);});child.stderr.on('data',b=>out.write(b));
const timer=setTimeout(()=>{child.kill();process.exitCode=1;console.error('Render diagnostic timed out');},180000);
child.on('error',e=>{clearTimeout(timer);console.error(e.message);process.exitCode=1;out.end();});
child.on('exit',code=>{clearTimeout(timer);out.end();const line=report.split(/\r?\n/).find(x=>x.startsWith('RENDER_DIAGNOSTICS_OK '));if(code!==0||!line){process.exitCode=1;console.error('Render diagnostic failed '+code);return;}fs.writeFileSync(prefix+'.json',JSON.stringify(JSON.parse(line.slice('RENDER_DIAGNOSTICS_OK '.length)),null,2));console.log('RENDER_DIAGNOSTICS_PASSED '+process.platform+' '+process.arch+' '+mode);});
