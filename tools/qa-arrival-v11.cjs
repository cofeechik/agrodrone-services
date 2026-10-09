const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/prototype-3d.js',r=>{
   let body=fs.readFileSync('prototype-3d.js','utf8');body=body.replace('renderer.render(scene, camera);','renderer.render(scene, camera); if(introStarted>=0)(window.__arrival ||= []).push({at:performance.now(),progress:introElapsed/2.3,scale:model.scale.x,roll:model.rotation.z});');
   r.fulfill({contentType:'text/javascript',body});
  });
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>window.__arrival?.length>60&&!document.querySelector('#flight').classList.contains('is-arriving'),null,{timeout:180000});
  const arrival=await page.evaluate(()=>__arrival);assert(arrival.length>=68);assert(arrival.at(-1).scale>arrival[0].scale*20);
  for(let i=1;i<arrival.length;i++)assert(arrival[i].progress-arrival[i-1].progress<.015);
  assert.deepEqual(errors,[]);fs.writeFileSync('.impeccable/review/navigation-v11/arrival-results.json',JSON.stringify({nominalSeconds:2.3,arrival,errors},null,2));console.log('PASS: 2.3s nominal arrival, >68 rendered frames, distant >20x scale approach, bounded progress, no page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
