import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>console.error(e));await page.goto('http://127.0.0.1:5173/bake.html');await page.waitForFunction(()=>window.bakeReady,{},{timeout:90000});
 const write=async(path,data)=>fs.writeFile(path,Buffer.from(data.split(',')[1],'base64'));
 await fs.mkdir('public/assets',{recursive:true});await write('public/assets/representative.webp',await page.evaluate(()=>window.renderPreview()));console.log('Representative view saved.');
 const firstOnly=process.argv.includes('--first');const ids=['entrance','discovery','connection','horizon'];
 for(let i=0;i<(firstOnly?1:4);i++){await fs.mkdir(`public/panoramas/${ids[i]}`,{recursive:true});for(const [face,name]of ['px','nx','py','ny','pz','nz'].entries()){await write(`public/panoramas/${ids[i]}/${name}.webp`,await page.evaluate(([i,f])=>window.renderFace(i,f),[i,face]));}console.log(`Baked ${ids[i]}`);}
}finally{await browser.close();}
