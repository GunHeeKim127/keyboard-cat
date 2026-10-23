import type {ChildProcess} from 'node:child_process';
import {CoreStore,CoreManifest,CoreFailureCode} from './core-store';
// Only the private parent/child channel can request a switch or confirm health.
export class CoreSupervisor{
 private child:ChildProcess|undefined;private stopping=false;private restart=false;
 private candidate:CoreManifest|undefined;private timer:ReturnType<typeof setTimeout>|undefined;
 private generation=0;private failed=false;private installer=false;
 private reason:CoreFailureCode='crash';
 constructor(private store:CoreStore,private launch:(candidate:CoreManifest|undefined,rollback:boolean)=>ChildProcess,private finished:()=>void,private error:(message:string)=>void,private timeout=60000){}
 start(rollback=false){
  if(this.stopping)return;
  try{this.store.recoverActive();}catch{this.error('업데이트 저장 위치를 안전하게 확인하지 못했어요. 기존 설치파일로 다시 설치해 주세요.');this.stopping=true;this.finished();return;}
  try{this.candidate=this.store.candidate();}catch{try{this.store.reject();}catch{}this.candidate=undefined;rollback=true;}
  const generation=++this.generation;this.restart=false;this.failed=false;this.reason='crash';
  try{this.child=this.launch(this.candidate,rollback);}catch{this.error('앱을 실행하지 못했어요.');this.stop();this.finished();return;}
  const child=this.child;
  if(this.candidate)this.timer=setTimeout(()=>{if(generation!==this.generation||this.stopping)return;this.failed=true;child.kill();},this.timeout);
  child.on('message',message=>{
   if(generation!==this.generation||this.stopping||this.failed)return;
   const m=message as {type?:unknown;screen?:unknown;input?:unknown};
   if(m?.type==='core-health'){this.reason=m.input==='permission'?'permission':m.screen!==true?'screen':'input';}
   else if(m?.type==='core-ready'&&m.screen===true&&m.input===true){
    try{if(this.candidate)this.store.confirm(this.candidate);this.candidate=undefined;this.clearTimer();}catch{this.failed=true;child.kill();}
   }else if(m?.type==='core-switch')this.restart=true;
   else if(m?.type==='core-installer'){this.installer=true;this.stopping=true;this.clearTimer();this.finished();}
  });
  child.once('error',()=>{if(generation!==this.generation)return;this.error('앱을 실행하지 못했어요. 기존 설치파일로 다시 설치해 주세요.');this.stop();this.finished();});
  child.once('exit',()=>{
   if(generation!==this.generation)return;
   this.clearTimer();if(this.stopping){this.finished();return;}
   const rejected=!!this.candidate;
   if(rejected){try{this.store.reject(this.reason);}catch{}this.candidate=undefined;}
   if(rejected||this.restart)this.start(rejected);else {this.stopping=true;this.finished();}
  });
 }
 activate(){if(this.child?.connected)this.child.send({type:'core-activate'},()=>{});}
 stop(){this.stopping=true;this.clearTimer();if(!this.installer&&this.child?.connected)this.child.send({type:'core-quit'},()=>{});}
 private clearTimer(){if(this.timer)clearTimeout(this.timer);this.timer=undefined;}
}
