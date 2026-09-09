import {test,expect} from '@playwright/test';
import * as T from 'three';
import {stations,artworks} from '../src/data.js';
function screen(position,station,yaw,pitch,width=1440,height=900){const c=new T.PerspectiveCamera(72,width/height,.05,100);c.position.fromArray(stations[station].position);c.rotation.order='YXZ';c.rotation.set(pitch,yaw,0);c.updateMatrixWorld();const p=new T.Vector3(...position).project(c);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2};}
test('outside entry, clear interior, event one and floor-only navigation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await expect(page.locator('.brand-logo')).toHaveCount(0);await expect(page.getByRole('heading',{name:/NEOIZE 2026/})).toBeVisible();await expect(page.locator('.entry')).toHaveCSS('background-image',/entrance-exterior.webp/);
 const enter=page.getByRole('button',{name:'전시관 입장하기'});await expect(enter).toBeEnabled({timeout:60000});await page.screenshot({path:'test-results/door-entry.png'});await enter.click();
 await expect(page.locator('.entry')).toHaveCount(0);await expect(page.locator('.brand')).toHaveCount(0);await expect(page.locator('.location')).toHaveCount(0);await expect(page.locator('.station-nav')).toHaveCount(0);
 await page.waitForTimeout(700);await page.screenshot({path:'test-results/intro-wall.png'});
 const art=screen(artworks[0].position,0,-Math.PI/2,.025);await page.mouse.click(art.x,art.y);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'주요 행사 01'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 for(let i=0;i<22;i++)await page.keyboard.press('ArrowLeft');for(let i=0;i<4;i++)await page.keyboard.press('ArrowDown');
 for(const next of [2,3]){await expect(page.locator('.loading')).toHaveCount(0);await expect(page.locator('.room')).not.toHaveClass(/changing/);const p=screen([stations[next].position[0],.021,stations[next].position[2]],next===2?0:2,-Math.PI/2+22*.07,.025-4*.06);await page.mouse.click(p.x,p.y);await expect(page.locator('.room')).toHaveAttribute('data-station',String(next),{timeout:15000});}
 await page.getByRole('button',{name:'첫 지점으로',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-station','0');await expect(page.locator('.loading')).toHaveCount(0);
 const before=await page.locator('canvas').screenshot();await page.mouse.move(350,450);await page.mouse.down();await page.mouse.move(1135,450,{steps:24});await page.mouse.up();await page.waitForTimeout(300);const after=await page.locator('canvas').screenshot();expect(before.equals(after)).toBe(false);await page.screenshot({path:'test-results/blender-window.png'});expect(errors).toEqual([]);
});
test('mobile has no branding or numbered navigation after entry',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('./');await page.getByRole('button',{name:'전시관 입장하기'}).click();await expect(page.locator('.entry')).toHaveCount(0);await expect(page.locator('.brand')).toHaveCount(0);await expect(page.locator('.station-nav')).toHaveCount(0);await page.getByRole('button',{name:'행사 목록',exact:true}).click();await page.getByRole('button',{name:'주요 행사 01',exact:true}).click();await expect(page.getByRole('heading',{name:'주요 행사 01'})).toBeVisible();await page.keyboard.press('Escape');await page.waitForTimeout(400);await page.screenshot({path:'test-results/mobile.png'});});

