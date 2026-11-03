import {spriteFor,spriteDuration} from './pets';
import {monkeyWalkVelocity} from './monkeys';
import type {Options} from './options';
// Use the existing whole-body stride cadence; do not slide a slow cycle up a wall.
export function wallClimbCycle(o:Options){
 if(o.pet==='parrot')return 16*Math.max(1/o.fps,.12);
 const v=spriteFor(o.pet,o.dogBreed,'WALK',o.catBreed,o.parrotBreed,o.monkeyBreed,o.penguinBreed);return spriteDuration(o.pet,'WALK',v.frames,o.fps,o.catBreed,o.parrotBreed,o.monkeyBreed,o.penguinBreed);
}
export function wallClimbSpeed(o:Options){
 if(o.pet==='penguin')return 0;
 if(o.pet==='monkey')return monkeyWalkVelocity(o.monkeyBreed,o.size,o.fps);
 const cycle=wallClimbCycle(o);
 const stride=o.pet==='parrot'?16:o.pet==='dog'?24:28;
 return Math.max(3,Math.min(40,stride*1.12*o.size/cycle));
}
