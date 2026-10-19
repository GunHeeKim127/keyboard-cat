export type Options={avatarName:string;quality:'low'|'medium'|'high'|'custom';size:number;fps:number;wander:boolean;effects:boolean;restAnimation:boolean;sleepAnimation:boolean;showCombo:boolean;grabEnabled:boolean};
export const presets:Record<'low'|'medium'|'high',Options>={
 low:{avatarName:'고양이',quality:'low',size:.75,fps:5,wander:false,effects:false,restAnimation:false,sleepAnimation:false,showCombo:true,grabEnabled:true},
 medium:{avatarName:'고양이',quality:'medium',size:1,fps:8,wander:false,effects:true,restAnimation:false,sleepAnimation:true,showCombo:true,grabEnabled:true},
 high:{avatarName:'고양이',quality:'high',size:1.3,fps:12,wander:true,effects:true,restAnimation:true,sleepAnimation:true,showCombo:true,grabEnabled:true}
};
export function updateOptions(current:Options,patch:unknown):Options {
 if(!patch||typeof patch!=='object')return current;
 const p=patch as Record<string,unknown>;
 if(p.preset==='low'||p.preset==='medium'||p.preset==='high')return {...presets[p.preset],avatarName:current.avatarName};
 const next={...current};let changed=false;
 if(typeof p.avatarName==='string')next.avatarName=Array.from(p.avatarName.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim()).slice(0,20).join('')||'고양이';
 for(const k of ['wander','effects','restAnimation','sleepAnimation','showCombo','grabEnabled'] as const)if(typeof p[k]==='boolean'&&p[k]!==next[k]){next[k]=p[k] as boolean;changed=true;}
 if(typeof p.size==='number'&&[.75,1,1.3].includes(p.size)&&p.size!==next.size){next.size=p.size;changed=true;}
 if(typeof p.fps==='number'&&[5,8,12].includes(p.fps)&&p.fps!==next.fps){next.fps=p.fps;changed=true;}
 if(changed)next.quality='custom';return next;
}
