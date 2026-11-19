import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,ArrowLeft,ArrowRight,ChevronLeft,ChevronRight,RotateCcw,Plus,ZoomIn,ZoomOut,X,Move,Maximize,FileText,Volume2,VolumeX,MessageCircle,Footprints} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {createViewer} from './viewer';
import {createBgm} from './bgm';
import {asset,artworks,stations,site,slideKind,youtubeId} from './data';
import './style.css';

const pad=n=>String(n).padStart(2,'0');

function Slide({src,title}){
 const kind=slideKind(src);
 if(kind==='youtube')return <iframe className="slide-media" src={`https://www.youtube-nocookie.com/embed/${youtubeId(src)}?rel=0`} title={title} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen/>;
 if(kind==='video')return <video className="slide-media" src={asset(src)} controls playsInline preload="metadata"/>;
 return <img className="large-art" src={asset(src)} alt={title}/>;
}

function ArtDialog({art,slide,onSlide,onArt,onClose}){
 const index=art?artworks.findIndex(a=>a.id===art.id):-1;
 const count=art?.slides.length??0;
 // Arrows move through the event's slides and continue into the neighbouring event at either end.
 const step=useCallback(dir=>{
  if(!art)return;const next=slide+dir;
  if(next>=0&&next<count)return onSlide(next);
  const other=artworks[(index+dir+artworks.length)%artworks.length];onArt(other,dir>0?0:other.slides.length-1);
 },[art,slide,count,index,onSlide,onArt]);
 useEffect(()=>{if(!art)return;const key=e=>{if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)},[art,step]);
 return <Dialog open={!!art} onOpenChange={v=>{if(!v)onClose()}}>
  <DialogContent className="art-dialog" showCloseButton={false}>{art&&<>
   <DialogTitle className="sr-only">{art.title}</DialogTitle><DialogDescription className="sr-only">{art.description}</DialogDescription>
   <button className="close-dialog" aria-label="닫기" onClick={onClose}><X/></button>
   <div className="art-image-stage">
    <Slide key={`${art.id}-${slide}`} src={art.slides[slide]} title={`${art.title} ${slide+1}`}/>
    <button className="slide-arrow prev" aria-label="이전 슬라이드" onClick={()=>step(-1)}><ChevronLeft size={34} strokeWidth={1.6}/></button>
    <button className="slide-arrow next" aria-label="다음 슬라이드" onClick={()=>step(1)}><ChevronRight size={34} strokeWidth={1.6}/></button>
    {count>1&&<div className="slide-dots" role="tablist" aria-label="슬라이드">{art.slides.map((_,i)=><button key={i} role="tab" aria-selected={i===slide} aria-label={`${i+1}번째 슬라이드`} className={i===slide?'active':''} onClick={()=>onSlide(i)}/>)}</div>}
   </div>
   <div className="art-pagination">
    <div className="art-meta"><span className="art-count">{pad(index+1)} / {pad(artworks.length)}</span><strong>{art.title}</strong>{count>1&&<span className="slide-count">{slide+1} / {count}</span>}</div>
    <div>
     {art.links.map(l=><a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="pdf-link"><MessageCircle size={17}/> {l.label}</a>)}
     {art.pdf&&<a href={asset(art.pdf)} target="_blank" rel="noopener noreferrer" className="pdf-link"><FileText size={17}/> PDF 자료 보기</a>}
     <button aria-label="이전 행사" title="이전 행사" onClick={()=>onArt(artworks[(index-1+artworks.length)%artworks.length],0)}><ArrowLeft size={18}/></button>
     <button aria-label="다음 행사" title="다음 행사" onClick={()=>onArt(artworks[(index+1)%artworks.length],0)}><ArrowRight size={18}/></button>
    </div>
   </div>
  </>}</DialogContent>
 </Dialog>;
}

function TourMenu({open,station,onPick}){
 if(!open)return null;
 return <nav className="tour-menu" aria-label="공간 이동">
  {stations.map((s,i)=><button key={s.id} className={i===station?'tour-item active':'tour-item'} aria-current={i===station?'location':undefined} onClick={()=>onPick(i)}>
   <img src={asset(s.thumbnail)} alt="" loading="lazy"/>
   <span><b>{pad(i+1)}</b>{s.name}</span>
  </button>)}
 </nav>;
}

// On-screen joystick for walking on touch screens. Reports -1..1 on each axis (y<0 = forward).
function Joystick({onMove}){
 const [knob,setKnob]=useState([0,0]);const base=useRef(null);
 const update=e=>{const r=base.current.getBoundingClientRect(),R=r.width/2;let x=(e.clientX-r.left-R)/R,y=(e.clientY-r.top-R)/R;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}setKnob([x,y]);onMove(x,y);};
 const end=()=>{setKnob([0,0]);onMove(0,0);};
 return <div className="joystick" ref={base} role="presentation" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);update(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))update(e);}} onPointerUp={end} onPointerCancel={end}>
  <i style={{transform:`translate(${knob[0]*34}px,${knob[1]*34}px)`}}/>
 </div>;
}

function App(){const host=useRef(),viewer=useRef(),bgm=useRef(null);const [entered,setEntered]=useState(false),[entering,setEntering]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(true),[station,setStation]=useState(0),[art,setArt]=useState(null),[slide,setSlide]=useState(0),[error,setError]=useState(''),[retry,setRetry]=useState(0),[list,setList]=useState(false),[menu,setMenu]=useState(false),[music,setMusic]=useState(false),[walk,setWalk]=useState(false);
 const openArt=useCallback((a,s=0)=>{setArt(a);setSlide(s)},[]);
 useEffect(()=>{let cancelled=false;setReady(false);setError('');createViewer(host.current,{onArtwork:a=>openArt(a,0),onStation:setStation,onBusy:setBusy,onError:setError,onMode:setWalk}).then(v=>{if(cancelled)v.dispose();else{viewer.current=v;setReady(true);if(entered)v.enter();if(import.meta.env.DEV)window.gallery=v;}}).catch(e=>{console.error(e);setBusy(false);setError('전시관을 열 수 없습니다. WebGL 지원과 네트워크 연결을 확인해주세요.')});return()=>{cancelled=true;viewer.current?.dispose();viewer.current=null;};},[retry]);
 useEffect(()=>{viewer.current?.block(Boolean(art)||list);},[art,list]);
 useEffect(()=>()=>bgm.current?.dispose(),[]);
 // Music fades out while a video slide is playing.
 const mediaSlide=art&&slideKind(art.slides[slide])!=='image';
 useEffect(()=>{if(!bgm.current&&!music)return;bgm.current??=createBgm(site.bgm&&asset(site.bgm));bgm.current.set(music&&!mediaSlide).catch(()=>setMusic(false));},[music,mediaSlide]);
 useEffect(()=>{if(!menu)return;const close=e=>{if(!e.target.closest('.corner'))setMenu(false)};const esc=e=>{if(e.key==='Escape')setMenu(false)};window.addEventListener('pointerdown',close);window.addEventListener('keydown',esc);return()=>{window.removeEventListener('pointerdown',close);window.removeEventListener('keydown',esc)}},[menu]);
 const toggleWalk=useCallback(()=>{void viewer.current?.setWalk(!viewer.current.walking());},[]);
 // V switches between the panorama view and walk mode.
 useEffect(()=>{if(!entered)return;const key=e=>{if(e.code==='KeyV'&&!e.repeat&&!art&&!list&&!menu)toggleWalk();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[entered,art,list,menu,toggleWalk]);
 const enter=()=>{if(!ready||busy||error||entering)return;setEntering(true);setTimeout(()=>{setEntered(true);setEntering(false);viewer.current.enter();},650);};
 return <main className={entered?'exhibition entered':'exhibition'}>
  <div className="room" data-station={station} ref={host} role="application" aria-label="가상 전시 공간. 드래그 또는 방향키로 둘러보기" tabIndex={0}/>
  {!entered&&<div className={entering?"entry entering":"entry"} onClick={enter} style={{backgroundImage:`linear-gradient(0deg,rgba(14,27,23,.45),rgba(14,27,23,.12) 65%,transparent),url(${asset('assets/entrance-exterior.webp')})`}}>
   <div className="entry-copy">
    <h1 className="slogan">NEOIZE 2026<br/>주요 행사 기록</h1>
    <button className="enter-button" disabled={!ready||busy||!!error} onClick={e=>{e.stopPropagation();enter();}}>{busy?'전시 공간 준비 중':'전시관 입장하기'}<ArrowUpRight size={21}/></button>
    <span className="entry-note">화면을 클릭하여 입장할 수 있습니다</span>
   </div>
  </div>}
  <header>
   <div className="header-right">
    {!entered&&<><span className="live-dot"/>NEOIZE EVENTS<span className="year">2026</span></>}
    {entered&&<button className="icon-button home" title="첫 지점으로" aria-label="첫 지점으로" onClick={()=>viewer.current.reset()}><RotateCcw size={18}/></button>}
   </div>
  </header>
  {entered&&<>
   <div className="right-controls"><button className={walk?'icon-button on':'icon-button'} aria-pressed={walk} aria-label={walk?'걷기 모드 끄기':'걷기 모드 켜기'} title={walk?'걷기 모드 끄기 (V)':'걷기 모드 켜기 (V)'} onClick={toggleWalk}><Footprints size={18}/></button><button className="icon-button" aria-label="확대" title="확대" onClick={()=>viewer.current.zoom(-8)}><ZoomIn size={18}/></button><button className="icon-button" aria-label="축소" title="축소" onClick={()=>viewer.current.zoom(8)}><ZoomOut size={18}/></button><button className="icon-button" aria-label="전체 화면" title="전체 화면" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>setError('이 브라우저에서는 전체 화면을 사용할 수 없습니다.'));}}><Maximize size={17}/></button></div>
   <footer>
    {walk?<div className="hint"><Footprints size={18}/><span>WASD · 방향키로 걷기 · 드래그로 둘러보기<br/><small>Shift 빠르게 · Q/E 회전 · V 고화질 보기로 돌아가기</small></span></div>
     :<div className="hint"><Move size={18}/><span>드래그하여 둘러보기<br/><small>바닥의 원을 눌러 이동하세요 · V 걷기 모드</small></span></div>}
    <button className="collection-button" onClick={()=>setList(true)}>행사 목록 <ArrowUpRight size={17}/></button>
    <div className="corner">
     <TourMenu open={menu} station={station} onPick={i=>{setMenu(false);viewer.current.goto(i)}}/>
     <button className={music?'icon-button square on':'icon-button square'} aria-pressed={music} aria-label={music?'배경음악 끄기':'배경음악 켜기'} title={music?'배경음악 끄기':'배경음악 켜기'} onClick={()=>setMusic(m=>!m)}>{music?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
     <button className={menu?'icon-button square menu-toggle open':'icon-button square menu-toggle'} aria-expanded={menu} aria-label={menu?'공간 이동 메뉴 닫기':'공간 이동 메뉴 열기'} title="공간 이동" onClick={()=>setMenu(m=>!m)}><Plus size={21}/></button>
    </div>
   </footer>
  </>}
  {entered&&walk&&!art&&!list&&<Joystick onMove={(x,y)=>viewer.current?.stick(x,y)}/>}
  {busy&&entered&&<div className="loading" role="status">다음 공간을 불러오고 있습니다<span className="spinner"/></div>}
  {error&&<div className="error" role="alert">{error}<button onClick={()=>{setError('');if(!ready||!viewer.current){setRetry(r=>r+1)}else void viewer.current.move(station,{face:'keep',initial:true})}}>다시 시도</button><button aria-label="알림 닫기" onClick={()=>setError('')}><X size={16}/></button></div>}
  <ArtDialog art={art} slide={slide} onSlide={setSlide} onArt={openArt} onClose={()=>setArt(null)}/>
  <Dialog open={list} onOpenChange={setList}><DialogContent className="list-dialog" showCloseButton={false}><button className="close-dialog" aria-label="닫기" onClick={()=>setList(false)}><X/></button><DialogTitle>행사 목록</DialogTitle><DialogDescription>2026년 네오아이즈의 주요 행사들을 만나보세요.</DialogDescription><div className="art-grid">{artworks.map(a=><button key={a.id} onClick={()=>{setList(false);openArt(a,0)}}><img src={asset(a.image)} alt=""/>{a.title}<ArrowUpRight size={16}/></button>)}</div></DialogContent></Dialog>
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
