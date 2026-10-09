const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const unwanted=/демонстра|реконструк|заводской CAD|не результат реальной|высоты ×|Бурабаев|Асанов|\+7 747|\+7 705/iu;
(async()=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'agrodron-customer-'));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{navigator.clipboard.writeText=async text=>{window.__copiedRequest=text;};});
      await page.goto('http://127.0.0.1:4173/prototype.html#contact');
      await page.waitForFunction(()=>document.querySelector('#drone-stage').dataset.state==='ready',null,{timeout:90000});
      assert.equal(await page.locator('a[href^="tel:"],a[href*="wa.me"]').count(),0);
      assert(!unwanted.test(await page.locator('body').innerText()));
      await page.locator('#request-area').fill('150');await page.locator('#request-crop').fill('Пшеница');await page.locator('#request-location').fill('Кокшетау');
      await page.locator('#prototype-request button[type=submit]').click();
      await page.waitForFunction(()=>document.querySelector('#request-status').textContent.includes('скопирован'));
      assert.equal(await page.evaluate(()=>window.__copiedRequest),await page.locator('#request-text').inputValue());
      assert((await page.locator('#request-text').inputValue()).includes('Площадь, га: 150'));
      await page.locator('#request-area').fill('200');assert(!(await page.locator('#prepared-request').isVisible()));
      await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('Clipboard blocked');};});
      await page.locator('#prototype-request button[type=submit]').click();
      await page.waitForFunction(()=>document.querySelector('#request-status').textContent.includes('Скопируйте текст'));
      assert((await page.locator('#request-text').inputValue()).includes('Площадь, га: 200'));
      await page.locator('#contact').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
      await page.screenshot({path:path.join(output,name+'-request.png')});
      await page.locator('#uses').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
      for(const scenario of ['spray','spread','cargo','map']){
        await page.locator('button[data-scenario="'+scenario+'"]').click();
        assert(!unwanted.test(await page.locator('#scenario-panel').innerText()));
      }
      await page.waitForFunction(()=>document.querySelector('.navigation-viewer')?.dataset.ready==='true',null,{timeout:90000});
      assert(await page.locator('.scenario-airspace').evaluate(e=>e.getBoundingClientRect().width>250));
      await page.locator('[data-field="0"]').click();
      assert(!unwanted.test(await page.locator('body').innerText()));
      assert(!(await page.locator('.navigation-controls').innerText()).includes('Mapzen'));
      await page.locator('.navigation-viewer').screenshot({path:path.join(output,name+'-map.png')});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.deepEqual(errors,[]);await page.close();
      console.log(name+': PASS customer text, no fake contact links, request copy and fallback, clear map, no errors or overflow');
    }
    const legacy=await browser.newPage();await legacy.goto('http://127.0.0.1:4173/legacy.html');
    assert.equal(await legacy.locator('a[href^="tel:"],a[href*="wa.me"]').count(),0);
    assert(!unwanted.test(await legacy.locator('body').innerText()));await legacy.close();
    console.log('Legacy contacts removed. Screenshots: '+output);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
