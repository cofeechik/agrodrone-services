const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out='.impeccable/review/navigation-v11';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
 try{for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/prototype-navigation.js',r=>{
   let body=fs.readFileSync('prototype-navigation.js','utf8');body=body.replace('  return {show(element){',`  window.__mission=(seconds)=>{missionTime=seconds;previous=0;request();};
  window.__nav=()=>({state,fields,covered:Array.from(covered),drone:dronePoint.toArray(),camera:camera?.position.toArray(),look:displayLook.toArray(),footprint:selected>=0?footprint(dronePoint):null,beam:scan?Array.from(scan.geometry.attributes.position.array):[],rendererCalls:renderer?.info.render.calls});
  return {show(element){`);r.fulfill({contentType:'text/javascript',body});
  });
  await page.route('**/prototype-3d.js',r=>{
   let body=fs.readFileSync('prototype-3d.js','utf8');body+=`\nwindow.__hardware=()=>({part:activePart,mode:navigationMode,focus:currentFocus,cover:meshes.find(m=>m.userData.inspectionCover)?.material.opacity,array:meshes.filter(m=>m.name.includes('175 visible')).length,ghosted:meshes.filter(m=>!isSelected(m)&&m.material.opacity<.04).length,calls:renderer?.info.render.calls});`;
   r.fulfill({contentType:'text/javascript',body});
  });
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.inspectionWarm==='true',null,{timeout:150000});
  assert.deepEqual(await page.locator('button[data-part]').evaluateAll(es=>es.map(e=>e.dataset.part)),['all','spread','spray','tank','rotors','battery','navigation']);
  await page.screenshot({path:out+'/'+name+'-hero.png'});
  await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));await page.locator('button[data-part="navigation"]').click();
  await page.waitForFunction(()=>__hardware().focus>.99&&__hardware().part==='navigation');
  const hardware=await page.evaluate(()=>__hardware());assert.equal(hardware.mode,'hardware');assert.equal(hardware.array,1);assert(hardware.cover<.11&&hardware.ghosted>0);
  assert.equal(await page.locator('.machine-airspace .navigation-viewer').count(),0);await page.screenshot({path:out+'/'+name+'-hardware.png'});
  await page.locator('.viewer-mode-button').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true',null,{timeout:90000});
  await page.locator('.navigation-viewer').screenshot({path:out+'/'+name+'-overview-canvas.png'});
  await page.screenshot({path:out+'/'+name+'-overview.png'});
  const parcels=[];for(let i=0;i<3;i++){
   await page.locator('[data-field="'+i+'"]').click();await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='result');
   const nav=await page.evaluate(()=>__nav());assert(nav.covered.filter(Boolean).length>560,'Incomplete actual coverage');assert(nav.fields.every(f=>f.w<=.07&&f.d<=.05));parcels.push({field:i,count:nav.covered.filter(Boolean).length});
  }
  await page.locator('.navigation-viewer').screenshot({path:out+'/'+name+'-result-canvas.png'});
  await page.screenshot({path:out+'/'+name+'-result.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-field="1"]').click();await page.evaluate(()=>__mission(7.2));
  await page.waitForFunction(()=>document.querySelector('.navigation-viewer').dataset.state==='flight');
  await page.waitForFunction(()=>{const n=__nav();return Math.hypot(n.camera[0]-n.drone[0],n.camera[2]-n.drone[2])<.22;},null,{timeout:90000});
  const nav=await page.evaluate(()=>__nav()),b=nav.footprint,f=nav.fields[1];
  assert(b.left>=f.x-f.w/2-1e-8&&b.right<=f.x+f.w/2+1e-8&&b.top>=f.z-f.d/2-1e-8&&b.bottom<=f.z+f.d/2+1e-8);
  for(let i=0;i<nav.beam.length;i+=3){assert(nav.beam[i]>=b.left-1e-6&&nav.beam[i]<=b.right+1e-6);assert(nav.beam[i+2]>=b.top-1e-6&&nav.beam[i+2]<=b.bottom+1e-6);}
  const bounds=await page.locator('.navigation-viewer').evaluate(e=>JSON.parse(e.dataset.scanBounds));assert(bounds.top>=bounds.safeTop-1&&bounds.bottom<=bounds.safeBottom+1);
  assert(nav.covered.filter(Boolean).length>0&&nav.covered.filter(Boolean).length<576);
  await page.screenshot({path:out+'/'+name+'-flight.png'});await page.locator('.navigation-viewer').screenshot({path:out+'/'+name+'-flight-canvas.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.viewer-mode-button').click();await page.waitForFunction(()=>__hardware().mode==='hardware');
  if(name==='mobile'){
   const button=await page.locator('.viewer-mode-button').boundingBox(),viewer=await page.locator('.machine-airspace').boundingBox();assert(button.y+button.height<=viewer.y&&button.height>=44);
   assert(button.y>=64&&button.y+button.height<=height,'Mode button must remain visible on return');
  }
  await page.locator('button[data-part="battery"]').click();await page.locator('button[data-part="navigation"]').click();assert.equal(await page.locator('.viewer-mode-button').textContent(),'Посмотреть сканирование');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({name,hardware,parcels,flight:nav,bounds,errors});await page.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS: desktop/mobile hardware default, half radome, small parcels, exact beam/coverage, lower camera, reduced results, controls, order, overflow/errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
