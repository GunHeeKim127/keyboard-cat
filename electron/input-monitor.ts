import {ChildProcess} from 'node:child_process';
import {createInterface} from 'node:readline';

export type InputStatus='stopped'|'starting'|'ready'|'permission'|'unavailable'|'error';
export class InputMonitor {
 private child:ChildProcess|undefined;
 private retry:ReturnType<typeof setTimeout>|undefined;
 private timeout:ReturnType<typeof setTimeout>|undefined;
 status:InputStatus='stopped';
 constructor(private platform:string,private launch:(prompt:boolean)=>ChildProcess,private onCount:(n:number)=>void,private onStatus:(status:InputStatus)=>void){}
 private change(status:InputStatus){this.status=status;this.onStatus(status);}
 private clearTimers(){if(this.retry)clearTimeout(this.retry);if(this.timeout)clearTimeout(this.timeout);this.retry=this.timeout=undefined;}
 start(prompt=true){
  if(this.child)return;
  this.clearTimers();this.change('starting');
  let child:ChildProcess;
  try{child=this.launch(prompt);}catch{this.change('error');return;}
  this.child=child;
  const finish=(code:number|null,signal?:NodeJS.Signals|null)=>{
   if(this.child!==child)return;
   this.child=undefined;if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;
   const recoverable=this.platform==='darwin'&&(code===77||code===78||signal==='SIGKILL'||signal==='SIGTERM'||this.status==='permission'||this.status==='unavailable');
   this.change(code===77||this.status==='permission'?'permission':code===78||this.status==='unavailable'?'unavailable':'error');
   if(recoverable)this.retry=setTimeout(()=>this.start(false),5000);
  };
  child.on('error',()=>finish(null));child.on('exit',finish);
  if(!child.stdout||!child.stderr){this.child=undefined;child.kill();this.change('error');return;}
  const ready=()=>{if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;this.change('ready');};
  createInterface({input:child.stderr}).on('line',line=>{
   if(this.child!==child)return;
   if(line==='INPUT_READY'||line==='RAW_INPUT_READY')ready();
   else if(line==='PERMISSION_REQUIRED'){if(this.timeout)clearTimeout(this.timeout);this.timeout=undefined;this.change('permission');}
   else if(line==='EVENT_TAP_UNAVAILABLE')this.change('unavailable');
  });
  createInterface({input:child.stdout}).on('line',line=>{
   if(this.child!==child||!/^[0-9]{1,4}$/.test(line))return;
   const n=Number(line);if(n<1||n>1000)return;
   if(this.status!=='ready')ready();this.onCount(n);
  });
  this.timeout=setTimeout(()=>{if(this.child===child){this.child=undefined;child.kill();this.timeout=undefined;this.change('error');}},30000);
 }
 stop(){this.clearTimers();const child=this.child;this.child=undefined;child?.kill();this.change('stopped');}
 retryNow(){if(!this.child&&(this.status==='permission'||this.status==='unavailable'))this.start(false);}
}
export function inputError(status:InputStatus){
 return status==='permission'?'입력 모니터링 권한 필요 · 허용 후 자동으로 다시 연결합니다':status==='unavailable'?'macOS 입력 감지 시작 실패 · 권한 확인 후 다시 연결':status==='error'?'입력 감지 중단 · 다시 연결을 눌러주세요':'';
}
