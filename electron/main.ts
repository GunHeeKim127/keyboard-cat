import {app,BrowserWindow,Tray,Menu,nativeImage,ipcMain,screen,dialog,session,powerMonitor,shell} from 'electron';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {Combo} from './combo';
import {animationState} from './view-state';
import {Options,presets,updateOptions} from './options';
import {carryPosition,dropPosition,petRect,facingForDelta,nativePosition,limitToArea} from './position';
import {inputBinaryPath} from './platform';
import {InputMonitor,inputError} from './input-monitor';
import {isAppResource,isTrustedFrame,readSettings} from './security';
const distRoot=path.join(__dirname,'../dist'),indexFile=path.join(distRoot,'index.html');
let win:BrowserWindow,remote:BrowserWindow|undefined,tray:Tray;
let options:Options={...presets.low},paused=false,moving=false,quitting=false,hookError='',effect=0,effectAt=0,lastHit=Date.now(),direction=1;
let lastSent='',stateMessages=0,saveTimer:ReturnType<typeof setTimeout>|undefined;
let carried=false,landingUntil=0,carryTimer:ReturnType<typeof setInterval>|undefined;
let suspended=false;const combo=new Combo(),smoke=process.argv.includes('--smoke-test');
if(smoke){const testProfile=path.join(app.getPath('temp'),'keyboard-cat-smoke-'+process.pid);mkdirSync(testProfile,{recursive:true});app.setPath('userData',testProfile);}
const settingsPath=()=>path.join(app.getPath('userData'),'settings.json');
function state(){const now=Date.now();const view=animationState(paused,!options.restAnimation,moving,now-lastHit,combo.count,options.effects?effect:0,now-effectAt);if(now<landingUntil&&!paused){view.action='LAND';view.animate=true;}if(view.action==='SLEEP')view.animate=!paused&&options.sleepAnimation;return {platform:process.platform,inputReady:inputMonitor.status==='ready',options,facing:direction,combo:combo.count,paused,moving,carried,landing:now<landingUntil,hookError,effectAt,lastHit,...view};}
function send(){if(!win||win.isDestroyed())return;const value=state(),serialized=JSON.stringify(value);if(serialized===lastSent)return;lastSent=serialized;stateMessages++;for(const view of [win,remote])if(view&&!view.isDestroyed())view.webContents.send('state',value);}
function save(){if(quitting||!win||win.isDestroyed())return;const [x,y]=win.getPosition();writeFileSync(settingsPath(),JSON.stringify({x,y,options}));}
const inputMonitor=new InputMonitor(process.platform,prompt=>spawn(inputBinaryPath(process.platform,app.isPackaged,process.resourcesPath,app.getAppPath()),[String(process.pid),...(process.platform==='darwin'&&!prompt?['--no-prompt']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe']}),n=>{if(paused||suspended||quitting)return;const now=Date.now(),crossed=combo.hit(now,n);lastHit=now;if(crossed.length){effect=crossed[crossed.length-1];effectAt=now;}},status=>{hookError=inputError(status);send();refresh();});
function stopInput(){inputMonitor.stop();}
function startInput(prompt=true){if(!paused&&!suspended&&!quitting&&!smoke)inputMonitor.start(prompt);}
function positionWindow(x:unknown,y:unknown){const pos=nativePosition(x,y);if(!pos||quitting||!win||win.isDestroyed())return false;const next=options.multiMonitor?pos:limitToArea(pos,options.size,screen.getPrimaryDisplay().workArea,carried);const [oldX,oldY]=win.getPosition();if(oldX!==next.x||oldY!==next.y)win.setPosition(next.x,next.y);return true;}
function enforceMonitor(){if(!options.multiMonitor&&!quitting&&win&&!win.isDestroyed()){const [x,y]=win.getPosition();positionWindow(x,y);}}
function stopCarry(){carried=false;if(carryTimer)clearInterval(carryTimer);carryTimer=undefined;}
let previousPointerX=0;
function followCarry(){if(!carried||quitting||!win||win.isDestroyed()){stopCarry();return;}const p=screen.getCursorScreenPoint(),next=facingForDelta(direction,p.x-previousPointerX);previousPointerX=p.x;const pos=carryPosition(p,options.size),b=win.getBounds();if(pos.x!==b.x||pos.y!==b.y)positionWindow(pos.x,pos.y);if(next!==direction){direction=next;send();}}
function finishCarry(){if(!carried)return;followCarry();if(!carried)return;stopCarry();landingUntil=Date.now()+450;lastHit=Date.now();const p=screen.getCursorScreenPoint(),a=screen.getDisplayNearestPoint(p).workArea,pos=dropPosition(p,options.size,a);positionWindow(pos.x,pos.y);win.setIgnoreMouseEvents(!moving,{forward:true});save();send();}
function startCarry(){if(quitting||!win||win.isDestroyed()||carried||moving||!options.grabEnabled)return;carried=true;previousPointerX=screen.getCursorScreenPoint().x;win.setIgnoreMouseEvents(false);followCarry();carryTimer=setInterval(followCarry,options.quality==='low'?66:33);send();}
function setMoving(value:boolean){finishCarry();moving=value;win.setIgnoreMouseEvents(!moving,{forward:true});send();refresh();}
function togglePause(){paused=!paused;combo.reset();effect=0;effectAt=0;lastHit=Date.now();paused?stopInput():startInput();send();refresh();}
function center(){const a=screen.getPrimaryDisplay().workArea;positionWindow(a.x+a.width-650,a.y+a.height-280);save();}
function secure(view:BrowserWindow){view.webContents.setWindowOpenHandler(()=>({action:'deny'}));view.webContents.on('will-navigate',e=>e.preventDefault());view.webContents.on('will-frame-navigate',e=>e.preventDefault());view.webContents.on('will-redirect',e=>e.preventDefault());view.webContents.on('will-attach-webview',e=>e.preventDefault());}
function apply(patch:unknown){finishCarry();options=updateOptions(options,patch);enforceMonitor();win.setIgnoreMouseEvents(!moving,{forward:true});save();send();refresh();}
async function openRemote(){
 if(remote&&!remote.isDestroyed()){remote.show();remote.focus();return;}
 const a=screen.getPrimaryDisplay().workArea;
 const panel=new BrowserWindow({title:'Keyboard Cat 리모컨',width:350,height:Math.min(700,a.height),x:a.x+Math.max(0,a.width-362),y:a.y+Math.max(0,a.height-712),resizable:false,show:false,autoHideMenuBar:true,backgroundColor:'#111826',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false,navigateOnDragDrop:false}});remote=panel;
 secure(panel);panel.on('closed',()=>{if(remote===panel)remote=undefined;});
 // Opening the controller must not change the position chosen by the user.
 try{await panel.loadFile(path.join(__dirname,'../dist/index.html'),{query:{panel:'1'}});if(!quitting&&!panel.isDestroyed())panel.show();}catch(error){if(!quitting&&!panel.isDestroyed()){panel.destroy();dialog.showErrorBox('리모컨 열기 실패',String(error));}}
}
function refresh(){if(!tray)return;tray.setContextMenu(Menu.buildFromTemplate([
 {label:'리모컨 열기',click:()=>{void openRemote();}},
 {label:'화질 / 성능',submenu:(['low','medium','high'] as const).map((p,i)=>({label:['저 · 절전','중 · 균형','고 · 모든 효과'][i],type:'radio' as const,checked:options.quality===p,click:()=>apply({preset:p})}))},
 {label:'다중 모니터 이동',type:'checkbox',checked:options.multiMonitor,click:()=>apply({multiMonitor:!options.multiMonitor})},
 {label:'자동 이동',type:'checkbox',checked:options.wander,click:()=>apply({wander:!options.wander})},
 {label:'위치 조정',type:'checkbox',checked:moving,click:()=>setMoving(!moving)},
 {label:paused?'계속하기':'일시정지',click:togglePause},
 {label:'위치 초기화',click:center},{type:'separator'},{label:'종료',click:()=>app.quit()}
 ]));}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(win)void openRemote();});
 app.on('activate',()=>{if(!paused&&!suspended&&!quitting)inputMonitor.retryNow();if(win&&!win.isDestroyed())void openRemote();});
 app.whenReady().then(async()=>{
  const saved=readSettings(settingsPath());
  if(saved.options){options=updateOptions(options,saved.options);const quality=(saved.options as Record<string,unknown>).quality;if(quality==='low'||quality==='medium'||quality==='high'||quality==='custom')options.quality=quality;}
  win=new BrowserWindow({width:320,height:270,frame:false,transparent:true,alwaysOnTop:true,resizable:false,skipTaskbar:true,show:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  win.setAlwaysOnTop(true,process.platform==='darwin'?'floating':'screen-saver');win.setIgnoreMouseEvents(true,{forward:true});secure(win);
  if(process.platform==='darwin'){win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});Menu.setApplicationMenu(Menu.buildFromTemplate([{role:'appMenu'},{role:'editMenu'}]));}
  win.on('closed',stopCarry);win.on('move',enforceMonitor);screen.on('display-removed',enforceMonitor);screen.on('display-metrics-changed',enforceMonitor);
  if(Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&(options.multiMonitor?screen.getAllDisplays():[screen.getPrimaryDisplay()]).some(d=>saved.x!+petRect(options.size).x>=d.workArea.x-1&&saved.x!+petRect(options.size).x+petRect(options.size).width<=d.workArea.x+d.workArea.width+1&&saved.y!+petRect(options.size).y>=d.workArea.y-1&&saved.y!+248<=d.workArea.y+d.workArea.height+1)) {if(!positionWindow(saved.x,saved.y))center();}else center();
  const localSession=session.defaultSession;
  localSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));localSession.setPermissionCheckHandler(()=>false);localSession.setDevicePermissionHandler(()=>false);localSession.on('will-download',(e)=>e.preventDefault());
  localSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!isAppResource(d.url,distRoot)}));
  const trusted=(e:Electron.IpcMainEvent|Electron.IpcMainInvokeEvent)=>{const sender=e.sender;return !quitting&&!win.isDestroyed()&&!sender.isDestroyed()&&(sender===win.webContents||(!!remote&&!remote.isDestroyed()&&sender===remote.webContents))&&isTrustedFrame(sender,e.senderFrame,indexFile);};
  ipcMain.handle('snapshot',e=>{if(trusted(e))return state();});
  ipcMain.on('options',(e,p)=>{if(trusted(e)&&e.sender===remote?.webContents)apply(p);});
  ipcMain.on('hover',(e,on)=>{if(!quitting&&!win.isDestroyed()&&trusted(e)&&e.sender===win.webContents&&typeof on==='boolean'&&!moving&&!carried)win.setIgnoreMouseEvents(!(options.grabEnabled&&on===true),{forward:true});});
  ipcMain.on('carry',(e,on)=>{if(!quitting&&!win.isDestroyed()&&trusted(e)&&e.sender===win.webContents&&typeof on==='boolean'){if(on===true)startCarry();else finishCarry();}});
  ipcMain.on('command',(e,c)=>{if(!trusted(e)||typeof c!=='string'||(e.sender===win.webContents&&c!=='lock'))return;switch(c){case 'move':setMoving(!moving);break;case 'lock':setMoving(false);save();break;case 'pause':togglePause();break;case 'center':center();break;case 'reconnect':stopInput();startInput();send();break;case 'input-settings':if(process.platform==='darwin')void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent').catch(()=>{hookError='입력 권한 설정을 열지 못했습니다';send();});break;case 'hide':remote?.close();break;case 'quit':app.quit();break;case 'remote':void openRemote();}});
  await win.loadFile(path.join(__dirname,'../dist/index.html'));
  tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../dist/sprites/IDLE-0.png')).resize({width:32,height:32}));tray.setToolTip('Keyboard Cat · 리모컨');tray.on('double-click',()=>{void openRemote();});refresh();
  win.on('close',e=>{if(!quitting){e.preventDefault();setMoving(false);}});
  let previousWindowX=win.getPosition()[0];win.on('moved',()=>{const x=win.getPosition()[0];if(moving){direction=facingForDelta(direction,x-previousWindowX);send();if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(save,300);}previousWindowX=x;});win.showInactive();startInput();
  powerMonitor.on('suspend',()=>{suspended=true;finishCarry();stopInput();combo.reset();effect=0;effectAt=0;});powerMonitor.on('resume',()=>{suspended=false;lastHit=Date.now();startInput(false);});
  const timer=setInterval(()=>{if(quitting||win.isDestroyed())return;const now=Date.now();combo.expire(now);if(options.wander&&!paused&&!moving&&!carried&&now-lastHit>4000&&now-lastHit<30000){const [x,y]=win.getPosition(),a=(options.multiMonitor?screen.getDisplayMatching(win.getBounds()):screen.getPrimaryDisplay()).workArea;let nx=x+direction*3;if(nx<a.x||nx+320>a.x+a.width){direction*=-1;nx=Math.max(a.x,Math.min(nx,a.x+a.width-320));}positionWindow(nx,y);}send();},100);
  app.on('before-quit',()=>{quitting=true;clearInterval(timer);stopCarry();if(saveTimer)clearTimeout(saveTimer);stopInput();tray.destroy();});
  if(smoke){try{
   const nativeRejections=[];for(const y of [353.2,NaN,Infinity,'450',2147483648]){try{win.setPosition(640,y as number);}catch(e){nativeRejections.push({value:String(y),error:String(e)});}}
   if(nativeRejections.length!==5)throw Error('Native coordinate rejection changed');
   for(const y of [NaN,Infinity,'450',2147483648])if(positionWindow(640,y))throw Error('Invalid coordinate accepted');
   if(!positionWindow(640.25,353.2)||win.getPosition()[1]!==353)throw Error('Fractional coordinate not normalized');
   const original={...options};apply({preset:'low'});await openRemote();
   const petEvent={sender:win.webContents,senderFrame:win.webContents.mainFrame};
   const invalidEvents=[{sender:remote!.webContents,senderFrame:null},{sender:remote!.webContents,senderFrame:{url:remote!.webContents.getURL()}},petEvent];
   for(const event of invalidEvents)ipcMain.emit('options',event,{avatarName:'UNTRUSTED'});
   if(options.avatarName==='UNTRUSTED')throw Error('Untrusted options accepted');
   ipcMain.emit('command',petEvent,'quit');if(quitting)throw Error('Pet issued controller command');
   const outsideFile=path.join(app.getPath('userData'),'outside.png');writeFileSync(outsideFile,readFileSync(path.join(distRoot,'sprites/IDLE-0.png')));const outside=pathToFileURL(outsideFile).href;
   const deniedResource=await win.webContents.executeJavaScript(`new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(false);img.onerror=()=>resolve(true);img.src=${JSON.stringify(outside)};setTimeout(()=>resolve(false),1000);})`);
   if(!deniedResource)throw Error('Unrelated local resource was not blocked');
   const securityReport={untrustedFramesRejected:true,petPrivilegesRestricted:true,unrelatedLocalResourceBlocked:true,permissionsDenied:(await win.webContents.executeJavaScript(`Notification.requestPermission()`))==='denied'};
   if(!securityReport.permissionsDenied)throw Error('Permission unexpectedly granted');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-option=multiMonitor]').click()`);await new Promise(r=>setTimeout(r,100));
   if(options.multiMonitor||JSON.parse(readFileSync(settingsPath(),'utf8')).options.multiMonitor!==false)throw Error('Monitor preference not saved');
   const primary=screen.getPrimaryDisplay().workArea,outsideX=primary.x-5000,outsideY=primary.y-5000;
   positionWindow(outsideX,outsideY);const constrained=win.getPosition(),expected=limitToArea({x:outsideX,y:outsideY},options.size,primary);
   if(constrained[0]!==expected.x||constrained[1]!==expected.y)throw Error('Primary monitor constraint failed');
   win.setPosition(outsideX,outsideY);await new Promise(r=>setTimeout(r,100));const dragged=win.getPosition();
   if(dragged[0]!==expected.x||dragged[1]!==expected.y)throw Error('Native drag escaped primary monitor');
   apply({preset:'high'});if(options.multiMonitor)throw Error('Preset reset monitor choice');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-option=multiMonitor]').click()`);await new Promise(r=>setTimeout(r,100));
   if(!options.multiMonitor)throw Error('Multi monitor enable failed');apply({preset:'low'});center();
   const monitorReport={toggleSaved:true,primaryConstraint:true,nativeMoveConstrained:true,presetPreserved:true,reEnabled:true,displayCount:screen.getAllDisplays().length};
   const report=await win.webContents.executeJavaScript(`new Promise(resolve=>{const check=()=>{const img=document.querySelector('img');if(img&&img.complete&&img.naturalWidth>0)resolve({ready:!!window.cat,width:img.naturalWidth});else setTimeout(check,50);};check();setTimeout(()=>resolve({ready:false}),5000);})`);
   const panelReport=await remote!.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>resolve({presets:document.querySelectorAll('[data-preset]').length,toggles:document.querySelectorAll('input[type=checkbox]').length,scroll:document.documentElement.scrollHeight>innerHeight}),200))`);
   if(!report.ready||panelReport.presets!==3||panelReport.toggles<4)throw Error('Pet/remote not ready');
   await remote!.webContents.executeJavaScript(`(()=>{const input=document.querySelector('#avatar-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'테스트 나비');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
   await new Promise(r=>setTimeout(r,80));
   await remote!.webContents.executeJavaScript(`document.querySelector('.avatar-settings').requestSubmit()`);
   await new Promise(r=>setTimeout(r,150));
   if(options.avatarName!=='테스트 나비'||JSON.parse(readFileSync(settingsPath(),'utf8')).options.avatarName!=='테스트 나비')throw Error('Avatar name not saved');
   await win.webContents.executeJavaScript(`document.querySelector('.pet').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`);
   await new Promise(r=>setTimeout(r,100));
   const nameShown=await win.webContents.executeJavaScript(`(()=>{const n=document.querySelector('.avatar-name'),p=document.querySelector('.pet');return n?.textContent==='테스트 나비'&&n.getBoundingClientRect().top>=p.getBoundingClientRect().bottom;})()`);
   if(!nameShown)throw Error('Hover name not shown below avatar');
   await win.webContents.executeJavaScript(`document.querySelector('.pet').dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))`);
   await new Promise(r=>setTimeout(r,100));
   if(await win.webContents.executeJavaScript(`!!document.querySelector('.avatar-name')`))throw Error('Hover name did not hide');
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
   const carryReport=await win.webContents.executeJavaScript(`({shown:!!document.querySelector('.carry-image'),width:document.querySelector('.carry-image')?.naturalWidth})`);if(!carried||!carryReport.shown||carryReport.width!==100)throw Error('Carry image not ready');ipcMain.emit('carry',petEvent,'invalid');if(!carried)throw Error('Non-boolean carry event accepted');
   await win.webContents.executeJavaScript(`window.cat.carry(false)`);await new Promise(r=>setTimeout(r,500));if(carried||state().landing)throw Error('Carry release failed');
   for(const size of [.75,1,1.3]){apply({size});startCarry();await new Promise(r=>setTimeout(r,150));followCarry();finishCarry();if(carried||carryTimer)throw Error('Carry timer leaked');}
   apply({effects:true});landingUntil=0;
   const extraAnimations=[];
   for(const [testEffect,age,action,atlas] of [[10,100,'JUMP','JUMP'],[10,700,'FALL','FALL'],[10,1050,'LAND','LAND'],[20,100,'CLIMB_UP','CLIMB'],[20,1000,'CLIMB_DOWN','CLIMB'],[20,1700,'LAND','LAND']]){
    effect=Number(testEffect);effectAt=Date.now()-Number(age);send();await new Promise(r=>setTimeout(r,80));
    const frame=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img');return {src:img?.getAttribute('src'),width:img?.naturalWidth,direction:img?getComputedStyle(img).animationDirection:''};})()`);
    if(state().action!==action||!frame.src?.endsWith(String(atlas)+'-atlas.png')||!frame.width||(action==='CLIMB_DOWN'&&frame.direction!=='reverse'))throw Error('Extra animation failed: '+action);
    extraAnimations.push({action,...frame});
    if(process.argv.includes('--capture-smoke')){const dir=path.join(app.getAppPath(),'work');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,String(action)+'.png'),(await win.webContents.capturePage()).toPNG());}
   }
   togglePause();if(state().effect!==0||state().animate)throw Error('Pause did not stop combo');togglePause();
   effect=0;effectAt=0;combo.reset();lastHit=Date.now();apply({preset:'low'});
   direction=-1;send();await new Promise(r=>setTimeout(r,120));
   const left=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.facing')).transform`);
   direction=1;send();await new Promise(r=>setTimeout(r,120));
   const right=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.facing')).transform`);
   if(left!=='matrix(-1, 0, 0, 1, 0, 0)'||right!=='matrix(1, 0, 0, 1, 0, 0)')throw Error('Facing mirror failed');
   options=original;save();const alwaysOnTop=win.isAlwaysOnTop();
   const closedPanel=remote!.webContents;remote!.destroy();ipcMain.emit('options',{sender:closedPanel},{wander:true});
   startCarry();const queuedCarry=followCarry;const closedPet=win.webContents;win.destroy();queuedCarry();finishCarry();if(carried||carryTimer)throw Error('Destroyed window kept carry timer');ipcMain.emit('hover',{sender:closedPet},true);ipcMain.emit('carry',{sender:closedPet},false);
   console.log('SMOKE_OK '+JSON.stringify({report,panelReport,carryReport,left,right,sleepOn,sleepOff,idleMessages,animation,alwaysOnTop,lateEventsIgnored:true,nativeRejections,carrySizes:[.75,1,1.3],destroyedCarryIgnored:true,extraAnimations,securityReport,monitorReport}));app.exit(0);
  }catch(e){console.error(e);app.exit(1);}}else await openRemote();
 }).catch(e=>{dialog.showErrorBox('Keyboard Cat 실행 오류',String(e));app.exit(1);});
}
