import * as T from 'three';
import {createRoom} from './room.js';
import {stations} from './data.js';
const faceSize=Math.max(1024,Math.min(4096,Number(new URLSearchParams(location.search).get('size'))||2048));
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(faceSize,faceSize);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.appendChild(renderer.domElement);
const scene=await createRoom();const camera=new T.PerspectiveCamera(90,1,.05,100);
const dirs=[[-1,0,0],[1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
window.renderFace=async(index,face)=>{renderer.setSize(faceSize,faceSize);camera.fov=90;camera.aspect=1;camera.updateProjectionMatrix();camera.position.fromArray(stations[index].position);camera.up.set(0,face===2||face===3?0:1,face===2?-1:face===3?1:0);camera.lookAt(camera.position.clone().add(new T.Vector3(...dirs[face])));renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.95);};
window.renderPreview=()=>{renderer.setSize(1920,1080);camera.aspect=1920/1080;camera.fov=73;camera.updateProjectionMatrix();camera.up.set(0,1,0);camera.position.fromArray(stations[0].position);camera.lookAt(3.91,2.1,4.4);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.94);};window.renderExterior=()=>{renderer.setSize(2560,1440);camera.aspect=2560/1440;camera.fov=65;camera.updateProjectionMatrix();camera.up.set(0,1,0);camera.position.set(0,1.65,14.8);camera.lookAt(0,1.8,9.13);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/webp',.95);};window.bakeReady=true;

