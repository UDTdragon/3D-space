import {test,expect} from '@playwright/test';

// Runs against the dev server, where the viewer is exposed as window.gallery.
const at=async(page,i)=>{await expect(page.locator('.room')).toHaveAttribute('data-station',String(i),{timeout:15000});await expect(page.locator('.loading')).toHaveCount(0);await page.waitForTimeout(300);};
const enter=async page=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');const button=page.getByRole('button',{name:'전시관 입장하기'});await expect(button).toBeEnabled({timeout:60000});await button.click();await expect(page.locator('.entry')).toHaveCount(0);await page.waitForTimeout(700);return errors;};
const clickProjected=async(page,...args)=>{const p=await page.evaluate(args=>window.gallery.project(...args),args);expect(p.visible).toBe(true);await page.mouse.click(p.x,p.y);};

test('entry, guides and floor markers reach every station with its default view',async({page})=>{
 await page.goto('./');await expect(page.getByRole('heading',{name:/NEOIZE 2026/})).toBeVisible();await expect(page.locator('.entry')).toHaveCSS('background-image',/entrance-exterior.webp/);
 const errors=await enter(page);await page.screenshot({path:'test-results/intro-wall.png'});
 for(const i of [0,1,2]){await clickProjected(page,i,'guide');await at(page,i+1);const v=await page.evaluate(()=>window.gallery.inspect());const yaw=await page.evaluate(i=>import('/src/data.js').then(m=>m.stations[i].yaw),i+1);expect(v.yaw).toBeCloseTo(yaw);}
 // From the far end, look back down the hall: markers for all other stations, including the second one, are clickable.
 await page.evaluate(()=>window.gallery.look(Math.PI,-.35));await page.screenshot({path:'test-results/floor-markers.png'});
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
 await page.getByRole('button',{name:'공간 이동 메뉴 열기'}).click();await expect(page.locator('.tour-item')).toHaveCount(4);await expect(page.locator('.tour-item.active')).toContainText('2026 행사 돌아보기');await page.screenshot({path:'test-results/tour-menu.png'});
 await page.locator('.tour-item').nth(3).click();await at(page,3);await expect(page.locator('.tour-menu')).toHaveCount(0);
 await page.getByRole('button',{name:'배경음악 켜기'}).click();await expect(page.getByRole('button',{name:'배경음악 끄기'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'배경음악 끄기'}).click();await expect(page.getByRole('button',{name:'배경음악 켜기'})).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});

test('mobile: guide visible, menu and event list work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await enter(page);
 const g=await page.evaluate(()=>window.gallery.project(0,'guide'));expect(g.visible).toBe(true);
 await page.getByRole('button',{name:'공간 이동 메뉴 열기'}).click();await expect(page.locator('.tour-menu')).toBeVisible();await page.getByRole('button',{name:'공간 이동 메뉴 닫기'}).click();
 await page.getByRole('button',{name:'행사 목록',exact:true}).click();await page.getByRole('button',{name:'주요 행사 01',exact:true}).click();await expect(page.locator('.art-image-stage')).toBeVisible();await expect(page.getByRole('button',{name:'다음 슬라이드'})).toBeVisible();await page.screenshot({path:'test-results/mobile-dialog.png'});
});
