export function animationState(paused:boolean,lowPower:boolean,moving:boolean,idleFor:number,count:number,effect:number,effectAge:number,pet:'cat'|'dog'='cat'){
 const dog=pet==='dog',climb=dog?1400:800,jump=dog?800:600,fall=dog?1250:950;
 const duration=dog?(effect===20?3300:effect===10?1700:effect>=50?1800:1500):(effect===20?1900:effect===10?1300:1100);
 const activeEffect=!paused&&!moving&&effectAge>=0&&effectAge<duration?effect:0;
 const action=paused?'IDLE':activeEffect>=50?'ATTACK':activeEffect>=30?'DASH':activeEffect===20?(effectAge<climb?'CLIMB_UP':effectAge<climb*2?'CLIMB_DOWN':'LAND'):activeEffect===10?(effectAge<jump?'JUMP':effectAge<fall?'FALL':'LAND'):idleFor>=30000?'SLEEP':idleFor>4000&&!moving?'WALK':count>0?'ATTACK':'IDLE';
 return {action,effect:activeEffect,animate:!paused&&!(lowPower&&(action==='IDLE'||action==='SLEEP'))};
}

// Sleep-off continues the same awake walk used before the idle timeout.
export function sleepPreference<T extends {action:string;animate:boolean}>(view:T,autoSleep:boolean,paused:boolean,sleepAnimation:boolean){
 if(view.action!=='SLEEP')return view;
 return {...view,action:autoSleep?'SLEEP':'WALK',animate:!paused&&(!autoSleep||sleepAnimation)};
}
export function awakeForMovement(autoSleep:boolean,idleFor:number){return !autoSleep||idleFor<30000;}
// Active keyboard combos outrank environmental and petting poses; carrying is
// rendered separately. Physical motion still respects its own collision rules.
export function motionVisual<T extends {action:string;animate:boolean;effect:number}>(view:T,paused:boolean,carried:boolean,landing:boolean,environment:string,petting:boolean){
 if(paused)return {...view,animate:false};
 if(carried||view.effect>0)return view;
 if(petting)return {...view,action:'PETTED',animate:true};
 if(environment)return {...view,action:environment,animate:true};
 if(landing)return {...view,action:'LAND',animate:true};
 return view;
}
