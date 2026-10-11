const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  let browser;
  try { browser = await chromium.launch({headless:true}); }
  catch { browser = await chromium.launch({headless:true,channel:'msedge'}); }
  try {
    for (const width of [375,1280]) {
      const context = await browser.newContext({viewport:{width,height:900},reducedMotion:width === 375 ? 'reduce' : 'no-preference'});
      let probes=0, ready=false, premature=false;
      await context.route('**/config/runtime.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const runtimeConfig={mode:"live",baseUrl:"https://startup.test",contactMode:"legacy",chatMode:"legacy"};'}));
      await context.route('https://startup.test/api/**',async route=>{
        if (route.request().url().endsWith('/health')) {
          probes++;
          if(probes===1) return route.fulfill({status:503,contentType:'application/json',body:'{}'});
          await new Promise(resolve=>setTimeout(resolve,500));ready=true;
          return route.fulfill({contentType:'application/json',body:'{"status":"ok"}'});
        }
        if(!ready)premature=true;
        return route.fulfill({contentType:'application/json',body:route.request().url().includes('/projects')?'[]':'{"items":[],"total":0,"nextOffset":0}'});
      });
      const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:4173/');
      await page.locator('.startup-screen').waitFor();
      assert.ok(await page.locator('#main').evaluate(el=>el.inert));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('.startup-screen').waitFor({state:'detached',timeout:10000});
      assert.equal(probes,2);assert.equal(premature,false);
      assert.equal(await page.locator('#main').evaluate(el=>el.inert),false);
      for (const path of ['/about/', '/projects/', '/contact/']) {
        await page.goto('http://127.0.0.1:4173' + path);
        await page.evaluate(async () => { await (await import('/components/layout/startup.mjs')).startPortfolio(); });
        assert.equal(await page.locator('.startup-screen').count(),0);
      }
      await page.reload();
      await page.evaluate(async () => { await (await import('/components/layout/startup.mjs')).startPortfolio(); });
      assert.equal(probes,2,'Navigation and reload must not restart the startup health probes');
      assert.deepEqual(errors,[]);
      await context.close();
    }
    const context=await browser.newContext();
    await context.route('**/config/runtime.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const runtimeConfig={mode:"live",baseUrl:"",contactMode:"legacy",chatMode:"legacy"};'}));
    const page=await context.newPage();await page.goto('http://127.0.0.1:4173/');
    await page.locator('#startupRetry').waitFor();await page.locator('#startupContinue').click();
    await page.locator('.startup-screen').waitFor({state:'detached'});
    assert.equal(await page.locator('.startup-screen').count(),0);
    assert.equal(await page.locator('#main').evaluate(el=>el.inert),false);
    await page.goto('http://127.0.0.1:4173/about/');
    await page.evaluate(async () => { await (await import('/components/layout/startup.mjs')).startPortfolio(); });
    assert.equal(await page.locator('.startup-screen').count(),0,'Skip must also be remembered');
    await context.close();
    console.log('PASS: immediate wake probe, read-only retry, gated live content, responsive startup, reduced motion, safe failure/continue.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
