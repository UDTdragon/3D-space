export const asset = (path) => {
  if (/^https?:\/\//.test(path)) return path;
  const url = new URL(path, new URL(import.meta.env.BASE_URL, location.href));
  url.searchParams.set('v', __ASSET_VERSION__);
  return url.href;
};

// Site-wide options.
// bgm: an audio file under public/ (e.g. 'assets/bgm.mp3'). When null, a soft generated ambient tone is used.
// inquiry: default "문의하기" link shown on every event that does not define its own links.
// dragSpeed: how far the view turns while dragging. 1 = the wall stays under the cursor; lower is slower.
// smoothing: how softly the view catches up (0 = instant, higher = softer).
export const site = {
  bgm: null,
  inquiry: null,
  dragSpeed: .7,
  smoothing: .12,
};

// position: the camera point the panorama was rendered from (must match the Blender render).
// yaw: the direction the camera faces on arrival (0 = toward the far end wall, -PI/2 = toward the artwork wall).
// Floor markers are drawn on one straight line down the hall (x = MARKER_X) at each station's depth.
export const MARKER_X = 0;
export const stations = [
  {id:'entrance',name:'2026 행사 돌아보기',position:[.5,1.65,4.4],yaw:-Math.PI/2,pitch:.025},
  {id:'connection',name:'기억에 남을 장면들',position:[.3,1.65,-2.1],yaw:-.9,pitch:.025},
  {id:'horizon',name:'우리의 2026',position:[0,1.65,-6.1],yaw:0,pitch:.025},
].map(station=>({thumbnail:`thumbnails/${station.id}.webp`,marker:[MARKER_X,station.position[2]],...station}));

// Each event can hold several slides (images, .mp4 files or YouTube links) and optional links.
// slides: ['artworks/deib.svg', 'events/deib-2.jpg', 'https://youtu.be/VIDEO_ID', 'events/deib.mp4']
// links:  [{label:'문의하기', url:'https://...'}]
const placeholder = 'artworks/detail-placeholder.svg';
export const artworks = [
 {id:'deib',title:'주요 행사 01',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#08634d',accent:'#80e6b0',position:[3.91,2.25,2.8],rotation:-Math.PI/2},
 {id:'warm',title:'주요 행사 02',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#a63f28',accent:'#ffceab',position:[3.91,2.25,-.2],rotation:-Math.PI/2},
 {id:'phone',title:'주요 행사 03',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#be286f',accent:'#ffdbe9',position:[3.91,2.25,-3.0],rotation:-Math.PI/2},
 {id:'ai',title:'주요 행사 04',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#184e90',accent:'#a9dbff',position:[3.91,2.25,-5.8],rotation:-Math.PI/2},
 {id:'growth',title:'주요 행사 05',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#3c336f',accent:'#d9c8ff',position:[1.6,2.25,-8.89],rotation:0},
 {id:'together',title:'주요 행사 06',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#a77d17',accent:'#ffebaf',position:[-1.6,2.25,-8.89],rotation:0},
].map(art=>{
  const image = art.image ?? `artworks/${art.id}.svg`;
  return {
    pdf:null,
    ...art,
    image,
    slides: art.slides ?? [image, placeholder],
    links: art.links ?? (site.inquiry ? [{label:'문의하기', url:site.inquiry}] : []),
  };
});

export function slideKind(src){
  if (/youtu\.?be/.test(src)) return 'youtube';
  if (/\.(mp4|webm|mov)(\?|$)/i.test(src)) return 'video';
  return 'image';
}
export function youtubeId(src){
  const m = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
