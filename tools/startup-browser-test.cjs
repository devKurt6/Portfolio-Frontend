const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
(async () => {
 const server = spawn(process.execPath, ['tools/serve.mjs'], {env:{...process.env,PORT:'4181'},stdio:'pipe'});
 let browser;
 try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  try { browser = await chromium.launch({headless:true}); }
  catch { browser = await chromium.launch({headless:true,channel:'msedge'}); }
  for (const reducedMotion of ['reduce','no-preference']) {
   const context = await browser.newContext({viewport:{width:375,height:900},reducedMotion});
   let probes=0, ready=false;
   await context.route('**/config/runtime.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const runtimeConfig={mode:"live",baseUrl:"https://startup.test",contactMode:"legacy",chatMode:"legacy"};'}));
   await context.route('https://startup.test/api/**',async route=>{
    if(route.request().url().endsWith('/health')) {
     probes++;
     await new Promise(resolve=>setTimeout(resolve,6500));ready=true;
     return route.fulfill({contentType:'application/json',body:'{"status":"ok"}'});
    }
    return route.fulfill({contentType:'application/json',body:'{"items":[],"total":0,"nextOffset":0}'});
   });
   const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:4181/');
   await page.locator('.startup-screen').waitFor();const started=Date.now();
   await page.waitForTimeout(1450);
   assert.equal(await page.locator('.startup-log li').count(),5);
   assert.equal(await page.locator('.startup-log li').last().innerText(),'Ready');
   await page.locator('.startup-screen').waitFor({state:'detached',timeout:4500});
   assert.ok(Date.now()-started<3600,'Startup must finish without backend');
   assert.equal(ready,false);
   await page.evaluate(async()=>{const host=document.getElementById('wallHost');(await import('/components/freedom-wall/wall.mjs')).mount(host);});
   await page.locator('.wall-connection').waitFor();
   assert.equal(await page.locator('#wallPost').isDisabled(),true);
   await page.getByText('The wall is empty',{exact:true}).waitFor({timeout:10000});
   assert.equal(await page.locator('.wall-connection').count(),0);
   assert.equal(await page.locator('#wallPost').isDisabled(),false);
   assert.equal(probes,1,'Wall shares startup background probe');
   await page.goto('http://127.0.0.1:4181/projects/');
   await page.evaluate(async()=>await (await import('/components/layout/startup.mjs')).startPortfolio());
   assert.equal(await page.locator('.startup-screen').count(),0,'Startup remains once per session');
   assert.equal(await page.locator('.project-card').count(),8);
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS: fixed startup, five gradual messages, background wake, waiting wall, automatic recovery, session navigation, reduced motion.');
 } finally { await browser?.close();server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
