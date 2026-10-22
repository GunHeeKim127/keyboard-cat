import {petRect} from './position';
export const parrotBreeds=['cockatoo','macaw','cockatiel','parrotlet','lovebird'] as const;
export type ParrotBreed=typeof parrotBreeds[number];
export const parrotNames:Record<ParrotBreed,string>={cockatoo:'코카투',macaw:'금강앵무',cockatiel:'왕관앵무',parrotlet:'유리앵무',lovebird:'모란앵무'};
export const parrotTraits:Record<ParrotBreed,string>={cockatoo:'흰 깃·노란 관모 · 관모를 활짝 펼치는 인사',macaw:'청금강앵무 · 파란 날개·노란 가슴 · 넓은 날개 자랑',cockatiel:'회색 깃·주황 볼·노란 관모 · 고개 까딱 인사',parrotlet:'작고 둥근 초록 몸·푸른 깃 · 작은 날개 기지개',lovebird:'복숭아빛 얼굴·초록 몸 · 깃 다듬기와 인사'};
export const parrotDisplays:Record<ParrotBreed,string>={cockatoo:'관모 활짝!',macaw:'날개 자랑!',cockatiel:'왕관 인사!',parrotlet:'작은 날개 쭉!',lovebird:'깃 단장!'};
export const parrotFrames:Record<string,number>={IDLE:4,WALK:8,CHIRP:4,CLIMB_UP:4,CLIMB_DOWN:4,FLY:4,DISPLAY:4,SLEEP:4,CARRY:4,LAND:4};
export function isParrotBreed(value:unknown):value is ParrotBreed{return typeof value==='string'&&(parrotBreeds as readonly string[]).includes(value);}
export function parrotSpriteFor(breed:ParrotBreed,action:string){
 const safeBreed=isParrotBreed(breed)?breed:'cockatoo',safeAction=Object.hasOwn(parrotFrames,action)?action:'IDLE';
 return {src:`./sprites/parrot-${safeBreed}-${safeAction.startsWith('CLIMB_')?'CLIMB':safeAction}-atlas.png`,frames:parrotFrames[safeAction]};
}
const parrotFrameHold:Record<string,number>={IDLE:600,WALK:140,CHIRP:260,CLIMB_UP:400,CLIMB_DOWN:400,FLY:180,DISPLAY:450,SLEEP:1200,CARRY:700,LAND:250};
export function parrotDuration(action:string,frames:number,fps:number){

 return frames*Math.max(1000/fps,parrotFrameHold[action]??600)/1000;
}
export function parrotAnimationState(paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,effectAge:number){
 const duration=effect===20?4200:effect===30?2600:effect>=50?2400:1600;
 const activeEffect=!paused&&!moving&&effectAge>=0&&effectAge<duration?effect:0;
 const action=paused?'IDLE':activeEffect>=50?'DISPLAY':activeEffect===30?(effectAge<1600?'FLY':'LAND'):activeEffect===20?(effectAge<1600?'CLIMB_UP':effectAge<3200?'CLIMB_DOWN':'LAND'):activeEffect===10?'CHIRP':idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'CHIRP':'IDLE';
 return {action,effect:activeEffect,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}

// A bird balances on the pointer with its feet; cats/dogs retain their carry geometry.
export function parrotCarryPosition(pointer:{x:number;y:number},size:number){return {x:Math.round(pointer.x-160),y:Math.round(pointer.y-80-112*size*.94)};}
export function parrotDropPosition(pointer:{x:number;y:number},size:number,area:{x:number;y:number;width:number;height:number}){
 const carry=parrotCarryPosition(pointer,size),pet=petRect(size),x=carry.x,y=carry.y+80-pet.y;
 return {x:Math.round(Math.max(area.x-pet.x,Math.min(x,area.x+area.width-pet.x-pet.width))),y:Math.round(Math.max(area.y-pet.y,Math.min(y,area.y+area.height-pet.y-pet.height)))};
}
