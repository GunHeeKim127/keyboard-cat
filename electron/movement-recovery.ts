import {nativePosition} from './position';
export class MovementRecovery{
 private failures=0;private retryAt=0;
 get message(){return this.failures?'이동 좌표를 다시 확인 중 · 현재 위치를 유지해요':'';}
 ready(now:number){return now>=this.retryAt;}
 fail(now:number){this.failures++;this.retryAt=now+Math.min(5000,250*2**Math.min(this.failures-1,5));}
 success(){this.failures=0;this.retryAt=0;}
}
// A rejected plan is discarded; the next plan starts at the actual window,
// never the rejected destination or a fabricated origin.
export function commitMovement(point:{x:number;y:number},move:(x:number,y:number)=>boolean,cancel:()=>void,recovery:MovementRecovery,now:number){
 const valid=nativePosition(point.x,point.y);
 if(!valid||!move(valid.x,valid.y)){cancel();recovery.fail(now);return false;}
 recovery.success();return true;
}
