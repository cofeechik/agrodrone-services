const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve('.impeccable/review/navigation-v09');fs.mkdirSync(out,{recursive:true});
const probe=`
window.__v09=()=>{
 const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 if(model)for(const c of corners){const p=c.clone().applyEuler(model.rotation).multiplyScalar(model.scale.x).add(model.position).project(camera);const x=(p.x+1)*width/2,y=(1-p.y)*height/2+headerHeight;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);}
 return {section:stage.dataset.section,configuration,cargoReady,payloadReady,weights:{...assemblyWeights},bounds,pose:currentPose,bank:flightBank,spray:sprayParticles?.points.visible,spread:spreadParticles?.points.visible,visible:!stage.classList.contains('is-offscreen'),rotors:rotors.map(r=>r.angle),programs:renderer.info.programs.length};};`;
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('prototype-3d.js','utf8')+probe}));
 await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>__v09().cargoReady&&__v09().payloadReady&&document.querySelector('#drone-stage').dataset.inspectionWarm==='true',null,{timeout:90000});
 const hero=await page.evaluate(()=>({probe:__v09(),heading:document.querySelector('.flight-heading').getBoundingClientRect().toJSON(),copy:document.querySelector('.flight-bottom').getBoundingClientRect().toJSON()}));
 assert(hero.probe.bounds.top>=hero.heading.bottom,'Hero top cropped');assert(hero.probe.bounds.bottom<=hero.copy.top,'Hero bottom cropped');
 await page.screenshot({path:out+'/'+name+'-hero.png'});
 const scenarios=[];
 for(const key of ['spray','spread','cargo','map']){
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));await page.locator('button[data-scenario='+key+']').click();
  if(key==='map'){
   await page.waitForFunction(()=>document.querySelector('.scenario-airspace .navigation-viewer')?.dataset.ready==='true');
   await page.locator('.scenario-airspace button[data-field="1"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='result');
   assert(await page.locator('.scenario-airspace .navigation-status').isVisible());
  }else await page.waitForFunction(k=>__v09().configuration===k&&document.querySelector('#drone-stage').dataset.transitioning==='false',key);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow');
  const s=await page.evaluate(()=>__v09());if(key==='spray')assert(s.spray);if(key==='spread')assert(s.spread&&s.weights.spray===0);if(key==='cargo')assert(s.weights.cargo===1&&s.weights.spray===0&&s.weights.spread===0);
  await page.screenshot({path:out+'/'+name+'-uses-'+key+'.png'});scenarios.push({key,...s});
 }
 const equipment=[];
 for(const key of ['spray','spread','battery','navigation']){
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));await page.locator('button[data-part='+key+']').click();
  await page.waitForFunction(k=>document.querySelector('#drone-stage').dataset.part===k,key);
  if(key==='navigation'){
    await page.waitForFunction(()=>document.querySelector('.machine-airspace .navigation-viewer')?.dataset.ready==='true');
    await page.locator('.machine-airspace [data-field="2"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='result');
  }else{const s=await page.evaluate(()=>__v09());if(key==='spray')assert(s.spray);if(key==='spread')assert(s.spread);}
  assert.equal(await page.locator('#part-stats dd').count(),3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/'+name+'-equipment-'+key+'.png'});equipment.push({key,...await page.evaluate(()=>__v09())});
 }
 await page.locator('.viewer-mode-button').click();await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));await page.waitForFunction(()=>__v09().visible);await page.screenshot({path:out+'/'+name+'-equipment-sensors.png'});
 // Reduced motion still allows choosing a new field and showing its result.
 await page.locator('.viewer-mode-button').click();await page.locator('.machine-airspace [data-field="0"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='result');
 await page.locator('#contact').evaluate(e=>scrollTo({top:e.offsetTop,behavior:'instant'}));await page.waitForFunction(()=>!__v09().visible);assert.deepEqual(errors,[]);
 results.push({name,hero,scenarios,equipment,errors});await page.close();
}
// One normal-motion mission: approach -> follow -> result, latest input wins.
const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:4173/prototype.html');
await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready');
await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));await page.locator('[data-scenario="map"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true');
await page.locator('[data-field="0"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='flight',null,{timeout:60000});await page.screenshot({path:out+'/desktop-navigation-flight.png'});
await page.locator('[data-field="2"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='result',null,{timeout:180000});await page.screenshot({path:out+'/desktop-navigation-result.png'});
await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.navigation-back').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='overview');
await page.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS: hero framing, 4 applications, 4 equipment views, sensor switch, geodata results, reduced motion and normal mission');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
