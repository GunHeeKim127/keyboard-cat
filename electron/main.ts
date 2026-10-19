import {app,BrowserWindow,Tray,Menu,nativeImage,ipcMain,screen,dialog,session,powerMonitor,shell} from 'electron';
import {spawn,ChildProcess} from 'node:child_process';
import path from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {Combo} from './combo';
import {animationState} from './view-state';
import {Options,presets,updateOptions} from './options';
import {carryPosition,dropPosition,petRect,facingForDelta} from './position';
import {inputBinaryPath} from './platform';
let win:BrowserWindow,remote:BrowserWindow|undefined,tray:Tray,helper:ChildProcess|undefined;
let options:Options={...presets.low},paused=false,moving=false,quitting=false,hookError='',effect=0,effectAt=0,lastHit=Date.now(),direction=1;
let lastSent='',stateMessages=0,saveTimer:ReturnType<typeof setTimeout>|undefined;
let carried=false,landingUntil=0,carryTimer:ReturnType<typeof setInterval>|undefined;
let suspended=false;const combo=new Combo(),smoke=process.argv.includes('--smoke-test');
if(smoke){const testProfile=path.join(app.getPath('temp'),'keyboard-cat-smoke-'+process.pid);mkdirSync(testProfile,{recursive:true});app.setPath('userData',testProfile);}
const settingsPath=()=>path.join(app.getPath('userData'),'settings.json');
function state(){const now=Date.now();const view=animationState(paused,!options.restAnimation,moving,now-lastHit,combo.count,options.effects?effect:0,now-effectAt);if(view.action==='SLEEP')view.animate=!paused&&options.sleepAnimation;return {platform:process.platform,options,facing:direction,combo:combo.count,paused,moving,carried,landing:now<landingUntil,hookError,effectAt,lastHit,...view};}
function send(){if(!win||win.isDestroyed())return;const value=state(),serialized=JSON.stringify(value);if(serialized===lastSent)return;lastSent=serialized;stateMessages++;for(const view of [win,remote])if(view&&!view.isDestroyed())view.webContents.send('state',value);}
function save(){const [x,y]=win.getPosition();writeFileSync(settingsPath(),JSON.stringify({x,y,options}));}
function stopInput(){const old=helper;helper=undefined;old?.kill();}
function startInput(){if(paused||suspended||helper||smoke)return;hookError='';
 const child=spawn(inputBinaryPath(process.platform,app.isPackaged,process.resourcesPath,app.getAppPath()),[String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});helper=child;
 const fail=()=>{if(helper===child){helper=undefined;if(!hookError)hookError='입력 감지 중단 · 다시 연결을 눌러주세요';send();refresh();}};child.on('error',fail);child.on('exit',fail);
 createInterface({input:child.stderr!}).on('line',line=>{if(helper!==child)return;if(line==='PERMISSION_REQUIRED'){hookError='입력 모니터링 권한 필요 · 더보기에서 설정을 여세요';send();}else if(line==='EVENT_TAP_UNAVAILABLE'){hookError='macOS 입력 감지 시작 실패 · 권한 확인 후 다시 연결';send();}});
 createInterface({input:child.stdout!}).on('line',line=>{if(helper!==child||paused||suspended||!/^[0-9]{1,4}$/.test(line))return;const n=Number(line);if(n<1||n>1000)return;const now=Date.now(),crossed=combo.hit(now,n);lastHit=now;if(crossed.length){effect=crossed[crossed.length-1];effectAt=now;}});
}
let previousPointerX=0;
function followCarry(){const p=screen.getCursorScreenPoint(),next=facingForDelta(direction,p.x-previousPointerX);previousPointerX=p.x;const pos=carryPosition(p,options.size),b=win.getBounds();if(pos.x!==b.x||pos.y!==b.y)win.setPosition(pos.x,pos.y);if(next!==direction){direction=next;send();}}
function finishCarry(){if(!carried)return;followCarry();carried=false;if(carryTimer)clearInterval(carryTimer);carryTimer=undefined;landingUntil=Date.now()+450;lastHit=Date.now();const p=screen.getCursorScreenPoint(),a=screen.getDisplayNearestPoint(p).workArea,pos=dropPosition(p,options.size,a);win.setPosition(pos.x,pos.y);win.setIgnoreMouseEvents(!moving,{forward:true});save();send();}
function startCarry(){if(carried||moving||!options.grabEnabled)return;carried=true;previousPointerX=screen.getCursorScreenPoint().x;win.setIgnoreMouseEvents(false);followCarry();carryTimer=setInterval(followCarry,options.quality==='low'?66:33);send();}
function setMoving(value:boolean){finishCarry();moving=value;win.setIgnoreMouseEvents(!moving,{forward:true});send();refresh();}
function togglePause(){paused=!paused;combo.reset();lastHit=Date.now();paused?stopInput():startInput();send();refresh();}
function center(){const a=screen.getPrimaryDisplay().workArea;win.setPosition(a.x+a.width-650,a.y+a.height-280);save();}
function secure(view:BrowserWindow){view.webContents.setWindowOpenHandler(()=>({action:'deny'}));view.webContents.on('will-navigate',e=>e.preventDefault());}
function apply(patch:unknown){finishCarry();options=updateOptions(options,patch);win.setIgnoreMouseEvents(!moving,{forward:true});save();send();refresh();}
async function openRemote(){
 if(remote&&!remote.isDestroyed()){remote.show();remote.focus();return;}
 const a=screen.getPrimaryDisplay().workArea;
 remote=new BrowserWindow({title:'Keyboard Cat 리모컨',width:350,height:Math.min(700,a.height),x:a.x+Math.max(0,a.width-362),y:a.y+Math.max(0,a.height-712),resizable:false,show:false,autoHideMenuBar:true,backgroundColor:'#111826',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 secure(remote);remote.on('closed',()=>{remote=undefined;});
 // Opening the controller must not change the position chosen by the user.
 await remote.loadFile(path.join(__dirname,'../dist/index.html'),{query:{panel:'1'}});remote.show();
}
function refresh(){if(!tray)return;tray.setContextMenu(Menu.buildFromTemplate([
 {label:'리모컨 열기',click:()=>{void openRemote();}},
 {label:'화질 / 성능',submenu:(['low','medium','high'] as const).map((p,i)=>({label:['저 · 절전','중 · 균형','고 · 모든 효과'][i],type:'radio' as const,checked:options.quality===p,click:()=>apply({preset:p})}))},
 {label:'자동 이동',type:'checkbox',checked:options.wander,click:()=>apply({wander:!options.wander})},
 {label:'위치 조정',type:'checkbox',checked:moving,click:()=>setMoving(!moving)},
 {label:paused?'계속하기':'일시정지',click:togglePause},
 {label:'위치 초기화',click:center},{type:'separator'},{label:'종료',click:()=>app.quit()}
 ]));}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(win)void openRemote();});
 app.on('activate',()=>{if(win&&!win.isDestroyed())void openRemote();});
 app.whenReady().then(async()=>{
  let saved:{x?:number;y?:number;options?:Options}={};try{saved=JSON.parse(readFileSync(settingsPath(),'utf8'));}catch{}
  if(saved.options){options=updateOptions(options,saved.options);if(['low','medium','high','custom'].includes(saved.options.quality))options.quality=saved.options.quality;}
  win=new BrowserWindow({width:320,height:270,frame:false,transparent:true,alwaysOnTop:true,resizable:false,skipTaskbar:true,show:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.setAlwaysOnTop(true,process.platform==='darwin'?'floating':'screen-saver');win.setIgnoreMouseEvents(true,{forward:true});secure(win);
  if(process.platform==='darwin'){win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});Menu.setApplicationMenu(Menu.buildFromTemplate([{role:'appMenu'},{role:'editMenu'}]));}
  if(Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&screen.getAllDisplays().some(d=>saved.x!+petRect(options.size).x>=d.workArea.x-1&&saved.x!+petRect(options.size).x+petRect(options.size).width<=d.workArea.x+d.workArea.width+1&&saved.y!+petRect(options.size).y>=d.workArea.y-1&&saved.y!+248<=d.workArea.y+d.workArea.height+1))win.setPosition(saved.x!,saved.y!);else center();
  session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith('file:')&&!d.url.startsWith('data:')}));
  const trusted=(sender:Electron.WebContents)=>!sender.isDestroyed()&&((!win.isDestroyed()&&sender===win.webContents)||(!!remote&&!remote.isDestroyed()&&sender===remote.webContents));
  ipcMain.handle('snapshot',e=>{if(trusted(e.sender))return state();});
  ipcMain.on('options',(e,p)=>{if(trusted(e.sender))apply(p);});
  ipcMain.on('hover',(e,on)=>{if(!quitting&&!win.isDestroyed()&&trusted(e.sender)&&e.sender===win.webContents&&!moving&&!carried)win.setIgnoreMouseEvents(!(options.grabEnabled&&on===true),{forward:true});});
  ipcMain.on('carry',(e,on)=>{if(!quitting&&!win.isDestroyed()&&trusted(e.sender)&&e.sender===win.webContents){if(on===true)startCarry();else finishCarry();}});
  ipcMain.on('command',(e,c)=>{if(!trusted(e.sender))return;switch(c){case 'move':setMoving(!moving);break;case 'lock':setMoving(false);save();break;case 'pause':togglePause();break;case 'center':center();break;case 'reconnect':stopInput();startInput();send();break;case 'input-settings':if(process.platform==='darwin')void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent');break;case 'hide':remote?.close();break;case 'quit':app.quit();break;case 'remote':void openRemote();}});
  await win.loadFile(path.join(__dirname,'../dist/index.html'));
  tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../dist/sprites/IDLE-0.png')).resize({width:32,height:32}));tray.setToolTip('Keyboard Cat · 리모컨');tray.on('double-click',()=>{void openRemote();});refresh();
  win.on('close',e=>{if(!quitting){e.preventDefault();setMoving(false);}});
  let previousWindowX=win.getPosition()[0];win.on('moved',()=>{const x=win.getPosition()[0];if(moving){direction=facingForDelta(direction,x-previousWindowX);send();if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(save,300);}previousWindowX=x;});win.showInactive();startInput();
  powerMonitor.on('suspend',()=>{suspended=true;stopInput();combo.reset();});powerMonitor.on('resume',()=>{suspended=false;lastHit=Date.now();startInput();});
  const timer=setInterval(()=>{const now=Date.now();combo.expire(now);if(options.wander&&!paused&&!moving&&!carried&&now-lastHit>4000&&now-lastHit<30000){const [x,y]=win.getPosition(),a=screen.getDisplayMatching(win.getBounds()).workArea;let nx=x+direction*3;if(nx<a.x||nx+320>a.x+a.width){direction*=-1;nx=Math.max(a.x,Math.min(nx,a.x+a.width-320));}win.setPosition(nx,y);}send();},100);
  app.on('before-quit',()=>{quitting=true;clearInterval(timer);if(carryTimer)clearInterval(carryTimer);if(saveTimer)clearTimeout(saveTimer);stopInput();tray.destroy();});
  if(smoke){try{
   const original={...options};apply({preset:'low'});await openRemote();
   const report=await win.webContents.executeJavaScript(`new Promise(resolve=>{const check=()=>{const img=document.querySelector('img');if(img&&img.complete&&img.naturalWidth>0)resolve({ready:!!window.cat,width:img.naturalWidth});else setTimeout(check,50);};check();setTimeout(()=>resolve({ready:false}),5000);})`);
   const panelReport=await remote!.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>resolve({presets:document.querySelectorAll('[data-preset]').length,toggles:document.querySelectorAll('input[type=checkbox]').length,scroll:document.documentElement.scrollHeight>innerHeight}),200))`);
   if(!report.ready||panelReport.presets!==3||panelReport.toggles<4)throw Error('Pet/remote not ready');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-preset=high]').click()`);await new Promise(r=>setTimeout(r,150));if(options.fps!==12||!options.wander)throw Error('Preset control failed');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-preset=low]').click()`);await new Promise(r=>setTimeout(r,150));if(Number(options.fps)!==5||options.wander)throw Error('Low preset failed');
   lastHit=Date.now()-31000;apply({sleepAnimation:true});await new Promise(r=>setTimeout(r,150));
   const sleepOn=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('img')).animationName`);if(sleepOn!=='frames')throw Error('Sleep animation switch failed');
   apply({sleepAnimation:false});await new Promise(r=>setTimeout(r,150));
   const sleepOff=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('img')).animationName`);if(sleepOff!=='none')throw Error('Sleep animation did not stop');lastHit=Date.now();send();
   setMoving(true);setMoving(false);const before=stateMessages;await new Promise(r=>setTimeout(r,350));if(before!==stateMessages)throw Error('Redundant idle updates');
   const animation=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('img')).animationName`);if(animation!=='none')throw Error('Idle animation not stopped');
   const idleMessages=stateMessages-before;
   await win.webContents.executeJavaScript(`window.cat.carry(true)`);await new Promise(r=>setTimeout(r,150));
   const carryReport=await win.webContents.executeJavaScript(`({shown:!!document.querySelector('.carry-image'),width:document.querySelector('.carry-image')?.naturalWidth})`);if(!carried||!carryReport.shown||carryReport.width!==100)throw Error('Carry image not ready');
   await win.webContents.executeJavaScript(`window.cat.carry(false)`);await new Promise(r=>setTimeout(r,500));if(carried||state().landing)throw Error('Carry release failed');
   direction=-1;send();await new Promise(r=>setTimeout(r,120));
   const left=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.facing')).transform`);
   direction=1;send();await new Promise(r=>setTimeout(r,120));
   const right=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.facing')).transform`);
   if(left!=='matrix(-1, 0, 0, 1, 0, 0)'||right!=='matrix(1, 0, 0, 1, 0, 0)')throw Error('Facing mirror failed');
   options=original;save();const alwaysOnTop=win.isAlwaysOnTop();
   const closedPanel=remote!.webContents;remote!.destroy();ipcMain.emit('options',{sender:closedPanel},{wander:true});
   const closedPet=win.webContents;win.destroy();ipcMain.emit('hover',{sender:closedPet},true);ipcMain.emit('carry',{sender:closedPet},false);
   console.log('SMOKE_OK '+JSON.stringify({report,panelReport,carryReport,left,right,sleepOn,sleepOff,idleMessages,animation,alwaysOnTop,lateEventsIgnored:true}));app.exit(0);
  }catch(e){console.error(e);app.exit(1);}}else await openRemote();
 }).catch(e=>{dialog.showErrorBox('Keyboard Cat 실행 오류',String(e));app.exit(1);});
}
