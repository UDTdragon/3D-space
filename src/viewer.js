import * as T from 'three';
import {asset,stations,artworks} from './data';

const LAST = stations.length-1;
const DEFAULT_FOV = 72;

// Yaw that looks from one floor point toward another (camera looks down -Z at yaw 0).
const wrap = a=>Math.atan2(Math.sin(a),Math.cos(a));
const yawToward = (from,to)=>Math.atan2(-(to[0]-from[0]),-(to[2]-from[2]));

function guideTexture(dir){
 const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');
 g.fillStyle='rgba(30,44,36,.62)';g.beginPath();g.roundRect(26,26,460,204,102);g.fill();
 g.strokeStyle='#fff';g.lineWidth=15;g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<3;i++){const x=180+i*58+(dir<0?38:0);g.beginPath();g.moveTo(x,62);g.lineTo(x+38*dir,100);g.lineTo(x,138);g.stroke();}
 g.fillStyle='#fff';g.font='600 44px Arial, "Malgun Gothic", sans-serif';g.textAlign='center';g.fillText('둘러보기',256,200);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}

export async function createViewer(container,{onArtwork,onStation,onBusy,onError}){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;container.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(DEFAULT_FOV,1,.05,100);const ray=new T.Raycaster();const pointer=new T.Vector2();
 const frames=new T.Group(),markers=new T.Group(),guides=new T.Group();scene.add(frames,markers,guides);
 let disposed=false,current=0,yaw=stations[0].yaw,pitch=stations[0].pitch,drag=null,enabled=false,blocked=false,busy=false;
 const cache=new Map();const loader=new T.CubeTextureLoader();
 async function load(index){if(cache.has(index))return cache.get(index);const pending=loader.loadAsync(['px','nx','py','ny','pz','nz'].map(f=>asset(`panoramas/${stations[index].id}/${f}.webp?v=clear-daylight-20260909`))).then(tex=>{tex.colorSpace=T.SRGBColorSpace;if(disposed)tex.dispose();return tex}).catch(e=>{cache.delete(index);throw e});cache.set(index,pending);return pending;}
 function trimCache(){for(const [index,promise]of cache){if(index!==current&&index!==Math.min(current+1,LAST)){promise.then(t=>t.dispose());cache.delete(index);}}}
 const textureLoader=new T.TextureLoader();
 const introTex=await textureLoader.loadAsync(asset('assets/wall-introduction.svg'));introTex.colorSpace=T.SRGBColorSpace;
 const introduction=new T.Mesh(new T.PlaneGeometry(3.0,2.35),new T.MeshBasicMaterial({map:introTex,transparent:true,depthWrite:false}));introduction.position.set(3.925, 2.18, 6.1);introduction.rotation.y=-Math.PI/2;scene.add(introduction);
 await Promise.all(artworks.map(async art=>{const group=new T.Group();group.position.fromArray(art.position);group.rotation.y=art.rotation;frames.add(group);
   const frame=new T.Mesh(new T.BoxGeometry(2.48,1.66,.055),new T.MeshBasicMaterial({color:'#f1eee8'}));group.add(frame);
   const inner=new T.Mesh(new T.PlaneGeometry(2.32,1.50),new T.MeshBasicMaterial({color:'#bdb9b1'}));inner.position.z=.031;group.add(inner);
   const tex=await textureLoader.loadAsync(asset(art.image));tex.colorSpace=T.SRGBColorSpace;
   const picture=new T.Mesh(new T.PlaneGeometry(2.23,1.41),new T.MeshBasicMaterial({map:tex}));picture.position.z=.033;group.add(picture);group.userData.artwork=art;
 }));

 // Floor markers: one per station, at the station's own floor position.
 stations.forEach((station,index)=>{
  const at=new T.Vector3(station.position[0],.021,station.position[2]);
  const ring=new T.Mesh(new T.RingGeometry(.20,.25,64),new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,transparent:true,opacity:.95}));
  const dot=new T.Mesh(new T.CircleGeometry(.055,32),new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide}));
  const target=new T.Mesh(new T.CircleGeometry(.32,32),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
  for(const m of [ring,dot,target]){m.rotation.x=-Math.PI/2;m.position.copy(at);m.userData.station=index;markers.add(m);}
 });

 // "≫ 둘러보기" guide, placed inside each station's default view on the side of the next station.
 const guideMats={1:new T.SpriteMaterial({map:guideTexture(1),transparent:true,depthWrite:false}),[-1]:new T.SpriteMaterial({map:guideTexture(-1),transparent:true,depthWrite:false})};
 stations.forEach((station,index)=>{if(index===LAST)return;
  const sprite=new T.Sprite();sprite.scale.set(.46,.23,1);sprite.userData.station=index+1;sprite.userData.guideOf=index;guides.add(sprite);
 });
 // Keep each guide inside the default view: narrower screens (phones) pull it closer to the centre.
 function placeGuides(){
  const halfH=Math.atan(Math.tan(T.MathUtils.degToRad(DEFAULT_FOV)/2)*camera.aspect),limit=Math.min(.55,halfH*.62);
  for(const sprite of guides.children){const station=stations[sprite.userData.guideOf],from=station.position;
   const turn=wrap(yawToward(from,stations[sprite.userData.station].position)-station.yaw),a=station.yaw+T.MathUtils.clamp(turn,-limit,limit),d=2.1;
   sprite.material=guideMats[turn>0?-1:1];sprite.position.x=from[0]-Math.sin(a)*d;sprite.position.z=from[2]-Math.cos(a)*d;}
 }

 const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();placeGuides();};const ro=new ResizeObserver(resize);ro.observe(container);resize();
 function aim(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
 function refresh(){camera.position.fromArray(stations[current].position);for(const m of markers.children)m.visible=m.userData.station!==current;for(const g of guides.children)g.visible=g.userData.guideOf===current;aim();onStation(current);}

 // face: 'default' turns to the station's curated view (where its guide is visible), 'keep' keeps the current direction.
 async function move(index,{face='default',initial=false}={}){
  if(busy||disposed||index<0||index>LAST||(!initial&&index===current))return;busy=true;onBusy(true);
  try{const tex=await load(index);if(disposed)return;
   container.classList.add('changing');await new Promise(r=>setTimeout(r,initial?0:220));
   if(face==='default'){yaw=stations[index].yaw;pitch=stations[index].pitch;}
   current=index;scene.background=tex;refresh();await new Promise(r=>setTimeout(r,40));container.classList.remove('changing');trimCache();
   const next=Math.min(current+1,LAST);if(next!==current)load(next).catch(()=>{});
  }catch{onError('공간을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');}
  finally{busy=false;onBusy(false);}
 }
 function hit(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);return ray.intersectObjects([...guides.children,...frames.children,...markers.children],true).find(h=>h.object.visible&&h.object.parent.visible);}
 const down=e=>{if(!enabled||blocked||busy||e.button>0)return;drag={x:e.clientX,y:e.clientY,travel:0};renderer.domElement.setPointerCapture(e.pointerId);};
 const motion=e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.travel+=Math.abs(dx)+Math.abs(dy);yaw+=dx*.0025;pitch=Math.max(-1.35,Math.min(1.35,pitch+dy*.0025));drag.x=e.clientX;drag.y=e.clientY;aim();}else if(enabled&&!blocked){renderer.domElement.style.cursor=hit(e)?'pointer':'grab';}};
 const up=e=>{if(!drag)return;const click=drag.travel<7;drag=null;if(click){const h=hit(e);if(h){let o=h.object;while(o&&!o.userData.artwork&&o.userData.station===undefined)o=o.parent;if(o?.userData.artwork)onArtwork(o.userData.artwork);else if(o?.userData.station!==undefined)void move(o.userData.station);}}};
 const cancel=()=>{drag=null};
 const key=e=>{if(!enabled||blocked||busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageDown','PageUp'].includes(e.key))return;e.preventDefault();if(e.key==='PageDown'){void move(Math.min(current+1,LAST));return;}if(e.key==='PageUp'){void move(Math.max(current-1,0));return;}if(e.key==='ArrowLeft')yaw+=.07;if(e.key==='ArrowRight')yaw-=.07;if(e.key==='ArrowUp')pitch=Math.min(1.35,pitch+.06);if(e.key==='ArrowDown')pitch=Math.max(-1.35,pitch-.06);aim();};
 const wheel=e=>{if(!enabled||blocked)return;e.preventDefault();camera.fov=T.MathUtils.clamp(camera.fov+e.deltaY*.018,45,90);camera.updateProjectionMatrix();};
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',motion);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);
 const clock=new T.Clock();
 renderer.setAnimationLoop(()=>{if(disposed)return;const t=clock.getElapsedTime();for(const m of Object.values(guideMats))m.opacity=.8+.2*Math.sin(t*3);for(const g of guides.children)g.position.y=1.4+Math.sin(t*2)*.025;renderer.render(scene,camera)});
 await move(0,{face:'default',initial:true});
 return {
  move:(index,opts)=>move(index,opts),
  goto:(index)=>index===current?(yaw=stations[index].yaw,pitch=stations[index].pitch,aim()):move(index,{face:'default'}),
  enter(){enabled=true;},
  block(value){blocked=value;drag=null;},
  reset(){camera.fov=DEFAULT_FOV;camera.updateProjectionMatrix();if(current===0){yaw=stations[0].yaw;pitch=stations[0].pitch;aim();}else void move(0,{face:'default'});},
  zoom(delta){camera.fov=T.MathUtils.clamp(camera.fov+delta,45,90);camera.updateProjectionMatrix()},
  inspect(){return{station:current,yaw,pitch,fov:camera.fov}},
  look(y,p=pitch){yaw=y;pitch=p;aim();},
  project(id,type='artwork'){let p;if(type==='station')p=new T.Vector3(stations[id].position[0],.021,stations[id].position[2]);else if(type==='guide')p=guides.children.find(g=>g.userData.guideOf===id).position.clone();else p=new T.Vector3(...artworks.find(a=>a.id===id).position);camera.updateMatrixWorld();p.project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,visible:Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1}},
  dispose(){disposed=true;ro.disconnect();window.removeEventListener('keydown',key);renderer.setAnimationLoop(null);scene.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose()}});cache.forEach(p=>p.then(t=>t.dispose()));renderer.dispose();canvas.remove();}
 };
}
