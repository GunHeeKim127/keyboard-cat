import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
type Options={quality:string;size:number;fps:number;wander:boolean;effects:boolean;restAnimation:boolean;sleepAnimation:boolean;showCombo:boolean;grabEnabled:boolean};
type State={platform:string;options:Options;facing:number;combo:number;paused:boolean;moving:boolean;carried:boolean;landing:boolean;hookError:string;effect:number;effectAt:number;lastHit:number;action:string;animate:boolean};
declare global {interface Window{cat:{snapshot:()=>Promise<State>;onState:(fn:(s:State)=>void)=>()=>void;lock:()=>void;command:(v:string)=>void;options:(v:unknown)=>void;hover:(v:boolean)=>void;carry:(v:boolean)=>void}}}
const frames:Record<string,number>={IDLE:8,WALK:9,JUMP:7,DASH:6,ATTACK:5,SLEEP:5};
function Controller({s}:{s:State}){
 const o=s.options,labels:Record<string,string>={low:'저 · 절전',medium:'중 · 균형',high:'고 · 풍성하게',custom:'사용자 설정'};
 return <div className="controller"><header><div className="eyebrow">DESKTOP COMPANION</div><h1>Keyboard Cat <span>리모컨</span></h1><p>내 PC에 맞게 가볍게, 또는 풍성하게.</p></header>
  <div className="section-label">화질 / 성능 <span>{labels[o.quality]}</span></div>
  <div className="presets">{['low','medium','high'].map((p,i)=><button data-preset={p} className={o.quality===p?'selected':''} key={p} onClick={()=>window.cat.options({preset:p})}><b>{['저','중','고'][i]}</b><small>{['절전 · 5 FPS','균형 · 8 FPS','효과 · 12 FPS'][i]}</small></button>)}</div>
  <p className="hint">원본 픽셀 해상도는 같고, 크기·프레임·효과를 조절해요.</p>
  <div className="toggles">{([['wander','자동 이동'],['effects','콤보 특수 효과'],['restAnimation','대기 애니메이션'],['sleepAnimation','수면 애니메이션'],['showCombo','콤보 숫자 표시'],['grabEnabled','마우스로 집어 들기']] as const).map(([k,label])=><label key={k}><span>{label}</span><input type="checkbox" checked={o[k]} onChange={e=>window.cat.options({[k]:e.target.checked})}/></label>)}</div>
  <div className="controls"><button onClick={()=>window.cat.command('move')}>{s.moving?'✓ 위치 고정':'↔ 고양이 위치 조정'}</button><button onClick={()=>window.cat.command('pause')}>{s.paused?'▶ 계속하기':'Ⅱ 일시정지'}</button></div>
  <details><summary>더보기</summary><div className="advanced"><label>표시 크기<select value={o.size} onChange={e=>window.cat.options({size:Number(e.target.value)})}><option value="0.75">작게 · 75%</option><option value="1">보통 · 100%</option><option value="1.3">크게 · 130%</option></select></label><label>애니메이션<select value={o.fps} onChange={e=>window.cat.options({fps:Number(e.target.value)})}>{[5,8,12].map(n=><option key={n} value={n}>{n} FPS</option>)}</select></label><div className="controls"><button onClick={()=>window.cat.command('center')}>위치 초기화</button><button onClick={()=>window.cat.command('reconnect')}>입력 다시 연결</button></div><p className="hint">키 내용은 기록하지 않고 누른 횟수만 처리합니다. 다른 앱 입력을 가로채는 키보드 훅을 사용하지 않습니다.</p></div></details>
  {s.platform==='darwin'&&<div className="mac-permission"><button onClick={()=>window.cat.command('input-settings')}>입력 모니터링 권한 설정</button><p className="hint">처음에는 시스템 설정에서 Keyboard Cat의 입력 모니터링을 허용한 뒤 앱을 다시 실행해 주세요. 권한이 없어도 고양이와 리모컨은 사용할 수 있어요.</p></div>}
  <div className={`connection ${s.hookError?'error':''}`}>{s.hookError|| (s.paused?'● 입력 감지 일시정지':'● 입력 횟수 감지 중')}</div>
  <footer><button onClick={()=>window.cat.command('hide')}>리모컨 숨기기</button><button onClick={()=>window.cat.command('quit')}>앱 종료</button></footer>
  <p className="hint bottom-note">숨긴 리모컨은 트레이 고양이를 더블클릭하면 열려요.</p>
 </div>;
}
function App(){
 const [s,set]=useState<State>({platform:'',options:{quality:'low',size:.75,fps:5,wander:false,effects:false,restAnimation:false,sleepAnimation:false,showCombo:true,grabEnabled:true},facing:1,combo:0,paused:false,moving:false,carried:false,landing:false,hookError:'',effect:0,effectAt:0,lastHit:0,action:'IDLE',animate:false});
 useEffect(()=>{let active=true;const off=window.cat.onState(v=>{if(active)set(v);});window.cat.snapshot().then(v=>{if(active&&v)set(v);});return()=>{active=false;off();};},[]);
 if(new URLSearchParams(location.search).has('panel'))return <Controller s={s}/>;
 const o=s.options,n=frames[s.action],duration=n/(s.action==='SLEEP'?2.5:o.fps);
 return <main className={`${s.moving?'moving':''} ${!o.effects?'low-power':''} effect-${s.effect}`}>
  {s.moving&&<div className="toolbar"><span>드래그하여 이동</span><button onClick={()=>window.cat.lock()}>위치 고정</button></div>}
  {o.showCombo&&s.combo>0&&<div className="combo"><strong>{s.combo}</strong><span>COMBO</span><div key={s.lastHit} className="meter" style={{animationDelay:`-${Math.min(1500,Date.now()-s.lastHit)}ms`}}/></div>}
  {s.effect>0&&<div className="burst" key={s.effectAt}>{s.effect===50?'✦ MEOW POWER ✦':s.effect===30?'⚡ SUPER DASH ⚡':'✧ NICE! ✧'}</div>}
  <div className={`pet ${s.carried?'carry':s.landing?'landing':s.animate?s.action.toLowerCase():''} ${o.grabEnabled?'grabbable':''}`} style={{width:112*o.size,height:112*o.size,'--facing':s.facing,'--drop-y':'-6px'} as React.CSSProperties}
   onMouseEnter={()=>window.cat.hover(true)} onMouseLeave={()=>window.cat.hover(false)}
   onPointerDown={e=>{if(e.button===0&&o.grabEnabled&&!s.moving){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);window.cat.carry(true);}}}
   onPointerUp={e=>{window.cat.carry(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>window.cat.carry(false)} onLostPointerCapture={()=>window.cat.carry(false)}>
   <div className="facing" style={{transform:`scaleX(${s.facing})`}}>{s.carried?<img className="carry-image" src="./sprites/carry.png" draggable={false}/>:<div className="sprite"><img key={s.action} src={`./sprites/${s.action}-atlas.png`} draggable={false} style={{width:`${n*100}%`,animation:s.animate&&!s.landing?`frames ${duration}s steps(${n}) infinite`:'none'}}/></div>}</div>
  </div>
  {(s.paused||s.hookError)&&<div className="status">{s.paused?'쉬는 중 · 감지 꺼짐':s.hookError}</div>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
