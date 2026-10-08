// Native WebGL render, not generated imagery; captures the shipped v05 model.
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const revision=process.argv[2]||'v07';if(!['v05','v06','v07'].includes(revision))throw Error('Unsupported revision');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.route('**/prototype-3d.js',async route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/prototype-3d.js','utf8')+'\nwindow.__renderBounds=()=>{model.updateMatrixWorld(true);let ys=corners.map(c=>c.clone().applyMatrix4(model.matrixWorld).project(camera).y);return {top:Math.max(0,Math.floor(headerHeight+(1-Math.max(...ys))*height/2)-16),bottom:Math.min(innerHeight,Math.ceil(headerHeight+(1-Math.min(...ys))*height/2)+16)};};'}));
 await page.goto('http://127.0.0.1:4173/prototype.html');await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:60000});await page.waitForTimeout(200);
 const b=await page.evaluate(()=>__renderBounds());
 await page.addStyleTag({content:'body{background:transparent!important}.header,main,footer,.model-toolbar{visibility:hidden!important}'});
 const target=path.join(root,`models/xag-p150-max/preview-${revision}-browser.png`);
 await page.screenshot({path:target,clip:{x:0,y:b.top,width:1440,height:b.bottom-b.top},omitBackground:true});
 console.log(JSON.stringify({target,width:1440,height:b.bottom-b.top,origin:`Native browser WebGL render of authored xag-p150-max-${revision}-web.glb; perspective camera and authored studio in prototype-3d.js/prototype-studio.js, no image-generation model.`}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
