const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['user-2869',2869,1630]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/prototype.html');await page.evaluate(()=>document.fonts.ready);
  await page.locator('#contact').evaluate(e=>scrollTo({top:e.offsetTop-document.querySelector('.header').offsetHeight,behavior:'instant'}));
  await page.waitForTimeout(700);await page.screenshot({path:path.resolve(__dirname,'../.impeccable/review/'+name+'-contact.png')});
  if(name==='mobile'){await page.locator('#prototype-request').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-84,behavior:'instant'}));await page.waitForTimeout(350);await page.screenshot({path:path.resolve(__dirname,'../.impeccable/review/mobile-form.png')});}
  await page.close();
 } await browser.close();console.log('Contact captures replaced after paint settlement');
})().catch(e=>{console.error(e);process.exit(1)});
