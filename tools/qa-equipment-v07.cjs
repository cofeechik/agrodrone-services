const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.impeccable/review/equipment-v07');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try{for(const [name,width,height] of [['desktop',1440,1000],['compact',960,768],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/prototype-3d.js','utf8')+'\nwindow.__bankSamples=[];const originalRender=render;render=function(time){originalRender(time);window.__bankSamples.push(flightBank);};window.__equipmentQA=()=>({bank:flightBank,pose:currentPose,focus:currentFocus,angles:rotors.map(r=>r.angle),section:renderedSection,selected:meshes.filter(isSelected).map(m=>m.userData.component),ghosts:meshes.filter(m=>!isSelected(m)&&m.material.opacity<.04).length});'}));
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:60000});
  assert.equal(await page.locator('.header .brand').innerText(),'AGRODRON');
  await page.screenshot({path:path.join(out,name+'-hero.png')});
  // Real scroll sequence, not a single jump: visible banking in both directions.
  const banks=[];
  let previousProgress=0;
  for(const p of [.35,.5,.35,.5,.35]){
   await page.evaluate(()=>window.__bankSamples=[]);
   await page.evaluate(p=>scrollTo({top:(document.querySelector('#flight').offsetHeight-innerHeight)*p,behavior:'instant'}),p);
   await page.waitForFunction(right=>__bankSamples.some(b=>right?b<-.012:b>.012),p>previousProgress,{timeout:10000});
   banks.push(await page.evaluate(right=>right?Math.min(...__bankSamples):Math.max(...__bankSamples),p>previousProgress));
   previousProgress=p;
  }
  assert(banks.some(b=>b<-.012),'Missing right bank');assert(banks.some(b=>b>.012),'Missing reverse bank');
  await page.waitForFunction(()=>Math.abs(__equipmentQA().bank)<.004);
  await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('#drone-stage').classList.contains('is-offscreen'));
  await page.screenshot({path:path.join(out,name+'-uses.png')});
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForFunction(()=>__equipmentQA().section==='machine');
  const parts=[];
  for(const part of ['all','spray','tank','rotors','battery','navigation','spread']){
   await page.locator('button[data-part="'+part+'"]').click();
   await page.waitForFunction(p=>document.querySelector('#drone-stage').dataset.part===p,part);
   if(!['all','spread'].includes(part))await page.waitForFunction(()=>__equipmentQA().focus>.995);
   else if(part==='all')await page.waitForFunction(()=>__equipmentQA().focus<.001);
   const inspection=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}};
    return {...__equipmentQA(),panel:rect(document.querySelector('#part-panel')),layout:rect(document.querySelector('.machine-layout')),selector:rect(document.querySelector('.part-selector')),air:rect(document.querySelector('.machine-airspace')),numberOverflow:document.querySelector('#part-value').scrollWidth>document.querySelector('#part-value').clientWidth,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(inspection.panel.top>=inspection.selector.bottom,'Panel crosses selector');
   assert(inspection.panel.bottom<=inspection.layout.bottom+1,'Panel crosses layout');
   assert(!inspection.numberOverflow&&!inspection.overflow,'Type overflows');
   assert.equal(await page.locator('#part-stats dd').count(),3);
   if(['tank','spray','battery','navigation'].includes(part)){
    assert(inspection.selected.length>0);assert(inspection.selected.every(p=>p===part));assert(inspection.ghosts>0);
    assert(await page.locator('#isolation-toggle').isVisible());
   }
   if(part==='spread')assert(await page.locator('#machine-photo').isVisible());
   await page.screenshot({path:path.join(out,name+'-'+part+'.png')});
   parts.push({part,selected:inspection.selected.length,ghosts:inspection.ghosts,panelContained:true,typeContained:true});
  }
  await page.locator('[data-part="all"]').click();await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(250);const stopped=await page.evaluate(()=>__equipmentQA());
  await page.waitForTimeout(250);assert.deepEqual((await page.evaluate(()=>__equipmentQA())).angles,stopped.angles);assert.equal(stopped.bank,0);
  assert.equal(errors.length,0);results.push({name,width,height,parts,banks,bankRecovers:true,reducedMotion:true,usesNoModel:true,errors});await page.close();
 }fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
