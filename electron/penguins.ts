import {petRect} from './position';
export const penguinBreeds=['emperor','adelie','gentoo','rockhopper','little'] as const;
export type PenguinBreed=typeof penguinBreeds[number];
export const penguinNames:Record<PenguinBreed,string>={emperor:'황제펭귄',adelie:'아델리펭귄',gentoo:'젠투펭귄',rockhopper:'남방바위뛰기펭귄',little:'쇠푸른펭귄'};
export const penguinTraits:Record<PenguinBreed,string>={emperor:'노란 목·귀 무늬 · 느긋한 걸음과 발등 위 알 품기',adelie:'하얀 눈테·검은 머리 · 둥지 조약돌 선물',gentoo:'흰 머리띠·주황 부리 · 경쾌한 걸음과 헤엄',rockhopper:'노란 눈썹깃·붉은 눈 · 낮은 바위 폴짝 넘기',little:'작고 둥근 푸른 몸 · 조심스러운 걸음과 굴에서 빼꼼'};
export const penguinDisplays:Record<PenguinBreed,string>={emperor:'발등 위 알을 포근히!',adelie:'조약돌 선물!',gentoo:'물갈퀴 기지개!',rockhopper:'노란 눈썹깃 인사!',little:'굴에서 빼꼼!'};
export const penguinActivities:Record<PenguinBreed,string>={emperor:'얼음 위 슈욱!',adelie:'배로 미끄럼!',gentoo:'얼음 미끄럼!',rockhopper:'바위 폴짝!',little:'푸른 깃 단장!'};
export const penguinFrames:Record<string,number>={IDLE:4,WALK:16,CALL:4,SLIDE:4,SWIM:4,DISPLAY:4,SLEEP:4,CARRY:4,LAND:4};
export function isPenguinBreed(v:unknown):v is PenguinBreed{return typeof v==='string'&&(penguinBreeds as readonly string[]).includes(v);}
export function penguinSpriteFor(breed:PenguinBreed,action:string){const b=isPenguinBreed(breed)?breed:'emperor',a=Object.hasOwn(penguinFrames,action)?action:'IDLE';return {src:`./sprites/penguin-${b}-${a}-atlas.png`,frames:penguinFrames[a]};}
const holds:Record<string,number>={IDLE:650,WALK:75,CALL:350,SLIDE:350,SWIM:300,DISPLAY:650,SLEEP:1400,CARRY:650,LAND:350};
export function penguinDuration(breed:PenguinBreed,action:string,frames:number,fps:number){const pace=action==='WALK'?{emperor:1.25,adelie:1,gentoo:.9,rockhopper:1,little:1.15}[breed]:1;return frames*Math.max(1000/fps,(holds[action]??650)*pace)/1000;}
export function penguinAnimationState(paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,age:number){
 const duration=effect===20?2400:effect===30?2600:effect===50?3000:1600;
 const active=!paused&&!moving&&age>=0&&age<duration?effect:0;
 const action=paused?'IDLE':active===50?'DISPLAY':active===30?(age<1800?'SWIM':'LAND'):active===20?(age<1600?'SLIDE':'LAND'):active===10?'CALL':idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'CALL':'IDLE';
 return {action,effect:active,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}
// A carried penguin rests its feet on the pointer; other pets keep their geometry.
export function penguinCarryPosition(p:{x:number;y:number},size:number){return {x:Math.round(p.x-160),y:Math.round(p.y-80-112*size*.94)};}
export function penguinDropPosition(p:{x:number;y:number},size:number,area:{x:number;y:number;width:number;height:number}){const c=penguinCarryPosition(p,size),r=petRect(size);return{x:Math.round(Math.max(area.x-r.x,Math.min(c.x,area.x+area.width-r.x-r.width))),y:Math.round(Math.max(area.y-r.y,Math.min(c.y+80-r.y,area.y+area.height-r.y-r.height)))};}
export function penguinWalkVelocity(breed:PenguinBreed,size:number,fps:number){return 6*(112/110)*size/penguinDuration(breed,'WALK',penguinFrames.WALK,fps);}
export class PenguinWalkStepper{
 private fraction=0;
 reset(){this.fraction=0;}
 advance(breed:PenguinBreed,size:number,fps:number,direction:number){const distance=this.fraction+penguinWalkVelocity(breed,size,fps)*.1*direction,nearest=Math.round(distance),step=Math.abs(distance-nearest)<1e-10?nearest:Math.trunc(distance);this.fraction=Math.abs(distance-step)<1e-10?0:distance-step;return step;}
}
