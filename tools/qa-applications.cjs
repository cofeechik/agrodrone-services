const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.impeccable/review/applications-v08');fs.mkdirSync(out,{recursive:true});
const probe=`
window.__applicationsQA=()=>({section:stage.dataset.section,configuration,weights:{...assemblyWeights},scan:fieldStudy.group.visible,
disc:payloadAngle,rotors:rotors.map(r=>r.angle),payloadReady,spinning:stage.dataset.spinning,
sprayParticles:sprayParticles?.points.visible,spreadParticles:spreadParticles?.points.visible,
sprayVisible:meshes.filter(m=>m.userData.payload==='spray'&&m.visible&&m.material.opacity>.1).length,
legsVisible:meshes.filter(m=>m.userData.payload==='landing'&&m.visible&&m.material.opacity>.1).length,
spreadVisible:meshes.filter(m=>m.userData.payload==='spread'&&m.visible&&m.material.opacity>.1).length,
air:document.querySelector(stage.dataset.section==='uses'?'.scenario-airspace':'.machine-airspace').getBoundingClientRect().toJSON(),
overflow:document.documentElement.scrollWidth>innerWidth,focus:currentFocus,bank:flightBank,
drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});`;
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],fallbackResults=[];
try{for(const [name,width,height]of[['desktop',1440,1000],['compact',960,768],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/prototype-3d.js','utf8')+probe}));
 await page.goto('http://127.0.0.1:4173/prototype.html');
 await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready'&&document.querySelector('#drone-stage').dataset.payloadState==='ready',null,{timeout:90000});
 await page.screenshot({path:out+'/'+name+'-hero.png'});
 await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
 await page.waitForFunction(()=>__applicationsQA().section==='uses');
 const scenarios=[];
 for(const key of ['spray','spread','map','cargo','spread','spray']){
  await page.locator('button[data-scenario="'+key+'"]').click();
  if(key!=='cargo')await page.waitForFunction(k=>{const s=__applicationsQA();return s.section==='uses'&&s.configuration===k&&document.querySelector('#drone-stage').dataset.transitioning==='false';},key);
  else await page.waitForFunction(()=>!document.querySelector('#application-photo').hidden&&document.querySelector('#application-photo').complete&&document.querySelector('#application-photo').naturalWidth>0);
  const s=await page.evaluate(()=>__applicationsQA());assert(!s.overflow,'Horizontal overflow');
  if(key==='spray'){assert(s.sprayVisible>0&&s.legsVisible>0&&s.spreadVisible===0);assert(s.sprayParticles,'Spray absent');}
  if(key==='spread'){assert(s.spreadVisible>0&&s.sprayVisible===0&&s.legsVisible===0,'Assemblies stacked');assert(s.spreadParticles,'Granules absent');const a=s.disc;await page.waitForFunction(a=>__applicationsQA().disc>a,a);}
  if(key==='map'){assert(s.scan&&s.sprayVisible===0&&s.spreadVisible===0);}
  if(key==='cargo')assert(await page.locator('#drone-stage').evaluate(e=>e.classList.contains('is-offscreen')));
  await page.screenshot({path:out+'/'+name+'-uses-'+key+'.png'});scenarios.push({key,...s});
 }
 // Latest input wins without queueing an old module arrival.
 await page.evaluate(()=>{for(const k of ['spread','map','spread','spray'])document.querySelector('button[data-scenario="'+k+'"]').click();});
 await page.waitForFunction(()=>__applicationsQA().configuration==='spray'&&document.querySelector('#drone-stage').dataset.transitioning==='false');
 await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
 const equipment=[];
 for(const key of ['all','spray','tank','rotors','battery','navigation','spread']){
  await page.locator('button[data-part="'+key+'"]').click();
  await page.waitForFunction(k=>__applicationsQA().section==='machine'&&document.querySelector('#drone-stage').dataset.part===k&&document.querySelector('#drone-stage').dataset.transitioning==='false'&&(k==='all'?__applicationsQA().focus<.01:__applicationsQA().focus>.99),key);
  const s=await page.evaluate(()=>__applicationsQA());assert(!s.overflow);
  if(key==='spread')assert(s.spreadVisible>0&&s.sprayVisible===0&&s.legsVisible===0);
  if(key==='navigation')assert(s.scan);
  assert.equal(await page.locator('#part-stats dd').count(),3);
  const containment=await page.locator('#part-panel').evaluate(e=>{const p=e.getBoundingClientRect(),l=document.querySelector('.machine-layout').getBoundingClientRect(),s=document.querySelector('.part-selector').getBoundingClientRect();return p.top>=s.bottom&&p.bottom<=l.bottom+1;});assert(containment,'Equipment copy outside layout');
  await page.screenshot({path:out+'/'+name+'-equipment-'+key+'.png'});equipment.push({key,...s});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.spinning==='false');
 const staticA=await page.evaluate(()=>__applicationsQA());await page.waitForTimeout(350);const staticB=await page.evaluate(()=>__applicationsQA());assert.deepEqual(staticA.rotors,staticB.rotors);assert.equal(staticA.disc,staticB.disc);
 await page.locator('#contact').evaluate(e=>scrollTo({top:e.offsetTop,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('#drone-stage').classList.contains('is-offscreen'));
 await page.screenshot({path:out+'/'+name+'-contact.png'});assert.deepEqual(errors,[]);
 results.push({name,scenarios,equipment,reducedMotion:true,offscreen:true,errors});await page.close();
 }
 for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  // Error and delayed-completion paths run in the same bounded confirmation batch.
  const failed=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await failed.route('**/revocast-5-v01-web.glb',r=>r.fulfill({status:404,body:'Not available'}));
  await failed.goto('http://127.0.0.1:4173/prototype.html');
  await failed.waitForFunction(()=>document.querySelector('#drone-stage').dataset.payloadState==='error');
  await failed.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-64,behavior:'instant'}));
  await failed.locator('button[data-scenario="spread"]').click();
  await failed.waitForFunction(()=>document.querySelector('.scenario-airspace').dataset.state==='fallback'&&!document.querySelector('#application-photo').hidden&&document.querySelector('#application-photo').naturalWidth>0);
  assert(await failed.locator('#drone-stage').evaluate(e=>e.classList.contains('is-offscreen')));
  await failed.screenshot({path:out+'/'+name+'-payload-error-uses.png'});
  await failed.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-64,behavior:'instant'}));
  await failed.locator('button[data-part="spread"]').click();
  assert(await failed.locator('#model-status').isVisible());assert(await failed.locator('#machine-photo').isVisible());
  await failed.screenshot({path:out+'/'+name+'-payload-error-equipment.png'});await failed.close();
  const late=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});let release;
  const pending=new Promise(resolve=>release=resolve);
  await late.route('**/revocast-5-v01-web.glb',async r=>{await pending;await r.continue();});
  await late.goto('http://127.0.0.1:4173/prototype.html');await late.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready');
  await late.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-64,behavior:'instant'}));await late.locator('button[data-part="spread"]').click();
  assert(await late.locator('#model-status').isVisible(),'Loading status hidden');
  await late.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-64,behavior:'instant'}));await late.locator('button[data-scenario="spread"]').click();
  await late.evaluate(()=>document.querySelector('#drone-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await late.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='fallback');release();
  await late.waitForFunction(()=>document.querySelector('#drone-stage').dataset.payloadState==='ready');
  assert.equal(await late.locator('.scenario-airspace').getAttribute('data-state'),'fallback','Late module erased context fallback');
  assert(await late.locator('#application-photo').isVisible());assert(await late.locator('#drone-stage').evaluate(e=>e.classList.contains('is-offscreen')));
  await late.screenshot({path:out+'/'+name+'-late-payload-context-loss.png'});await late.close();
  fallbackResults.push({name,moduleFailure:true,loadingMessage:true,lateContextLoss:true});
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));fs.writeFileSync(out+'/fallback-results.json',JSON.stringify(fallbackResults,null,2));
 console.log(JSON.stringify({layouts:results.map(r=>({name:r.name,scenarios:r.scenarios.length,equipment:r.equipment.length,errors:r.errors})),fallbacks:fallbackResults},null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
