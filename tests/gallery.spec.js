import {test,expect} from '@playwright/test';

// Runs against the dev server, where the viewer is exposed as window.gallery.
const at=async(page,i)=>{await expect(page.locator('.room')).toHaveAttribute('data-station',String(i),{timeout:15000});await expect(page.locator('.loading')).toHaveCount(0);await page.waitForTimeout(300);};
const enter=async page=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');const button=page.getByRole('button',{name:'전시관 입장하기'});await expect(button).toBeEnabled({timeout:60000});await button.click();await expect(page.locator('.entry')).toHaveCount(0);await page.waitForTimeout(700);return errors;};
const clickProjected=async(page,...args)=>{const p=await page.evaluate(args=>window.gallery.project(...args),args);expect(p.visible).toBe(true);await page.mouse.click(p.x,p.y);};

test('entry and aligned floor markers reach every station with its default view',async({page})=>{
 await page.goto('./');await expect(page.getByRole('heading',{name:/NEOIZE 2026/})).toBeVisible();await expect(page.locator('.entry')).toHaveCSS('background-image',/entrance-exterior.webp/);
 const errors=await enter(page);await page.screenshot({path:'test-results/intro-wall.png'});
 const stations=await page.evaluate(()=>import('/src/data.js').then(m=>m.stations.map(s=>({yaw:s.yaw,marker:s.marker}))));
 expect(stations).toHaveLength(3);expect(new Set(stations.map(s=>s.marker[0])).size).toBe(1);
 for(const i of [1,2]){await page.evaluate(()=>window.gallery.look(0,-.35));await clickProjected(page,i,'station');await at(page,i);expect((await page.evaluate(()=>window.gallery.inspect())).yaw).toBeCloseTo(stations[i].yaw);}
 // Looking back down the hall from the far end (camera on the marker line), the other markers sit in one vertical line.
 await page.evaluate(()=>window.gallery.look(Math.PI,-.35));await page.screenshot({path:'test-results/floor-markers.png'});
 const [m0,m1]=await page.evaluate(()=>[window.gallery.project(0,'station'),window.gallery.project(1,'station')]);expect(Math.abs(m0.x-m1.x)).toBeLessThan(2);
 await clickProjected(page,1,'station');await at(page,1);
 await page.getByRole('button',{name:'첫 지점으로',exact:true}).click();await at(page,0);
 const before=await page.locator('canvas').screenshot();await page.mouse.move(350,450);await page.mouse.down();await page.mouse.move(1135,450,{steps:24});await page.mouse.up();await page.waitForTimeout(300);expect(before.equals(await page.locator('canvas').screenshot())).toBe(false);
 expect(errors).toEqual([]);
});

test('event dialog pages through slides, then into the next event',async({page})=>{
 const errors=await enter(page);
 await clickProjected(page,'deib');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.art-meta strong')).toHaveText('주요 행사 01');await expect(page.locator('.slide-count')).toHaveText('1 / 2');
 await page.getByRole('button',{name:'다음 슬라이드'}).click();await expect(page.locator('.slide-count')).toHaveText('2 / 2');await page.screenshot({path:'test-results/slide-two.png'});
 await page.keyboard.press('ArrowRight');await expect(page.locator('.art-meta strong')).toHaveText('주요 행사 02');await expect(page.locator('.slide-count')).toHaveText('1 / 2');
 await page.keyboard.press('ArrowLeft');await expect(page.locator('.art-meta strong')).toHaveText('주요 행사 01');await expect(page.locator('.slide-count')).toHaveText('2 / 2');
 await page.getByRole('button',{name:'다음 행사'}).click();await expect(page.locator('.art-meta strong')).toHaveText('주요 행사 02');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);expect(errors).toEqual([]);
});

test('corner menu moves between stations and toggles music',async({page})=>{
 const errors=await enter(page);
 await page.getByRole('button',{name:'공간 이동 메뉴 열기'}).click();await expect(page.locator('.tour-item')).toHaveCount(3);await expect(page.locator('.tour-item.active')).toContainText('2026 행사 돌아보기');await page.screenshot({path:'test-results/tour-menu.png'});
 await page.locator('.tour-item').nth(2).click();await at(page,2);await expect(page.locator('.tour-menu')).toHaveCount(0);
 await page.getByRole('button',{name:'배경음악 켜기'}).click();await expect(page.getByRole('button',{name:'배경음악 끄기'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'배경음악 끄기'}).click();await expect(page.getByRole('button',{name:'배경음악 켜기'})).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});

test('mobile: menu and event list work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await enter(page);
 await page.getByRole('button',{name:'공간 이동 메뉴 열기'}).click();await expect(page.locator('.tour-menu')).toBeVisible();await page.getByRole('button',{name:'공간 이동 메뉴 닫기'}).click();
 await page.getByRole('button',{name:'행사 목록',exact:true}).click();await page.getByRole('button',{name:'주요 행사 01',exact:true}).click();await expect(page.locator('.art-image-stage')).toBeVisible();await expect(page.getByRole('button',{name:'다음 슬라이드'})).toBeVisible();await page.screenshot({path:'test-results/mobile-dialog.png'});
});

test('walk mode: keys move the visitor, walls stop them, V returns to the nearest panorama',async({page})=>{
 const errors=await enter(page);
 await page.getByRole('button',{name:'걷기 모드 켜기'}).click();
 await page.waitForFunction(()=>window.gallery.walking(),null,{timeout:60000});await expect(page.locator('.loading')).toHaveCount(0);
 const pos=()=>page.evaluate(()=>window.gallery.inspect().position);
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
 // Facing down the hall (-z), W walks forward.
 await page.evaluate(()=>{window.gallery.place(0,4);window.gallery.look(0,0)});await hold('KeyW',1500);
 const [x,y,z]=await pos();expect(z).toBeLessThan(3.8);expect(x).toBeCloseTo(0,1);expect(y).toBeCloseTo(1.65);
 // Running straight at the artwork wall stops in front of it.
 await page.evaluate(()=>{window.gallery.place(3,6.5);window.gallery.look(-Math.PI/2,0)});await page.keyboard.down('ShiftLeft');await hold('KeyW',2500);await page.keyboard.up('ShiftLeft');
 expect((await pos())[0]).toBeLessThan(3.7);
 // The glass entrance doors are closed.
 await page.evaluate(()=>{window.gallery.place(0,8.2);window.gallery.look(Math.PI,0)});await hold('KeyW',2500);
 expect((await pos())[2]).toBeLessThan(8.8);
 await page.screenshot({path:'test-results/walk.png'});
 // Artworks still open from walk mode.
 await page.evaluate(()=>{window.gallery.place(.5,2.8);window.gallery.look(-Math.PI/2,0)});await page.waitForTimeout(300);
 await clickProjected(page,'deib');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 // V goes back to the panorama closest to where the visitor stands.
 await page.evaluate(()=>window.gallery.place(.3,-2));await page.keyboard.press('v');
 await page.waitForFunction(()=>!window.gallery.walking());await at(page,1);
 await expect(page.getByRole('button',{name:'걷기 모드 켜기'})).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});
