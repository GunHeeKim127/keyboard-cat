// Ground traversal must not reuse the branches painted into monkey TRAVEL.
// Reuse already approved whole-body fall/flight poses, with phase-driven frames.
export function surfaceFrame(progress:number){if(!Number.isFinite(progress))return 0;return Math.max(0,Math.min(3,Math.floor((progress-.18)/.6*4+1e-9)));}
export function surfacePose(pet:string,flight:boolean,value:number):{interaction?:string;action?:string;frame:number}|undefined{
 const frame=Number.isFinite(value)?Math.max(0,Math.min(3,Math.floor(value))):0;
 if(pet==='monkey')return {interaction:'FALL_GROUND',frame};
 if(pet==='parrot'&&flight)return {action:'FLY',frame};
 return undefined;
}
