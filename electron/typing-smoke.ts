import {BrowserWindow} from 'electron';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {presets,Options} from './options';
export async function typingSmoke(apply:(v:unknown)=>void,input:(n:number)=>void,options:()=>Options,writes:()=>number,pet:BrowserWindow){
 const saved=options(),wait=(n:number)=>new Promise(r=>setTimeout(r,n));
 const editor=new BrowserWindow({width:420,height:180,show:false,webPreferences:{partition:'typing-smoke-'+process.pid,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 editor.webContents.setWindowOpenHandler(()=>({action:'deny'}));editor.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));editor.webContents.session.setPermissionCheckHandler(()=>false);
 const html='<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><label>입력 반응 자동 검사 · 입력 내용은 저장하지 않습니다<textarea autofocus style="width:95%;height:70px"></textarea></label>';
 const phases=[];
 try{
  await editor.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));editor.show();editor.focus();editor.webContents.focus();
  for(const active of [false,true,false]){
   apply({...presets.low,quality:'custom',fps:8,pet:'parrot',parrotBreed:'cockatoo',effects:active,autoSleep:false,wander:active,desktopRoam:active,windowWalk:active,gravity:active,edgeClimb:active,folderPlay:active});await wait(300);
   editor.focus();editor.webContents.focus();await wait(500);
   await editor.webContents.executeJavaScript(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))`);
   await editor.webContents.executeJavaScript(`(()=>{const t=document.querySelector('textarea');t.value='';t.focus();window.samples=[];window.inputSamples=[];window.queue=[];t.oninput=()=>{const start=window.queue.shift();if(start!==undefined){window.inputSamples.push(Date.now()-start);requestAnimationFrame(()=>window.samples.push(Date.now()-start));}};})()`);
   const loop=monitorEventLoopDelay({resolution:5});loop.enable();
   for(let i=0;i<80;i++){
    if(active)input(1);
    await editor.webContents.executeJavaScript('window.queue.push(Date.now())');
    editor.webContents.sendInputEvent({type:'keyDown',keyCode:'A'});editor.webContents.sendInputEvent({type:'char',keyCode:'a'});editor.webContents.sendInputEvent({type:'keyUp',keyCode:'A'});await wait(20);
   }
   await wait(120);loop.disable();
   const result=await editor.webContents.executeJavaScript(`(()=>{const a=window.samples.sort((a,b)=>a-b),b=window.inputSamples.sort((a,b)=>a-b);return {characters:document.querySelector('textarea').value.length,measured:a.length,inputP95ms:b[Math.floor((b.length-1)*.95)]||0,paintP95ms:a[Math.floor((a.length-1)*.95)]||0,paintMaxMs:a[a.length-1]||0};})()`);
   if(result.characters!==80||result.measured!==80)throw Error('Typing lost or duplicated input');
   phases.push({active,...result,eventLoopP95ms:Math.round(loop.percentile(95)/1e6)});
  }
  // A long parrot combo exceeds the old four-second wander delay.
  apply({...options(),effects:true,wander:true,desktopRoam:true,windowWalk:true,gravity:true,edgeClimb:true,folderPlay:true});await wait(1600);input(20);await wait(120);const before=pet.getPosition(),sent=writes();await wait(3950);
  if(pet.getPosition().some((n,i)=>n!==before[i])||writes()!==sent)throw Error('Keyboard combo moved the window');
  await wait(650);if(pet.getPosition().every((n,i)=>n===before[i]))throw Error('Movement did not resume after the combo');
  return {phases,comboPositionFrozen:true,movementResumed:true,scope:'isolated Electron editor; OS typing and IME not simulated'};
 }finally{editor.destroy();apply(saved);}
}
