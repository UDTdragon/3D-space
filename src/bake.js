import * as T from 'three';
import {createRoom} from './room.js';
import {stations} from './data.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1536,1536);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.appendChild(renderer.domElement);
const scene=await createRoom();const camera=new T.PerspectiveCamera(90,1,.05,100);
const dirs=[[-1,0,0],[1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
window.renderFace=async(index,face)=>{renderer.setSize(1536,1536);camera.fov=90;camera.aspect=1;camera.updateProjectionMatrix();camera.position.fromArray(stations[index].position);camera.up.set(0,face===2||face===3?0:1,face===2?-1:face===3?1:0);camera.lookAt(camera.position.clone().add(new T.Vector3(...dirs[face])));renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.91);};
window.renderPreview=()=>{renderer.setSize(1920,1080);camera.aspect=1920/1080;camera.fov=73;camera.updateProjectionMatrix();camera.up.set(0,1,0);camera.position.fromArray(stations[0].position);camera.lookAt(1.1,1.95,-3);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.94);};window.bakeReady=true;

