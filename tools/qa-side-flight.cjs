const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.impeccable/review/flight-side');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try{for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/prototype-3d.js','utf8')+'\nwindow.__sideQA=()=>({pose:currentPose,focus:currentFocus,angles:rotors.map(r=>r.angle),section:renderedSection,scissor:renderer.getScissor(new THREE.Vector4()).toArray(),scissorOn:renderer.getScissorTest()});'}));
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:60000});
  await page.screenshot({path:path.join(out,name+'-hero.png')});
  const start=await page.evaluate(()=>__sideQA().pose);
  await page.evaluate(()=>scrollTo({top:(document.querySelector('#flight').offsetHeight-innerHeight)*.5,behavior:'instant'}));
  await page.waitForFunction(()=>__sideQA().pose.x>innerWidth*.8);const exit=await page.evaluate(()=>__sideQA().pose);
  assert(Math.abs(exit.y-start.y)<.01);assert(exit.x>start.x);
  await page.screenshot({path:path.join(out,name+'-departure.png')});
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('#drone-stage').classList.contains('is-offscreen'));
  await page.screenshot({path:path.join(out,name+'-uses.png')});
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-innerHeight*.27,behavior:'instant'}));
  await page.waitForFunction(()=>__sideQA().section==='machine');const entry=await page.evaluate(()=>__sideQA().pose.x);
  await page.screenshot({path:path.join(out,name+'-entry.png')});
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForFunction(()=>Math.abs(__sideQA().pose.x-(document.querySelector('.machine-airspace').getBoundingClientRect().left+document.querySelector('.machine-airspace').offsetWidth/2))<1);
  assert(entry<await page.evaluate(()=>__sideQA().pose.x));
  await page.screenshot({path:path.join(out,name+'-machine.png')});
  for(const part of ['tank','rotors','battery','navigation','spread','all']){
   await page.locator('button[data-part="'+part+'"]').click();
   await page.waitForFunction(p=>document.querySelector('#part-panel').dataset.part===p,part);
   await page.waitForFunction(p=>document.querySelector('#drone-stage').dataset.part===p,part);
   if(['tank','rotors'].includes(part))await page.waitForFunction(()=>__sideQA().focus>.99);
   else if(part!=='spread')await page.waitForFunction(()=>__sideQA().focus<.001);
   assert.equal(await page.locator('#part-stats dd').count(),3);
   if(part==='spread'){assert.equal(await page.locator('#machine-photo').isVisible(),true);assert(await page.locator('#drone-stage').evaluate(e=>e.classList.contains('is-offscreen')));}
   await page.screenshot({path:path.join(out,name+'-'+part+'.png')});
  }
  assert.equal(await page.locator('#motion-toggle,.model-toolbar').count(),0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
  const a=await page.evaluate(()=>__sideQA().angles[0]);await page.waitForFunction(v=>__sideQA().angles[0]!==v,a);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const stopped=await page.evaluate(()=>__sideQA().angles);
  await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>__sideQA().angles),stopped);
  assert.equal(errors.length,0);results.push({name,width,height,sideExit:true,leftEntry:true,usesNoModel:true,parts:6,statsEach:3,noStopControl:true,spinning:true,reducedMotion:true,overflow,errors});await page.close();
 }fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
