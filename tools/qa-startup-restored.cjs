const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

(async()=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'agrodron-startup-'));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
      const page=await browser.newPage({viewport:{width,height}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/xag-p150-max-v08-configurable-web.glb',async route=>{
        await new Promise(resolve=>setTimeout(resolve,500));
        await route.continue();
      });
      await page.goto('http://127.0.0.1:4173/prototype.html',{waitUntil:'domcontentloaded'});
      const initial=await page.evaluate(()=>{
        const fallback=getComputedStyle(document.querySelector('.model-fallback'));
        return {preparing:document.documentElement.classList.contains('intro-pending'),arriving:document.querySelector('#flight').classList.contains('is-arriving'),text:getComputedStyle(document.querySelector('.flight-heading')).opacity,fallbackHidden:fallback.visibility==='hidden'||fallback.display==='none'};
      });
      assert(initial.preparing||initial.arriving,'Cold load must prepare or already be arriving');
      assert.equal(initial.text,'0','No initial text flash');
      assert(initial.fallbackHidden,'No static render before the 3D flight');
      await page.waitForFunction(()=>document.querySelector('#flight').classList.contains('is-arriving')&&document.querySelector('#drone-stage').classList.contains('is-ready'),null,{timeout:90000});
      assert.equal(await page.locator('.flight-heading').evaluate(e=>getComputedStyle(e).opacity),'0','Text stays hidden during arrival');
      await page.screenshot({path:path.join(output,name+'-arrival.png')});
      await page.waitForFunction(()=>!document.querySelector('#flight').classList.contains('is-arriving'),null,{timeout:90000});
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.flight-heading')).opacity==='1');
      assert.equal(await page.locator('.model-fallback').evaluate(e=>getComputedStyle(e).display),'none');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:path.join(output,name+'-settled.png')});
      console.log(name+': PASS preparation without flash, original 3D arrival, text afterwards, no errors or overflow');
      await page.close();
    }
    console.log('Screenshots: '+output);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
