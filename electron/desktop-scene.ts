import {spawn,ChildProcess} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Scene,emptyScene,parseScene,Rect,safeRect} from './desktop-world';
// Native Electron Rectangle arguments require integers even on fractional DPI layouts.
export function nativeSceneRect(r:Rect):Rect{if(!safeRect(r))throw new Error('Invalid scene rectangle');const x=Math.floor(r.x),y=Math.floor(r.y);return {x,y,width:Math.ceil(r.x+r.width)-x,height:Math.ceil(r.y+r.height)-y};}
export class DesktopSceneMonitor{
 scene:Scene=emptyScene();status='꺼짐';private child?:ChildProcess;private watchdog?:ReturnType<typeof setInterval>;private last=0;private folders=false;
 constructor(private executable:string,private convert:(r:Rect)=>Rect){}
 start(folders=false){if(this.child&&this.folders===folders)return;if(this.child)this.stop();this.folders=folders;this.status='창·폴더 위치 확인 중';this.last=Date.now();
  let child:ChildProcess;try{child=spawn(this.executable,[String(process.pid),'--watch',...(folders?['--folders']:[])],{windowsHide:true,stdio:['ignore','pipe','ignore']});}catch{this.status='위치 인식 시작 실패';return;}this.child=child;
  const finish=()=>{if(this.child!==child)return;this.child=undefined;this.scene=emptyScene();this.status='위치 인식 중단 · 기능을 껐다 켜서 다시 연결하세요';if(this.watchdog)clearInterval(this.watchdog);this.watchdog=undefined;};
  let bytes=0;child.stdout?.on('data',(d:Buffer)=>{bytes+=d.length;if(bytes>512*1024){child.kill();finish();}});
  if(child.stdout)createInterface({input:child.stdout}).on('line',line=>{bytes=0;if(this.child!==child||line.length>256*1024)return;try{const s=parseScene(JSON.parse(line));if(!s){console.error('Desktop scene rejected');return;}const mapped={...s,windows:s.windows.map(w=>({...w,rect:this.convert(w.rect)})),folders:s.folders.map(f=>({...f,rect:this.convert(f.rect)})),icons:s.icons?.map(i=>({...i,rect:this.convert(i.rect)}))};const checked=parseScene(mapped);if(!checked)return;this.scene=checked;this.last=Date.now();this.status=!this.folders?'창 위치 인식 중':s.foldersAvailable?'창·바탕화면 아이콘 인식 중':'창 인식 중 · 바탕화면 아이콘 위치를 읽지 못했어요';}catch(error){this.status='위치 정보 변환 실패';console.error('Desktop scene conversion failed',error instanceof Error?error.message:'invalid scene');}});
  child.once('error',finish);child.once('exit',(code,signal)=>{if(this.child===child)console.error('Desktop scene exited',code,signal);finish();});this.watchdog=setInterval(()=>{if(Date.now()-this.last>5000){child.kill();finish();}},1000);
 }
 stop(){const c=this.child;this.child=undefined;if(this.watchdog)clearInterval(this.watchdog);this.watchdog=undefined;c?.kill();this.scene=emptyScene();this.status='꺼짐';}
}
