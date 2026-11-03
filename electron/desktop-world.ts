export type Rect={x:number;y:number;width:number;height:number};
export type Scene={windows:{id:string;rect:Rect}[];folders:{id:string;rect:Rect}[];icons?:{id:string;rect:Rect}[];explorers:{windowId:string;folderId:string}[];foldersAvailable:boolean};
export type DesktopOptions={windowWalk:boolean;gravity:boolean;edgeClimb?:boolean;folderPlay:boolean;windowLook?:boolean;facing?:number;climbSpeed?:number;walkSpeed?:number;pet?:string;iconWalk?:boolean;behindWindows?:boolean};
export function desktopMotionPolicy(o:DesktopOptions&{wander:boolean;desktopRoam:boolean;pet?:string},hopping=false){
 const moving=o.wander||o.desktopRoam;
 return {windowWalk:moving&&o.windowWalk&&!o.behindWindows,gravity:moving&&o.windowWalk&&o.gravity&&!hopping,edgeClimb:moving&&o.edgeClimb&&o.pet!=='penguin'&&!hopping,windowLook:moving&&o.windowWalk&&o.windowLook&&o.pet==='penguin'&&!o.behindWindows,pet:o.pet,iconWalk:moving&&o.desktopRoam,folderPlay:o.folderPlay&&!hopping,behindWindows:o.behindWindows};
}
export type WorldMode='normal'|'fall'|'climb'|'mount'|'look-window'|'enter'|'inside-closed'|'inside-window'|'exit-closed'|'exit-approach'|'exit-window';
export type WorldResult={x:number;y:number;action:string;hidden:boolean;landing:boolean;mode:WorldMode;clip?:Rect;ownerWindow?:string;reverse?:boolean;facing?:number;folderProgress?:number;mountProgress?:number};
const contains=(r:Rect,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(x,Math.max(min,max)));
export function safeRect(v:unknown):v is Rect{if(!v||typeof v!=='object')return false;const r=v as Rect;return [r.x,r.y,r.width,r.height].every(Number.isFinite)&&Math.abs(r.x)<100000&&Math.abs(r.y)<100000&&r.width>0&&r.width<100000&&r.height>0&&r.height<100000;}
export function parseScene(v:unknown):Scene|undefined{
 if(!v||typeof v!=='object')return;const s=v as Scene;
 if(!Array.isArray(s.windows)||s.windows.length>128||!Array.isArray(s.folders)||s.folders.length>256||!Array.isArray(s.explorers)||s.explorers.length>128||typeof s.foldersAvailable!=='boolean')return;
 const id=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=4096&&!/[\u0000-\u001f]/.test(x);
 if(s.icons!==undefined&&(!Array.isArray(s.icons)||s.icons.length>512||!s.icons.every(i=>i&&id(i.id)&&safeRect(i.rect))))return;
 if(!s.windows.every(w=>w&&id(w.id)&&safeRect(w.rect))||!s.folders.every(f=>f&&id(f.id)&&safeRect(f.rect))||!s.explorers.every(e=>e&&id(e.windowId)&&id(e.folderId)))return;
 return {windows:s.windows.map(w=>({id:w.id,rect:{...w.rect}})),folders:s.folders.map(f=>({id:f.id,rect:{...f.rect}})),icons:s.icons?.map(i=>({id:i.id,rect:{...i.rect}})),explorers:s.explorers.map(e=>({...e})),foldersAvailable:s.foldersAvailable};
}
export const emptyScene=():Scene=>({windows:[],folders:[],explorers:[],foldersAvailable:false});
export class DesktopWorld{
 mode:WorldMode='normal';private since=0;private last=0;private vy=0;private folder?:{id:string;rect:Rect};private inside?:Rect;private insideWindowId?:string;private exitFacing?:number;private exitCursorX?:number;private exitStart?:{x:number;y:number};private edge?:{x:number;top:number;window?:string;facing:number;y:number;mount?:{x:number;y:number;since:number}};private cooldown=0;private support?:{id:string;rect:Rect};private forceFloor=false;
 private begin(mode:WorldMode,now:number){if(mode==='exit-approach'){this.exitCursorX=undefined;this.exitFacing=undefined;this.exitStart=undefined;}this.mode=mode;this.since=now;}
 freeze(now:number){const elapsed=this.last?Math.max(0,now-this.last):0;this.last=now;if(this.since)this.since+=elapsed;if(this.cooldown)this.cooldown+=elapsed;if(this.edge?.mount)this.edge.mount.since+=elapsed;}
 reset(){this.edge=undefined;this.mode='normal';this.folder=undefined;this.inside=undefined;this.insideWindowId=undefined;this.exitCursorX=undefined;this.exitFacing=undefined;this.exitStart=undefined;this.support=undefined;this.vy=0;this.last=0;this.forceFloor=false;}
 dropToFloor(now:number){if(this.folder)return;this.edge=undefined;this.support=undefined;this.forceFloor=true;this.vy=0;this.begin('fall',now);}
 get droppingToFloor(){return this.forceFloor;}
 get onSurface(){return !!this.support;}
 pauseMotion(){if(!this.folder){this.edge=undefined;this.mode='normal';this.support=undefined;this.forceFloor=false;this.vy=0;}}
 leaveFolder(now:number){if(this.folder&&(this.mode==='enter'||this.mode==='inside-closed'||this.mode==='inside-window')){this.begin(this.mode==='inside-window'?'exit-approach':'exit-closed',now);this.cooldown=now+15000;}}
 step(point:{x:number;y:number},body:Rect,area:Rect,o:DesktopOptions,scene:Scene,now:number,travel:number):WorldResult{
  const dt=this.last?clamp((now-this.last)/1000,0,.2):.1;this.last=now;let x=point.x,y=point.y,action='',hidden=false,landing=false,reverse=false;
  const foot=()=>({x:x+body.x+body.width/2,y:y+body.y+body.height});
  if(!o.folderPlay)this.leaveFolder(now);
  if(this.mode==='look-window'){if(!o.windowLook||o.behindWindows||now-this.since>=2400){this.begin('normal',now);this.cooldown=now+6000;return {x:Math.round(x),y:Math.round(y),action:'',hidden,landing,reverse:true,mode:this.mode};}return {x:Math.round(x),y:Math.round(y),action:'WINDOW_LOOK',hidden,landing,mode:this.mode};}
  const currentFolder=this.folder&&scene.folders.find(f=>f.id===this.folder!.id);
  if(currentFolder)this.folder={id:currentFolder.id,rect:{...currentFolder.rect}};
  const explorer=this.folder&&scene.explorers.find(e=>e.folderId===this.folder!.id);
  const folderWindow=explorer&&scene.windows.find(w=>w.id===explorer.windowId)?.rect;
  if(this.folder&&['enter','inside-closed','inside-window','exit-closed','exit-approach','exit-window'].includes(this.mode)){
   if(!currentFolder&&(this.mode==='enter'||this.mode==='inside-closed'||this.mode==='inside-window'))this.begin(this.mode==='inside-window'?'exit-approach':'exit-closed',now);
   if(this.mode==='enter'&&now-this.since>=900)this.begin('inside-closed',now);
   if(this.mode==='inside-closed'&&folderWindow){this.inside={...folderWindow};this.insideWindowId=explorer!.windowId;this.begin('inside-window',now);x=folderWindow.x+folderWindow.width/2-body.x-body.width/2;y=folderWindow.y+folderWindow.height-30-body.y-body.height;}
   if(this.mode==='inside-window'&&!folderWindow)this.begin('inside-closed',now);
   if(this.mode==='inside-closed'&&(!currentFolder||now-this.since>12000))this.begin('exit-closed',now);
   if(this.mode==='inside-window'&&now-this.since>20000)this.begin('exit-approach',now);
   if(this.mode==='enter'||this.mode==='inside-closed'||this.mode==='exit-closed'){
    const r=this.folder.rect;x=r.x+r.width/2-body.x-body.width/2;y=r.y+r.height*.7-body.y-body.height;
    const progress=clamp((now-this.since)/900,0,1);if(this.mode==='enter')x-=body.width*.4*(1-progress);if(this.mode==='exit-closed')x+=body.width*.4*progress;
   }
   if(this.mode==='inside-window'&&folderWindow){this.insideWindowId=explorer!.windowId;this.inside={...folderWindow};const wanted=x+travel;x=clamp(wanted,folderWindow.x+12-body.x,folderWindow.x+folderWindow.width-12-body.x-body.width);reverse=!!travel&&x!==wanted;y=folderWindow.y+folderWindow.height-30-body.y-body.height;action=travel?'WALK':'IDLE';}
   if(this.mode==='exit-approach'&&this.inside){const w=scene.windows.find(w=>w.id===this.insideWindowId),different=scene.explorers.some(e=>e.windowId===this.insideWindowId&&e.folderId!==this.folder!.id);
    if(!w||different){this.begin('exit-closed',now);}
    else{const r=w.rect;this.exitCursorX=(this.exitCursorX??x)+r.x-this.inside.x;x=this.exitCursorX;this.inside={...r};if(this.exitFacing===undefined)this.exitFacing=x+body.x+body.width/2<r.x+r.width/2?-1:1;
     const target=this.exitFacing>0?r.x+r.width-12-body.x-body.width:r.x+12-body.x;const d=target-x;x+=Math.sign(d)*Math.min(Math.abs(d),Math.max(3,o.walkSpeed??28)*dt);this.exitCursorX=x;y=r.y+r.height-30-body.y-body.height;action='WALK';
     if(Math.abs(target-x)<1){x=target;this.exitStart={x,y};this.begin('exit-window',now);}
    }
   }
   if(this.mode==='exit-window'&&this.inside){const r=this.inside,p=clamp((now-this.since)/900,0,1);if(!this.exitStart)this.exitStart={x,y};x=this.exitStart.x+(this.exitFacing??1)*(body.width+24)*p;y=this.exitStart.y;}

   if(this.mode==='enter')action='ENTER_FOLDER';if(this.mode==='exit-closed')action='EXIT_CLOSED_FOLDER';if(this.mode==='exit-window')action='EXIT_WINDOW';hidden=this.mode==='inside-closed';
   if((this.mode==='exit-closed'||this.mode==='exit-window')&&now-this.since>=900){this.reset();this.cooldown=now+15000;landing=true;}
   return {x:Math.round(x),y:Math.round(y),action,hidden,landing,reverse,mode:this.mode,facing:this.mode==='exit-approach'||this.mode==='exit-window'?this.exitFacing:undefined,folderProgress:this.mode==='enter'||this.mode==='exit-closed'||this.mode==='exit-window'?clamp((now-this.since)/900,0,1):undefined,clip:this.mode==='inside-window'||this.mode==='exit-approach'?this.inside:undefined,ownerWindow:this.mode==='inside-window'||this.mode==='exit-approach'||this.mode==='exit-window'?this.insideWindowId:undefined};
  }
  if(this.mode==='normal'&&!this.forceFloor&&o.folderPlay&&now>this.cooldown&&scene.foldersAvailable){const p=foot(),folder=scene.folders.find(f=>Math.abs(p.x-(f.rect.x+f.rect.width/2))<Math.max(35,body.width*.55)&&Math.abs(p.y-(f.rect.y+f.rect.height*.7))<Math.max(50,body.height*.65)&&(o.behindWindows||!scene.windows.some(w=>contains(w.rect,f.rect.x+f.rect.width/2,f.rect.y+f.rect.height/2))));if(folder){this.folder={id:folder.id,rect:{...folder.rect}};this.begin('enter',now);return this.step({x,y},body,area,o,scene,now,0);}}
  if(this.mode==='mount'&&this.edge){const e=this.edge,m=e.mount!,w=scene.windows.find(w=>w.id===e.window);
   if(!w||!o.edgeClimb||o.pet==='penguin'||o.behindWindows){this.dropToFloor(now);}
   else{const p=clamp((now-m.since)/500,0,1),t=p*p*(3-2*p),targetX=e.facing>0?w.rect.x+8-body.x:w.rect.x+w.rect.width-8-body.x-body.width,targetY=w.rect.y-body.y-body.height;x=m.x+(targetX-m.x)*t;y=m.y+(targetY-m.y)*t;
    if(p===1){this.begin('normal',now);this.edge=undefined;this.support={id:w.id,rect:{...w.rect}};return {x:Math.round(x),y:Math.round(y),action:'',hidden,landing:true,mode:this.mode,facing:e.facing};}
    return {x:Math.round(x),y:Math.round(y),action:'EDGE_MOUNT',hidden,landing,mode:this.mode,facing:e.facing,mountProgress:Math.round(p*16)/16};}
  }
  if(this.mode==='climb'&&this.edge){const e=this.edge,w=e.window?scene.windows.find(w=>w.id===e.window):undefined;
   if(!o.edgeClimb||o.pet==='penguin'||e.window&&(!w||o.behindWindows)||now-this.since>(o.climbSpeed===undefined?3500:Math.min(20000,body.height*2000/Math.max(3,o.climbSpeed)))){this.dropToFloor(now);}
   else{if(w){const nx=e.facing>0?w.rect.x:w.rect.x+w.rect.width;if(Math.abs(nx-e.x)>80){this.dropToFloor(now);}else{e.x=nx;e.y+=w.rect.y-e.top;e.top=w.rect.y;}}
    if(this.mode==='climb'){x=e.x-body.x-body.width*(e.facing>0?.95:.05);e.y-=(o.climbSpeed??45)*dt;y=e.y;
     if(y+body.y+body.height<=e.top+2&&w){e.mount={x,y,since:now};this.begin('mount',now);return {x:Math.round(x),y:Math.round(y),action:'EDGE_MOUNT',hidden,landing,mode:this.mode,facing:e.facing,mountProgress:0};}
     return {x:Math.round(x),y:Math.round(y),action:'EDGE_CLIMB',hidden,landing,mode:this.mode,facing:e.facing};}
   }
  }
  const platforms=this.forceFloor?[]:[...(o.windowWalk&&!o.behindWindows?scene.windows:[]),...(o.iconWalk?(scene.icons??[]).map(i=>({id:'icon:'+i.id,rect:{...i.rect,y:i.rect.y+i.rect.height*.2}})):[])];
  if(this.support){const w=platforms.find(w=>w.id===this.support!.id);if(w){x+=w.rect.x-this.support.rect.x;y+=w.rect.y-this.support.rect.y;this.support={id:w.id,rect:{...w.rect}};}else this.support=undefined;}
  const oldFoot=foot();x+=travel;
  let p=foot();const floor=area.y+area.height;
  if(!this.forceFloor&&o.windowLook&&o.pet==='penguin'&&!o.behindWindows&&travel&&now>this.cooldown){const blocked=scene.windows.some(w=>p.y>w.rect.y+body.height*.5&&p.y<w.rect.y+w.rect.height+5&&(travel>0&&oldFoot.x+body.width/2<=w.rect.x+5&&p.x+body.width/2>=w.rect.x||travel<0&&oldFoot.x-body.width/2>=w.rect.x+w.rect.width-5&&p.x-body.width/2<=w.rect.x+w.rect.width));if(blocked){x=point.x;this.begin('look-window',now);return {x:Math.round(x),y:Math.round(y),action:'WINDOW_LOOK',hidden,landing,mode:this.mode};}}
  const surfaces=platforms.filter(w=>{const index=scene.windows.findIndex(front=>front.id===w.id),fronts=index<0?scene.windows:scene.windows.slice(0,index);return p.x>w.rect.x+3&&p.x<w.rect.x+w.rect.width-3&&(o.behindWindows||!fronts.some(front=>contains(front.rect,p.x,w.rect.y-1)));});
  const supported=surfaces.find(w=>Math.abs(p.y-w.rect.y)<3);
  if(supported)this.support={id:supported.id,rect:{...supported.rect}};else this.support=undefined;
  const approach=travel||(o.iconWalk?(o.facing??1):0);
  if(!this.forceFloor&&o.edgeClimb&&o.pet!=='penguin'&&approach&&now>this.cooldown){
   const candidates=[{x:area.x,top:area.y,facing:-1},{x:area.x+area.width,top:area.y,facing:1},...(!o.windowWalk||o.behindWindows?[]:scene.windows.flatMap(w=>[{x:w.rect.x,top:w.rect.y,window:w.id,facing:1},{x:w.rect.x+w.rect.width,top:w.rect.y,window:w.id,facing:-1}]))];
   const e=candidates.find(e=>e.facing===Math.sign(approach)&&Math.abs(p.x-e.x)<body.width*.55&&p.y>e.top+body.height*.3);
   if(e){this.edge={...e,y};this.begin('climb',now);this.cooldown=now+12000;return {x:Math.round(x),y:Math.round(y),action:'EDGE_CLIMB',hidden,landing,mode:this.mode,facing:e.facing};}
  }
  if((o.gravity||this.forceFloor)&&!supported&&p.y<floor-1){if(this.mode!=='fall'){this.begin('fall',now);this.vy=0;}this.vy=Math.min(650,this.vy+1100*dt);const next=p.y+this.vy*dt,hit=surfaces.filter(w=>w.rect.y>=p.y-1&&w.rect.y<=next).sort((a,b)=>a.rect.y-b.rect.y)[0];const target=hit?.rect.y??floor;if(next>=target){y=target-body.y-body.height;this.vy=0;this.forceFloor=false;this.begin('normal',now);landing=true;if(hit)this.support={id:hit.id,rect:{...hit.rect}};}else{y+=this.vy*dt;action='ENV_FALL';}}
  else if(this.mode==='fall'){this.begin('normal',now);this.vy=0;}
  const wanted=x;x=clamp(x,area.x-body.x,area.x+area.width-body.x-body.width);reverse=!!travel&&x!==wanted;if(o.gravity&&y+body.y+body.height>floor)y=floor-body.y-body.height;
  return {x:Math.round(x),y:Math.round(y),action,hidden,landing,reverse,mode:this.mode};
 }
}
