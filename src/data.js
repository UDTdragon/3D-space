export const asset = (path) => new URL(path, new URL(import.meta.env.BASE_URL, location.href)).href;
export const stations = [
  {id:'entrance',name:'2026 행사 돌아보기',position:[0,1.65,6.1]},
  {id:'discovery',name:'함께한 순간들',position:[-.3,1.65,2.1]},
  {id:'connection',name:'기억에 남을 장면들',position:[.3,1.65,-2.1]},
  {id:'horizon',name:'우리의 2026',position:[0,1.65,-6.1]},
];
export const artworks = [
 {id:'deib',title:'주요 행사 01',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#08634d',accent:'#80e6b0',position:[3.91,2.25,5.5],rotation:-Math.PI/2},
 {id:'warm',title:'주요 행사 02',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#a63f28',accent:'#ffceab',position:[3.91,2.25,2.0],rotation:-Math.PI/2},
 {id:'phone',title:'주요 행사 03',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#be286f',accent:'#ffdbe9',position:[3.91,2.25,-1.5],rotation:-Math.PI/2},
 {id:'ai',title:'주요 행사 04',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#184e90',accent:'#a9dbff',position:[3.91,2.25,-5],rotation:-Math.PI/2},
 {id:'growth',title:'주요 행사 05',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#3c336f',accent:'#d9c8ff',position:[1.6,2.25,-8.89],rotation:0},
 {id:'together',title:'주요 행사 06',category:'NEOIZE 2026 EVENTS',description:'2026년 네오아이즈의 주요 행사와 함께한 순간을 소개합니다. 상세 행사 이야기를 준비하고 있습니다.',color:'#a77d17',accent:'#ffebaf',position:[-1.6,2.25,-8.89],rotation:0},
].map(art=>({image:`artworks/${art.id}.svg`,pdf:null,...art}));

