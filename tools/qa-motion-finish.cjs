const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='.impeccable/review/motion-v10';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
 try{for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/prototype-3d.js',r=>{
   let body=fs.readFileSync('prototype-3d.js','utf8');body=body.replace('renderer.render(scene, camera);','renderer.render(scene, camera); if(introStarted>=0)(window.__renderedArrival ||= []).push({at:performance.now(),progress:introElapsed/.85,scale:model.scale.x,x:currentPose.x,roll:model.rotation.z});');
   body+='\nwindow.__replayArrival=()=>{introElapsed=0;introStarted=performance.now();hero.classList.add("is-arriving");requestFrame();};';r.fulfill({contentType:'text/javascript',body});
  });
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready'&&!document.querySelector('#flight').classList.contains('is-arriving'),null,{timeout:180000});
  const arrival=await page.evaluate(()=>__renderedArrival);assert(arrival.length>=18,'Arrival must render a continuous sequence');
  for(let i=1;i<arrival.length;i++){assert(arrival[i].progress-arrival[i-1].progress<=.040,'Stall skipped arrival');assert(arrival[i].at>=arrival[i-1].at);}
  assert(arrival.at(-1).scale>arrival[0].scale*3);await page.screenshot({path:out+'/'+name+'-hero.png'});
  await page.evaluate(()=>{__replayArrival();scrollTo({top:30,behavior:'instant'});});await page.waitForFunction(()=>!document.querySelector('#flight').classList.contains('is-arriving'));
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));await page.locator('button[data-scenario="map"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true',null,{timeout:90000});
  await page.locator('[data-field="1"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.state==='flight',null,{timeout:90000});
  const bounds=await page.locator('.navigation-viewer').evaluate(e=>JSON.parse(e.dataset.scanBounds));
  assert(bounds.top>=bounds.safeTop-1&&bounds.bottom<=bounds.safeBottom+1,'Scan vertical crop');assert(bounds.left>=15&&bounds.right<=width-15,'Scan horizontal crop');
  await page.locator('.navigation-viewer').screenshot({path:out+'/'+name+'-scan-canvas.png'});
  await page.screenshot({path:out+'/'+name+'-scan.png'});assert.deepEqual(errors,[]);results.push({name,arrival,bounds,errors});await page.close();
 }
 fs.writeFileSync(out+'/finish-results.json',JSON.stringify(results,null,2));console.log('PASS: rendered arrival sequence desktop/mobile, scroll cancel, full scan contained under controls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
