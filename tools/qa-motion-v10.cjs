const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='.impeccable/review/motion-v10';fs.mkdirSync(out,{recursive:true});
const probe=`window.__motion=()=>({section:stage.dataset.section,bank:flightBank,rz:model?.rotation.z,scale:model?.scale.x,intro:introStarted,applicationFlight,scenario:activeScenario,pickup:stage.dataset.pickup,box:cargoBox?.position.y,hook:cargoHook[0]?.node.position.y,hookCount:cargoHook.length,cargoReady,pose:currentPose});window.__trace=[];setInterval(()=>{if(model&&__trace.length<180)__trace.push(__motion());},40);`;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
 try{for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]].filter(v=>!process.env.AGRO_QA_VIEW||v[0]===process.env.AGRO_QA_VIEW)){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('prototype-3d.js','utf8')+probe}));
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>window.__motion?.().cargoReady&&__motion().intro===-1,null,{timeout:90000});
  await page.screenshot({path:out+'/'+name+'-hero.png'});
  await page.evaluate(()=>scrollTo({top:150,behavior:'instant'}));await page.waitForFunction(()=>Math.abs(__motion().bank)>.01,null,{timeout:15000});
  const bank=await page.evaluate(()=>__motion());await page.screenshot({path:out+'/'+name+'-bank.png'});
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));
  await page.locator('[data-scenario="spread"]').click();await page.waitForFunction(()=>__motion().scenario==='spread'&&!__motion().applicationFlight);await page.screenshot({path:out+'/'+name+'-spread.png'});
  await page.locator('[data-scenario="cargo"]').click();await page.waitForFunction(()=>__motion().scenario==='cargo'&&!__motion().applicationFlight);assert((await page.evaluate(()=>__motion().hookCount))>0);
  await page.locator('.cargo-pickup').click();await page.waitForFunction(()=>__motion().pickup==='complete',null,{timeout:60000});assert.equal(await page.evaluate(()=>__motion().box),-1.046);await page.screenshot({path:out+'/'+name+'-cargo.png'});
  await page.locator('[data-scenario="map"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true');
  await page.waitForTimeout(2500);await page.screenshot({path:out+'/'+name+'-map-overview.png'});
  await page.locator('[data-field="1"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='flight',null,{timeout:90000});await page.screenshot({path:out+'/'+name+'-scan.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.state==='result').catch(async e=>{console.log(await page.evaluate(()=>({motion:__motion(),nav:document.querySelector('.navigation-viewer')?.dataset,uses:document.querySelector('#uses').getBoundingClientRect().toJSON(),scroll:scrollY,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})),errors);throw e;});await page.screenshot({path:out+'/'+name+'-map-result.png'});
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));await page.locator('[data-part="battery"]').click();await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.part==='battery');await page.screenshot({path:out+'/'+name+'-battery.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({name,bank,trace:await page.evaluate(()=>__trace),errors});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4173/prototype.html');
 await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));await page.locator('button[data-scenario="spray"]').click();await page.locator('.scenario-airspace').hover();await page.mouse.wheel(0,120);
 await page.waitForFunction(()=>document.querySelector('[data-scenario="spread"]').getAttribute('aria-pressed')==='true');
 await page.locator('[data-scenario="map"]').click();const y=await page.evaluate(()=>scrollY);await page.locator('.scenario-airspace').hover();await page.mouse.wheel(0,180);await page.waitForTimeout(600);assert((await page.evaluate(()=>scrollY))>y,'Map must release page wheel');
 await page.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS v10: desktop/mobile bank, arrival, cargo, regional map, compact scan, reduced motion, wheel.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
