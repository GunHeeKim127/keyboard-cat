export const UPDATE_CHECK_INTERVAL=6*60*60*1000;
// One sleeping timer, no polling loop and no downloads. Resume preserves the due time.
export class PeriodicUpdateCheck{
 private timer:ReturnType<typeof setTimeout>|undefined;private stopped=true;private pending=false;private due=0;
 constructor(private check:()=>Promise<unknown>,private changed:()=>void,private now=Date.now,private schedule:typeof setTimeout=setTimeout,private cancel:typeof clearTimeout=clearTimeout){}
 start(){this.stopped=false;if(this.timer||this.pending)return;this.arm(Math.max(15000,this.due-this.now()));}
 stop(){this.stopped=true;if(this.timer)this.cancel(this.timer);this.timer=undefined;}
 private arm(delay:number){if(this.stopped)return;this.timer=this.schedule(()=>{this.timer=undefined;void this.tick();},delay);this.timer.unref?.();}
 private async tick(){if(this.stopped||this.pending)return;this.pending=true;try{await this.check();if(!this.stopped)this.changed();}catch{/* Keep the app usable offline. */}finally{this.pending=false;this.due=this.now()+UPDATE_CHECK_INTERVAL;this.arm(UPDATE_CHECK_INTERVAL);}}
}
// Tiny native UI badge, generated once; existing pet artwork is untouched.
export function updateBadgeBitmap(base:Buffer,width:number,height:number){
 if(width<16||height<16||base.length!==width*height*4)throw Error('Invalid tray bitmap');
 const out=Buffer.from(base),cx=width-6.5,cy=5.5;
 for(let y=0;y<12;y++)for(let x=Math.max(0,width-13);x<width;x++){const d=Math.hypot(x-cx,y-cy);if(d>5.5)continue;const i=(y*width+x)*4;out[i]=d>4.5?255:72;out[i+1]=d>4.5?255:75;out[i+2]=d>4.5?255:245;out[i+3]=255;}
 return out;
}
