import {BrowserWindow} from 'electron';
import {catBreeds,breeds} from './pets';
import {parrotBreeds} from './parrots';
import {monkeyBreeds} from './monkeys';
import {penguinBreeds} from './penguins';
import {desktopDefaults} from './options';
import {interactionActions} from './interaction-sprites';
import fs from 'node:fs';
import path from 'node:path';
export async function interactionSmoke(win:BrowserWindow,panel:BrowserWindow,snapshot:()=>Record<string,unknown>,apply:(v:unknown)=>void){
 const wait=(n:number)=>new Promise(r=>setTimeout(r,n)),report=[];
 const first=await win.webContents.executeJavaScript(`new Promise(resolve=>{const end=Date.now()+5000;const check=()=>{const i=document.querySelector('.sprite img');if(i?.complete&&i.naturalWidth)resolve(true);else if(Date.now()>end)resolve(false);else setTimeout(check,20);};check();})`);if(!first)throw Error('Initial interaction image not ready');
 await win.webContents.executeJavaScript(`window.__interactionPaint={blank:0,incomplete:0,paints:0,active:true};(()=>{const check=()=>{const r=window.__interactionPaint;if(!r.active)return;const image=document.querySelector('.sprite img');r.paints++;if(!image)r.blank++;else if(!image.complete||!image.naturalWidth)r.incomplete++;requestAnimationFrame(check);};check();})();`);
 for(const [pet,list] of [['cat',catBreeds],['dog',breeds],['parrot',parrotBreeds],['monkey',monkeyBreeds],['penguin',penguinBreeds]] as const)for(const breed of list){
  const key=pet==='cat'?'catBreed':pet==='dog'?'dogBreed':pet==='parrot'?'parrotBreed':pet==='monkey'?'monkeyBreed':'penguinBreed';
  apply({preset:'low'});apply({...desktopDefaults,pet,[key]:breed});await wait(35);
  let testedActions=0;for(const action of interactionActions){if(action==='EDGE_CLIMB'&&pet!=='parrot')continue;if((action==='WINDOW_LOOK'||action==='HOP')&&pet!=='penguin')continue;const prefix=`./sprites/interaction-${pet}-${breed}-${action}-frame-`;win.webContents.send('state',{...snapshot(),action,animate:true,carried:false,landing:false});
   const ok=await win.webContents.executeJavaScript(`new Promise(resolve=>{const end=Date.now()+3000;const check=()=>{const i=document.querySelector('.sprite img');if(i?.complete&&i.naturalWidth===100&&i.naturalHeight===110&&i.getAttribute('src').startsWith(${JSON.stringify(prefix)}))resolve(true);else if(Date.now()>end)resolve(false);else setTimeout(check,20);};check();})`);if(!ok)throw Error('Interaction image failed '+pet+' '+breed+' '+action);testedActions++;
  }report.push({pet,breed,actions:testedActions});
 }
 const wallReport=[];const review=path.resolve('work/desktop-interactions/wall-review');fs.mkdirSync(review,{recursive:true});
 for(const [pet,list] of [['cat',catBreeds],['dog',breeds],['parrot',parrotBreeds],['monkey',monkeyBreeds]] as const)for(const breed of list){
  const key=pet==='cat'?'catBreed':pet==='dog'?'dogBreed':pet==='parrot'?'parrotBreed':'monkeyBreed';apply({...desktopDefaults,pet,[key]:breed});
  const expected=pet==='parrot'?`./sprites/interaction-parrot-${breed}-EDGE_CLIMB-frame-`:pet==='cat'&&breed==='original'?'./sprites/WALK-atlas.png':`./sprites/${pet}-${breed}-WALK-frame-`;
  for(const facing of [1,-1]){win.webContents.send('state',{...snapshot(),action:'EDGE_CLIMB',animate:true,carried:false,landing:false,facing});
   const ok=await win.webContents.executeJavaScript(`new Promise(resolve=>{const end=Date.now()+3000;const check=()=>{const i=document.querySelector('.sprite img'),r=document.querySelector('.pet.edge_climb .sprite');if(i?.complete&&i.naturalWidth&&i.getAttribute('src').startsWith(${JSON.stringify(expected)})&&r&&(()=>{const m=new DOMMatrix(getComputedStyle(r).transform);return ${pet==='parrot'}?m.a===1&&m.b===0&&m.c===0&&m.d===1:Math.abs(m.a)<1e-6&&m.b===-1&&m.c===1&&Math.abs(m.d)<1e-6;})())resolve(true);else if(Date.now()>end)resolve(false);else setTimeout(check,20);};check();})`);if(!ok)throw Error('Wall appearance or orientation failed '+pet+' '+breed+' '+facing);
   await wait(60);if(facing===1&&breed===list[0])fs.writeFileSync(path.join(review,pet+'.png'),(await win.webContents.capturePage()).toPNG());
  }wallReport.push({pet,breed,faces:2});
 }
 apply({...desktopDefaults,pet:'penguin',penguinBreed:'emperor'});
 for(const hopFrame of [0,4,7]){win.webContents.send('state',{...snapshot(),action:'ICON_HOP',animate:true,carried:false,landing:false,desktopView:{action:'ICON_HOP',hidden:false,mode:'normal',occluders:[],hopFrame}});await wait(60);const actual=await win.webContents.executeJavaScript(`Number(document.querySelector('.sprite img')?.dataset.frame)`);if(actual!==hopFrame)throw Error('Hop phase out of sync '+hopFrame+' '+actual);}
 for(const folderProgress of [0,.5,1]){win.webContents.send('state',{...snapshot(),action:'EXIT_WINDOW',animate:true,carried:false,landing:false,desktopView:{action:'EXIT_WINDOW',mode:'exit-window',hidden:false,occluders:[],folderProgress}});const visible=await win.webContents.executeJavaScript(`new Promise(resolve=>{const end=Date.now()+3000;const check=()=>{const p=document.querySelector('.pet.exit_window');if(p)resolve(getComputedStyle(p).clipPath==='none'&&getComputedStyle(p).visibility!=='hidden');else if(Date.now()>end)resolve(false);else setTimeout(check,20);};check();})`);if(!visible)throw Error('Window exit hid pet at progress '+folderProgress);}
 const base=snapshot(),desktopView={action:'',hidden:true,mode:'inside-closed',occluders:[]};win.webContents.send('state',{...base,combo:32,desktopView});await wait(100);
 const hiddenCombo=await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.pet')).visibility==='hidden'&&document.querySelector('.combo strong')?.textContent==='32'&&getComputedStyle(document.querySelector('.combo')).visibility!=='hidden'`);if(!hiddenCombo)throw Error('Folder combo disappeared');
 win.webContents.send('state',{...base,combo:0,desktopView});await wait(100);
 const folderLocator=await win.webContents.executeJavaScript(`document.querySelector('.folder-locator')?.textContent==='폴더 안에 있어요'&&!document.querySelector('.folder-locator .meter')`);if(!folderLocator)throw Error('Idle folder location indicator missing');
 win.webContents.send('state',{...base,combo:0,options:{...(base.options as Record<string,unknown>),showCombo:false},desktopView});await wait(75);if(await win.webContents.executeJavaScript(`!!document.querySelector('.combo')`))throw Error('Folder indicator ignored combo visibility switch');
 win.webContents.send('state',{...base,desktopView:{...desktopView,hidden:false,mode:'normal'}});apply({petting:true});await wait(75);await win.webContents.executeJavaScript(`window.cat.stroke()`);await wait(75);
 const petted=await win.webContents.executeJavaScript(`document.querySelector('.sprite img')?.getAttribute('src').includes('-PETTED-frame-')`);if(!petted)throw Error('Petting not delivered');
 panel.webContents.send('state',{...snapshot(),corePermissionWait:true});await wait(75);const banner=await panel.webContents.executeJavaScript(`!!document.querySelector('[aria-label="새 버전 입력 권한 대기"]')`);if(!banner)throw Error('Permission wait banner missing');
 panel.webContents.send('state',{...snapshot(),corePermissionWait:false});await wait(75);if(await panel.webContents.executeJavaScript(`!!document.querySelector('[aria-label="새 버전 입력 권한 대기"]')`))throw Error('Permission wait banner remained');
 panel.webContents.send('state',{...snapshot(),updateAvailable:'9.9.9'});await wait(80);if(!await panel.webContents.executeJavaScript(`document.querySelector('[data-update-badge]')?.textContent.includes('9.9.9')`))throw Error('Update badge missing');panel.webContents.send('state',{...snapshot(),updateAvailable:undefined});await wait(80);if(await panel.webContents.executeJavaScript(`!!document.querySelector('[data-update-badge]')`))throw Error('Update badge did not clear');
 const controls=await panel.webContents.executeJavaScript(`document.querySelectorAll('[data-desktop-option]').length`);if(controls!==9)throw Error('Desktop switches missing');
 const paint=await win.webContents.executeJavaScript(`window.__interactionPaint.active=false;({...window.__interactionPaint})`);if(paint.blank||paint.incomplete)throw Error('Blank interaction frame '+JSON.stringify(paint));
 return {report,wallReport,windowExitVisible:true,updateBadge:true,hiddenCombo,folderLocator,petted,permissionBanner:banner,controls,paint};
}
