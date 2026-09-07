import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,ArrowLeft,ArrowRight,RotateCcw,Plus,Minus,X,Move,Maximize,FileText} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {createViewer} from './viewer';
import {asset,artworks} from './data';
import './style.css';
function App(){const host=useRef(),viewer=useRef();const [entered,setEntered]=useState(false),[entering,setEntering]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(true),[station,setStation]=useState(0),[art,setArt]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[list,setList]=useState(false);
 useEffect(()=>{let cancelled=false;setReady(false);setError('');createViewer(host.current,{onArtwork:setArt,onStation:setStation,onBusy:setBusy,onError:setError}).then(v=>{if(cancelled)v.dispose();else{viewer.current=v;setReady(true);if(entered)v.enter();if(import.meta.env.DEV)window.gallery=v;}}).catch(()=>{setBusy(false);setError('전시관을 열 수 없습니다. WebGL 지원과 네트워크 연결을 확인해주세요.')});return()=>{cancelled=true;viewer.current?.dispose();viewer.current=null;};},[retry]);
 useEffect(()=>{viewer.current?.block(Boolean(art)||list);},[art,list]);
 const enter=()=>{if(!ready||busy||error||entering)return;setEntering(true);setTimeout(()=>{setEntered(true);setEntering(false);viewer.current.enter();},650);};
 return <main className={entered?'exhibition entered':'exhibition'}>
  <div className="room" data-station={station} ref={host} role="application" aria-label="가상 전시 공간. 드래그 또는 방향키로 둘러보기" tabIndex={0}/>
  {!entered&&<div className={entering?"entry entering":"entry"} onClick={enter} style={{backgroundImage:`linear-gradient(0deg,rgba(14,27,23,.45),rgba(14,27,23,.12) 65%,transparent),url(${asset('assets/entrance-exterior.webp')})`}}>
    <div className="entry-copy">
  <h1 className="slogan">
    NEOIZE 2026<br/>
    주요 행사 기록
  </h1>

  <button
    className="enter-button"
    disabled={!ready || busy || !!error}
    onClick={e => {
      e.stopPropagation();
      enter();
    }}
  >
    {busy ? '전시 공간 준비 중' : '전시관 입장하기'}
    <ArrowUpRight size={21} />
  </button>

  <span className="entry-note">
    화면을 클릭하여 입장할 수 있습니다
  </span>
</div>
  </div>}
  <header>
  <div className="header-right">
    {!entered && (
      <>
        <span className="live-dot" />
        NEOIZE EVENTS
        <span className="year">2026</span>
      </>
    )}

    {entered && (
      <button
        className="icon-button home"
        title="첫 지점으로"
        aria-label="첫 지점으로"
        onClick={() => viewer.current.reset()}
      >
        <RotateCcw size={18} />
      </button>
    )}
  </div>
</header>
  {entered&&<>
  <div className="right-controls"><button className="icon-button" aria-label="확대" onClick={()=>viewer.current.zoom(-8)}><Plus size={19}/></button><button className="icon-button" aria-label="축소" onClick={()=>viewer.current.zoom(8)}><Minus size={19}/></button><button className="icon-button" aria-label="전체 화면" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>setError('이 브라우저에서는 전체 화면을 사용할 수 없습니다.'));}}><Maximize size={17}/></button></div>
  <footer><div className="hint"><Move size={18}/><span>드래그하여 둘러보기<br/><small>바닥의 원을 눌러 이동하세요</small></span></div><button className="collection-button" onClick={()=>setList(true)}>행사 목록 <ArrowUpRight size={17}/></button></footer></>}
  {busy&&entered&&<div className="loading" role="status">다음 공간을 불러오고 있습니다<span className="spinner"/></div>}
  {error&&<div className="error" role="alert">{error}<button onClick={()=>{setError('');if(!ready||!viewer.current){setRetry(r=>r+1)}else viewer.current.move(station,true)}}>다시 시도</button><button aria-label="알림 닫기" onClick={()=>setError('')}><X size={16}/></button></div>}
  <Dialog open={!!art} onOpenChange={v=>{if(!v)setArt(null)}}><DialogContent className="art-dialog" showCloseButton={false}>{art&&<><button className="close-dialog" aria-label="닫기" onClick={()=>setArt(null)}><X/></button><img className="large-art" src={asset(art.image)} alt={art.title}/><div className="art-info"><span className="eyebrow">{art.category}</span><DialogTitle>{art.title}</DialogTitle><DialogDescription>{art.description}</DialogDescription>{art.pdf&&<a href={asset(art.pdf)} target="_blank" rel="noopener noreferrer" className="pdf-link"><FileText size={17}/> PDF 자료 보기</a>}<div className="art-pagination"><span>0{artworks.findIndex(a=>a.id===art.id)+1} / 0{artworks.length}</span><div><button aria-label="이전 작품" onClick={()=>setArt(artworks[(artworks.findIndex(a=>a.id===art.id)+5)%6])}><ArrowLeft size={18}/></button><button aria-label="다음 작품" onClick={()=>setArt(artworks[(artworks.findIndex(a=>a.id===art.id)+1)%6])}><ArrowRight size={18}/></button></div></div></div></>}</DialogContent></Dialog>
  <Dialog open={list} onOpenChange={setList}><DialogContent className="list-dialog" showCloseButton={false}><button className="close-dialog" aria-label="닫기" onClick={()=>setList(false)}><X/></button><DialogTitle>행사 목록</DialogTitle><DialogDescription>2026년 네오아이즈의 주요 행사들을 만나보세요.</DialogDescription><div className="art-grid">{artworks.map(a=><button key={a.id} onClick={()=>{setList(false);setArt(a)}}><img src={asset(a.image)} alt=""/>{a.title}<ArrowUpRight size={16}/></button>)}</div></DialogContent></Dialog>
 </main>;
}createRoot(document.getElementById('root')).render(<App/>);

