export function animationState(paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,effectAge:number,pet:'cat'|'dog'='cat'){
 const dog=pet==='dog',climb=dog?1400:800,jump=dog?800:600,fall=dog?1250:950;
 const duration=dog?(effect===20?3300:effect===10?1700:effect>=50?1800:1500):(effect===20?1900:effect===10?1300:1100);
 const activeEffect=!paused&&!moving&&effectAge>=0&&effectAge<duration?effect:0;
 const action=paused?'IDLE':activeEffect>=50?'ATTACK':activeEffect>=30?'DASH':activeEffect===20?(effectAge<climb?'CLIMB_UP':effectAge<climb*2?'CLIMB_DOWN':'LAND'):activeEffect===10?(effectAge<jump?'JUMP':effectAge<fall?'FALL':'LAND'):idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'ATTACK':'IDLE';
 return {action,effect:activeEffect,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}
