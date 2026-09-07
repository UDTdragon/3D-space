import * as T from 'three';
import {asset} from './data.js';
export async function createRoom(){
 const scene=new T.Scene();scene.background=new T.Color('#cfdfeb');
 let seed=9271;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const noise=document.createElement('canvas');noise.width=noise.height=256;const ctx=noise.getContext('2d'),im=ctx.createImageData(256,256);
 for(let i=0;i<im.data.length;i+=4){const v=210+rand()*40;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);
 const bump=new T.CanvasTexture(noise);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(5,5);
 const wall=new T.MeshStandardMaterial({color:'#e9e5db',roughness:.91,bumpMap:bump,bumpScale:.009});
 const trim=new T.MeshStandardMaterial({color:'#f1eee5',roughness:.6});
 const metal=new T.MeshStandardMaterial({color:'#515953',roughness:.5,metalness:.35});
 const box=(w,h,d,x,y,z,mat=wall)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m};
 box(.25,4.8,18,4.12,2.4,0);box(8.4,4.8,.25,0,2.4,-9.13);// Entrance wall has a real opening shared with the vestibule.
 box(2.9,4.8,.25,-2.55,2.4,9.13);box(2.9,4.8,.25,2.55,2.4,9.13);box(2.2,1.6,.25,0,4,9.13);
 box(8.5,.25,25.5,0,4.92,3.5);box(.3,.58,18,-4.12,.29,0);box(.3,.62,18,-4.12,4.51,0);
 for(const z of [-9,-4.5,0,4.5,9])box(.48,4.8,.5,-4,2.4,z);
 for(const z of [-6.75,-2.25,2.25,6.75]){
  box(.45,.14,4.1,-4,.62,z,trim);box(.3,.12,4.1,-4,4.2,z,trim);
  for(let k=-2;k<=2;k++)box(.095,3.55,.045,-4.015,2.41,z+k*.79,metal);
  for(let k=1;k<5;k++)box(.095,.045,4,-4.015,.62+k*.71,z,metal);
 }
 for(let x=-4;x<4;x++)for(let z=-9;z<16;z++){
  const g=.53+rand()*.025;box(.997,.1,.997,x+.5,-.055,z+.5,new T.MeshStandardMaterial({color:new T.Color(g,g+.012,g+.025),roughness:.5,bumpMap:bump,bumpScale:.004}));
 }
 box(.055,.18,18,3.98,.09,0,trim);box(8,.18,.055,0,.09,-8.98,trim);box(8,.18,.055,0,.09,8.98,trim);
 for(let z=-7.5;z<=7.5;z+=3)box(8,.27,.2,0,4.66,z,trim);
 for(const x of [-2.6,2.6])box(.07,.1,17,x,4.48,0,metal);
 const ambient=new T.HemisphereLight('#f4f7ff','#c7cbd1',2.8);scene.add(ambient,new T.AmbientLight(0xffffff,.4));
 const sun=new T.DirectionalLight('#fff1d6',2.8);sun.position.set(-12,10,4);sun.target.position.set(0,0,-2);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:50});sun.shadow.bias=-.00012;sun.shadow.normalBias=.018;sun.shadow.radius=4;scene.add(sun,sun.target);
 for(const z of [-7,-3.5,0,3.5,7]){
  for(const side of [1,-1]){const x=side*2.6;const lamp=new T.Mesh(new T.CylinderGeometry(.085,.085,.26,20),trim);lamp.position.set(x,4.27,z);lamp.rotation.z=-side*.55;scene.add(lamp);
   if(side===1){const light=new T.SpotLight('#fff3d8',30,7,.56,.85,1.5);light.position.set(x,4.17,z);light.target.position.set(3.98,2.0,z);scene.add(light,light.target);}
  }
 }
 // Permanent built-in bench; all stations use this exact geometry.
 box(.68,.14,5.2,3.35,.46,-.6,trim);for(const z of [-2.7,1.5])box(.5,.38,.14,3.35,.19,z,metal);
 // Vestibule outside the gallery door, part of the same architectural model.
 box(.25,4.8,7,4.12,2.4,12.5);box(8.4,4.8,.25,0,2.4,16.13);
 box(.3,.58,7,-4.12,.29,12.5);box(.3,.62,7,-4.12,4.51,12.5);box(.48,4.8,.5,-4,2.4,16);
 box(.45,.14,6.5,-4,.62,12.5,trim);box(.3,.12,6.5,-4,4.2,12.5,trim);
 for(let z=9.4;z<15.9;z+=.8)box(.095,3.55,.045,-4.015,2.41,z,metal);
 for(let k=1;k<5;k++)box(.095,.045,6.5,-4.015,.62+k*.71,12.5,metal);
 for(const z of [10.5,13.5])box(8,.27,.2,0,4.66,z,trim);
 const glass=new T.MeshStandardMaterial({color:'#c7d8d9',transparent:true,opacity:.22,roughness:.13,metalness:.15});
 box(.12,3.3,.2,-1.1,1.65,9.13,metal);box(.12,3.3,.2,1.1,1.65,9.13,metal);box(2.3,.12,.2,0,3.25,9.13,metal);box(.07,3.2,.18,0,1.6,9.13,metal);
 box(1.03,3.1,.045,-.55,1.61,9.13,glass);box(1.03,3.1,.045,.55,1.61,9.13,glass);
 for(const x of [-.14,.14])box(.035,.45,.06,x,1.42,9.26,metal);
 const logoTex=await new T.TextureLoader().loadAsync(asset('assets/neoize-logo.png'));logoTex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(2.4,.714),new T.MeshBasicMaterial({map:logoTex,transparent:true}));sign.position.set(0,3.88,9.28);scene.add(sign);
 const view=await new T.TextureLoader().loadAsync(asset('assets/autumn.webp'));view.colorSpace=T.SRGBColorSpace;view.anisotropy=8;
 const outside=new T.Mesh(new T.PlaneGeometry(40,17),new T.MeshBasicMaterial({map:view}));outside.position.set(-8,5,0);outside.rotation.y=Math.PI/2;scene.add(outside);
 return scene;
}

