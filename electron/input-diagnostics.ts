import path from 'node:path';
import {existsSync,readdirSync,realpathSync} from 'node:fs';
import {execFile,execFileSync} from 'node:child_process';

type IdentityProbe=(file:string)=>Promise<string>;
// Only explicitly requested diagnostics inspect public signing metadata. Never
// read keychains, private keys, TCC databases, command arguments or key events.
export async function macSigningIdentity(executable:string,helper:string,probe:IdentityProbe=file=>new Promise(resolve=>{
 execFile('/usr/bin/codesign',['-d','--verbose=2','-r-',file],{encoding:'utf8',timeout:2000,maxBuffer:65536,windowsHide:true},(error,stdout,stderr)=>resolve(error?'':stdout+'\n'+stderr));
})){
 return Promise.all([['앱',executable],['입력 보조 프로그램',helper]].map(async([label,file])=>{
  try{
   const text=await probe(file);
   const identifier=/^Identifier=([^\r\n]{1,200})$/m.exec(text)?.[1];
   const authority=/^Authority=([^\r\n]{1,200})$/m.exec(text)?.[1];
   const certificate=/certificate (?:root|leaf|0)\s*=\s*H"([a-f\d]{40})"/i.exec(text)?.[1].toUpperCase();
   const adhoc=/^Signature=adhoc$/m.test(text);
   return `${label} 서명 식별: ${identifier?`ID=${identifier} · ${adhoc?'ad-hoc':`발급 이름=${authority||'확인 불가'}`} · 고정 인증서=${certificate||'확인 불가'}`:'확인 불가'}`;
  }catch{return `${label} 서명 식별: 확인 불가`;}
 }));
}

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
