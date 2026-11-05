export type RandomSource=()=>number;
export function randomUnit(random:RandomSource){const n=random();return Number.isFinite(n)?Math.max(0,Math.min(1-Number.EPSILON,n)):.5;}
export function randomDuration(min:number,max:number,random:RandomSource){return Math.round(min+(max-min)*randomUnit(random));}
export function variedDuration(base:number,random:RandomSource){return randomDuration(base*.5,base*2.5,random);}
// Decisions are sampled at transitions, never every render/movement tick.
export class AutonomousTiming{
 walkAfter=4000;sleepAfter=30000;private lastInput=0;
 constructor(private random:RandomSource=Math.random){this.activity(0);}
 activity(now:number){if(!this.lastInput||now-this.lastInput>1500){this.walkAfter=randomDuration(2000,10000,this.random);this.sleepAfter=randomDuration(25000,45000,this.random);}this.lastInput=now;}
 idleFor(actual:number){if(actual>=this.sleepAfter)return 30000+actual-this.sleepAfter;if(actual>=this.walkAfter)return Math.max(4001,Math.min(29999,actual));return Math.min(3999,actual);}
}
