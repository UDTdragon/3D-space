import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {asset,stations,artworks,site} from './data';

const LAST = stations.length-1;
const DEFAULT_FOV = 72;

// Walk mode: the live Three.js room (src/room.js) is rendered instead of the baked panoramas.
const EYE = 1.65;          // eye height, same as the panorama stations
const RADIUS = .32;        // player's body radius for collisions
const WALK_SPEED = 1.6;    // m/s
const RUN_SPEED = 3.0;     // m/s while Shift is held
const MOVE_KEYS = {KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',KeyD:'r',ShiftLeft:'run',ShiftRight:'run'};
const TURN_KEYS = {ArrowLeft:1,ArrowRight:-1,KeyQ:1,KeyE:-1};

export async function createViewer(container,{onArtwork,onStation,onBusy,onError,onMode=()=>{}}){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;container.appendChild(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(DEFAULT_FOV,1,.05,100);const ray=new T.Raycaster();const pointer=new T.Vector2();
 const frames=new T.Group(),markers=new T.Group();scene.add(frames,markers);
 let disposed=false,current=0,yaw=stations[0].yaw,pitch=stations[0].pitch,viewYaw=yaw,viewPitch=pitch,drag=null,enabled=false,blocked=false,busy=false;
 let walking=false,room=null,roomPending=null,colliders=[],goal=null;
 const held=new Set(),turn=new Set(),stick=new T.Vector2();
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

 const active=()=>walking&&room?room:scene;
 const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(container);resize();
 // yaw/pitch are the target direction; the camera eases toward them every frame (see the animation loop).
 function aim(snap=false){if(snap||!site.smoothing){viewYaw=yaw;viewPitch=pitch;}camera.rotation.order='YXZ';camera.rotation.set(viewPitch,viewYaw,0);}
 const dragRate=()=>site.dragSpeed*T.MathUtils.degToRad(camera.fov)/Math.max(1,renderer.domElement.clientHeight);
 function refresh(){camera.position.fromArray(stations[current].position);for(const m of markers.children)m.visible=m.userData.station!==current;aim(true);onStation(current);}

 // face: 'default' turns to the station's curated view, 'keep' keeps the current direction.
 async function move(index,{face='default',initial=false}={}){
  if(walking){if(index>=0&&index<=LAST)walkTo(index,face);return;}
  if(busy||disposed||index<0||index>LAST||(!initial&&index===current))return;busy=true;onBusy(true);
  try{const tex=await load(index);if(disposed)return;
   container.classList.add('changing');await new Promise(r=>setTimeout(r,initial?0:220));
   if(face==='default'){yaw=stations[index].yaw;pitch=stations[index].pitch;}
   current=index;scene.background=tex;refresh();await new Promise(r=>setTimeout(r,40));container.classList.remove('changing');trimCache();
   const next=Math.min(current+1,LAST);if(next!==current)load(next).catch(()=>{});
  }catch{onError('공간을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');}
  finally{busy=false;onBusy(false);}
 }

 /* ---------------- walk mode ---------------- */
 // Build the live room once, then collect a 2D (x/z) box for everything between ankle and head height.
 async function buildRoom(){
  const {createRoom}=await import('./room.js');
  const r=await createRoom();
  r.updateMatrixWorld(true);
  const box=new T.Box3(),list=[];
  r.traverse(o=>{if(!o.isMesh)return;box.setFromObject(o);if(box.max.y>.15&&box.min.y<1.8)list.push([box.min.x,box.min.z,box.max.x,box.max.z]);});
  colliders=list;
  mergeStatic(r);
  // A smaller shadow map keeps phones responsive; the room looks the same apart from slightly softer shadow edges.
  if(matchMedia('(pointer:coarse)').matches)r.traverse(o=>{if(o.isDirectionalLight)o.shadow.mapSize.set(2048,2048);});
  return r;
 }
 // room.js builds several hundred separate boxes (each floor tile has its own material).
 // Fine for baking, but slow to draw every frame, so opaque untextured meshes are merged into one mesh
 // per surface type, keeping each piece's colour as a vertex colour.
 function mergeStatic(r){
  const groups=new Map(),remove=[];
  r.traverse(o=>{
   const m=o.material;
   if(!o.isMesh||!m?.isMeshStandardMaterial||m.map||m.transparent)return;
   const key=[m.roughness,m.metalness,m.bumpMap?.uuid,m.bumpScale].join('|');
   const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
   const c=new Float32Array(g.attributes.position.count*3);for(let i=0;i<c.length;i+=3){c[i]=m.color.r;c[i+1]=m.color.g;c[i+2]=m.color.b;}
   g.setAttribute('color',new T.BufferAttribute(c,3));
   for(const k of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(k))g.deleteAttribute(k);
   if(!groups.has(key))groups.set(key,{material:m,list:[]});groups.get(key).list.push(g);remove.push(o);
  });
  for(const o of remove)o.parent.remove(o);
  for(const {material,list} of groups.values()){
   const merged=mergeGeometries(list);if(!merged)continue;for(const g of list)g.dispose();
   const mat=material.clone();mat.color.set('#ffffff');mat.vertexColors=true;
   const mesh=new T.Mesh(merged,mat);mesh.castShadow=mesh.receiveShadow=true;r.add(mesh);
  }
 }
 // Artwork frames sit on the wall: keep the player from walking into them as well.
 function frameColliders(){const box=new T.Box3(),list=[];frames.updateMatrixWorld(true);for(const g of frames.children){box.setFromObject(g);list.push([box.min.x,box.min.z,box.max.x,box.max.z]);}return list;}
 // Push the player's circle out of every box it overlaps; repeating lets it slide along walls and into corners.
 function collide(p){
  const all=colliders;
  for(let pass=0;pass<3;pass++){let moved=false;
   for(const [x1,z1,x2,z2] of all){
    const cx=Math.max(x1,Math.min(p.x,x2)),cz=Math.max(z1,Math.min(p.z,z2));
    const dx=p.x-cx,dz=p.z-cz;const d2=dx*dx+dz*dz;
    if(d2>=RADIUS*RADIUS)continue;
    if(d2<1e-10){// centre is inside the box: leave by the nearest side
     const out=[[p.x-x1,-1,0],[x2-p.x,1,0],[p.z-z1,0,-1],[z2-p.z,0,1]].sort((a,b)=>a[0]-b[0])[0];
     p.x+=out[1]*(out[0]+RADIUS);p.z+=out[2]*(out[0]+RADIUS);
    }else{const d=Math.sqrt(d2);p.x+=dx/d*(RADIUS-d);p.z+=dz/d*(RADIUS-d);}
    moved=true;
   }
   if(!moved)break;
  }
 }
 function nearestStation(){let best=0,bd=Infinity;stations.forEach((s,i)=>{const d=Math.hypot(s.position[0]-camera.position.x,s.position[2]-camera.position.z);if(d<bd){bd=d;best=i;}});return best;}
 function walkTo(index,face='default'){goal={x:stations[index].position[0],z:stations[index].position[2]};if(face==='default'){yaw=stations[index].yaw;pitch=stations[index].pitch;}}
 function stopMoving(){held.clear();turn.clear();stick.set(0,0);goal=null;}

 async function setWalk(on){
  if(on===walking||busy||disposed)return walking;
  if(on){
   busy=true;onBusy(true);
   try{roomPending??=buildRoom();room=await roomPending;}
   catch(e){console.error(e);roomPending=null;onError('걷기 모드를 불러오지 못했습니다. 다시 시도해주세요.');return walking;}
   finally{busy=false;onBusy(false);}
   if(disposed)return walking;
   colliders=colliders.concat(frameColliders());
   room.add(frames,markers,introduction);
   for(const m of markers.children)m.visible=true;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   walking=true;camera.position.fromArray(stations[current].position);collide(camera.position);
  }else{
   stopMoving();walking=false;
   scene.add(frames,markers,introduction);
   renderer.shadowMap.enabled=false;renderer.toneMapping=T.NoToneMapping;
   // Panoramas only exist at the stations, so return to the closest one, keeping the view direction.
   const index=nearestStation();current=-1;await move(index,{face:'keep',initial:true});
  }
  onMode(walking);
  return walking;
 }
 const forward=new T.Vector3(),right=new T.Vector3();
 function step(dt){
  if(blocked){stopMoving();return;}
  const t=(turn.has(1)?1:0)-(turn.has(-1)?1:0);if(t){yaw+=t*1.6*dt;aim();}
  const f=(held.has('f')?1:0)-(held.has('b')?1:0)-stick.y,s=(held.has('r')?1:0)-(held.has('l')?1:0)+stick.x;
  forward.set(-Math.sin(viewYaw),0,-Math.cos(viewYaw));right.set(Math.cos(viewYaw),0,-Math.sin(viewYaw));
  const p=camera.position,speed=held.has('run')?RUN_SPEED:WALK_SPEED;
  if(f||s){goal=null;const len=Math.max(1,Math.hypot(f,s));p.addScaledVector(forward,f/len*speed*dt).addScaledVector(right,s/len*speed*dt);}
  else if(goal){const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz),k=Math.min(d,RUN_SPEED*dt);if(d<.02)goal=null;else{p.x+=dx/d*k;p.z+=dz/d*k;}}
  else return;
  p.y=EYE;collide(p);
  const near=nearestStation();if(near!==current){current=near;onStation(current);}
 }

 function hit(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);active().updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(pointer,camera);return ray.intersectObjects([...frames.children,...markers.children],true).find(h=>h.object.visible&&h.object.parent.visible);}
 const down=e=>{if(!enabled||blocked||busy||e.button>0)return;drag={x:e.clientX,y:e.clientY,travel:0};renderer.domElement.setPointerCapture(e.pointerId);};
 const motion=e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.travel+=Math.abs(dx)+Math.abs(dy);const k=dragRate();yaw+=dx*k;pitch=Math.max(-1.35,Math.min(1.35,pitch+dy*k));drag.x=e.clientX;drag.y=e.clientY;aim();}else if(enabled&&!blocked){renderer.domElement.style.cursor=hit(e)?'pointer':'grab';}};
 const up=e=>{if(!drag)return;const click=drag.travel<7;drag=null;if(click){const h=hit(e);if(h){let o=h.object;while(o&&!o.userData.artwork&&o.userData.station===undefined)o=o.parent;if(o?.userData.artwork)onArtwork(o.userData.artwork);else if(o?.userData.station!==undefined)void move(o.userData.station,{face:walking?'keep':'default'});}}};
 const cancel=()=>{drag=null};
 const key=e=>{
  if(!enabled||blocked||busy)return;
  if(walking){
   if(MOVE_KEYS[e.code]){e.preventDefault();held.add(MOVE_KEYS[e.code]);return;}
   if(TURN_KEYS[e.code]){e.preventDefault();turn.add(TURN_KEYS[e.code]);return;}
  }
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageDown','PageUp'].includes(e.key))return;e.preventDefault();if(e.key==='PageDown'){void move(Math.min(current+1,LAST));return;}if(e.key==='PageUp'){void move(Math.max(current-1,0));return;}if(e.key==='ArrowLeft')yaw+=.07;if(e.key==='ArrowRight')yaw-=.07;if(e.key==='ArrowUp')pitch=Math.min(1.35,pitch+.06);if(e.key==='ArrowDown')pitch=Math.max(-1.35,pitch-.06);aim();};
 const keyUp=e=>{if(MOVE_KEYS[e.code])held.delete(MOVE_KEYS[e.code]);if(TURN_KEYS[e.code])turn.delete(TURN_KEYS[e.code]);};
 const blur=()=>{held.clear();turn.clear();};
 const wheel=e=>{if(!enabled||blocked)return;e.preventDefault();camera.fov=T.MathUtils.clamp(camera.fov+e.deltaY*.018,45,90);camera.updateProjectionMatrix();};
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',motion);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
 let last=performance.now();
 renderer.setAnimationLoop(now=>{if(disposed)return;const dt=Math.min(.1,(now-last)/1000);last=now;
  if(site.smoothing&&(viewYaw!==yaw||viewPitch!==pitch)){const f=1-Math.exp(-dt/site.smoothing*1.6);viewYaw+=(yaw-viewYaw)*f;viewPitch+=(pitch-viewPitch)*f;if(Math.abs(yaw-viewYaw)<1e-4&&Math.abs(pitch-viewPitch)<1e-4){viewYaw=yaw;viewPitch=pitch;}aim();}
  if(walking&&enabled)step(dt);
  renderer.render(active(),camera)});
 await move(0,{face:'default',initial:true});
 return {
  move:(index,opts)=>move(index,opts),
  goto:(index)=>walking?walkTo(index):index===current?(yaw=stations[index].yaw,pitch=stations[index].pitch,aim(true)):move(index,{face:'default'}),
  enter(){enabled=true;},
  block(value){blocked=value;drag=null;if(value)stopMoving();},
  reset(){camera.fov=DEFAULT_FOV;camera.updateProjectionMatrix();if(walking){goal=null;camera.position.fromArray(stations[0].position);yaw=stations[0].yaw;pitch=stations[0].pitch;aim(true);current=0;onStation(0);}else if(current===0){yaw=stations[0].yaw;pitch=stations[0].pitch;aim(true);}else void move(0,{face:'default'});},
  zoom(delta){camera.fov=T.MathUtils.clamp(camera.fov+delta,45,90);camera.updateProjectionMatrix()},
  // Walk mode controls: setWalk(true/false) switches modes, stick(x, y) is the on-screen joystick (-1..1, y<0 = forward).
  setWalk,
  walking:()=>walking,
  stick(x,y){stick.set(x,y);if(x||y)goal=null;},
  place(x,z){if(!walking)return;goal=null;camera.position.set(x,EYE,z);collide(camera.position);},
  inspect(){return{station:current,yaw,pitch,fov:camera.fov,walking,position:camera.position.toArray()}},
  look(y,p=pitch){yaw=y;pitch=p;aim(true);},
  project(id,type='artwork'){let p;if(type==='station')p=new T.Vector3(stations[id].marker[0],.021,stations[id].marker[1]);else p=new T.Vector3(...artworks.find(a=>a.id===id).position);camera.updateMatrixWorld();p.project(camera);const r=canvas.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2,visible:Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1}},
  dispose(){disposed=true;ro.disconnect();window.removeEventListener('keydown',key);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);renderer.setAnimationLoop(null);const gone=new Set();for(const s of [scene,room])s?.traverse(o=>{if(gone.has(o))return;gone.add(o);o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.bumpMap?.dispose();o.material.dispose()}});cache.forEach(p=>p.then(t=>t.dispose()));renderer.dispose();canvas.remove();}
 };
}
