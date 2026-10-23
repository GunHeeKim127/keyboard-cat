import {parrotBreeds,parrotNames,parrotAnimationState,parrotCarryPosition,parrotDropPosition} from './parrots';
import {app,BrowserWindow,Tray,Menu,nativeImage,ipcMain,screen,dialog,session,powerMonitor,shell,clipboard} from 'electron';
import {UpdateChecker} from './updates';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {findMacCopies,macLaunchLocation,macLeftovers,runningMacCopies} from './input-diagnostics';
import {Combo} from './combo';
import {breedNames,breeds,catBreeds,catBreedNames} from './pets';
import {animationState} from './view-state';
import {StateDelivery} from './state-delivery';
import {InstalledUpdater,isUpdaterResource} from './installed-updater';
import {UpdateRecovery} from './update-recovery';
import {ManagedUpdateFiles} from './managed-update-files';
import {WindowsFolderUpdater} from './windows-updater';
import {CoreStore} from './core-store';
import {coreRuntime} from './core-runtime';
import {CoreUpdater} from './core-updater';
import {coreFailureInfo} from './core-failure';
import {InstallerGate} from './installer-gate';
import {Options,presets,updateOptions} from './options';
import {carryPosition,dropPosition,petRect,facingForDelta,nativePosition,limitToArea} from './position';
import {inputBinaryPath} from './platform';
import {InputMonitor,inputError} from './input-monitor';
import {isAppResource,isTrustedFrame,readSettings} from './security';
const distRoot=path.join(__dirname,'../dist'),indexFile=path.join(distRoot,'index.html');
const currentVersion=JSON.parse(readFileSync(path.join(__dirname,'../package.json'),'utf8')).version as string;
const supervised=process.argv.includes('--keyboard-cat-core-worker')&&!!process.send&&process.connected;
let coreUpdater:CoreUpdater|undefined,coreHealthTimer:ReturnType<typeof setInterval>|undefined;
let coreStore:CoreStore|undefined;
let win:BrowserWindow,remote:BrowserWindow|undefined,tray:Tray;
let options:Options={...presets.low},paused=false,moving=false,quitting=false,hookError='',effect=0,effectAt=0,lastHit=Date.now(),direction=1;
const petDelivery=new StateDelivery(),controllerDelivery=new StateDelivery(true);
let stateMessages=0,saveTimer:ReturnType<typeof setTimeout>|undefined;
let carried=false,landingUntil=0,carryTimer:ReturnType<typeof setInterval>|undefined;
let suspended=false;const combo=new Combo(),smoke=process.argv.includes('--smoke-test');
let diagnosticReport='';
let installedUpdater:InstalledUpdater|undefined,installQuitArmed=false;
let updateRecovery:UpdateRecovery|undefined,startupTimer:ReturnType<typeof setInterval>|undefined;
let managedUpdateFiles:ManagedUpdateFiles|undefined;
let installerGate:InstallerGate|undefined;
const buildLabel='런처·기능 묶음 분리 업데이트 · 기존 모션 유지';
const updates=new UpdateChecker(currentVersion,process.platform,process.arch,false,undefined,url=>shell.openExternal(url));
function inputReport(){
 const helper=inputBinaryPath(process.platform,app.isPackaged,process.resourcesPath,app.getAppPath());
 const copies=process.platform==='darwin'?findMacCopies(app.getPath('home')):[];
 return [`Keyboard Cat ${currentVersion} · ${buildLabel}`,`OS: ${process.platform} ${process.getSystemVersion()} / ${process.arch}`,`상태: ${inputMonitor.status}`,`실행 위치: ${process.platform==='darwin'?macLaunchLocation(app.getPath('exe')):'Windows'}`,`실행 파일: ${app.getPath('exe')}`,`입력 보조 프로그램: ${helper}`,`보조 프로그램 존재: ${existsSync(helper)}`,`앱 설정 파일: ${settingsPath()} (존재: ${existsSync(settingsPath())})`,`연결 진단: ${JSON.stringify(inputMonitor.diagnostics)}`,...(process.platform==='darwin'?['발견한 앱 복사본(표준 설치·다운로드·바탕화면·마운트 루트만 확인):',...copies.map(p=>'  '+p),...(!copies.length?['  없음 또는 폴더 접근 불가']:[]),'실행 중인 앱/보조 프로그램(PID · 경로):',...runningMacCopies(),'남아 있는 앱 전용 설정·캐시 위치(현재 사용 중인 데이터도 포함):',...macLeftovers(app.getPath('home'),app.getPath('userData')),'이 위치들이 존재한다고 권한 오류의 원인이라는 뜻은 아닙니다. 권한 승인은 macOS가 별도로 관리하며 앱 삭제로 초기화됐는지 확인할 수 없습니다.','같은 앱의 복사본이 있어도 버전·실행 여부까지 의미하지 않습니다. 임의 하위 폴더·설정 파일·권한 DB는 검사하거나 변경하지 않습니다.']:[]),'키 내용과 입력 횟수는 이 보고서에 포함되지 않습니다. 실행 경로에 사용자 이름이 있을 수 있으니 공유 전에 확인하세요.'].join('\n');
}
if(smoke){const testProfile=path.join(app.getPath('temp'),'keyboard-cat-smoke-'+process.pid);mkdirSync(testProfile,{recursive:true});app.setPath('userData',realpathSync(testProfile));}
const settingsPath=()=>path.join(app.getPath('userData'),'settings.json');
function state(){const now=Date.now();const view=options.pet==='parrot'?parrotAnimationState(paused,!options.restAnimation,moving,now-lastHit,combo.count,options.effects?effect:0,now-effectAt):animationState(paused,!options.restAnimation,moving,now-lastHit,combo.count,options.effects?effect:0,now-effectAt,options.pet==='cat'&&options.catBreed!=='original'?'dog':options.pet);if(now<landingUntil&&!paused){view.action='LAND';view.animate=true;}if(view.action==='SLEEP')view.animate=!paused&&options.sleepAnimation;return {buildLabel,diagnosticReport,version:currentVersion,platform:process.platform,inputReady:inputMonitor.status==='ready',options,facing:direction,combo:combo.count,paused,moving,carried,landing:now<landingUntil,hookError,effectAt,lastHit,...view};}
function send(){if(!win||win.isDestroyed())return;const value=state();if(petDelivery.changed(value)){stateMessages++;win.webContents.send('state',value);}if(remote&&!remote.isDestroyed()&&controllerDelivery.changed(value))remote.webContents.send('state',value);}
function save(){if(quitting||!win||win.isDestroyed())return;const [x,y]=win.getPosition();writeFileSync(settingsPath(),JSON.stringify({x,y,options}));}
const inputMonitor=new InputMonitor(process.platform,prompt=>spawn(inputBinaryPath(process.platform,app.isPackaged,process.resourcesPath,app.getAppPath()),[String(process.pid),...(process.platform==='darwin'&&!prompt?['--no-prompt']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe']}),n=>{if(paused||suspended||quitting)return;const now=Date.now(),crossed=combo.hit(now,n);lastHit=now;if(crossed.length){effect=crossed[crossed.length-1];effectAt=now;}},status=>{hookError=inputError(status);send();refresh();});
function stopInput(){inputMonitor.stop();}
function startInput(prompt=true){if(!paused&&!suspended&&!quitting&&!smoke)inputMonitor.start(prompt);}
function positionWindow(x:unknown,y:unknown){const pos=nativePosition(x,y);if(!pos||quitting||!win||win.isDestroyed())return false;const next=options.multiMonitor?pos:limitToArea(pos,options.size,screen.getPrimaryDisplay().workArea,carried);const [oldX,oldY]=win.getPosition();if(oldX!==next.x||oldY!==next.y)win.setPosition(next.x,next.y);return true;}
function enforceMonitor(){if(!options.multiMonitor&&!quitting&&win&&!win.isDestroyed()){const [x,y]=win.getPosition();positionWindow(x,y);}}
function stopCarry(){carried=false;if(carryTimer)clearInterval(carryTimer);carryTimer=undefined;}
let previousPointerX=0;
function followCarry(){if(!carried||quitting||!win||win.isDestroyed()){stopCarry();return;}const p=screen.getCursorScreenPoint(),next=facingForDelta(direction,p.x-previousPointerX);previousPointerX=p.x;const pos=(options.pet==='parrot'?parrotCarryPosition:carryPosition)(p,options.size),b=win.getBounds();if(pos.x!==b.x||pos.y!==b.y)positionWindow(pos.x,pos.y);if(next!==direction){direction=next;send();}}
function finishCarry(){if(!carried)return;followCarry();if(!carried)return;stopCarry();landingUntil=Date.now()+(options.pet==='parrot'?1000:450);lastHit=Date.now();const p=screen.getCursorScreenPoint(),a=screen.getDisplayNearestPoint(p).workArea,pos=(options.pet==='parrot'?parrotDropPosition:dropPosition)(p,options.size,a);positionWindow(pos.x,pos.y);win.setIgnoreMouseEvents(!moving,{forward:true});save();send();}
function startCarry(){if(quitting||!win||win.isDestroyed()||carried||moving||!options.grabEnabled)return;carried=true;previousPointerX=screen.getCursorScreenPoint().x;win.setIgnoreMouseEvents(false);followCarry();carryTimer=setInterval(followCarry,options.quality==='low'?66:33);send();}
function setMoving(value:boolean){finishCarry();moving=value;win.setIgnoreMouseEvents(!moving,{forward:true});send();refresh();}
function togglePause(){paused=!paused;combo.reset();effect=0;effectAt=0;lastHit=Date.now();paused?stopInput():startInput();send();refresh();}
function center(){const a=screen.getPrimaryDisplay().workArea;positionWindow(a.x+a.width-650,a.y+a.height-280);save();}
function secure(view:BrowserWindow){view.webContents.setWindowOpenHandler(()=>({action:'deny'}));view.webContents.on('will-navigate',e=>e.preventDefault());view.webContents.on('will-frame-navigate',e=>e.preventDefault());view.webContents.on('will-redirect',e=>e.preventDefault());view.webContents.on('will-attach-webview',e=>e.preventDefault());}
function togglePet(){apply({pet:options.pet==='cat'?'dog':'cat'});}
function apply(patch:unknown){finishCarry();const next=updateOptions(options,patch);if(next===options)return;options=next;enforceMonitor();win.setIgnoreMouseEvents(!moving,{forward:true});save();send();refresh();}
async function openRemote(){
 if(remote&&!remote.isDestroyed()){remote.show();remote.focus();return;}
 const a=screen.getPrimaryDisplay().workArea;
 const panel=new BrowserWindow({title:'Keyboard Cat 리모컨',width:350,height:Math.min(700,a.height),x:a.x+Math.max(0,a.width-362),y:a.y+Math.max(0,a.height-712),resizable:false,show:false,autoHideMenuBar:true,backgroundColor:'#111826',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false,navigateOnDragDrop:false}});remote=panel;
 secure(panel);panel.on('closed',()=>{if(remote===panel)remote=undefined;});
 panel.on('focus',()=>{if(process.platform==='darwin'&&!paused&&!suspended&&!quitting&&!smoke)inputMonitor.retryNow();});
 // Opening the controller must not change the position chosen by the user.
 try{await panel.loadFile(path.join(__dirname,'../dist/index.html'),{query:{panel:'1'}});if(!quitting&&!panel.isDestroyed())panel.show();}catch(error){if(!quitting&&!panel.isDestroyed()){panel.destroy();dialog.showErrorBox('리모컨 열기 실패',String(error));}}
}
function refresh(){if(!tray)return;tray.setContextMenu(Menu.buildFromTemplate([
 {label:'리모컨 열기',click:()=>{void openRemote();}},
 {label:options.pet==='cat'?'강아지로 전환':'고양이로 전환',click:togglePet},
 {label:'고양이 종류',submenu:catBreeds.map(b=>({label:catBreedNames[b],type:'radio' as const,checked:options.catBreed===b,click:()=>apply({pet:'cat',catBreed:b})}))},
 {label:'앵무새 종류',submenu:parrotBreeds.map(b=>({label:parrotNames[b],type:'radio' as const,checked:options.pet==='parrot'&&options.parrotBreed===b,click:()=>apply({pet:'parrot',parrotBreed:b})}))},
 {label:'강아지 종류',submenu:breeds.map(b=>({label:breedNames[b],type:'radio' as const,checked:options.dogBreed===b,click:()=>apply({pet:'dog',dogBreed:b})}))},
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
  if(!smoke&&app.isPackaged&&process.platform==='win32'&&(process.env.PORTABLE_EXECUTABLE_FILE||existsSync(path.join(path.dirname(app.getPath('exe')),'Uninstall Keyboard Cat.exe')))){
   try{
   managedUpdateFiles=new ManagedUpdateFiles(app.getPath('userData'),process.env.LOCALAPPDATA||path.join(app.getPath('home'),'AppData','Local'));
   coreStore=new CoreStore(app.getPath('userData'),app.getVersion(),coreRuntime(process.execPath,process.resourcesPath,process.platform,process.arch,process.versions.electron));installerGate=new InstallerGate(coreStore);
   const updater=new WindowsFolderUpdater(managedUpdateFiles.root),updateSession=updater.netSession;
   // NSIS may inherit the old portable launcher's environment during migration.
   // An actual installed bundle always wins over that stale environment variable.
   const portable=existsSync(path.join(path.dirname(app.getPath('exe')),'Uninstall Keyboard Cat.exe'))?undefined:process.env.PORTABLE_EXECUTABLE_FILE;
   const installDirectory=portable?managedUpdateFiles.installDirectory:path.dirname(app.getPath('exe'));
   updater.installDirectory=installDirectory;
   updateSession.setPermissionRequestHandler((_c,_p,cb)=>cb(false));updateSession.setPermissionCheckHandler(()=>false);
   updateSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!isUpdaterResource(d.url)}));
   updateRecovery=new UpdateRecovery(app.getPath('userData'));
   installedUpdater=new InstalledUpdater(updater,currentVersion,()=>{if(installQuitArmed){installQuitArmed=false;quitting=false;}},async target=>{
    if(quitting)throw Error('Application is quitting');
    if(portable){await managedUpdateFiles!.checkInstallDirectory();await managedUpdateFiles!.rememberPortable(portable,currentVersion,target);}
    else await updateRecovery!.prepare(path.dirname(app.getPath('exe')),currentVersion,target);
    if(quitting)throw Error('Application is quitting');
   },async(files,target)=>{installerGate!.verify(files,target);await managedUpdateFiles!.rememberDownload(files,target,installDirectory);});
   }catch{installedUpdater=undefined;updateRecovery=undefined;managedUpdateFiles=undefined;}
  }
  if(supervised&&!smoke){
   const store=new CoreStore(app.getPath('userData'),app.getVersion(),coreRuntime(process.execPath,process.resourcesPath,process.platform,process.arch,process.versions.electron));coreStore=store;
   coreUpdater=new CoreUpdater(store,()=>{process.send!({type:'core-switch'},error=>{if(error){quitting=false;app.quit();return;}app.quit();});});
   if(process.env.KEYBOARD_CAT_CORE_ROLLBACK==='1')coreUpdater.state.message='새 기능 묶음의 정상 실행을 확인하지 못해 이전 버전으로 돌아왔어요.';
   process.on('message',message=>{const type=(message as {type?:unknown})?.type;if(type==='core-activate')void openRemote();else if(type==='core-quit')app.quit();else if(type==='core-confirmed'){if(coreUpdater)coreUpdater.state={phase:'idle',progress:0,message:'새 버전의 정상 실행을 확인했어요.',mode:'core'};remote?.webContents.send('update-status');}});
   process.on('disconnect',()=>app.quit());
  }
  ipcMain.handle('snapshot',e=>{if(trusted(e))return state();});
  const quitForUpdate=(version:string,asset:string)=>{const target=updates.selectedInstaller();if(!target||target.version!==version||target.asset!==asset)throw Error('Selected update changed');save();installQuitArmed=true;quitting=true;if(supervised)process.send!({type:'core-installer'});};
  const installation=()=>coreUpdater&&coreUpdater.state.phase!=='idle'?coreUpdater.state:installedUpdater?.state??coreUpdater?.state;
  const failure=()=>coreFailureInfo(coreStore?.failure(),process.platform);
  ipcMain.handle('updates',async(e,action:unknown)=>{
   if(quitting||!trusted(e)||e.sender!==remote?.webContents)return undefined;
   try{
    if(action==='check'){const info=await updates.check(),target=updates.selectedInstaller();installedUpdater?.invalidate(target?.version,target?.asset);return {...info,coreReady:!!coreUpdater&&info.coreReady,installation:installation(),failure:failure()};}
    if(action==='status')return {status:'current',message:'',installation:installation(),failure:failure()};
    if(action==='cancel-core'){coreStore?.cancel();if(coreUpdater)coreUpdater.state={phase:'idle',progress:0,message:'이번 업데이트를 취소하고 이전 버전을 유지해요.',mode:'core'};return {status:'current',message:'이번 업데이트를 취소하고 이전 버전을 유지해요.',installation:installation(),failure:failure()};}
    if(action==='retry-core'){
     await updates.check();const core=updates.selectedCore();
     const cached=coreStore?.failure()?.manifest;
     if((!core||core.archive.sha256===cached?.sha256)&&coreUpdater?.retry(()=>{if(quitting)throw Error('Quitting');save();quitting=true;}))return true;
     // Reuse the complete download path, including signed full-runtime fallback.
     action='download';
    }
    if(action==='install')return installedUpdater?.install(quitForUpdate)??false;
    if(action==='download'){
     const core=updates.selectedCore();
     if(coreUpdater&&core){
      const result=await coreUpdater.update(core,()=>{if(quitting||updates.selectedCore()!==core)throw Error('Selected core changed');save();quitting=true;});
      if(result!=='fallback')return {status:'available',message:'',installation:coreUpdater.state,failure:failure()};
     }
     if(!installedUpdater)return await updates.download();
     const target=updates.selectedInstaller();if(!target)return false;
     if(!await installerGate?.authorize(core)){try{coreStore?.noteFailure(target.version,'verification');}catch{}return {status:'error',message:'개발자 서명이 있는 설치 정보를 확인하지 못해 자동 설치를 중단했어요. 현재 앱은 유지됩니다. 릴리스 내용을 확인해 주세요.',installation:installation(),failure:failure()};}
     await installedUpdater.update(target.version,target.asset,quitForUpdate);
     return {status:'available',message:'',installation:installedUpdater.state};
    }
    if(action==='notes')return await updates.openNotes();
   }catch{return false;}
   return undefined;
  });
  ipcMain.on('options',(e,p)=>{if(trusted(e)&&e.sender===remote?.webContents)apply(p);});
  ipcMain.on('hover',(e,on)=>{if(!quitting&&!win.isDestroyed()&&trusted(e)&&e.sender===win.webContents&&typeof on==='boolean'&&!moving&&!carried)win.setIgnoreMouseEvents(!(options.grabEnabled&&on===true),{forward:true});});
  ipcMain.on('carry',(e,on)=>{if(!quitting&&!win.isDestroyed()&&trusted(e)&&e.sender===win.webContents&&typeof on==='boolean'){if(on===true)startCarry();else finishCarry();}});
  ipcMain.on('command',(e,c)=>{if(!trusted(e)||typeof c!=='string'||(e.sender===win.webContents&&c!=='lock'))return;switch(c){case 'input-diagnostics':diagnosticReport=inputReport();send();break;case 'copy-diagnostics':diagnosticReport=inputReport();clipboard.writeText(diagnosticReport);send();break;case 'toggle-pet':togglePet();break;case 'move':setMoving(!moving);break;case 'lock':setMoving(false);save();break;case 'pause':togglePause();break;case 'center':center();break;case 'reconnect':stopInput();startInput();send();break;case 'input-settings':if(process.platform==='darwin')void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent').catch(()=>{hookError='입력 권한 설정을 열지 못했습니다';send();});break;case 'hide':remote?.close();break;case 'quit':app.quit();break;case 'remote':void openRemote();}});
  await win.loadFile(path.join(__dirname,'../dist/index.html'));
  tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../dist/sprites/IDLE-0.png')).resize({width:32,height:32}));tray.setToolTip('Keyboard Cat · 리모컨');tray.on('double-click',()=>{void openRemote();});refresh();
  win.on('close',e=>{if(!quitting){e.preventDefault();setMoving(false);}});
  let previousWindowX=win.getPosition()[0];win.on('moved',()=>{const x=win.getPosition()[0];if(moving){direction=facingForDelta(direction,x-previousWindowX);send();if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(save,300);}previousWindowX=x;});win.showInactive();startInput();
  powerMonitor.on('suspend',()=>{suspended=true;finishCarry();stopInput();combo.reset();effect=0;effectAt=0;});powerMonitor.on('resume',()=>{suspended=false;lastHit=Date.now();startInput(false);});
  const timer=setInterval(()=>{if(quitting||win.isDestroyed())return;const now=Date.now();combo.expire(now);if(options.wander&&!paused&&!moving&&!carried&&now-lastHit>4000&&now-lastHit<30000){const [x,y]=win.getPosition(),a=(options.multiMonitor?screen.getDisplayMatching(win.getBounds()):screen.getPrimaryDisplay()).workArea;let nx=x+direction*3;if(nx<a.x||nx+320>a.x+a.width){direction*=-1;nx=Math.max(a.x,Math.min(nx,a.x+a.width-320));}positionWindow(nx,y);}send();},100);
  if((updateRecovery&&existsSync(updateRecovery.root))||(managedUpdateFiles&&existsSync(managedUpdateFiles.record))){
   let attempts=0,checking=false;
   startupTimer=setInterval(async()=>{
    if(checking)return;
    if(quitting||win.isDestroyed()||++attempts>30){if(startupTimer)clearInterval(startupTimer);startupTimer=undefined;return;}
    if(attempts<5||inputMonitor.status!=='ready')return;
    checking=true;
    try{
     const healthy=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img,.carry-image');return document.readyState==='complete'&&!!window.cat&&!!img&&img.complete&&img.naturalWidth>0;})()`);
     if(healthy&&!quitting&&!win.isDestroyed()){
      const directory=path.dirname(app.getPath('exe'));
      const backup=updateRecovery?await updateRecovery.confirm(currentVersion,directory):{removed:0,retained:0};
      const files=managedUpdateFiles?await managedUpdateFiles.confirm(currentVersion,directory):{removed:0,retained:0};
      const result={removed:backup.removed+files.removed,retained:backup.retained+files.retained};
      installedUpdater?.startupConfirmed(result);if(!result.retained){if(startupTimer)clearInterval(startupTimer);startupTimer=undefined;}
     }
    }catch{/* A failed startup keeps the previous copy. */}finally{checking=false;}
   },1000);
  }
  if(supervised&&!smoke){
   let checking=false,ticks=0;
   coreHealthTimer=setInterval(async()=>{
    if(checking||quitting||win.isDestroyed()||++ticks<5)return;
    checking=true;
    try{const healthy=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img,.carry-image');return document.readyState==='complete'&&!!window.cat&&!!img&&img.complete&&img.naturalWidth>0;})()`);if(!quitting){process.send?.({type:'core-health',screen:healthy,input:inputMonitor.status});if(healthy&&inputMonitor.status==='ready'){process.send?.({type:'core-ready',screen:true,input:true});if(coreHealthTimer)clearInterval(coreHealthTimer);coreHealthTimer=undefined;}}}catch{}finally{checking=false;}
   },1000);
  }
  app.on('before-quit',()=>{save();quitting=true;clearInterval(timer);if(coreHealthTimer)clearInterval(coreHealthTimer);if(startupTimer)clearInterval(startupTimer);stopCarry();if(saveTimer)clearTimeout(saveTimer);stopInput();tray.destroy();});
  if(smoke){try{
   if(process.platform==='win32'&&app.isPackaged){
    // Exercise physical ASAR backup inside Electron, not only Node unit tests.
    const recovery=new UpdateRecovery(app.getPath('userData'));
    await recovery.prepare(path.dirname(process.execPath),currentVersion,'99.0.0');
    const recovered=await recovery.confirm('99.0.0',path.dirname(process.execPath));
    if(recovered.removed!==1||recovered.retained)throw Error('Physical packaged recovery failed');
    console.log('PHYSICAL_ASAR_RECOVERY_OK');
   }
   const {NsisUpdater}=require('electron-updater') as typeof import('electron-updater');
   const updateClient=new NsisUpdater(),updateSmoke=new InstalledUpdater(updateClient,currentVersion);
   const folderClient=new WindowsFolderUpdater(path.join(app.getPath('userData'),'managed-updater-smoke'));
   if(!(folderClient as unknown as {httpExecutor:unknown}).httpExecutor)throw Error('Managed updater HTTP transport missing');
   if(updateClient.autoDownload||updateClient.autoInstallOnAppQuit||updateClient.allowDowngrade||!updateClient.disableWebInstaller||await updateSmoke.install(()=>{throw Error('Unprepared installer ran');}))throw Error('Installed updater initialization failed');
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
   ipcMain.emit('command',petEvent,'input-diagnostics');if(diagnosticReport)throw Error('Pet accessed local diagnostics');
   const outsideFile=path.join(app.getPath('userData'),'outside.png');writeFileSync(outsideFile,readFileSync(path.join(distRoot,'sprites/IDLE-0.png')));const outside=pathToFileURL(outsideFile).href;
   const deniedResource=await win.webContents.executeJavaScript(`new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(false);img.onerror=()=>resolve(true);img.src=${JSON.stringify(outside)};setTimeout(()=>resolve(false),1000);})`);
   if(!deniedResource)throw Error('Unrelated local resource was not blocked');
   const securityReport={untrustedFramesRejected:true,petPrivilegesRestricted:true,unrelatedLocalResourceBlocked:true,permissionsDenied:(await win.webContents.executeJavaScript(`Notification.requestPermission()`))==='denied'};
   if(!securityReport.permissionsDenied)throw Error('Permission unexpectedly granted');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-option=multiMonitor]').click()`);await new Promise(r=>setTimeout(r,100));
   if(options.multiMonitor||JSON.parse(readFileSync(settingsPath(),'utf8')).options.multiMonitor!==false)throw Error('Monitor preference not saved');
   const primary=screen.getPrimaryDisplay().workArea,outsideX=primary.x-5000,outsideY=primary.y-5000;
   const insidePrimary=([x,y]:number[])=>{const r=petRect(options.size);return x+r.x>=primary.x-1&&y+r.y>=primary.y-1&&x+r.x+r.width<=primary.x+primary.width+1&&y+r.y+r.height<=primary.y+primary.height+1;};
   positionWindow(outsideX,outsideY);await new Promise(r=>setTimeout(r,100));const constrained=win.getPosition();
   // macOS can further constrain a transparent window's frame to its work area.
   // Verify the visible pet's containment, not a Windows-specific frame origin.
   if(!insidePrimary(constrained))throw Error('Primary monitor constraint failed: '+JSON.stringify({constrained,primary,pet:petRect(options.size)}));
   win.setPosition(outsideX,outsideY);await new Promise(r=>setTimeout(r,100));const dragged=win.getPosition();
   if(!insidePrimary(dragged))throw Error('Native drag escaped primary monitor: '+JSON.stringify({dragged,primary,pet:petRect(options.size)}));
   apply({preset:'high'});if(options.multiMonitor)throw Error('Preset reset monitor choice');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-option=multiMonitor]').click()`);await new Promise(r=>setTimeout(r,100));
   if(!options.multiMonitor)throw Error('Multi monitor enable failed');apply({preset:'low'});center();
   const monitorReport={toggleSaved:true,primaryConstraint:true,nativeMoveConstrained:true,presetPreserved:true,reEnabled:true,displayCount:screen.getAllDisplays().length};
   const report=await win.webContents.executeJavaScript(`new Promise(resolve=>{const check=()=>{const img=document.querySelector('img');if(img&&img.complete&&img.naturalWidth>0)resolve({ready:!!window.cat,width:img.naturalWidth});else setTimeout(check,50);};check();setTimeout(()=>resolve({ready:false}),5000);})`);
   const panelReport=await remote!.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>resolve({presets:document.querySelectorAll('[data-preset]').length,toggles:document.querySelectorAll('input[type=checkbox]').length,scroll:document.documentElement.scrollHeight>innerHeight}),200))`);
   const updateButton=await remote!.webContents.executeJavaScript(`(()=>{const b=document.querySelector('[data-update-check]');return !!b&&b.textContent==='업데이트 확인'&&!b.disabled;})()`);
   if(!updateButton)throw Error('Update check control missing');
   const petUpdate=await win.webContents.executeJavaScript(`window.cat.updates('check')`);
   if(petUpdate!==undefined)throw Error('Pet accessed controller-only updates');
   const invalidUpdate=await remote!.webContents.executeJavaScript(`window.cat.updates('https://evil.example')`);
   if(invalidUpdate!==undefined)throw Error('Unknown update action accepted');
   // UI history uses an isolated smoke profile; real signed promotion is covered
   // separately by store/supervisor and packaged launcher integration tests.
   coreStore=new CoreStore(app.getPath('userData'),currentVersion,{electron:process.versions.electron,platform:process.platform,arch:process.arch,engineSha256:'a'.repeat(64),nativeSha256:'b'.repeat(64)});
   const panelWait=(expression:string)=>remote!.webContents.executeJavaScript(`new Promise(resolve=>{const deadline=Date.now()+3000;const check=()=>{if(${expression})resolve(true);else if(Date.now()>deadline)resolve(false);else setTimeout(check,25);};check();})`);
   coreStore.noteFailure('9.9.9','permission');remote!.webContents.send('update-status');
   if(!await panelWait(`document.querySelector('.update-history')?.textContent.includes('입력 권한')`))throw Error('Failure history missing');
   remote!.destroy();await openRemote();
   if(!await panelWait(`!!document.querySelector('[data-core-retry]')`))throw Error('Failure history lost after reopen: '+await remote!.webContents.executeJavaScript(`document.body.innerText.slice(-800)`));
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-core-cancel]').click()`);await panelWait(`document.querySelector('.update-history')?.textContent.includes('취소했고')`);
   if(!coreStore.failure()?.cancelled)throw Error('Cancellation not persisted');
   writeFileSync(coreStore.record,'{}');remote!.webContents.send('update-status');
   if(!await panelWait(`!document.querySelector('.update-history')`))throw Error('Successful update left failure history visible');
   coreStore=undefined;const updateHistoryReport={reopened:true,cancelled:true,clearedAfterConfirmation:true};
   if(!report.ready||panelReport.presets!==3||panelReport.toggles<4)throw Error('Pet/remote not ready');
   await remote!.webContents.executeJavaScript(`window.cat.command('input-diagnostics')`);await new Promise(r=>setTimeout(r,100));
   const diagnosticsReady=await remote!.webContents.executeJavaScript(`(()=>{const report=document.querySelector('.input-diagnostics textarea');return !!report&&report.value.includes('Keyboard Cat '+${JSON.stringify(currentVersion)})&&document.querySelector('[data-app-version]')?.textContent===${JSON.stringify('v'+currentVersion)};})()`);
   if(!diagnosticsReady)throw Error('Input diagnostics or displayed app version missing');
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
   const nameControlVisible=await remote!.webContents.executeJavaScript(`(()=>{const b=document.querySelector('[data-name-display=hidden]'),r=b?.getBoundingClientRect();return !!b&&b.textContent==='숨기기'&&b.getAttribute('aria-label')==='이름 숨기기'&&r.top>=0&&r.bottom<=innerHeight;})()`);
   if(!nameControlVisible)throw Error('Name hide button not visible in initial viewport');
   for(const mode of ['always','hidden','hover'] as const){
    await remote!.webContents.executeJavaScript(`document.querySelector('[data-name-display='+${JSON.stringify(mode)}+']').click()`);await new Promise(r=>setTimeout(r,100));
    if(options.nameDisplay!==mode||JSON.parse(readFileSync(settingsPath(),'utf8')).options.nameDisplay!==mode)throw Error('Name display setting not saved');
    const selectedNameButton=await remote!.webContents.executeJavaScript(`document.querySelector('[data-name-display='+${JSON.stringify(mode)}+']').getAttribute('aria-pressed')`);if(selectedNameButton!=='true')throw Error('Name display button selection missing');
    const visible=await win.webContents.executeJavaScript(`!!document.querySelector('.avatar-name')`);if(visible!==(mode==='always'))throw Error('Name visibility without hover failed');
    await win.webContents.executeJavaScript(`document.querySelector('.pet').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`);await new Promise(r=>setTimeout(r,70));
    const hoveredName=await win.webContents.executeJavaScript(`!!document.querySelector('.avatar-name')`);if(hoveredName!==(mode!=='hidden'))throw Error('Name visibility with hover failed');
    await win.webContents.executeJavaScript(`document.querySelector('.pet').dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}))`);await new Promise(r=>setTimeout(r,70));
   }
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
    if(action.startsWith('CLIMB_')){const originalLadder=await win.webContents.executeJavaScript(`({extra:!!document.querySelector('.ladder'),movement:getComputedStyle(document.querySelector('.sprite')).animationName})`);if(originalLadder.extra||originalLadder.movement!=='none')throw Error('Original cat ladder was changed');}
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
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-pet=dog]').click()`);await new Promise(r=>setTimeout(r,100));
   if(options.pet!=='dog')throw Error('Dog selection failed');
   // Renderer fixture states must not race the real idle/wander timer.
   clearInterval(timer);
   const dogReport=[];
   for(const breed of breeds){
    await remote!.webContents.executeJavaScript(`(()=>{const s=document.querySelector('#dog-breed');s.value=${JSON.stringify(breed)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await new Promise(r=>setTimeout(r,100));
    if(options.dogBreed!==breed||JSON.parse(readFileSync(settingsPath(),'utf8')).options.dogBreed!==breed)throw Error('Dog breed not saved');
    for(const action of ['IDLE','WALK','JUMP','FALL','LAND','DASH','ATTACK','SLEEP','CLIMB_UP','CLIMB_DOWN','CARRY']){
     win.webContents.send('state',{...state(),action,carried:action==='CARRY',animate:true});await new Promise(r=>setTimeout(r,100));
     const loaded=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img');return !!img&&img.complete&&img.naturalWidth>0&&img.getAttribute('src').startsWith('./sprites/dog-'+${JSON.stringify(breed)}+'-');})()`);
     if(!loaded)throw Error('Dog animation failed: '+breed+' '+action);
     if(action.startsWith('CLIMB_')){const previousLadder=await win.webContents.executeJavaScript(`({extra:!!document.querySelector('.ladder'),movement:getComputedStyle(document.querySelector('.sprite')).animationName})`);if(previousLadder.extra||previousLadder.movement!=='none')throw Error('Dog ladder has extra prop or movement');}
     const timing=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img'),style=getComputedStyle(img);return {duration:Number(img.dataset.cycleDuration),name:style.animationName,width:img.naturalWidth,frames:Number(img.dataset.frameCount)};})()`);
     if(action==='WALK'&&(timing.width!==100||timing.frames!==8))throw Error('Dog walk needs eight frames');
     if(action==='WALK'){const sway=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.sprite')).animationName`);if(sway!=='walk-sway')throw Error('Dog natural sway missing');}
     if((action==='FALL'||action==='LAND')&&timing.name!=='none')throw Error('Single pose should hold still');
     if(action==='SLEEP'&&timing.duration<2.4)throw Error('Dog sleep cycle too fast');
     if(action==='ATTACK'&&timing.duration<.9)throw Error('Dog attack cycle too fast');
    }
    if(process.argv.includes('--capture-smoke')){
     win.webContents.send('state',{...state(),action:'IDLE',carried:false,animate:false});await new Promise(r=>setTimeout(r,50));
     const dir=path.join(app.getAppPath(),'work');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,'dog-'+breed+'.png'),(await win.webContents.capturePage()).toPNG());
    }
    dogReport.push({breed,actions:11});
   }
   const catReport=[];
   for(const breed of catBreeds.filter(b=>b!=='original')){
    apply({pet:'cat'});await new Promise(r=>setTimeout(r,50));
    await remote!.webContents.executeJavaScript(`(()=>{const select=document.querySelector('#cat-breed');select.value=${JSON.stringify(breed)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await new Promise(r=>setTimeout(r,80));
    if(options.catBreed!==breed)throw Error('Cat breed mouse selection failed');landingUntil=0;
    const selected=await remote!.webContents.executeJavaScript(`document.querySelector('#cat-breed')?.value`);if(selected!==breed)throw Error('Cat breed control not synchronized');
    if(JSON.parse(readFileSync(settingsPath(),'utf8')).options.catBreed!==breed)throw Error('Cat breed not saved');
    for(const action of ['IDLE','WALK','JUMP','FALL','LAND','DASH','ATTACK','SLEEP','CLIMB_UP','CLIMB_DOWN','CARRY']){
     win.webContents.send('state',{...state(),action,carried:action==='CARRY',animate:true});await new Promise(r=>setTimeout(r,120));
     const loaded=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img'),ladder=document.querySelector('.ladder');return {ready:!!img&&img.complete&&img.naturalWidth===100&&img.getAttribute('src').startsWith('./sprites/cat-'+${JSON.stringify(breed)}+'-'),ladder:ladder?.getAttribute('data-direction'),reverse:img?.dataset.reverse,ladderRatio:ladder?ladder.getBoundingClientRect().height/document.querySelector('.pet').getBoundingClientRect().height:0};})()`);
     if(!loaded.ready)throw Error('Cat action missing: '+breed+' '+action);
     if(action==='WALK'){const sway=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.sprite')).animationName`);if(sway!=='walk-sway')throw Error('Cat natural sway missing');}
     if(action.startsWith('CLIMB_')&&(loaded.ladder!==(action==='CLIMB_DOWN'?'down':'up')||loaded.reverse!==String(action==='CLIMB_DOWN')))throw Error('Cat ladder direction missing');
     if(action.startsWith('CLIMB_')&&Math.abs(loaded.ladderRatio-.72)>.02)throw Error('Cat ladder too tall');
     if(!action.startsWith('CLIMB_')&&loaded.ladder)throw Error('Ladder left behind');
     if(process.argv.includes('--capture-smoke')&&['IDLE','CARRY','CLIMB_UP','CLIMB_DOWN'].includes(action)){const dir=path.join(app.getAppPath(),'work');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,'cat-'+breed+'-'+action+'.png'),(await win.webContents.capturePage()).toPNG());}
    }
    startCarry();await new Promise(r=>setTimeout(r,100));
    const held=await win.webContents.executeJavaScript(`document.querySelector('.sprite img')?.getAttribute('src').includes('-CARRY-frame-')`);if(!held)throw Error('Cat scruff carry not displayed');finishCarry();
    catReport.push({breed,actions:11,scruffCarry:true});
   }
   for(const size of [.75,1,1.3])for(const facing of [-1,1]){
    apply({size});win.webContents.send('state',{...state(),action:'CLIMB_UP',carried:false,animate:true,facing});await new Promise(r=>setTimeout(r,100));
    const ladder=await win.webContents.executeJavaScript(`(()=>{const l=document.querySelector('.ladder'),p=document.querySelector('.pet');return {ratio:l.getBoundingClientRect().height/p.getBoundingClientRect().height,left:l.getBoundingClientRect().left,petLeft:p.getBoundingClientRect().left,petRight:p.getBoundingClientRect().right,right:l.getBoundingClientRect().right};})()`);
    if(Math.abs(ladder.ratio-.72)>.02||ladder.left<ladder.petLeft||ladder.right>ladder.petRight)throw Error('Cat ladder size or facing failed');
   }
   apply({pet:'dog'});
   // Isolated textures remain frame-sized at every supported display size.
   for(const size of [.75,1,1.3]){
    apply({size});win.webContents.send('state',{...state(),action:'WALK',carried:false,animate:true});await new Promise(r=>setTimeout(r,120));
    const isolated=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img'),box=document.querySelector('.sprite');return {width:img.naturalWidth,count:img.dataset.frameCount,transform:getComputedStyle(img).transform,fits:img.getBoundingClientRect().width<=box.getBoundingClientRect().width+.01};})()`);
    if(isolated.width!==100||isolated.count!=='8'||isolated.transform!=='none'||!isolated.fits)throw Error('Dog frame isolation failed at size '+size);
   }
   const aspectReport=[];
   for(const pet of ['cat','dog'] as const)for(const size of [.75,1,1.3]){
    apply({pet,size});landingUntil=0;
    for(const action of ['IDLE','WALK','JUMP','FALL','LAND','DASH','ATTACK','SLEEP','CARRY','CLIMB_UP','CLIMB_DOWN']){
     win.webContents.send('state',{...state(),action,carried:action==='CARRY',animate:true});await new Promise(r=>setTimeout(r,60));
     const geometry=await win.webContents.executeJavaScript(`(()=>{const img=document.querySelector('.sprite img'),box=document.querySelector('.pet'),style=getComputedStyle(img);return {fit:style.objectFit,position:style.objectPosition,width:img.naturalWidth,height:img.naturalHeight,boxWidth:box.offsetWidth,boxHeight:box.offsetHeight};})()`);
     if(geometry.fit!=='contain'||geometry.position!=='50% 100%'||geometry.width!==100||geometry.height!==110||Math.abs(geometry.boxWidth-112*size)>1||Math.abs(geometry.boxHeight-112*size)>1)throw Error('Sprite aspect ratio changed: '+pet+' '+action+' '+size);
    }
    if(process.argv.includes('--capture-smoke')){
     win.webContents.send('state',{...state(),action:'IDLE',carried:false,animate:false});await new Promise(r=>setTimeout(r,80));
     const dir=path.join(app.getAppPath(),'work');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,pet+'-aspect-'+size+'.png'),(await win.webContents.capturePage()).toPNG());
    }
    aspectReport.push({pet,size,actions:11,fit:'contain'});
   }
   apply({pet:'dog'});landingUntil=0;
   // All husky poses were loaded above. Re-entering a motion must reuse decodes.
   await win.webContents.executeJavaScript(`(()=>{window.__dogDecodeCalls=0;const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){window.__dogDecodeCalls++;return decode.call(this);};})()`);
   win.webContents.send('state',{...state(),action:'WALK',carried:false,animate:true});await new Promise(r=>setTimeout(r,600));
   const walked=await win.webContents.executeJavaScript(`Number(document.querySelector('.sprite img').dataset.frame)`);if(walked===0)throw Error('Dog walk did not advance');
   win.webContents.send('state',{...state(),action:'CLIMB_DOWN',carried:false,animate:true});await new Promise(r=>setTimeout(r,500));
   const descended=await win.webContents.executeJavaScript(`Number(document.querySelector('.sprite img').dataset.frame)`);if(descended>=3)throw Error('Dog ladder did not reverse');
   const repeatedDogDecodes=await win.webContents.executeJavaScript(`window.__dogDecodeCalls`);if(repeatedDogDecodes!==0)throw Error('Previously loaded dog frames decoded again');
   win.webContents.send('state',{...state(),action:'WALK',carried:false,animate:false});await new Promise(r=>setTimeout(r,500));
   const stopped=await win.webContents.executeJavaScript(`document.querySelector('.sprite img').dataset.frame`);if(stopped!=='0')throw Error('Dog stopped walk kept advancing');
   const stoppedSway=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.sprite')).animationName`);if(stoppedSway!=='none')throw Error('Stopped walking kept swaying');
   for(const key of ['wander','effects','restAnimation','sleepAnimation','showCombo','grabEnabled','multiMonitor'] as const){
    apply({[key]:false});await new Promise(r=>setTimeout(r,40));
    await remote!.webContents.executeJavaScript(`document.querySelector('[data-option=${key}]').click()`);await new Promise(r=>setTimeout(r,50));
    if(!options[key])throw Error('Existing toggle did not turn on: '+key);
    await remote!.webContents.executeJavaScript(`document.querySelector('[data-option=${key}]').click()`);await new Promise(r=>setTimeout(r,50));
    if(options[key])throw Error('Existing toggle did not turn off: '+key);
   }
   if(process.argv.includes('--capture-smoke')){const dir=path.join(app.getAppPath(),'work');writeFileSync(path.join(dir,'dog-controller.png'),(await remote!.webContents.capturePage()).toPNG());}
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-pet=cat]').click()`);await new Promise(r=>setTimeout(r,100));
   if(String(options.pet)!=='cat')throw Error('Cat restore failed');
   await remote!.webContents.executeJavaScript(`document.querySelector('[data-pet=dog]').click()`);await new Promise(r=>setTimeout(r,80));if(String(options.pet)!=='dog'||options.dogBreed!=='husky')throw Error('Mouse selection lost last breed');
   apply({pet:'cat'});
   // Explicit pose tests must not race the real idle/walk/sleep timer. That
   // timer was exercised above; keep each requested pose until its image loads.
   clearInterval(timer);lastHit=Date.now();
   const parrotReport=[];
   for(const breed of parrotBreeds){
    await remote!.webContents.executeJavaScript(`document.querySelector('[data-pet=parrot]').click()`);await new Promise(r=>setTimeout(r,80));
    await remote!.webContents.executeJavaScript(`(()=>{const select=document.querySelector('#parrot-breed');select.value=${JSON.stringify(breed)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await new Promise(r=>setTimeout(r,80));
    if(String(options.pet)!=='parrot'||options.parrotBreed!==breed||JSON.parse(readFileSync(settingsPath(),'utf8')).options.parrotBreed!==breed)throw Error('Parrot selection/persistence failed');landingUntil=0;
    for(const action of ['IDLE','WALK','CHIRP','CLIMB_UP','CLIMB_DOWN','FLY','DISPLAY','SLEEP','CARRY','LAND']){
     win.webContents.send('state',{...state(),action,carried:action==='CARRY',animate:true});
     const bird=await win.webContents.executeJavaScript(`new Promise(resolve=>{const deadline=Date.now()+3000;const check=()=>{const img=document.querySelector('.sprite img'),ready=!!img?.complete&&img.naturalWidth===100&&img.naturalHeight===110&&img.getAttribute('src').startsWith('./sprites/parrot-'+${JSON.stringify(breed)}+'-')&&document.querySelector('.pet')?.classList.contains(${JSON.stringify(action.toLowerCase())});if(ready||Date.now()>deadline)resolve({ready,reverse:img?.dataset.reverse,twig:!!document.querySelector('.parrot-twig'),src:img?.getAttribute('src')});else setTimeout(check,25);};check();})`);
     if(!bird.ready)throw Error('Parrot action failed: '+breed+' '+action+' '+JSON.stringify(bird));
     if(action.startsWith('CLIMB_')&&(!bird.twig||bird.reverse!==String(action==='CLIMB_DOWN')))throw Error('Parrot branch direction failed');
     if(!action.startsWith('CLIMB_')&&bird.twig)throw Error('Parrot branch remained');
    }
    apply({grabEnabled:true});startCarry();await new Promise(r=>setTimeout(r,150));
    if(!carried||!await win.webContents.executeJavaScript(`document.querySelector('.sprite img')?.getAttribute('src').includes('-CARRY-frame-')`))throw Error('Parrot carry failed');finishCarry();
    parrotReport.push({breed,actions:10,mouseSelection:true,persisted:true,footCarry:true});
   }
   options=original;save();const alwaysOnTop=win.isAlwaysOnTop();
   const closedPanel=remote!.webContents;remote!.destroy();ipcMain.emit('options',{sender:closedPanel},{wander:true});
   startCarry();const queuedCarry=followCarry;const closedPet=win.webContents;win.destroy();queuedCarry();finishCarry();if(carried||carryTimer)throw Error('Destroyed window kept carry timer');ipcMain.emit('hover',{sender:closedPet},true);ipcMain.emit('carry',{sender:closedPet},false);
   console.log('SMOKE_OK '+JSON.stringify({report,panelReport,updateHistoryReport,carryReport,left,right,sleepOn,sleepOff,idleMessages,animation,alwaysOnTop,lateEventsIgnored:true,nativeRejections,carrySizes:[.75,1,1.3],destroyedCarryIgnored:true,extraAnimations,securityReport,monitorReport,dogReport,catReport,parrotReport,aspectReport,mouseSelection:true}));app.exit(0);
  }catch(e){console.error(e);app.exit(1);}}else await openRemote();
 }).catch(e=>{dialog.showErrorBox('Keyboard Cat 실행 오류',String(e));app.exit(1);});
}
