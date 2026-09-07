const {chromium}=require('/Users/imac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1380,height:920}});
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 assert.equal(await page.locator('.empty-state').count(),1,'Provide an intentional empty state before importing data');
 assert(await page.locator('.empty-state').isVisible());
 await page.click('#studioDemo');
 await page.waitForFunction(()=>document.querySelector('#plotlyChart').data?.length>0);
 assert.equal(await page.locator('.empty-state').isVisible(),false);
 assert.match(await page.locator('#studioResult').innerText(),/422.0037 mAU·mL/);
 for(const width of [1380,1024,768]){
  await page.setViewportSize({width,height:1000});
  await page.waitForTimeout(200);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal page overflow at ${width}px`);
  for(const id of ['studioColumnVolume','studioUnit','studioKeep','studioSVG']){
   const box=await page.locator('#'+id).boundingBox();
   assert(box&&box.width>30&&box.x>=0&&box.x+box.width<=width,`${id} remains accessible at ${width}px`);
  }
 }
 await page.setViewportSize({width:1440,height:1100});
 await page.click('button[onclick*="switchTab(\'analysis\'"]');
 await page.selectOption('#tubeRangeMode','fraction');await page.selectOption('#tubeEnd','8');await page.selectOption('#tubeStart','5');
 assert.equal(await page.locator('#integEndValue').inputValue(),'10');
 await page.screenshot({path:path.resolve(__dirname,'../design-preview.png'),fullPage:true});
 await browser.close();console.log('PASS: empty state, demo entry, responsive controls at 3 widths, inclusive fraction integration');
})().catch(e=>{console.error(e);process.exit(1)});
