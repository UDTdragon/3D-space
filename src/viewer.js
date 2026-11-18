import * as T from 'three';
import {asset,stations,artworks,site} from './data';

const LAST = stations.length-1;
const DEFAULT_FOV = 72;

export async function createViewer(container,{onArtwork,onStation,onBusy,onError}){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;container.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(DEFAULT_FOV,1,.05,100);const ray=new T.Raycaster();const pointer=new T.Vector2();
 const frames=new T.Group(),markers=new T.Group();scene.add(frames,markers);
 let disposed=false,current=0,yaw=stations[0].yaw,pitch=stations[0].pitch,viewYaw=yaw,viewPitch=pitch,drag=null,enabled=false,blocked=false,busy=false;
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

 // Floor markers: one per station, aligned on a single line down the hall.
 stations.forEach((station,index)=>{
  const at=new T.Vector3(station.marker[0],.021,station.marker[1]);
  const ring=new T.Mesh(new T.RingGeometry(.20,.25,64),new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,transparent:true,opacity:.95}));
  const dot=new T.Mesh(new T.CircleGeometry(.055,32),new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide}));
  const target=new T.Mesh(new T.CircleGeometry(.32,32),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
  for(const m of [ring,dot,target]){m.rotation.x=-Math.PI/2;m.position.copy(at);m.userData.station=index;markers.add(m);}
 });

 const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(container);resize();
 // yaw/pitch are the target direction; the camera eases toward them every frame (see the animation loop).
 function aim(snap=false){if(snap||!site.smoothing){viewYaw=yaw;viewPitch=pitch;}camera.rotation.order='YXZ';camera.rotation.set(viewPitch,viewYaw,0);}
 const dragRate=()=>site.dragSpeed*T.MathUtils.degToRad(camera.fov)/Math.max(1,renderer.domElement.clientHeight);
 function refresh(){camera.position.fromArray(stations[current].position);for(const m of markers.children)m.visible=m.userData.station!==current;aim(true);onStation(current);}

 // face: 'default' turns to the station's curated view, 'keep' keeps the current direction.
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
 function hit(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);return ray.intersectObjects([...frames.children,...markers.children],true).find(h=>h.object.visible&&h.object.parent.visible);}
 const down=e=>{if(!enabled||blocked||busy||e.button>0)return;drag={x:e.clientX,y:e.clientY,travel:0};renderer.domElement.setPointerCapture(e.pointerId);};
 const motion=e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.travel+=Math.abs(dx)+Math.abs(dy);const k=dragRate();yaw+=dx*k;pitch=Math.max(-1.35,Math.min(1.35,pitch+dy*k));drag.x=e.clientX;drag.y=e.clientY;aim();}else if(enabled&&!blocked){renderer.domElement.style.cursor=hit(e)?'pointer':'grab';}};
 const up=e=>{if(!drag)return;const click=drag.travel<7;drag=null;if(click){const h=hit(e);if(h){let o=h.object;while(o&&!o.userData.artwork&&o.userData.station===undefined)o=o.parent;if(o?.userData.artwork)onArtwork(o.userData.artwork);else if(o?.userData.station!==undefined)void move(o.userData.station);}}};
 const cancel=()=>{drag=null};
 const key=e=>{if(!enabled||blocked||busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageDown','PageUp'].includes(e.key))return;e.preventDefault();if(e.key==='PageDown'){void move(Math.min(current+1,LAST));return;}if(e.key==='PageUp'){void move(Math.max(current-1,0));return;}if(e.key==='ArrowLeft')yaw+=.07;if(e.key==='ArrowRight')yaw-=.07;if(e.key==='ArrowUp')pitch=Math.min(1.35,pitch+.06);if(e.key==='ArrowDown')pitch=Math.max(-1.35,pitch-.06);aim();};
 const wheel=e=>{if(!enabled||blocked)return;e.preventDefault();camera.fov=T.MathUtils.clamp(camera.fov+e.deltaY*.018,45,90);camera.updateProjectionMatrix();};
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',motion);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);
 let last=performance.now();
 renderer.setAnimationLoop(now=>{if(disposed)return;const dt=Math.min(.1,(now-last)/1000);last=now;
  if(site.smoothing&&(viewYaw!==yaw||viewPitch!==pitch)){const f=1-Math.exp(-dt/site.smoothing*1.6);viewYaw+=(yaw-viewYaw)*f;viewPitch+=(pitch-viewPitch)*f;if(Math.abs(yaw-viewYaw)<1e-4&&Math.abs(pitch-viewPitch)<1e-4){viewYaw=yaw;viewPitch=pitch;}aim();}
  renderer.render(scene,camera)});
 await move(0,{face:'default',initial:true});
 return {
  move:(index,opts)=>move(index,opts),
  goto:(index)=>index===current?(yaw=stations[index].yaw,pitch=stations[index].pitch,aim(true)):move(index,{face:'default'}),
  enter(){enabled=true;},
  block(value){blocked=value;drag=null;},
  reset(){camera.fov=DEFAULT_FOV;camera.updateProjectionMatrix();if(current===0){yaw=stations[0].yaw;pitch=stations[0].pitch;aim(true);}else void move(0,{face:'default'});},
  zoom(delta){camera.fov=T.MathUtils.clamp(camera.fov+delta,45,90);camera.updateProjectionMatrix()},
  inspect(){return{station:current,yaw,pitch,fov:camera.fov}},
  look(y,p=pitch){yaw=y;pitch=p;aim(true);},
  project(id,type='artwork'){let p;if(type==='station')p=new T.Vector3(stations[id].marker[0],.021,stations[id].marker[1]);else p=new T.Vector3(...artworks.find(a=>a.id===id).position);camera.updateMatrixWorld();p.project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,visible:Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1}},
  dispose(){disposed=true;ro.disconnect();window.removeEventListener('keydown',key);renderer.setAnimationLoop(null);scene.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose()}});cache.forEach(p=>p.then(t=>t.dispose()));renderer.dispose();canvas.remove();}
 };
}
