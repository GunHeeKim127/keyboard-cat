import type {Rect} from './desktop-world';
export type IconPlatform={id:string;rect:Rect};
export type IconMotionLimits={distance:number;rise:number;drop:number;arc:number;duration:number};
const defaults:IconMotionLimits={distance:220,rise:150,drop:150,arc:60,duration:1100};
export function iconHopFrame(progress:number){return [0,.08,.18,.32,.50,.78,.88,.96].filter(t=>progress>=t).length-1;}
export function iconHopAction(pet:string,frame:number){
 if(pet==='penguin')return 'ICON_HOP';
 if(frame<2)return 'IDLE';
 if(frame>=5)return 'LAND_GROUND';
 if((pet==='cat'||pet==='dog')&&frame===4)return 'FALL_GROUND';
 return 'ICON_HOP';
}
export function surfaceFallbackTravel(onSurface:boolean,awake:boolean,hopping:boolean,falling:boolean,settling:boolean,travel:number,facing:number,fallbackStep?:number){
 return onSurface&&awake&&!hopping&&!falling&&!settling?(travel||(fallbackStep??Math.sign(facing)*2)):0;
}
// Art direction limits, scaled with the pet; not real-world jumping records.
export function iconMotionLimits(pet:string,monkey:string,penguin:string,size:number,flight=true):IconMotionLimits{
 const side=Math.max(40,Math.min(200,size));
 if(pet==='penguin')return {distance:side*1.1,rise:side*(penguin==='rockhopper'?.6:.3),drop:side*.6,arc:side*.18,duration:1200};
 if(pet==='monkey'&&monkey==='loris')return {distance:side*.55,rise:side*.3,drop:side*.4,arc:0,duration:1900};
 if(pet==='parrot'&&!flight)return {distance:side*.6,rise:side*.25,drop:side*.4,arc:side*.08,duration:1300};
 if(pet==='parrot')return {distance:side*2.8,rise:side*2,drop:side*2,arc:side*.35,duration:1150};
 if(pet==='dog')return {distance:side*1.8,rise:side*1.1,drop:side*1.2,arc:side*.4,duration:1200};
 return {distance:side*2.3,rise:side*1.5,drop:side*1.5,arc:side*.5,duration:1200};
}
const surface=(i:IconPlatform)=>({x:i.rect.x+i.rect.width/2,y:i.rect.y+i.rect.height*.2});
function pointAt(from:{x:number;y:number},end:{x:number;y:number},p:number,arc:number){const t=Math.max(0,Math.min(1,(p-.18)/.60));if(t===0)return {...from};if(t===1)return {...end};return {x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t-Math.sin(Math.PI*t)*arc};}
function clearPath(from:{x:number;y:number},target:IconPlatform,arc:number,obstacles:Rect[]){const end=surface(target);for(let n=1;n<=12;n++){const p=pointAt(from,end,n/12,arc);if(obstacles.some(r=>p.x>r.x+2&&p.x<r.x+r.width-2&&p.y>r.y+2&&p.y<r.y+r.height-2))return false;}return true;}
// Positions only: files are never opened, moved or changed by this planner.
export class IconRoute{
 private hop?:{from:{x:number;y:number};target:IconPlatform;start:number;limits:IconMotionLimits};private serial=0;private current='';private restUntil=0;
 private last=0;
 get active(){return !!this.hop;}
 freeze(now:number){const elapsed=this.last?Math.max(0,now-this.last):0;this.last=now;if(this.hop)this.hop.start+=elapsed;if(this.restUntil)this.restUntil+=elapsed;}
 reset(){this.hop=undefined;this.current='';this.restUntil=0;}
 step(foot:{x:number;y:number},icons:IconPlatform[],now:number,limits:IconMotionLimits=defaults,obstacles:Rect[]=[]){
  this.last=now;
  if(this.hop){const h=this.hop,target=icons.find(i=>i.id===h.target.id);if(!target||Math.hypot(target.rect.x-h.target.rect.x,target.rect.y-h.target.rect.y)>8){this.reset();return {foot,fall:true,moving:false};}
   const end=surface(target),p=Math.max(0,Math.min(1,(now-h.start)/h.limits.duration)),next=pointAt(h.from,end,p,h.limits.arc);
   if(!clearPath(h.from,target,h.limits.arc,obstacles)){this.reset();return {foot,fall:true,moving:false};}
   if(p>=1){this.current=target.id;this.hop=undefined;this.restUntil=now+80;return {foot:end,moving:false,landed:true};}return {foot:next,moving:true,facing:end.x<h.from.x?-1:1,progress:p};
  }
  if(this.current&&!icons.some(i=>i.id===this.current)){this.reset();return {foot,fall:true,moving:false};}
  if(now<this.restUntil)return {foot,moving:false};
  const candidates=icons.filter(i=>{const p=surface(i),d=Math.hypot(p.x-foot.x,p.y-foot.y),rise=foot.y-p.y;return i.id!==this.current&&d>8&&d<=limits.distance&&rise<=limits.rise&&rise>=-limits.drop;}).sort((a,b)=>Math.hypot(surface(a).x-foot.x,surface(a).y-foot.y)-Math.hypot(surface(b).x-foot.x,surface(b).y-foot.y)).slice(0,12).filter(i=>clearPath(foot,i,limits.arc,obstacles));
  if(!candidates.length)return {foot,moving:false};
  const higher=candidates.filter(i=>surface(i).y<foot.y-8),choices=higher.length?higher:candidates,target=choices[this.serial++%Math.min(3,choices.length)],end=surface(target);
  this.hop={from:{...foot},target:{id:target.id,rect:{...target.rect}},start:now,limits:{...limits}};return {foot,moving:true,facing:end.x<foot.x?-1:1,progress:0};
 }
}
