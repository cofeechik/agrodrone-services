const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await page.route('**/prototype-3d.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('prototype-3d.js','utf8')+'\nwindow.__batteryProbe=()=>({programs:renderer.info.programs.length,selected:stage.dataset.selectedMeshes});'}));
await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.payloadState==='ready'&&document.querySelector('#drone-stage').dataset.inspectionWarm==='true');
await page.locator('#machine').evaluate(e=>scrollTo({top:e.offsetTop-76,behavior:'instant'}));
const results=[];
for(const part of ['battery','all','battery']){
const before=await page.evaluate(()=>__batteryProbe()),time=Date.now();await page.locator('button[data-part='+part+']').click();
await page.waitForFunction(p=>document.querySelector('#drone-stage').dataset.part===p,part);results.push({part,ms:Date.now()-time,before,after:await page.evaluate(()=>__batteryProbe())});
}
console.log(JSON.stringify(results));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
