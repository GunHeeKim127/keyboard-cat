export function animationState(paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,effectAge:number){
 const activeEffect=!paused&&effectAge<1100?effect:0;
 const action=paused?'IDLE':activeEffect>=50?'ATTACK':activeEffect>=30?'DASH':activeEffect>=10?'JUMP':idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'ATTACK':'IDLE';
 return {action,effect:activeEffect,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}
