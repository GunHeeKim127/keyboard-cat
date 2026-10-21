import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import type {NameDisplay} from '../electron/options';
import {DogBreed,PetKind,CatBreed,catBreeds,catBreedNames,catBreedTraits,breeds,breedNames,breedTraits,spriteFor,spriteDuration} from '../electron/pets';
type Options={pet:PetKind;dogBreed:DogBreed;catBreed:CatBreed;avatarName:string;nameDisplay:NameDisplay;quality:string;size:number;fps:number;wander:boolean;effects:boolean;restAnimation:boolean;sleepAnimation:boolean;showCombo:boolean;grabEnabled:boolean;multiMonitor:boolean};
type State={buildLabel:string;diagnosticReport:string;version:string;platform:string;inputReady:boolean;options:Options;facing:number;combo:number;paused:boolean;moving:boolean;carried:boolean;landing:boolean;hookError:string;effect:number;effectAt:number;lastHit:number;action:string;animate:boolean};
declare global {interface Window{cat:{snapshot:()=>Promise<State>;onState:(fn:(s:State)=>void)=>()=>void;lock:()=>void;command:(v:string)=>void;options:(v:unknown)=>void;hover:(v:boolean)=>void;carry:(v:boolean)=>void}}}
// Each generated pet frame has its own texture, so fractional sizes cannot reveal adjacent poses.
// Assets are a fixed, finite set. Retain successful decodes across motion changes.
const frameTextures=new Map<string,Promise<HTMLImageElement>>();
function loadFrame(url:string){
 let loaded=frameTextures.get(url);
 if(!loaded){const img=new Image();img.src=url;loaded=img.decode().then(()=>img);frameTextures.set(url,loaded);loaded.catch(()=>frameTextures.delete(url));}
 return loaded;
}
function FrameSprite({src,frames,duration,animate,reverse=false}:{src:string;frames:number;duration:number;animate:boolean;reverse?:boolean}){
 const first=reverse?frames-1:0,[frame,setFrame]=useState(first);
 useEffect(()=>{
  let disposed=false,timer:ReturnType<typeof setInterval>|undefined;
  setFrame(reverse?frames-1:0);
  // A stationary pose needs no preload work or timer.
  if(!animate||frames<=1)return;
  const images=Array.from({length:frames},(_,i)=>loadFrame(src.replace('-atlas.png','-frame-'+i+'.png')));
  Promise.all(images).then(()=>{
   if(!disposed&&animate&&frames>1)timer=setInterval(()=>setFrame(f=>(f+(reverse?frames-1:1))%frames),duration*1000/frames);
  },()=>{/* Keep the first pose if an asset cannot load. */});
  return()=>{disposed=true;if(timer!==undefined)clearInterval(timer);};
 },[src,frames,duration,animate,reverse]);
 return <img src={src.replace('-atlas.png','-frame-'+frame+'.png')} draggable={false} data-frame={frame} data-frame-count={frames} data-cycle-duration={duration} data-playing={animate&&frames>1} data-reverse={reverse} style={{width:'100%',animation:'none'}}/>;
}
function AvatarName({name,display}:{name:string;display:NameDisplay}){
 const [draft,setDraft]=useState(name);
 useEffect(()=>setDraft(name),[name]);
 function save(){window.cat.options({avatarName:draft});setDraft(draft.trim()||'고양이');}
 return <form className="avatar-settings" onSubmit={e=>{e.preventDefault();save();}}><label htmlFor="avatar-name">아바타 이름</label><div><input id="avatar-name" value={draft} maxLength={40} placeholder="고양이" onChange={e=>setDraft(e.target.value)} onBlur={save}/><button type="submit">저장</button></div><p>최대 20자 · 이름과 표시 방식은 자동으로 저장돼요.</p><span className="name-display-label">이름 표시</span><div className="name-display-options" role="group" aria-label="이름 표시">{(['always','hover','hidden'] as const).map(mode=><button key={mode} type="button" data-name-display={mode} aria-label={mode==='hidden'?'이름 숨기기':mode==='always'?'이름 항상 표시':'마우스를 올릴 때만 이름 표시'} aria-pressed={display===mode} className={display===mode?'selected':''} onClick={()=>window.cat.options({nameDisplay:mode})}>{mode==='always'?'항상':mode==='hover'?'마우스를 올릴 때만':'숨기기'}</button>)}</div><p data-name-display-status>{display==='hidden'?'현재 이름을 숨기고 있어요.':display==='always'?'현재 이름을 항상 표시해요.':'현재 마우스를 올릴 때만 이름을 표시해요.'}</p></form>;
}
function PetPicker({options:o}:{options:Options}){
 const preview=spriteFor(o.pet,o.dogBreed,'IDLE',o.catBreed);
 return <section className="pet-picker" aria-label="반려동물 선택"><div className="pet-tabs">{(['cat','dog'] as const).map(p=><button key={p} data-pet={p} aria-pressed={o.pet===p} className={o.pet===p?'selected':''} onClick={()=>window.cat.options({pet:p})}>{p==='cat'?'고양이':'강아지'}</button>)}</div><div className="pet-choice"><div className="pet-preview"><img src={(o.pet==='dog'||o.catBreed!=='original')?preview.src.replace('-atlas.png','-frame-0.png'):preview.src} alt={o.pet==='cat'?catBreedNames[o.catBreed]:breedNames[o.dogBreed]} style={{width:((o.pet==='dog'||o.catBreed!=='original')?100:preview.frames*100)+'%'}}/></div><div>{o.pet==='dog'?<><label htmlFor="dog-breed">강아지 종류</label><select id="dog-breed" value={o.dogBreed} onChange={e=>window.cat.options({dogBreed:e.target.value})}>{breeds.map(b=><option key={b} value={b}>{breedNames[b]}</option>)}</select><p>{breedTraits[o.dogBreed]}</p></>:<><label htmlFor="cat-breed">고양이 종류</label><select id="cat-breed" value={o.catBreed} onChange={e=>window.cat.options({catBreed:e.target.value})}>{catBreeds.map(b=><option key={b} value={b}>{catBreedNames[b]}</option>)}</select><p>{catBreedTraits[o.catBreed]}</p></>}</div></div><p className="hint">마우스로 고양이·강아지와 품종을 선택해요. 마지막 선택은 저장됩니다.</p></section>;
}
function Controller({s}:{s:State}){
 const o=s.options,labels:Record<string,string>={low:'저 · 절전',medium:'중 · 균형',high:'고 · 풍성하게',custom:'사용자 설정'};
 return <div className="controller"><header><div className="eyebrow">DESKTOP COMPANION</div><h1>Keyboard Cat <span>리모컨</span></h1><p>내 PC에 맞게 가볍게, 또는 풍성하게. <span data-app-version>v{s.version}</span> · {s.buildLabel}</p></header>
  <AvatarName name={o.avatarName} display={o.nameDisplay}/><PetPicker options={o}/>
  <div className="section-label">화질 / 성능 <span>{labels[o.quality]}</span></div>
  <div className="presets">{['low','medium','high'].map((p,i)=><button data-preset={p} className={o.quality===p?'selected':''} key={p} onClick={()=>window.cat.options({preset:p})}><b>{['저','중','고'][i]}</b><small>{['절전 · 5 FPS','균형 · 8 FPS','효과 · 12 FPS'][i]}</small></button>)}</div>
  <p className="hint">원본 픽셀 해상도는 같고, 크기·프레임·효과를 조절해요.</p>
  <div className="toggles">{([['wander','자동 이동'],['effects','콤보 특수 효과'],['restAnimation','대기 애니메이션'],['sleepAnimation','수면 애니메이션'],['showCombo','콤보 숫자 표시'],['grabEnabled','마우스로 집어 들기'],['multiMonitor','다중 모니터 이동']] as const).map(([k,label])=><label key={k}><span>{label}</span><input type="checkbox" data-option={k} checked={o[k]} onChange={e=>window.cat.options({[k]:e.target.checked})}/></label>)}</div>
  <p className="hint">다중 모니터 이동을 끄면 고양이가 주 모니터 안에서만 움직여요.</p><p className="hint combo-guide">콤보 효과를 켜면 10의 배수: 점프·낙하·착지 / 20의 배수: 사다리 / 30의 배수: 대시 / 50의 배수: 공격 · 겹치면 공격 → 대시 → 사다리 → 점프</p><div className="controls"><button onClick={()=>window.cat.command('move')}>{s.moving?'✓ 위치 고정':'↔ 고양이 위치 조정'}</button><button onClick={()=>window.cat.command('pause')}>{s.paused?'▶ 계속하기':'Ⅱ 일시정지'}</button></div>
  <details><summary>더보기</summary><div className="advanced"><label>표시 크기<select value={o.size} onChange={e=>window.cat.options({size:Number(e.target.value)})}><option value="0.75">작게 · 75%</option><option value="1">보통 · 100%</option><option value="1.3">크게 · 130%</option></select></label><label>애니메이션<select value={o.fps} onChange={e=>window.cat.options({fps:Number(e.target.value)})}>{[5,8,12].map(n=><option key={n} value={n}>{n} FPS</option>)}</select></label><div className="controls"><button onClick={()=>window.cat.command('center')}>위치 초기화</button><button onClick={()=>window.cat.command('reconnect')}>입력 다시 연결</button></div><p className="hint">키 내용은 기록하지 않고 누른 횟수만 처리합니다. 다른 앱 입력을 가로채는 키보드 훅을 사용하지 않습니다.</p></div></details>
  {s.platform==='darwin'&&<div className="mac-permission"><button onClick={()=>window.cat.command('input-settings')}>입력 모니터링 권한 설정</button><p className="hint">시스템 설정에서 현재 설치한 Keyboard Cat의 입력 모니터링을 허용하세요. 5초 간격으로 자동 재연결하며, macOS가 요구하면 앱을 완전히 종료 후 다시 실행하세요. 권한이 없어도 고양이와 리모컨은 사용할 수 있어요.</p></div>}
  <div className={`connection ${s.hookError?'error':''}`}>{s.hookError|| (s.paused?'● 입력 감지 일시정지':s.inputReady?'● 입력 감지 준비 완료':'● 입력 감지 연결 확인 중')}</div>
  <details className="input-diagnostics"><summary>입력 진단 · 이전 앱 확인</summary><p className="hint">설치 위치와 연결 오류만 확인합니다. 키 내용은 포함하지 않습니다. 경로에 사용자 이름이 있을 수 있으니 공유 전에 확인하세요.</p><div className="controls"><button onClick={()=>window.cat.command('input-diagnostics')}>상태 확인</button><button onClick={()=>window.cat.command('copy-diagnostics')}>진단 복사</button></div>{s.diagnosticReport&&<textarea aria-label="입력 연결 진단" readOnly value={s.diagnosticReport}/>}</details>
  <footer><button onClick={()=>window.cat.command('hide')}>리모컨 숨기기</button><button onClick={()=>window.cat.command('quit')}>앱 종료</button></footer>
  <p className="hint bottom-note">숨긴 리모컨은 트레이 고양이를 더블클릭하면 열려요.</p>
 </div>;
}
function App(){
 const [hovered,setHovered]=useState(false);
 const [s,set]=useState<State>({buildLabel:'',diagnosticReport:'',version:'',platform:'',inputReady:false,options:{pet:'cat',dogBreed:'chihuahua',catBreed:'original',avatarName:'고양이',nameDisplay:'hover',quality:'low',size:.75,fps:5,wander:false,effects:false,restAnimation:false,sleepAnimation:false,showCombo:true,grabEnabled:true,multiMonitor:true},facing:1,combo:0,paused:false,moving:false,carried:false,landing:false,hookError:'',effect:0,effectAt:0,lastHit:0,action:'IDLE',animate:false});
 useEffect(()=>{let active=true;const off=window.cat.onState(v=>{if(active)set(v);});window.cat.snapshot().then(v=>{if(active&&v)set(v);});return()=>{active=false;off();};},[]);
 if(new URLSearchParams(location.search).has('panel'))return <Controller s={s}/>;
 const o=s.options,isolated=o.pet==='dog'||o.catBreed!=='original',visualAction=s.carried&&isolated?'CARRY':s.action,visual=spriteFor(o.pet,o.dogBreed,visualAction,o.catBreed),n=visual.frames,duration=spriteDuration(o.pet,visualAction,n,o.fps,o.catBreed),spriteKey=o.pet+'-'+o.dogBreed+'-'+o.catBreed+'-'+visualAction+'-'+s.effectAt;
 return <main data-cat-breed={o.catBreed} data-isolated={isolated} data-pet-kind={o.pet} data-dog-breed={o.dogBreed} className={`${s.moving?'moving':''} ${!o.effects?'low-power':''} effect-${s.effect}`}>
  {s.moving&&<div className="toolbar"><span>드래그하여 이동</span><button onClick={()=>window.cat.lock()}>위치 고정</button></div>}
  {o.showCombo&&s.combo>0&&<div className="combo"><strong>{s.combo}</strong><span>COMBO</span><div key={s.lastHit} className="meter" style={{animationDelay:`-${Math.min(1500,Date.now()-s.lastHit)}ms`}}/></div>}
  {s.effect>0&&<div className="burst" key={s.effectAt}>{s.effect===50?(o.pet==='dog'?'✦ WOOF POWER ✦':'✦ MEOW POWER ✦'):s.effect===30?'⚡ SUPER DASH ⚡':s.effect===20?(s.action==='CLIMB_DOWN'?'↓ 내려오기 ↓':'↑ 사다리 콤보 ↑'):'✧ NICE! ✧'}</div>}
  <div className={`pet ${s.carried?'carry':s.landing?'landing':s.animate?s.action.toLowerCase():''} ${o.grabEnabled?'grabbable':''}`} style={{width:112*o.size,height:112*o.size,'--facing':s.facing,'--drop-y':'-6px','--walk-cycle':duration+'s','--walk-sway-x':(.8*o.size)+'px','--walk-sway-y':(-.5*o.size)+'px'} as React.CSSProperties}
   onMouseEnter={()=>{setHovered(true);window.cat.hover(true);}} onMouseLeave={()=>{setHovered(false);window.cat.hover(false);}}
   onPointerDown={e=>{if(e.button===0&&o.grabEnabled&&!s.moving){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);window.cat.carry(true);}}}
   onPointerUp={e=>{window.cat.carry(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>window.cat.carry(false)} onLostPointerCapture={()=>window.cat.carry(false)}>
   {o.pet==='cat'&&o.catBreed!=='original'&&!s.carried&&s.animate&&s.action.startsWith('CLIMB_')&&<div className="ladder" aria-label="사다리" data-direction={s.action==='CLIMB_DOWN'?'down':'up'} style={{left:s.facing<0?'10%':'66%'}}><i/><i/><i/><i/><i/></div>}
   <div className="facing" style={{transform:`scaleX(${s.facing})`}}>{s.carried&&!isolated?<img className="carry-image" src="./sprites/carry.png" draggable={false}/>:<div className="sprite">{isolated?<FrameSprite key={spriteKey} src={visual.src} frames={n} duration={duration} animate={s.carried?!s.paused:s.animate} reverse={s.action==='CLIMB_DOWN'}/>:<img key={spriteKey} src={visual.src} draggable={false} style={{width:`${n*100}%`,animation:(n>1)&&s.animate?`frames ${duration}s steps(${n}) infinite ${s.action==='CLIMB_DOWN'?'reverse':'normal'}`:'none'}}/>}</div>}</div>
   {(o.nameDisplay==='always'||(o.nameDisplay==='hover'&&hovered))&&<div className="avatar-name" role={o.nameDisplay==='hover'?'tooltip':undefined}>{o.avatarName}</div>}
  </div>
  {(s.paused||s.hookError)&&<div className="status">{s.paused?'쉬는 중 · 감지 꺼짐':s.hookError}</div>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
