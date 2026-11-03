import {app,screen,BrowserWindow} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {desktopDefaults} from './options';
import {iconMotionLimits} from './icon-route';
import {petRect} from './position';
import type {Scene} from './desktop-world';
// Opt-in local test against an empty test folder opened by the tester in Explorer.
// It controls only this application's window, never Explorer or other programs.
export async function physicalFolderSmoke(win:BrowserWindow,apply:(v:unknown)=>void,position:(x:number,y:number)=>void,snapshot:()=>Record<string,any>,scene:()=>Scene,control:{writes:()=>number;face:(d:number)=>void;combo:()=>void;scan:()=>void;hopping:()=>boolean}){
 if(process.platform!=='win32')throw Error('Windows physical test only');app.getAppMetrics();let captures=0;
 const fixture=JSON.parse(fs.readFileSync('work/desktop-interactions/desktop-fixture.json','utf8').replace(/^\uFEFF/,''));
 if(typeof fixture.path!=='string'||!/^KeyboardCat-검증용-[a-f0-9]{8}$/.test(path.basename(fixture.path)))throw Error('Expected the isolated empty desktop fixture');
 const id=path.resolve(fixture.path).replace(/\\$/,'').toUpperCase(),wait=(n:number)=>new Promise(r=>setTimeout(r,n));
 const until=async(check:()=>boolean,ms:number)=>{const end=Date.now()+ms;while(Date.now()<end){if(check())return;await wait(50);}throw Error('Physical folder phase timed out: '+JSON.stringify({mode:snapshot().desktopView?.mode,status:snapshot().desktopStatus,folders:scene().folders.length,windows:scene().windows.length,explorers:scene().explorers.length,match:scene().folders.some(f=>f.id===id)}));};
 apply({...desktopDefaults,pet:'cat',catBreed:'original',size:1,fps:8,autoSleep:false,wander:false,folderPlay:true,restAnimation:true,grabEnabled:false,nameDisplay:'hidden'});
 await until(()=>scene().folders.some(f=>f.id===id)&&scene().explorers.some(e=>e.folderId===id),10000);
 const icon=scene().folders.find(f=>f.id===id)!.rect;
 // Entry behind an existing window is explicitly enabled for this physical test.
 position(Math.round(icon.x+icon.width/2-160),Math.round(icon.y+icon.height*.7-248));
 await until(()=>snapshot().desktopView?.mode==='inside-window',10000);
 apply({behindWindows:false}); const explorer=scene().explorers.find(e=>e.folderId===id)!,window=scene().windows.find(w=>w.id===explorer.windowId)!.rect,body=petRect(1);
 // Establish a reproducible in-window starting point near its left quarter.
 position(Math.round(window.x+body.width+12-body.x),Math.round(window.y+window.height-30-body.y-body.height));await wait(150);
 const out='work/desktop-interactions/physical-folder-review';fs.mkdirSync(out,{recursive:true});
 const capture=async(name:string)=>{
  const rect=await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.pet').getBoundingClientRect();return {x:Math.floor(p.x),y:Math.floor(p.y),width:Math.ceil(p.width),height:Math.ceil(p.height)};})()`);
  const image=await win.webContents.capturePage(rect),bits=image.toBitmap();let visible=0;for(let i=3;i<bits.length;i+=4)if(bits[i]>32)visible++;
  captures++;if(visible<100)throw Error('Pet vanished in physical folder phase '+name);fs.writeFileSync(path.join(out,name+'.png'),image.toPNG());
 };
 await capture('inside');const start=win.getPosition();apply({folderPlay:false});
 let sawWalk=false,sawExit=false,maxWalkStep=0,previous=start,previousMode='',steps=0;const deadline=Date.now()+30000;
 while(Date.now()<deadline){await wait(50);const s=snapshot(),mode=s.desktopView.mode,p=win.getPosition();steps++;
  if(mode==='exit-approach'){if(previousMode===mode)maxWalkStep=Math.max(maxWalkStep,Math.abs(p[0]-previous[0]));if(!sawWalk){if(Math.abs(p[0]-start[0])>16)throw Error('Exit teleported from its starting point');await capture('approaching-edge');sawWalk=true;}}
  if(mode==='exit-window'&&!sawExit){await capture('leaving-edge');sawExit=true;}
  if(mode==='normal'&&sawExit){await capture('outside');const outside=p[0]+body.x+body.width<=window.x+2;if(!outside||maxWalkStep>16)throw Error('Exit did not reach the nearby edge smoothly');const report={realDesktopFolder:true,exactExplorerMatched:true,walkedToEdge:sawWalk,visibleExit:sawExit,outsideWindow:outside,maxWalkStep,steps};
     const area=screen.getPrimaryDisplay().workArea,fallX=window.x-body.width/2-30-160;
     apply({...desktopDefaults,autoSleep:false,wander:true,windowWalk:true,gravity:true,effects:false});await until(()=>scene().windows.length>0,10000);control.face(1);position(Math.round(fallX),Math.round(area.y+130-248));
     await until(()=>snapshot().desktopView.mode==='fall',5000);const fallStart=Date.now(),writeStart=control.writes();await capture('falling');
     await until(()=>snapshot().desktopView.mode==='normal',5000);const landedAt=Date.now(),landingX=win.getPosition()[0],fallWriteRate=(control.writes()-writeStart)*1000/Math.max(1,landedAt-fallStart);await capture('landed');
     await until(()=>snapshot().action!=='LAND_GROUND'&&win.getPosition()[0]!==landingX,1000);const resumeAfterLandingMs=Date.now()-landedAt;if(resumeAfterLandingMs>600)throw Error('Landing still delays walking');if(fallWriteRate>35)throw Error('Duplicate movement clock detected');
     apply({effects:true});position(Math.round(fallX),Math.round(area.y+130-248));await until(()=>snapshot().desktopView.mode==='fall',5000);control.combo();if(snapshot().action!=='JUMP')throw Error('Falling motion overrode keyboard combo');await wait(160);if(snapshot().action!=='JUMP')throw Error('Combo priority did not persist');await capture('combo-during-fall');await until(()=>snapshot().desktopView.mode==='normal',5000);
     apply({wander:false,effects:false});await wait(15500);apply({wander:true,edgeClimb:true});control.face(1);position(Math.round(window.x-body.x-body.width*.95),Math.round(window.y+40-body.y-body.height));await until(()=>snapshot().desktopView.mode==='climb',5000);await capture('climbing');await until(()=>snapshot().desktopView.mode==='mount',10000);await capture('mounting');await until(()=>snapshot().desktopView.mode==='normal',3000);await capture('on-window-top');
     apply({...desktopDefaults,autoSleep:false,wander:false});control.scan();await until(()=>!!scene().icons?.length,10000);const limits=iconMotionLimits('cat','capuchin','emperor',body.width),surface=(i:{rect:{x:number;y:number;width:number;height:number}})=>({x:i.rect.x+i.rect.width/2,y:i.rect.y+i.rect.height*.2});
     const visibleIcons=(scene().icons??[]).filter(i=>{const p=surface(i);return p.x-body.width/2>=area.x&&p.x+body.width/2<=area.x+area.width&&p.y-body.height>=area.y&&p.y<=area.y+area.height&&!scene().windows.some(w=>p.x>=w.rect.x&&p.x<w.rect.x+w.rect.width&&p.y>=w.rect.y&&p.y<w.rect.y+w.rect.height);});
     const source=visibleIcons.find(a=>a.id.startsWith('file-icon-')&&visibleIcons.some(b=>{const p=surface(a),q=surface(b),d=Math.hypot(p.x-q.x,p.y-q.y);return d>8&&d<=limits.distance&&Math.abs(q.y-p.y)<=Math.min(limits.rise,limits.drop);}));if(!source)throw Error('No uncovered real icon pair for motion test');const foot=surface(source);position(Math.round(foot.x-160),Math.round(foot.y-248));apply({desktopRoam:true});await until(()=>control.hopping()&&snapshot().desktopView.action==='ICON_HOP',5000);await capture('real-icon-hop');await until(()=>!control.hopping(),5000);await capture('real-icon-land');apply({desktopRoam:false});
     const metrics=app.getAppMetrics(),result={...report,fallWriteRate:Math.round(fallWriteRate*10)/10,resumeAfterLandingMs,comboDuringFall:true,climbAndMount:true,realIconHop:true,transparentCaptures:captures,appCpuPercent:metrics.reduce((n,m)=>n+m.cpu.percentCPUUsage,0),gpuCompositing:app.getGPUFeatureStatus().gpu_compositing,workingSetMB:Math.round(metrics.reduce((n,m)=>n+m.memory.workingSetSize,0)/1024)};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));return result;}
  previous=p;previousMode=mode;
 }
 throw Error('Physical folder exit did not complete');
}
