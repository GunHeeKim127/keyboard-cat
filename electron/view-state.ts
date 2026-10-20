export function animationState(paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,effectAge:number){
 const duration=effect===20?1900:effect===10?1300:1100;
 const activeEffect=!paused&&!moving&&effectAge>=0&&effectAge<duration?effect:0;
 const action=paused?'IDLE':activeEffect>=50?'ATTACK':activeEffect>=30?'DASH':activeEffect===20?(effectAge<800?'CLIMB_UP':effectAge<1600?'CLIMB_DOWN':'LAND'):activeEffect===10?(effectAge<600?'JUMP':effectAge<950?'FALL':'LAND'):idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'ATTACK':'IDLE';
 return {action,effect:activeEffect,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}
