const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.impeccable/review/motion');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try {
  for(const [name,width,height] of [['recording',1556,1516],['mobile',390,844]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/prototype-3d.js','utf8')+'\nwindow.__motionQA=()=>({pose:currentPose,target:desiredPose().pose,section:renderedSection,focus:currentFocus,angles:rotors.map(r=>r.angle),frame:previousTime,shadowAuto:renderer.shadowMap.autoUpdate,shadowCenter:model.position.clone().applyMatrix4(keyLight.shadow.matrix).toArray()});'}));
   await page.goto('http://127.0.0.1:4173/prototype.html');
   await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:60000});
   for(const progress of [.2,.55,.1,.7,0]){
    await page.evaluate(p=>scrollTo({top:(document.querySelector('#flight').offsetHeight-innerHeight)*p,behavior:'instant'}),progress);
    await page.waitForFunction(()=>{const q=__motionQA();return q.section==='hero'&&Math.abs(q.pose.y-q.target.y)<.01;});
   }
   await page.screenshot({path:path.join(out,name+'-hero.png')});
   await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#drone-stage').classList.contains('is-offscreen'));
   await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));
   await page.waitForFunction(()=>{const q=__motionQA();return q.section==='machine'&&Math.abs(q.pose.y-q.target.y)<.01;});
   await page.locator('button[data-part="tank"]').click();
   await page.waitForFunction(()=>__motionQA().focus>.99);
   await page.locator('button[data-part="all"]').click();
   await page.waitForFunction(()=>__motionQA().focus<.001);
   await page.screenshot({path:path.join(out,name+'-machine.png')});
   const q=await page.evaluate(()=>__motionQA());assert.equal(q.shadowAuto,false);assert.equal(q.angles.length,4);
   await page.waitForFunction(t=>__motionQA().frame>t+100,q.frame);
   const hover=await page.evaluate(()=>__motionQA());
   assert(hover.shadowCenter.every((v,i)=>Math.abs(v-q.shadowCenter[i])<1e-6),'Cached shadow matrix must follow hover');
   await page.evaluate(()=>scrollBy({top:60,behavior:'instant'}));
   await page.waitForFunction(()=>Math.abs(__motionQA().pose.y-__motionQA().target.y)<.01);
   const scrolled=await page.evaluate(()=>__motionQA());
   assert(scrolled.shadowCenter.every((v,i)=>Math.abs(v-q.shadowCenter[i])<1e-6),'Cached shadow matrix must follow scroll');
   await page.locator('#motion-toggle').click();
   const paused=await page.evaluate(()=>__motionQA().angles);await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>__motionQA().angles),paused);
   assert.equal(errors.length,0);
   results.push({name,width,height,scrollReversals:5,positionLag:0,stageReset:true,partTransitions:true,shadowAuto:false,shadowTracksHoverAndScroll:true,rotors:4,pause:true,errors});
   await page.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
