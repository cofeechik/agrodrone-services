const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'.impeccable/review');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['user-2869',2869,1630]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/prototype-3d.js',async route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/prototype-3d.js','utf8')+'\nwindow.__droneQA=()=>({angles:rotors.map(r=>r.angle),pose:currentPose,focus:currentFocus,time:previousTime,scale:model?.scale.x,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles});'}));
  await page.goto('http://127.0.0.1:4173/prototype.html');
  await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(300);
  const a=await page.evaluate(()=>__droneQA());
  await page.waitForFunction(v=>Math.abs(__droneQA().angles[0]-v)>5,a.angles[0]);
  const b=await page.evaluate(()=>__droneQA());
  const speed=Math.abs((b.angles[0]-a.angles[0])/((b.time-a.time)/1000));assert(Math.abs(speed-58)<.01);
  await page.screenshot({path:path.join(out,name+'.png')});
  await page.locator('#motion-toggle').click();
  const paused=await page.evaluate(()=>__droneQA().angles);await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>__droneQA().angles),paused);
  await page.screenshot({path:path.join(out,name+'-paused.png')});
  await page.evaluate(()=>scrollTo({top:(document.querySelector('#flight').offsetHeight-innerHeight)*.55,behavior:'instant'}));
  await page.waitForTimeout(350);await page.screenshot({path:path.join(out,name+'-departure.png')});
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#drone-stage').evaluate(e=>e.classList.contains('is-offscreen')),true);
  await page.screenshot({path:path.join(out,name+'-uses.png')});
  const photo=await page.locator('#scenario-image').boundingBox();
  for(const key of ['spread','cargo','map','spray']){
   await page.locator('button[data-scenario="'+key+'"]').click();
   await page.waitForFunction(k=>document.querySelector('.scenario-photo').dataset.scenario===k,key);
  }
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForTimeout(350);await page.screenshot({path:path.join(out,name+'-machine.png')});
  for(const part of ['tank','battery','rotors','all']){
   await page.locator('button[data-part="'+part+'"]').click();
   await page.waitForFunction(p=>document.querySelector('#drone-stage').dataset.part===p,part);
   await page.screenshot({path:path.join(out,name+'-'+part+'.png')});
  }
  await page.locator('#contact').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForTimeout(350);await page.screenshot({path:path.join(out,name+'-contact.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
  await page.locator('#request-area').fill('150');await page.locator('#request-crop').fill('Пшеница');await page.locator('#request-location').fill('Акмолинская область');
  await page.evaluate(()=>{window.open=()=>null});await page.locator('button[type=submit]').click();assert.match(await page.locator('#request-retry').getAttribute('href'),/^https:\/\/wa.me\/77477386296\?text=/);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  assert.equal(await page.locator('#drone-stage').getAttribute('data-spinning'),'false');
  await page.locator('#motion-toggle').click();await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.spinning==='true');
  assert.equal(errors.length,0,errors.join('\n'));
  results.push({name,width,height,speed,rotors:a.angles.length,pause:true,usesNoModel:true,photo,overflow,errors,drawCalls:b.drawCalls,triangles:b.triangles,whatsApp:true,reducedMotion:true});
  await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
