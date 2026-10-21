import {ChildProcess} from 'node:child_process';
import {createInterface} from 'node:readline';

export type InputStatus='stopped'|'starting'|'ready'|'permission'|'unavailable'|'error';
type Check='unknown'|'allowed'|'denied';
export type InputDiagnostics={attempt:number;access:Check;request:Check;tap:'unknown'|'created'|'failed'|'invalid'|'disabled';exitCode:number|null;signal:string|null;launchError:'none'|'not-found'|'permission-denied'|'other';timedOut:boolean};
export class InputMonitor {
 private child:ChildProcess|undefined;
 private retry:ReturnType<typeof setTimeout>|undefined;
 private timeout:ReturnType<typeof setTimeout>|undefined;
 status:InputStatus='stopped';
 diagnostics:InputDiagnostics={attempt:0,access:'unknown',request:'unknown',tap:'unknown',exitCode:null,signal:null,launchError:'none',timedOut:false};
 constructor(private platform:string,private launch:(prompt:boolean)=>ChildProcess,private onCount:(n:number)=>void,private onStatus:(status:InputStatus)=>void){}
 private change(status:InputStatus){this.status=status;this.onStatus(status);}
 private clearTimers(){if(this.retry)clearTimeout(this.retry);if(this.timeout)clearTimeout(this.timeout);this.retry=this.timeout=undefined;}
 start(prompt=true){
  if(this.child)return;
  this.clearTimers();this.diagnostics={attempt:this.diagnostics.attempt+1,access:'unknown',request:'unknown',tap:'unknown',exitCode:null,signal:null,launchError:'none',timedOut:false};this.change('starting');
  let child:ChildProcess;
  const launchError=(error:unknown)=>{const code=(error as NodeJS.ErrnoException|null)?.code;this.diagnostics.launchError=code==='ENOENT'?'not-found':code==='EACCES'||code==='EPERM'?'permission-denied':'other';};
  try{child=this.launch(prompt);}catch(error){launchError(error);this.change('error');return;}
  this.child=child;
  const finish=(code:number|null,signal?:NodeJS.Signals|null)=>{
   if(this.child!==child)return;
   this.child=undefined;if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;this.diagnostics.exitCode=code;this.diagnostics.signal=signal||null;
   const recoverable=this.platform==='darwin'&&this.diagnostics.launchError==='none'&&(code===77||code===78||(code===0&&this.status==='ready')||signal==='SIGKILL'||signal==='SIGTERM'||this.status==='permission'||this.status==='unavailable');
   this.change(code===77||this.status==='permission'?'permission':code===78||this.status==='unavailable'?'unavailable':'error');
   if(recoverable)this.retry=setTimeout(()=>this.start(false),5000);
  };
  child.on('error',error=>{if(this.child!==child)return;launchError(error);finish(null);});child.on('exit',finish);
  if(!child.stdout||!child.stderr){this.child=undefined;child.kill();this.change('error');return;}
  const ready=()=>{if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;this.change('ready');};
  createInterface({input:child.stderr}).on('line',line=>{
   if(this.child!==child)return;
   // Keep only fixed diagnostic tokens; arbitrary stderr and key data are never retained.
   const tokens:Record<string,()=>void>={ACCESS_ALLOWED:()=>{this.diagnostics.access='allowed';},ACCESS_DENIED:()=>{this.diagnostics.access='denied';},REQUEST_ALLOWED:()=>{this.diagnostics.request='allowed';},REQUEST_DENIED:()=>{this.diagnostics.request='denied';},TAP_CREATED:()=>{this.diagnostics.tap='created';},TAP_CREATE_FAILED:()=>{this.diagnostics.tap='failed';},TAP_INVALID:()=>{this.diagnostics.tap='invalid';},TAP_DISABLED:()=>{this.diagnostics.tap='disabled';}};
   if(Object.hasOwn(tokens,line)){tokens[line]();this.change(this.status);return;}
   if(line==='INPUT_READY'||line==='RAW_INPUT_READY')ready();
   else if(line==='PERMISSION_REQUIRED'){if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;this.change('permission');}
   else if(line==='EVENT_TAP_UNAVAILABLE')this.change('unavailable');
  });
  createInterface({input:child.stdout}).on('line',line=>{
   if(this.child!==child||!/^[0-9]{1,4}$/.test(line))return;
   const n=Number(line);if(n<1||n>1000)return;
   if(this.status!=='ready')ready();this.onCount(n);
  });
  this.timeout=setTimeout(()=>{if(this.child===child){this.child=undefined;child.kill();this.timeout=undefined;this.diagnostics.timedOut=true;this.change(this.platform==='darwin'?'unavailable':'error');if(this.platform==='darwin')this.retry=setTimeout(()=>this.start(false),5000);}},30000);
 }
 stop(){this.clearTimers();const child=this.child;this.child=undefined;child?.kill();this.change('stopped');}
 retryNow(){if(!this.child&&(this.status==='permission'||this.status==='unavailable'))this.start(false);}
}
export function inputError(status:InputStatus){
 return status==='permission'?'입력 모니터링 권한 필요 · 허용 후 자동으로 다시 연결합니다':status==='unavailable'?'macOS 입력 감지 시작 실패 · 권한 확인 후 다시 연결':status==='error'?'입력 감지 중단 · 다시 연결을 눌러주세요':'';
}
