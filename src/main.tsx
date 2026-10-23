import {ParrotBreed,parrotBreeds,parrotNames,parrotTraits,parrotDisplays} from '../electron/parrots';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import {StableSpriteImage} from './StableSpriteImage';
import type {NameDisplay} from '../electron/options';
import type {UpdateInfo} from '../electron/updates';
import {DogBreed,PetKind,CatBreed,catBreeds,catBreedNames,catBreedTraits,breeds,breedNames,breedTraits,spriteFor,spriteDuration} from '../electron/pets';
type Options={pet:PetKind;dogBreed:DogBreed;catBreed:CatBreed;parrotBreed:ParrotBreed;avatarName:string;nameDisplay:NameDisplay;quality:string;size:number;fps:number;wander:boolean;effects:boolean;restAnimation:boolean;sleepAnimation:boolean;showCombo:boolean;grabEnabled:boolean;multiMonitor:boolean};
type State={buildLabel:string;diagnosticReport:string;version:string;platform:string;inputReady:boolean;options:Options;facing:number;combo:number;paused:boolean;moving:boolean;carried:boolean;landing:boolean;hookError:string;effect:number;effectAt:number;lastHit:number;action:string;animate:boolean};
declare global {interface Window{cat:{snapshot:()=>Promise<State>;updates:(action:'check'|'download'|'notes'|'status'|'install'|'retry-core'|'cancel-core')=>Promise<UpdateInfo|boolean|undefined>;onUpdateStatus:(fn:()=>void)=>()=>void;onState:(fn:(s:State)=>void)=>()=>void;lock:()=>void;command:(v:string)=>void;options:(v:unknown)=>void;hover:(v:boolean)=>void;carry:(v:boolean)=>void}}}
// Each generated pet frame has its own texture, so fractional sizes cannot reveal adjacent poses.
// Assets are a fixed, finite set. Retain successful decodes across motion changes.
const frameTextures=new Map<string,Promise<HTMLImageElement>>();
function loadFrame(url:string){
 let loaded=frameTextures.get(url);
 if(!loaded){const img=new Image();img.src=url;loaded=img.decode().then(()=>img);frameTextures.set(url,loaded);loaded.catch(()=>frameTextures.delete(url));}
 return loaded;
}
const FrameSprite=React.memo(function FrameSprite({src,frames,duration,animate,reverse=false,restart=0,atlas=false,carry=false}:{src:string;frames:number;duration:number;animate:boolean;reverse?:boolean;restart?:number;atlas?:boolean;carry?:boolean}){
 const first=reverse?frames-1:0,[cursor,setFrame]=useState({src,frame:first});
 const frame=cursor.src===src&&cursor.frame<frames?cursor.frame:first;
 useEffect(()=>{
  let disposed=false,timer:ReturnType<typeof setInterval>|undefined;
  const initial=reverse?frames-1:0;
  setFrame(previous=>previous.src===src&&previous.frame===initial?previous:{src,frame:initial});
  // A stationary pose needs no preload work or timer.
  if(atlas||!animate||frames<=1)return;
  const images=Array.from({length:frames},(_,i)=>loadFrame(src.replace('-atlas.png','-frame-'+i+'.png')));
  Promise.all(images).then(()=>{
   if(!disposed&&animate&&frames>1)timer=setInterval(()=>setFrame(f=>({src,frame:(f.frame+(reverse?frames-1:1))%frames})),duration*1000/frames);
  },()=>{/* Keep the first pose if an asset cannot load. */});
  return()=>{disposed=true;if(timer!==undefined)clearInterval(timer);};
 },[src,frames,duration,animate,reverse,restart,atlas]);
 return <StableSpriteImage src={atlas||carry?src:src.replace('-atlas.png','-frame-'+frame+'.png')} restart={atlas?reverse+'-'+restart:0} className={carry?'carry-image':undefined} draggable={false} data-frame={frame} data-frame-count={frames} data-cycle-duration={duration} data-playing={animate&&frames>1} data-reverse={reverse} style={{width:atlas?`${frames*100}%`:'100%',animation:atlas&&frames>1&&animate?`frames ${duration}s steps(${frames}) infinite ${reverse?'reverse':'normal'}`:'none'}}/>;
});
function AvatarName({name,display}:{name:string;display:NameDisplay}){
 const [draft,setDraft]=useState(name);
 useEffect(()=>setDraft(name),[name]);
 function save(){window.cat.options({avatarName:draft});setDraft(draft.trim()||'고양이');}
 return <form className="avatar-settings" onSubmit={e=>{e.preventDefault();save();}}><label htmlFor="avatar-name">아바타 이름</label><div><input id="avatar-name" value={draft} maxLength={40} placeholder="고양이" onChange={e=>setDraft(e.target.value)} onBlur={save}/><button type="submit">저장</button></div><p>최대 20자 · 이름과 표시 방식은 자동으로 저장돼요.</p><span className="name-display-label">이름 표시</span><div className="name-display-options" role="group" aria-label="이름 표시">{(['always','hover','hidden'] as const).map(mode=><button key={mode} type="button" data-name-display={mode} aria-label={mode==='hidden'?'이름 숨기기':mode==='always'?'이름 항상 표시':'마우스를 올릴 때만 이름 표시'} aria-pressed={display===mode} className={display===mode?'selected':''} onClick={()=>window.cat.options({nameDisplay:mode})}>{mode==='always'?'항상':mode==='hover'?'마우스를 올릴 때만':'숨기기'}</button>)}</div><p data-name-display-status>{display==='hidden'?'현재 이름을 숨기고 있어요.':display==='always'?'현재 이름을 항상 표시해요.':'현재 마우스를 올릴 때만 이름을 표시해요.'}</p></form>;
}
function PetPicker({options:o}:{options:Options}){
 const preview=spriteFor(o.pet,o.dogBreed,'IDLE',o.catBreed,o.parrotBreed);
 return <section className="pet-picker" aria-label="반려동물 선택"><div className="pet-tabs">{(['cat','dog','parrot'] as const).map(p=><button key={p} data-pet={p} aria-pressed={o.pet===p} className={o.pet===p?'selected':''} onClick={()=>window.cat.options({pet:p})}>{p==='cat'?'고양이':p==='dog'?'강아지':'앵무새'}</button>)}</div><div className="pet-choice"><div className="pet-preview"><img src={(o.pet!=='cat'||o.catBreed!=='original')?preview.src.replace('-atlas.png','-frame-0.png'):preview.src} alt={o.pet==='cat'?catBreedNames[o.catBreed]:o.pet==='dog'?breedNames[o.dogBreed]:parrotNames[o.parrotBreed]} style={{width:((o.pet!=='cat'||o.catBreed!=='original')?100:preview.frames*100)+'%'}}/></div><div>{o.pet==='parrot'?<><label htmlFor="parrot-breed">앵무새 종류</label><select id="parrot-breed" value={o.parrotBreed} onChange={e=>window.cat.options({parrotBreed:e.target.value})}>{parrotBreeds.map(b=><option key={b} value={b}>{parrotNames[b]}</option>)}</select><p>{parrotTraits[o.parrotBreed]}</p></>:o.pet==='dog'?<><label htmlFor="dog-breed">강아지 종류</label><select id="dog-breed" value={o.dogBreed} onChange={e=>window.cat.options({dogBreed:e.target.value})}>{breeds.map(b=><option key={b} value={b}>{breedNames[b]}</option>)}</select><p>{breedTraits[o.dogBreed]}</p></>:<><label htmlFor="cat-breed">고양이 종류</label><select id="cat-breed" value={o.catBreed} onChange={e=>window.cat.options({catBreed:e.target.value})}>{catBreeds.map(b=><option key={b} value={b}>{catBreedNames[b]}</option>)}</select><p>{catBreedTraits[o.catBreed]}</p></>}</div></div><p className="hint">마우스로 고양이·강아지·앵무새와 종류를 선택해요. 마지막 선택은 저장됩니다.</p></section>;
}
function MacPermission(){
 return <div className="mac-permission"><button onClick={()=>window.cat.command('input-settings')}>입력 모니터링 권한 설정</button><p className="hint">현재 설치한 Keyboard Cat의 입력 모니터링을 허용하세요. 권한 변경 후 자동으로 재연결하며, 이 리모컨으로 돌아올 때도 다시 확인합니다.</p><details><summary>권한을 켰는데도 입력이 안 될 때</summary><ol><li>앱을 응용 프로그램 폴더로 옮기고, 다운로드한 디스크 창의 앱은 종료하세요.</li><li>시스템 설정 → 개인정보 보호 및 보안 → 입력 모니터링에서 현재 앱의 권한을 확인하세요.</li><li>업데이트 전 권한 항목과 혼동되면 Keyboard Cat을 완전히 종료한 뒤 이전 항목을 제거하고, 응용 프로그램의 Keyboard Cat을 다시 추가해 허용하세요.</li><li>앱을 다시 열고 ‘입력 다시 연결’을 누르세요. 계속 안 되면 ‘입력 진단’으로 실행 위치와 상태를 확인하세요.</li></ol><p>macOS가 재실행을 요구하면 앱을 완전히 종료해 주세요. 권한은 macOS에서 관리하므로 앱이 대신 허용하거나 권한 기록을 지울 수는 없어요. 입력이 연결되지 않아도 캐릭터·리모컨·설정·업데이트는 사용할 수 있어요.</p></details></div>;
}
function Updates(){
 const [info,setInfo]=useState<UpdateInfo>(),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;const refresh=()=>{void window.cat.updates('status').then(value=>{if(active&&value&&typeof value==='object')setInfo(previous=>previous?{...previous,installation:value.installation,failure:value.failure}:value);}).catch(()=>{});};refresh();const remove=window.cat.onUpdateStatus(refresh);return()=>{active=false;remove();};},[]);
 const phase=info?.installation?.phase,working=phase==='checking'||phase==='downloading'||phase==='installing';
 useEffect(()=>{
  if(!working)return;
  let active=true,pending=false;
  const timer=setInterval(async()=>{if(pending)return;pending=true;try{const value=await window.cat.updates('status');if(active&&value&&typeof value==='object')setInfo(previous=>previous?{...previous,installation:value.installation,failure:value.failure}:previous);}catch{}finally{pending=false;}},750);
  return()=>{active=false;clearInterval(timer);};
 },[working]);
 async function check(){setBusy(true);setNotice('');try{const result=await window.cat.updates('check');if(result&&typeof result==='object')setInfo(result);else setNotice('업데이트를 확인하지 못했어요. 잠시 후 다시 눌러 주세요.');}catch{setNotice('업데이트를 확인하지 못했어요.');}finally{setBusy(false);}}
 async function open(action:'download'|'notes'|'install'|'retry-core'|'cancel-core'){
  setBusy(true);setNotice('');
  if(action==='download'&&info?.installation)setInfo({...info,installation:{phase:'checking',progress:0,message:'설치 정보를 확인하고 있어요.'}});
  if(action==='install'&&info?.installation)setInfo({...info,installation:{...info.installation,phase:'installing',message:'설치를 시작하고 있어요.'}});
  try{const result=await window.cat.updates(action);
   if(result&&typeof result==='object')setInfo(previous=>previous?{...previous,...result}:previous);
   else setNotice(result?(action==='retry-core'?'업데이트를 다시 적용하고 있어요.':action==='install'?'설치를 시작합니다.':action==='download'?'브라우저에서 받은 뒤 기존 앱을 종료하고 새 파일로 교체하세요.':'브라우저에서 릴리스 내용을 열었어요.'):'요청을 처리하지 못했어요. 업데이트를 다시 확인해 주세요.');
  }catch{setNotice('요청을 처리하지 못했어요. 다시 확인해 주세요.');}finally{setBusy(false);}
 }
 return <section className="updates" aria-label="앱 업데이트"><div className="controls"><button data-update-check disabled={busy||working} onClick={()=>void check()}>{busy||working?'처리 중…':'업데이트 확인'}</button><button disabled={busy||working} onClick={()=>void open('notes')}>릴리스 내용</button></div>{info&&<p role="status">{info.version&&<b>v{info.version} · </b>}{info.message}</p>}{info?.status==='available'&&info.downloadReady&&phase!=='ready'&&phase!=='installing'&&<button data-update-download disabled={busy||working} onClick={()=>void open('download')}>{info.coreReady?'업데이트 적용':info.installation?'업데이트하고 다시 시작':'새 버전 다운로드'}</button>}{info?.installation&&<p data-update-install-status role="status">{info.installation.message}{phase==='downloading'&&' '+Math.floor(info.installation.progress)+'%'}</p>}{phase==='ready'&&<button data-update-install disabled={busy} onClick={()=>void open('install')}>설치하고 다시 시작</button>}{info?.status==='available'&&info.notes&&<details><summary>변경 내용 보기</summary><pre>{info.notes}</pre></details>}{notice&&<p role="status">{notice}</p>}{info?.failure&&<details className="update-history" open={!info.failure.cancelled&&!info.failure.resolved}><summary>업데이트 기록 · v{info.failure.version}</summary><p>{info.failure.resolved?'이후 업데이트의 정상 실행을 확인했어요.':info.failure.cancelled?'이번 업데이트를 취소했고 이전 버전을 유지해요.':'현재 버전을 유지하거나 이전 버전으로 복구했어요.'}</p><p>{info.failure.reason}</p><p>{info.failure.guidance}</p><p>기록 시각: {new Date(info.failure.at).toLocaleString()}</p>{!info.failure.resolved&&!info.failure.cancelled&&<div className="controls"><button data-core-retry disabled={busy||working} onClick={()=>void open('retry-core')}>다시 시도</button><button data-core-cancel disabled={busy||working} onClick={()=>void open('cancel-core')}>이번 업데이트 취소</button></div>}<p>이 창을 닫아도 리모컨의 업데이트 기록에서 다시 확인할 수 있어요.</p></details>}<p>Windows·Mac의 ‘업데이트 적용’은 서명을 확인한 기능·이미지 묶음만 받아 런처를 유지하고 뒤쪽 앱을 자동으로 전환해요. 전환 순간 캐릭터와 리모컨이 잠시 다시 나타날 수 있어요. 새 앱의 화면과 입력 준비를 확인하지 못하면 이전 버전으로 돌아가요. 실행 환경 자체가 바뀌는 업데이트는 전체 앱 교체가 필요해요. Mac은 최초 실행 승인과 입력 모니터링 권한이 필요하며, 이 기능이 macOS 권한을 자동으로 허용하거나 보안 설정을 변경하지 않아요.</p><p>전체 앱 업데이트: Windows의 ‘업데이트하고 다시 시작’을 누르면 다운로드·검증 후 종료·설치를 진행해요. 휴대용도 처음 업데이트할 때 이 PC의 전용 폴더에 설치하며 이후 같은 위치를 갱신해요. 새 앱의 화면과 입력 준비를 확인한 뒤 이전 앱 보관본·기록된 과거 설치파일·직전에 실행한 휴대용 파일을 정리해요. 확인에 실패하면 이전 파일을 남깁니다. 이름·품종 등 설정은 유지해요. Mac은 받은 파일로 직접 교체해 주세요. Mac은 기존 앱을 종료하고 응용 프로그램 폴더에서 대치한 뒤, 확인이 끝나면 이전 DMG·다운로드 파일을 휴지통에 넣으세요.</p></section>;
}
function Controller({s}:{s:State}){
 const o=s.options,labels:Record<string,string>={low:'저 · 절전',medium:'중 · 균형',high:'고 · 풍성하게',custom:'사용자 설정'};
 return <div className="controller"><header><div className="eyebrow">DESKTOP COMPANION</div><h1>Keyboard Cat <span>리모컨</span></h1><p>내 PC에 맞게 가볍게, 또는 풍성하게. <span data-app-version>v{s.version}</span> · {s.buildLabel}</p></header>
  <AvatarName name={o.avatarName} display={o.nameDisplay}/><PetPicker options={o}/>
  <div className="section-label">화질 / 성능 <span>{labels[o.quality]}</span></div>
  <div className="presets">{['low','medium','high'].map((p,i)=><button data-preset={p} className={o.quality===p?'selected':''} key={p} onClick={()=>window.cat.options({preset:p})}><b>{['저','중','고'][i]}</b><small>{['절전 · 5 FPS','균형 · 8 FPS','효과 · 12 FPS'][i]}</small></button>)}</div>
  <p className="hint">원본 픽셀 해상도는 같고, 크기·프레임·효과를 조절해요.</p>
  <div className="toggles">{([['wander','자동 이동'],['effects','콤보 특수 효과'],['restAnimation','대기 애니메이션'],['sleepAnimation','수면 애니메이션'],['showCombo','콤보 숫자 표시'],['grabEnabled','마우스로 집어 들기'],['multiMonitor','다중 모니터 이동']] as const).map(([k,label])=><label key={k}><span>{label}</span><input type="checkbox" data-option={k} checked={o[k]} onChange={e=>window.cat.options({[k]:e.target.checked})}/></label>)}</div>
  <p className="hint">다중 모니터 이동을 끄면 {o.pet==='parrot'?'앵무새가':'고양이가'} 주 모니터 안에서만 움직여요.</p><p className="hint combo-guide">{o.pet==='parrot'?'앵무새 콤보: 10 인사 / 20 가지 오르내리기 / 30 짧은 비행·착지 / 50 종류별 깃 자랑 · 겹치면 50 → 30 → 20 → 10':'콤보 효과를 켜면 10의 배수: 점프·낙하·착지 / 20의 배수: 사다리 / 30의 배수: 대시 / 50의 배수: 공격 · 겹치면 공격 → 대시 → 사다리 → 점프'}</p><div className="controls"><button onClick={()=>window.cat.command('move')}>{s.moving?'✓ 위치 고정':o.pet==='parrot'?'↔ 앵무새 위치 조정':'↔ 고양이 위치 조정'}</button><button onClick={()=>window.cat.command('pause')}>{s.paused?'▶ 계속하기':'Ⅱ 일시정지'}</button></div>
  <details><summary>더보기</summary><div className="advanced"><label>표시 크기<select value={o.size} onChange={e=>window.cat.options({size:Number(e.target.value)})}><option value="0.75">작게 · 75%</option><option value="1">보통 · 100%</option><option value="1.3">크게 · 130%</option></select></label><label>애니메이션<select value={o.fps} onChange={e=>window.cat.options({fps:Number(e.target.value)})}>{[5,8,12].map(n=><option key={n} value={n}>{n} FPS</option>)}</select></label><div className="controls"><button onClick={()=>window.cat.command('center')}>위치 초기화</button><button onClick={()=>window.cat.command('reconnect')}>입력 다시 연결</button></div><p className="hint">키 내용은 기록하지 않고 누른 횟수만 처리합니다. 다른 앱 입력을 가로채는 키보드 훅을 사용하지 않습니다.</p></div></details>
  {s.platform==='darwin'&&<MacPermission/>}
  <div className={`connection ${s.hookError?'error':''}`}>{s.hookError|| (s.paused?'● 입력 감지 일시정지':s.inputReady?'● 입력 감지 준비 완료':'● 입력 감지 연결 확인 중')}</div>
  <details className="input-diagnostics"><summary>입력 진단 · 이전 앱 확인</summary><p className="hint">설치 위치와 연결 오류만 확인합니다. 키 내용은 포함하지 않습니다. 경로에 사용자 이름이 있을 수 있으니 공유 전에 확인하세요.</p><div className="controls"><button onClick={()=>window.cat.command('input-diagnostics')}>상태 확인</button><button onClick={()=>window.cat.command('copy-diagnostics')}>진단 복사</button></div>{s.diagnosticReport&&<textarea aria-label="입력 연결 진단" readOnly value={s.diagnosticReport}/>}</details>
  <Updates/>
  <footer><button onClick={()=>window.cat.command('hide')}>리모컨 숨기기</button><button onClick={()=>window.cat.command('quit')}>앱 종료</button></footer>
  <p className="hint bottom-note">숨긴 리모컨은 트레이 고양이를 더블클릭하면 열려요.</p>
 </div>;
}
type PetAvatarProps=Options & Pick<State,'action'|'animate'|'facing'|'carried'|'landing'|'paused'|'effectAt'|'moving'>;
// IPC clones options each time. Scalar props let memo skip unchanged visuals.
const PetAvatar=React.memo(function PetAvatar(props:PetAvatarProps){
 const s=props,o=props,[hovered,setHovered]=useState(false);
 const isolated=o.pet!=='cat'||o.catBreed!=='original',visualAction=s.carried&&isolated?'CARRY':s.action,visual=spriteFor(o.pet,o.dogBreed,visualAction,o.catBreed,o.parrotBreed),n=visual.frames,duration=spriteDuration(o.pet,visualAction,n,o.fps,o.catBreed,o.parrotBreed);
 return <div className={`pet ${s.carried?'carry':s.landing?'landing':s.animate?s.action.toLowerCase():''} ${o.grabEnabled?'grabbable':''}`} style={{width:112*o.size,height:112*o.size,'--facing':s.facing,'--drop-y':'-6px','--walk-cycle':duration+'s','--walk-sway-x':(.8*o.size)+'px','--walk-sway-y':(-.5*o.size)+'px'} as React.CSSProperties}
   onMouseEnter={()=>{setHovered(true);window.cat.hover(true);}} onMouseLeave={()=>{setHovered(false);window.cat.hover(false);}}
   onPointerDown={e=>{if(e.button===0&&o.grabEnabled&&!s.moving){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);window.cat.carry(true);}}}
   onPointerUp={e=>{window.cat.carry(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>window.cat.carry(false)} onLostPointerCapture={()=>window.cat.carry(false)}>
   {o.pet==='cat'&&o.catBreed!=='original'&&!s.carried&&s.animate&&s.action.startsWith('CLIMB_')&&<div className="ladder" aria-label="사다리" data-direction={s.action==='CLIMB_DOWN'?'down':'up'} style={{left:s.facing<0?'10%':'66%'}}><i/><i/><i/><i/><i/></div>}
   {o.pet==='parrot'&&!s.carried&&s.action.startsWith('CLIMB_')&&<div className="parrot-twig" aria-label="앵무새가 오르내리는 가지" style={{left:s.facing<0?'27%':'68%'}}/>}
   <div className="facing" style={{transform:`scaleX(${s.facing})`}}><div className="sprite"><FrameSprite src={s.carried&&!isolated?'./sprites/carry.png':visual.src} frames={s.carried&&!isolated?1:n} duration={duration} animate={s.carried?!s.paused:s.animate} reverse={s.action==='CLIMB_DOWN'} restart={s.effectAt} atlas={!isolated&&!s.carried} carry={!isolated&&s.carried}/></div></div>
   {(o.nameDisplay==='always'||(o.nameDisplay==='hover'&&hovered))&&<div className="avatar-name" role={o.nameDisplay==='hover'?'tooltip':undefined}>{o.avatarName}</div>}
  </div>;
});
function App(){
 const [s,set]=useState<State>({buildLabel:'',diagnosticReport:'',version:'',platform:'',inputReady:false,options:{pet:'cat',dogBreed:'chihuahua',catBreed:'original',parrotBreed:'cockatoo',avatarName:'고양이',nameDisplay:'hover',quality:'low',size:.75,fps:5,wander:false,effects:false,restAnimation:false,sleepAnimation:false,showCombo:true,grabEnabled:true,multiMonitor:true},facing:1,combo:0,paused:false,moving:false,carried:false,landing:false,hookError:'',effect:0,effectAt:0,lastHit:0,action:'IDLE',animate:false});
 useEffect(()=>{let active=true;const off=window.cat.onState(v=>{if(active)set(v);});window.cat.snapshot().then(v=>{if(active&&v)set(v);});return()=>{active=false;off();};},[]);
 if(new URLSearchParams(location.search).has('panel'))return <Controller s={s}/>;
 const o=s.options,isolated=o.pet!=='cat'||o.catBreed!=='original';
 return <main data-parrot-breed={o.parrotBreed} data-parrot-playing={!s.paused} data-cat-breed={o.catBreed} data-isolated={isolated} data-pet-kind={o.pet} data-dog-breed={o.dogBreed} className={`${s.moving?'moving':''} ${!o.effects?'low-power':''} effect-${s.effect}`}>
  {s.moving&&<div className="toolbar"><span>드래그하여 이동</span><button onClick={()=>window.cat.lock()}>위치 고정</button></div>}
  {o.showCombo&&s.combo>0&&<div className="combo"><strong>{s.combo}</strong><span>COMBO</span><div key={s.lastHit} className="meter" style={{animationDelay:`-${Math.min(1500,Date.now()-s.lastHit)}ms`}}/></div>}
  {s.effect>0&&<div className="burst" key={s.effectAt}>{o.pet==='parrot'?(s.effect===50?parrotDisplays[o.parrotBreed]:s.effect===30?'짧은 비행!':s.effect===20?(s.action==='CLIMB_DOWN'?'가지 내려오기':'가지 오르기'):'까딱 인사!'):s.effect===50?(o.pet==='dog'?'✦ WOOF POWER ✦':'✦ MEOW POWER ✦'):s.effect===30?'⚡ SUPER DASH ⚡':s.effect===20?(s.action==='CLIMB_DOWN'?'↓ 내려오기 ↓':'↑ 사다리 콤보 ↑'):'✧ NICE! ✧'}</div>}
  <PetAvatar {...o} moving={s.moving} action={s.action} animate={s.animate} facing={s.facing} carried={s.carried} landing={s.landing} paused={s.paused} effectAt={s.effectAt}/>
  {(s.paused||s.hookError)&&<div className="status">{s.paused?'쉬는 중 · 감지 꺼짐':s.hookError}</div>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
