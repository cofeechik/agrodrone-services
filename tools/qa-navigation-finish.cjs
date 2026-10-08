const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='.impeccable/review/navigation-v09';
const probe=`window.__exit=()=>({travel:hero.offsetHeight-height,left:Math.min(...corners.map(c=>{const p=c.clone().applyEuler(model.rotation).multiplyScalar(model.scale.x).add(model.position).project(camera);return (p.x+1)*width/2;})),section:stage.dataset.section});`;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try{for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
  await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('prototype-3d.js','utf8')+probe}));
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready');
  const exits=[];
  for(const progress of [.75,.98]){
   await page.evaluate(p=>scrollTo({top:__exit().travel*p,behavior:'instant'}),progress);
   await page.waitForFunction(()=>__exit().section==='hero');await page.waitForTimeout(600);
   const b=await page.evaluate(()=>__exit());assert(b.left<width,'Premature exit');exits.push({progress,...b});
   await page.screenshot({path:out+'/'+name+'-hero-exit-'+progress+'.png'});
  }
  await page.evaluate(()=>scrollTo({top:__exit().travel+2,behavior:'instant'}));await page.waitForFunction(()=>__exit().section!=='hero');
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));await page.locator('[data-scenario="map"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true');
  await page.locator('[data-field="0"]').click();
  await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.revealed==='0');
  await page.screenshot({path:out+'/'+name+'-scan-before.png'});
  await page.waitForFunction(()=>{const d=document.querySelector('.navigation-viewer').dataset;return +d.progress>.25&&+d.revealed>0&&+d.revealed<576;},null,{timeout:90000});
  const mid=await page.locator('.navigation-viewer').evaluate(e=>({...e.dataset}));
  await page.screenshot({path:out+'/'+name+'-scan-mid.png'});
  await page.waitForFunction(()=>{const d=document.querySelector('.navigation-viewer').dataset;return d.state==='result'&&d.revealed==='576';},null,{timeout:180000});
  await page.screenshot({path:out+'/'+name+'-scan-complete.png'});results.push({name,exits,mid,complete:576});await page.close();
 }
 fs.writeFileSync(out+'/finish-results.json',JSON.stringify(results,null,2));console.log('PASS: desktop/mobile exit until chapter release; scan zero -> partial -> all 576 cells.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
