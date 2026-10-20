import path from 'node:path';
import {existsSync,readdirSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

export function runningMacCopies(run:()=>string=()=>execFileSync('/bin/ps',['-axo','pid=,comm='],{encoding:'utf8',timeout:1500,maxBuffer:1024*1024})){
 try{return run().split('\n').filter(line=>/^\s*\d+\s+.*\/Keyboard[ -]Cat[^/]*\.app\/Contents\/(MacOS|Resources)\/(Keyboard Cat|KeyCounter-mac)\s*$/i.test(line)).map(line=>line.trim());}catch{return ['프로세스 목록 확인 불가'];}
}
export function macLeftovers(home:string,userData:string){
 const candidates=[userData,path.join(home,'Library','Application Support','Keyboard Cat'),path.join(home,'Library','Application Support','keyboard-cat'),path.join(home,'Library','Caches','local.keyboardcat.pet'),path.join(home,'Library','Saved Application State','local.keyboardcat.pet.savedState'),path.join(home,'Library','Preferences','local.keyboardcat.pet.plist')];
 return [...new Set(candidates)].filter(p=>existsSync(p));
}

// Read only the named install locations and mounted-volume roots, never user files.
export function findMacCopies(home:string,applications='/Applications',volumes='/Volumes'){
 const roots=[applications,path.join(home,'Applications'),path.join(home,'Downloads'),path.join(home,'Desktop')];
 try{for(const entry of readdirSync(volumes,{withFileTypes:true}))if(entry.isDirectory())roots.push(path.join(volumes,entry.name));}catch{/* Volumes may be unavailable. */}
 const found=new Set<string>();
 for(const root of roots){
  try{for(const entry of readdirSync(root,{withFileTypes:true})){
   if(!/^Keyboard[ -]Cat(?:[ ._-].*)?\.app$/i.test(entry.name))continue;
   const app=path.join(root,entry.name);
   if(existsSync(path.join(app,'Contents','Info.plist')))found.add(realpathSync(app));
  }}catch{/* Inaccessible folders are not a permission failure for input. */}
 }
 return [...found].sort();
}
export function macLaunchLocation(executable:string){
 const normalized=executable.replaceAll('\\','/');
 if(normalized.includes('/AppTranslocation/'))return '앱 임시 격리 위치(AppTranslocation)';
 if(normalized.startsWith('/Volumes/'))return '마운트된 디스크/DMG';
 if(normalized.startsWith('/Applications/'))return '응용 프로그램';
 return '기타 위치(아래 실행 경로 확인)';
}
