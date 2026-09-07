import {test,expect} from '@playwright/test';
test('enter, rotate, floor travel, artwork, preserve view, all stations',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await page.getByRole('button',{name:'전시관 입장하기'}).click();
 await expect(page.getByRole('heading',{name:'2026 행사 돌아보기'})).toBeVisible();
 await page.waitForTimeout(1100);
 await page.mouse.move(700,430);await page.mouse.down();await page.mouse.move(710,400,{steps:8});await page.mouse.up();
 // The first floor circle is centered below the horizon. Locate it in dev via its world projection.
 const hasDebug=await page.evaluate(()=>!!window.gallery);
 if(hasDebug){
  const before=await page.evaluate(()=>window.gallery.inspect());expect(before.pitch).toBeLessThan(.02);
  const circle=await page.evaluate(()=>window.gallery.project(1,'station'));console.log("circle",circle);expect(circle.visible).toBe(true);await page.mouse.click(circle.x,circle.y);
  await expect(page.getByRole('heading',{name:'함께한 순간들'})).toBeVisible();
  const after=await page.evaluate(()=>window.gallery.inspect());expect(after.yaw).toBe(before.yaw);expect(after.pitch).toBe(before.pitch);
  await page.waitForTimeout(700);const picture=await page.evaluate(()=>window.gallery.project('ai'));console.log("picture",picture);expect(picture.visible).toBe(true);await page.mouse.click(picture.x,picture.y);
 }else{
  // Production also exercises actual floor and framed artwork hit targets.
  await page.mouse.click(771.115,636.198);await expect(page.getByRole('heading',{name:'함께한 순간들'})).toBeVisible();
  await page.waitForTimeout(700);await page.mouse.click(1243.719,331.282);
 }
 await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'test-results/artwork.png'});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 for(const name of ['3. 기억에 남을 장면들','4. 우리의 2026','1. 2026 행사 돌아보기']){await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(600);}
 await page.getByRole('button',{name:'행사 목록',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.screenshot({path:'test-results/desktop.png'});expect(errors).toEqual([]);
});
test('mobile entry and artwork detail',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('./');await page.getByRole('button',{name:'전시관 입장하기'}).click();await page.getByRole('button',{name:'4. 우리의 2026'}).click();await expect(page.getByRole('heading',{name:'우리의 2026'})).toBeVisible();await page.getByRole('button',{name:'행사 목록',exact:true}).click();await page.getByRole('button',{name:'주요 행사 01',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();await page.screenshot({path:'test-results/mobile.png'});});


