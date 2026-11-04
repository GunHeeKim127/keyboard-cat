import {app,BrowserWindow,screen} from 'electron';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {Options,presets} from './options';
export async function renderDiagnostics(apply:(o:unknown)=>void,input:(n:number)=>void,options:()=>Options,pet:BrowserWindow,reset:()=>void){
 const saved=options(),wait=(ms:number)=>new Promise(r=>setTimeout(r,ms)),bounds=pet.getBounds(),area=screen.getPrimaryDisplay().workArea;
 const editor=new BrowserWindow({x:area.x+20,y:area.y+40,width:420,height:180,show:false,webPreferences:{partition:'render-diagnostic-'+process.pid,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 editor.webContents.setWindowOpenHandler(()=>({action:'deny'}));editor.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));editor.webContents.session.setPermissionCheckHandler(()=>false);
 const phases=[];let style:string|undefined;
 const cases=[{name:'idle',effects:false,desktop:false,input:false},{name:'input-only',effects:false,desktop:false,input:true},{name:'combos',effects:true,desktop:false,input:true},{name:'combos-no-filter',effects:true,desktop:false,input:true,css:'.pet{filter:none!important}'},{name:'combos-no-paint',effects:true,desktop:false,input:true,css:'main{visibility:hidden!important}'},{name:'desktop-only',effects:false,desktop:true,input:true},{name:'all',effects:true,desktop:true,input:true},{name:'idle-after',effects:false,desktop:false,input:false}];
 try{
  await editor.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\';style-src \'unsafe-inline\'"><textarea autofocus style="width:95%;height:90px"></textarea>'));editor.show();
  for(let repeat=0;repeat<2;repeat++)for(const test of cases){
   if(style){await pet.webContents.removeInsertedCSS(style);style=undefined;}
   apply({...presets.low,quality:'custom',fps:8,pet:'parrot',parrotBreed:'cockatoo',effects:test.effects,autoSleep:false,wander:test.desktop,desktopRoam:test.desktop,windowWalk:test.desktop,gravity:test.desktop,edgeClimb:test.desktop,folderPlay:test.desktop});
   reset();pet.setPosition(area.x+area.width-320,area.y+area.height-248);
   if(test.css)style=await pet.webContents.insertCSS(test.css);
   editor.focus();editor.webContents.focus();await wait(600);
   await editor.webContents.executeJavaScript(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   await editor.webContents.executeJavaScript(`(()=>{const t=document.querySelector('textarea');t.value='';t.focus();window.queue=[];window.delays=[];window.frames=[];window.inputs=[];window.running=true;let last;window.raf=requestAnimationFrame(function tick(now){if(!window.running)return;if(last!==undefined)window.frames.push(now-last);last=now;window.raf=requestAnimationFrame(tick);});t.oninput=()=>{const start=window.queue.shift();if(start!==undefined){window.inputs.push(Date.now()-start);requestAnimationFrame(()=>window.delays.push(Date.now()-start));}};})()`);
   const loop=monitorEventLoopDelay({resolution:5});loop.enable();
   for(let i=0;i<80;i++){
    if(test.input)input(1);
    await editor.webContents.executeJavaScript('window.queue.push(Date.now())');
    editor.webContents.sendInputEvent({type:'keyDown',keyCode:'A'});editor.webContents.sendInputEvent({type:'char',keyCode:'a'});editor.webContents.sendInputEvent({type:'keyUp',keyCode:'A'});await wait(20);
   }
   await wait(250);loop.disable();
   const result=await editor.webContents.executeJavaScript(`(()=>{window.running=false;cancelAnimationFrame(window.raf);const stats=a=>{a.sort((x,y)=>x-y);return {p95:a[Math.floor((a.length-1)*.95)]??null,max:a[a.length-1]??null};};return {characters:document.querySelector('textarea').value.length,measured:window.delays.length,input:stats(window.inputs),nextFrame:stats(window.delays),rafInterval:stats(window.frames),visibility:document.visibilityState,focused:document.hasFocus()};})()`);
   if(result.characters!==80||result.measured!==80)throw Error('Diagnostic input measurement incomplete');
   phases.push({repeat,scenario:test.name,...result,mainLoopP95ms:loop.percentile(95)/1e6,editorFocused:editor.isFocused(),editorBounds:editor.getBounds(),petBounds:pet.getBounds()});
  }
  return {platform:process.platform,arch:process.arch,electron:process.versions.electron,gpuFeatures:app.getGPUFeatureStatus(),gpu:await app.getGPUInfo('basic'),phases,scope:'synthetic ASCII in isolated editor; next-frame callback timing, not physical display or Korean IME; no user input recorded'};
 }finally{if(style)await pet.webContents.removeInsertedCSS(style);editor.destroy();pet.setBounds(bounds);apply(saved);}
}
