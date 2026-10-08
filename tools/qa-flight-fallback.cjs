const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.impeccable/review/flight-side');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
 try{for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const p=await b.newPage({viewport:{width,height}});
  await p.route('**/xag-p150-max-v06-web.glb',r=>r.abort());
  await p.goto('http://127.0.0.1:4173/prototype.html');
  await p.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='fallback');
  await p.waitForFunction(()=>document.querySelector('#drone-stage').style.clipPath.startsWith('inset('));
  await p.screenshot({path:path.join(out,name+'-fallback-hero.png')});
  await p.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await p.waitForFunction(()=>document.querySelector('#drone-stage').dataset.section==='machine');
  const clip=await p.locator('#drone-stage').evaluate(e=>e.style.clipPath);assert(clip.startsWith('inset('));
  await p.screenshot({path:path.join(out,name+'-fallback-machine.png')});
  await p.close();
  const v=await b.newPage({viewport:{width,height}});await v.goto('http://127.0.0.1:4173/prototype.html');
  await v.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:60000});
  await v.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight-innerHeight*.12,behavior:'instant'}));
  await v.waitForFunction(()=>document.querySelector('#drone-stage').dataset.section==='machine');
  await v.waitForTimeout(250);await v.screenshot({path:path.join(out,name+'-entry.png')});
  await v.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await v.locator('#scenario-image').evaluate(i=>i.decode());await v.waitForTimeout(300);
  await v.screenshot({path:path.join(out,name+'-uses.png')});
  await v.evaluate(()=>document.querySelector('#drone-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await v.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='fallback');
  await v.evaluate(()=>scrollTo({top:(document.querySelector('#flight').offsetHeight-innerHeight)*.5,behavior:'instant'}));
  await v.waitForFunction(()=>document.querySelector('#drone-stage').dataset.section==='hero'&&parseFloat(document.querySelector('.model-fallback').style.left)>innerWidth*.5);
  await v.screenshot({path:path.join(out,name+'-context-loss-hero.png')});
  await v.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await v.waitForFunction(()=>document.querySelector('#drone-stage').dataset.section==='machine');
  assert.equal(await v.locator('#model-status').evaluate(e=>getComputedStyle(e).position),'static');
  await v.screenshot({path:path.join(out,name+'-context-loss-machine.png')});await v.close();
  results.push({name,fallbackHeroClip:true,fallbackMachineClip:true,midEntryCaptured:true,photoDecoded:true,contextLossScroll:true,statusInFlow:true});
 }fs.writeFileSync(path.join(out,'fallback-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
