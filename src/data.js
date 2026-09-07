export const asset = (path) => new URL(path, new URL(import.meta.env.BASE_URL, location.href)).href;
export const stations = [
  {id:'entrance',name:'전시의 시작',position:[0,1.65,6.1]},
  {id:'discovery',name:'새로운 발견',position:[-.3,1.65,2.1]},
  {id:'connection',name:'함께하는 성장',position:[.3,1.65,-2.1]},
  {id:'horizon',name:'다음의 가능성',position:[0,1.65,-6.1]},
];
export const artworks = [
 {id:'deib',title:'DEIB 탐험 워크숍',category:'DIVERSITY & INCLUSION',description:'다양성이 모여 더 넓은 가능성을 만듭니다. 서로 다른 관점을 이해하고, 모두가 소속감을 느끼는 조직 문화를 함께 탐색합니다.',color:'#08634d',accent:'#80e6b0',position:[3.91,2.25,5.5],rotation:-Math.PI/2},
 {id:'warm',title:'온(溫)워크 과정',category:'WELLBEING AT WORK',description:'일하는 마음의 온도를 돌아봅니다. 나를 돌보는 작은 실천부터 동료와 건강한 관계를 만드는 대화까지, 지속 가능한 일의 방식을 생각합니다.',color:'#a63f28',accent:'#ffceab',position:[3.91,2.25,2.0],rotation:-Math.PI/2},
 {id:'phone',title:'폰 서비스 Skill-Up',category:'COMMUNICATION',description:'고객의 목소리 뒤에 있는 필요를 발견합니다. 경청과 공감, 명확한 안내를 통해 자신 있는 전화 응대와 더 나은 서비스 경험을 만들어갑니다.',color:'#be286f',accent:'#ffdbe9',position:[3.91,2.25,-1.5],rotation:-Math.PI/2},
 {id:'ai',title:'AI Work Smart',category:'FUTURE OF WORK',description:'반복되는 일에서 벗어나 더 중요한 일에 집중합니다. AI와 함께 문제를 정의하고 아이디어를 확장하며 새로운 업무 방식을 탐색합니다.',color:'#184e90',accent:'#a9dbff',position:[3.91,2.25,-5],rotation:-Math.PI/2},
 {id:'growth',title:'다음의 가능성',category:'LEARNING & GROWTH',description:'배움은 새로운 시선에서 시작됩니다. 오늘의 발견을 내일의 행동으로 연결하고, 개인과 조직이 함께 성장하는 가능성을 상상합니다.',color:'#3c336f',accent:'#d9c8ff',position:[1.6,2.25,-8.89],rotation:0},
 {id:'together',title:'함께, 더 멀리',category:'PEOPLE & CULTURE',description:'좋은 협업은 서로를 이해하는 데서 시작합니다. 공동의 목표와 열린 대화로 연결되는 팀, 함께 만들어가는 성장의 이야기를 만나보세요.',color:'#a77d17',accent:'#ffebaf',position:[-1.6,2.25,-8.89],rotation:0},
].map(art=>({...art,image:`artworks/${art.id}.svg`,pdf:null}));
