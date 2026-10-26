import {petRect} from './position';
export const monkeyBreeds=['capuchin','loris','tamarin','macaque','langur'] as const;
export type MonkeyBreed=typeof monkeyBreeds[number];
export const monkeyNames:Record<MonkeyBreed,string>={capuchin:'흰이마카푸친',loris:'슬로로리스',tamarin:'솜털머리타마린',macaque:'아기 돼지꼬리원숭이',langur:'안경랑구르'};
export const monkeyTraits:Record<MonkeyBreed,string>={capuchin:'크림색 이마·긴 꼬리 · 손으로 살피고 먹이 찾기',loris:'큰 눈·짧은 꼬리 · 천천히 네 발로 짚고 가지 매달리기',tamarin:'하얀 솜털 머리·긴 꼬리 · 가벼운 네 발 걸음과 짧은 도약',macaque:'둥근 아기 얼굴·짧게 말린 꼬리 · 낮은 네 발 걸음과 손뼉',langur:'흰 눈테·회색 털·긴 꼬리 · 균형 잡기와 잎 먹기'};
export const monkeyDisplays:Record<MonkeyBreed,string>={capuchin:'호기심 가득!',loris:'가지 꼭 잡기!',tamarin:'쫑긋 두리번!',macaque:'짝짝 손뼉!',langur:'잎사귀 냠냠!'};
export const monkeyFrames:Record<string,number>={IDLE:4,WALK:8,FORAGE:4,CLIMB_UP:4,CLIMB_DOWN:4,TRAVEL:4,DISPLAY:4,SLEEP:4,CARRY:4,LAND:4};
export function isMonkeyBreed(v:unknown):v is MonkeyBreed{return typeof v==='string'&&(monkeyBreeds as readonly string[]).includes(v);}
export function monkeySpriteFor(breed:MonkeyBreed,action:string){
 const b=isMonkeyBreed(breed)?breed:'capuchin',a=Object.hasOwn(monkeyFrames,action)?action:'IDLE';
 return {src:`./sprites/monkey-${b}-${a.startsWith('CLIMB_')?'CLIMB':a}-atlas.png`,frames:monkeyFrames[a]};
}
const holds:Record<string,number>={IDLE:650,WALK:150,FORAGE:450,CLIMB_UP:450,CLIMB_DOWN:450,TRAVEL:300,DISPLAY:600,SLEEP:1400,CARRY:700,LAND:300};
export function monkeyDuration(breed:MonkeyBreed,action:string,frames:number,fps:number){
 if(action==='WALK'){const hold={capuchin:150,loris:300,tamarin:125,macaque:160,langur:180}[breed]??150;return frames*Math.max(1000/fps,hold)/1000;}
 const slow=breed==='loris'&&['CLIMB_UP','CLIMB_DOWN','TRAVEL'].includes(action)?2:1;
 return frames*Math.max(1000/fps,(holds[action]??650)*slow)/1000;
}
// Distance per complete painted stride, in source-frame pixels. Match translation
// to frame cadence and displayed size so low FPS does not make the feet drag.
export function monkeyWalkVelocity(breed:MonkeyBreed,size:number,fps:number){
 const stride={capuchin:20,loris:22,tamarin:18,macaque:20,langur:22}[breed]??20;
 return stride*(112/110)*size/monkeyDuration(breed,'WALK',8,fps);
}
export class MonkeyWalkStepper{
 private fraction=0;
 reset(){this.fraction=0;}
 advance(breed:MonkeyBreed,size:number,fps:number,direction:number){
  const travel=this.fraction+monkeyWalkVelocity(breed,size,fps)*.1*direction,integer=Math.trunc(travel);
  this.fraction=travel-integer;return integer;
 }
}
export function monkeyAnimationState(breed:MonkeyBreed,paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,age:number){
 const slow=breed==='loris',climb=slow?3600:1800,travel=slow?2400:1200;
 const duration=effect===20?climb*2+1200:effect===30?travel+1200:effect===50?2400:1800;
 const active=!paused&&!moving&&age>=0&&age<duration?effect:0;
 const action=paused?'IDLE':active===50?'DISPLAY':active===30?(age<travel?'TRAVEL':'LAND'):active===20?(age<climb?'CLIMB_UP':age<climb*2?'CLIMB_DOWN':'LAND'):active===10?'FORAGE':idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'FORAGE':'IDLE';
 return {action,effect:active,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}
// Hands, rather than a neck or tail, meet the pointer. Keep the native window geometry.
export function monkeyCarryPosition(pointer:{x:number;y:number},size:number){return {x:Math.round(pointer.x-160),y:Math.round(pointer.y-80-112*size*.12)};}
export function monkeyDropPosition(pointer:{x:number;y:number},size:number,area:{x:number;y:number;width:number;height:number}){
 const p=monkeyCarryPosition(pointer,size),r=petRect(size);
 return {x:Math.round(Math.max(area.x-r.x,Math.min(p.x,area.x+area.width-r.x-r.width))),y:Math.round(Math.max(area.y-r.y,Math.min(p.y,area.y+area.height-r.y-r.height)))};
}
