import {PenguinBreed,isPenguinBreed} from './penguins';
import {ParrotBreed,isParrotBreed} from './parrots';
import {MonkeyBreed,isMonkeyBreed} from './monkeys';
import {DogBreed,PetKind,isDogBreed,CatBreed,isCatBreed} from './pets';
export type NameDisplay='hover'|'always'|'hidden';
export type DesktopPreferences={desktopRoam:boolean;behindWindows:boolean;windowWalk:boolean;gravity:boolean;edgeClimb:boolean;parrotFlight:boolean;windowLook:boolean;folderPlay:boolean;petting:boolean};
export const desktopDefaults:DesktopPreferences={desktopRoam:false,behindWindows:false,windowWalk:false,gravity:false,edgeClimb:false,parrotFlight:false,windowLook:false,folderPlay:false,petting:false};
export type Options=DesktopPreferences & {pet:PetKind;penguinBreed:PenguinBreed;dogBreed:DogBreed;catBreed:CatBreed;parrotBreed:ParrotBreed;monkeyBreed:MonkeyBreed;avatarName:string;nameDisplay:NameDisplay;quality:'low'|'medium'|'high'|'custom';size:number;fps:number;wander:boolean;effects:boolean;restAnimation:boolean;sleepAnimation:boolean;autoSleep:boolean;showCombo:boolean;grabEnabled:boolean;multiMonitor:boolean};
export const presets:Record<'low'|'medium'|'high',Options>={
 low:{...desktopDefaults,pet:'cat',dogBreed:'chihuahua',catBreed:'original',parrotBreed:'cockatoo',monkeyBreed:'capuchin',penguinBreed:'emperor',avatarName:'고양이',nameDisplay:'hover',quality:'low',size:.75,fps:5,wander:false,effects:false,restAnimation:false,sleepAnimation:false,autoSleep:true,showCombo:true,grabEnabled:true,multiMonitor:true},
 medium:{...desktopDefaults,pet:'cat',dogBreed:'chihuahua',catBreed:'original',parrotBreed:'cockatoo',monkeyBreed:'capuchin',penguinBreed:'emperor',avatarName:'고양이',nameDisplay:'hover',quality:'medium',size:1,fps:8,wander:false,effects:true,restAnimation:false,sleepAnimation:true,autoSleep:true,showCombo:true,grabEnabled:true,multiMonitor:true},
 high:{...desktopDefaults,pet:'cat',dogBreed:'chihuahua',catBreed:'original',parrotBreed:'cockatoo',monkeyBreed:'capuchin',penguinBreed:'emperor',avatarName:'고양이',nameDisplay:'hover',quality:'high',size:1.3,fps:12,wander:true,effects:true,restAnimation:true,sleepAnimation:true,autoSleep:true,showCombo:true,grabEnabled:true,multiMonitor:true}
};
function reuseOptions(current:Options,next:Options):Options {
 return (Object.keys(current) as (keyof Options)[]).every(key=>current[key]===next[key])?current:next;
}
export function updateOptions(current:Options,patch:unknown):Options {
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||![Object.prototype,null].includes(Object.getPrototypeOf(patch)))return current;
 const p=patch as Record<string,unknown>;
 if(Object.hasOwn(p,'preset')&&(p.preset==='low'||p.preset==='medium'||p.preset==='high'))return reuseOptions(current,{...presets[p.preset],pet:current.pet,penguinBreed:current.penguinBreed,dogBreed:current.dogBreed,catBreed:current.catBreed,parrotBreed:current.parrotBreed,monkeyBreed:current.monkeyBreed,avatarName:current.avatarName,nameDisplay:current.nameDisplay,autoSleep:current.autoSleep,multiMonitor:current.multiMonitor,...Object.fromEntries(Object.keys(desktopDefaults).map(k=>[k,current[k as keyof DesktopPreferences]]))});
 const next={...current};let changed=false;
 if(Object.hasOwn(p,'penguinBreed')&&isPenguinBreed(p.penguinBreed))next.penguinBreed=p.penguinBreed;
 if(Object.hasOwn(p,'monkeyBreed')&&isMonkeyBreed(p.monkeyBreed))next.monkeyBreed=p.monkeyBreed;
 if(Object.hasOwn(p,'parrotBreed')&&isParrotBreed(p.parrotBreed))next.parrotBreed=p.parrotBreed;
 if(Object.hasOwn(p,'nameDisplay')&&(p.nameDisplay==='hover'||p.nameDisplay==='always'||p.nameDisplay==='hidden'))next.nameDisplay=p.nameDisplay;
 if(Object.hasOwn(p,'catBreed')&&isCatBreed(p.catBreed))next.catBreed=p.catBreed;
 if(Object.hasOwn(p,'pet')&&(p.pet==='cat'||p.pet==='dog'||p.pet==='parrot'||p.pet==='monkey'||p.pet==='penguin'))next.pet=p.pet;
 if(Object.hasOwn(p,'dogBreed')&&isDogBreed(p.dogBreed))next.dogBreed=p.dogBreed;
 if(Object.hasOwn(p,'multiMonitor')&&typeof p.multiMonitor==='boolean')next.multiMonitor=p.multiMonitor;
 if(Object.hasOwn(p,'avatarName')&&typeof p.avatarName==='string'&&p.avatarName.length<=256)next.avatarName=Array.from(p.avatarName.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim()).slice(0,20).join('')||'고양이';
 for(const k of Object.keys(desktopDefaults) as (keyof DesktopPreferences)[])if(Object.hasOwn(p,k)&&typeof p[k]==='boolean')next[k]=p[k] as boolean;
 for(const k of ['wander','effects','restAnimation','autoSleep','sleepAnimation','showCombo','grabEnabled'] as const)if(Object.hasOwn(p,k)&&typeof p[k]==='boolean'&&p[k]!==next[k]){next[k]=p[k] as boolean;changed=true;}
 if(Object.hasOwn(p,'size')&&typeof p.size==='number'&&[.75,1,1.3].includes(p.size)&&p.size!==next.size){next.size=p.size;changed=true;}
 if(Object.hasOwn(p,'fps')&&typeof p.fps==='number'&&[5,8,12].includes(p.fps)&&p.fps!==next.fps){next.fps=p.fps;changed=true;}
 if(changed)next.quality='custom';return reuseOptions(current,next);
}
