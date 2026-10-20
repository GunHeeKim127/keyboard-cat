import {DogBreed,PetKind,isDogBreed} from './pets';
export type NameDisplay='hover'|'always'|'hidden';
export type Options={pet:PetKind;dogBreed:DogBreed;avatarName:string;nameDisplay:NameDisplay;quality:'low'|'medium'|'high'|'custom';size:number;fps:number;wander:boolean;effects:boolean;restAnimation:boolean;sleepAnimation:boolean;showCombo:boolean;grabEnabled:boolean;multiMonitor:boolean};
export const presets:Record<'low'|'medium'|'high',Options>={
 low:{pet:'cat',dogBreed:'chihuahua',avatarName:'고양이',nameDisplay:'hover',quality:'low',size:.75,fps:5,wander:false,effects:false,restAnimation:false,sleepAnimation:false,showCombo:true,grabEnabled:true,multiMonitor:true},
 medium:{pet:'cat',dogBreed:'chihuahua',avatarName:'고양이',nameDisplay:'hover',quality:'medium',size:1,fps:8,wander:false,effects:true,restAnimation:false,sleepAnimation:true,showCombo:true,grabEnabled:true,multiMonitor:true},
 high:{pet:'cat',dogBreed:'chihuahua',avatarName:'고양이',nameDisplay:'hover',quality:'high',size:1.3,fps:12,wander:true,effects:true,restAnimation:true,sleepAnimation:true,showCombo:true,grabEnabled:true,multiMonitor:true}
};
export function updateOptions(current:Options,patch:unknown):Options {
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||![Object.prototype,null].includes(Object.getPrototypeOf(patch)))return current;
 const p=patch as Record<string,unknown>;
 if(Object.hasOwn(p,'preset')&&(p.preset==='low'||p.preset==='medium'||p.preset==='high'))return {...presets[p.preset],pet:current.pet,dogBreed:current.dogBreed,avatarName:current.avatarName,nameDisplay:current.nameDisplay,multiMonitor:current.multiMonitor};
 const next={...current};let changed=false;
 if(Object.hasOwn(p,'nameDisplay')&&(p.nameDisplay==='hover'||p.nameDisplay==='always'||p.nameDisplay==='hidden'))next.nameDisplay=p.nameDisplay;
 if(Object.hasOwn(p,'pet')&&(p.pet==='cat'||p.pet==='dog'))next.pet=p.pet;
 if(Object.hasOwn(p,'dogBreed')&&isDogBreed(p.dogBreed))next.dogBreed=p.dogBreed;
 if(Object.hasOwn(p,'multiMonitor')&&typeof p.multiMonitor==='boolean')next.multiMonitor=p.multiMonitor;
 if(Object.hasOwn(p,'avatarName')&&typeof p.avatarName==='string'&&p.avatarName.length<=256)next.avatarName=Array.from(p.avatarName.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim()).slice(0,20).join('')||'고양이';
 for(const k of ['wander','effects','restAnimation','sleepAnimation','showCombo','grabEnabled'] as const)if(Object.hasOwn(p,k)&&typeof p[k]==='boolean'&&p[k]!==next[k]){next[k]=p[k] as boolean;changed=true;}
 if(Object.hasOwn(p,'size')&&typeof p.size==='number'&&[.75,1,1.3].includes(p.size)&&p.size!==next.size){next.size=p.size;changed=true;}
 if(Object.hasOwn(p,'fps')&&typeof p.fps==='number'&&[5,8,12].includes(p.fps)&&p.fps!==next.fps){next.fps=p.fps;changed=true;}
 if(changed)next.quality='custom';return next;
}
