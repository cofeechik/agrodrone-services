const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'agrodron-equipment-'));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/prototype.html#machine');
      await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:90000});
      for(const [group,parts] of [['flight',['all','rotors','battery']],['work',['spread','spray','tank']],['navigation',['navigation']]]){
        await page.locator('[data-part-group="'+group+'"]').click();
        for(const part of parts){
          await page.locator('.part-selector button[data-part="'+part+'"]').click();
          if(part==='spread')await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.payloadState==='ready',null,{timeout:90000});
          await page.locator('.machine-airspace').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-document.querySelector('.header').offsetHeight-10,behavior:'instant'}));
          await page.waitForFunction(part=>{
            const stage=document.querySelector('#drone-stage'),panel=document.querySelector('#part-panel');
            return stage.dataset.part===part&&!stage.hidden&&!panel.hidden&&!stage.classList.contains('is-offscreen')&&getComputedStyle(document.querySelector('#drone-canvas')).opacity==='1'&&+stage.dataset.selectedMeshes>0;
          },part,{timeout:30000});
          assert.equal(await page.locator('#part-stats>div').count(),3);
          assert(await page.locator('#part-title').isVisible(),'Visible characteristics for '+part);
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
        }
        await page.screenshot({path:path.join(output,name+'-'+group+'.png')});
      }
      await page.locator('.viewer-mode-button').click();
      await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true',null,{timeout:90000});
      assert(await page.locator('.navigation-viewer').isVisible(),'Navigation map visible');
      await page.locator('.viewer-mode-button').click();
      await page.waitForFunction(()=>!document.querySelector('#drone-stage').classList.contains('is-offscreen'));
      assert(await page.locator('#part-panel').isVisible());
      const intercepted=await page.locator('.machine-airspace').evaluate(e=>{
        const wheel=new WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true});e.dispatchEvent(wheel);return wheel.defaultPrevented;
      });
      assert.equal(intercepted,false,'Equipment must not capture vertical wheel');
      assert.deepEqual(errors,[]);
      console.log(name+': PASS all seven parts, visible 3D and specifications, map and return, natural wheel, no errors');
      await page.close();
    }
    console.log('Screenshots: '+output);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
