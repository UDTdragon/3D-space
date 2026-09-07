import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.goto('http://127.0.0.1:5173/');
await page.getByRole('button',{name:'전시관 입장하기'}).waitFor({timeout:90000});
await page.screenshot({path:'entry.png'});
await page.getByRole('button',{name:'전시관 입장하기'}).click();
await page.waitForTimeout(1200);
await page.screenshot({path:'gallery.png'}); for(let i=0;i<23;i++)await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); await page.screenshot({path:'east.png'});
console.log(await page.evaluate(()=>window.gallery.inspect()));
await browser.close();

