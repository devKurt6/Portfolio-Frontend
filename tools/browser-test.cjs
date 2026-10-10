/* Browser regression suite. Uses Playwright from the local QA runtime or an optional local installation. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
    }
    catch {
        browser = await chromium.launch({ headless: true, channel: 'msedge' });
    }
    await fs.mkdir('.qa', { recursive: true });
    const routes = ['/', '/projects/', '/about/', '/contact/', '/projects/embedded-plate-recognition/', '/projects/plate-number-recognition/', '/projects/gun-detection/', '/projects/smart-helmet/', '/projects/uniform-attendance/', '/projects/wedding-invitation/', '/projects/tissue-defect-detection/', '/success.html', '/error.html', '/type.html'];
    let checked = 0;
    const failures = [];
    try {
        if (!process.env.QA_INTERACTIONS_ONLY)
            for (const width of [375, 768, 1280])
                for (const theme of ['dark', 'light']) {
                    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
                    await context.addInitScript(value => localStorage.setItem('theme', value), theme);
                    await context.route('**/.netlify/functions/**', route => route.fulfill({ status: 200, contentType: 'text/plain', body: '**Kurt Decena** works with Python and computer vision.' }));
                    const page = await context.newPage();
                    const errors = [];
                page.on('pageerror', error => errors.push(error.message));
                page.on('console', message => { if(message.type()==='error')errors.push(message.text()); });
                    for (const url of routes) {
                        await page.goto('http://127.0.0.1:4173' + url, { waitUntil: 'networkidle' });
                        await page.waitForTimeout(120);
                        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
                        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
                        if (overflow)
                            failures.push(`${width}/${theme} ${url}: horizontal overflow`);
                        const missingImages = await page.locator('img').evaluateAll(images => images.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src));
                        // Lazy images outside the viewport are checked after scrolling into view.
                        for (const img of await page.locator('img').all()) {
                            await img.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(50);
                            assert.ok(await img.evaluate(img => img.complete && img.naturalWidth > 0), `${url}: image failed to load`);
                        }
                        await page.evaluate(() => scrollTo(0, 0));
                        if (['/', '/projects/', '/about/', '/contact/', '/projects/smart-helmet/'].includes(url))
                            await page.screenshot({ path: `.qa/${width}-${theme}-${url === '/' ? 'home' : url.split('/')[1] + (url.includes('smart-helmet') ? '-detail' : '')}.png`, fullPage: true });
                        checked++;
                    }
                    if (errors.length)
                        failures.push(`${width}/${theme}: ${errors.join('; ')}`);
                    await context.close();
                console.log(`Rendered all ${routes.length} routes at ${width}px in ${theme} mode.`);
                }
        const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
        // Test-only fixtures; the actual wall starts empty.
        await context.addInitScript(()=>{if(!sessionStorage.getItem('kurt-wall-demo-v2'))sessionStorage.setItem('kurt-wall-demo-v2',JSON.stringify({messages:Array.from({length:8},(_,i)=>({id:`qa-${i}`,name:'QA visitor',text:`QA message ${i}`,emoji:'',likes:8-i,timestamp:Date.now()-i*60000,liked:false,status:'published',mine:true})),cooldown:0,hidden:[]}));});
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:4173');
        await page.locator('#themeToggle').click();
        const chosen = await page.locator('html').getAttribute('data-theme');
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('data-theme'), chosen);
        await page.goto('http://127.0.0.1:4173/index.html#projects');
        await page.waitForURL('**/projects/');
        await page.locator('#projectSearch').fill('esp32');
        await page.waitForFunction(() => document.querySelectorAll('.project-card[hidden]').length === 6);
        assert.equal(await page.locator('.project-card:visible').count(), 1);
        await page.locator('#projectSearch').fill('nothing-matches');
        assert.ok(await page.locator('#projectEmpty').isVisible());
        await page.locator('#clearFilters').click();
        assert.equal(await page.locator('.project-card:visible').count(), 7);
        await page.getByRole('button', { name: 'Embedded & IoT', exact: true }).click();
        assert.equal(await page.locator('.project-card:visible').count(), 1);
        await page.locator('.certificate-item').first().focus();
        await page.keyboard.press('Enter');
        assert.ok(await page.locator('dialog').isVisible());
        await page.keyboard.press('Escape');
        await page.locator('dialog').waitFor({ state: 'detached' });
        assert.equal(await page.locator('dialog').count(), 0);
        assert.ok(await page.locator('.certificate-item').first().evaluate(el => el === document.activeElement));
        await page.goto('http://127.0.0.1:4173/');
        await page.locator('#wall').scrollIntoViewIfNeeded();
        await page.locator('#wallForm').waitFor();
        await page.locator('.note').first().waitFor();
        assert.equal(await page.locator('.note').count(), 6);
        await page.getByRole('button', { name: 'Load more', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('.note').length === 8);
        await page.locator('#wallName').fill('QA Visitor');
        await page.locator('#wallText').fill('Hello <img src=x onerror=alert(1)> https://example.com');
        assert.equal(await page.locator('#chatToggle').evaluate(el => getComputedStyle(el).visibility), 'hidden');
        assert.ok((await page.locator('#wallCounter').textContent()).endsWith(' / 300'));
        await page.locator('#wallPost').click();
        await page.locator('.pending-badge').waitFor();
        assert.equal(await page.locator('.note img').count(), 0);
        assert.equal(await page.locator('#wallPost').isDisabled(), true);
        await page.screenshot({ path: '.qa/375-wall-loaded.png', fullPage: true });
        const firstLike = page.locator('.note-actions button').first();
        const original = await firstLike.textContent();
        await firstLike.click();
        await page.waitForFunction(() => !document.querySelector('.note-actions button').disabled);
        assert.notEqual(await firstLike.textContent(), original);
        await firstLike.click();
        await page.waitForFunction(() => !document.querySelector('.note-actions button').disabled);
        assert.equal(await firstLike.textContent(), original);
        await page.locator('.report-btn').first().click();
        await page.waitForFunction(() => !document.querySelector('.pending-badge'));
        await context.setOffline(true);
        await page.getByRole('button', { name: 'Most liked', exact: true }).click();
        await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
        await context.setOffline(false);
        await page.getByRole('button', { name: 'Retry', exact: true }).click();
        await page.locator('.note').first().waitFor();
        await page.locator('h1').click();
        let chatPayload;
        await page.route('**/.netlify/functions/chat-groq', async (route) => { chatPayload = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: 'text/plain', body: '**Kurt Decena** <img src=x onerror=alert(1)> [Safe link](https://example.com) [Bad link](javascript:alert(1))' }); });
        await page.evaluate(async () => { (await import('/services/api.mjs')).apiConfig.mode = 'live'; });
        await page.locator('#chatToggle').click();
        await page.locator('#chatInput').fill('Tell me about projects');
        await page.locator('#chatSendBtn').click();
        await page.waitForFunction(() => !document.querySelector('#chatSendBtn').disabled);
        assert.equal(chatPayload.question, 'Tell me about projects');
        assert.equal(chatPayload.history[0].role, 'user');
        assert.equal(await page.locator('.chat-message img').count(), 0);
        assert.equal(await page.locator('.chat-message a[href^="javascript:"]').count(), 0);
        assert.ok(await page.locator('.chat-message strong').last().isVisible());
        await page.screenshot({ path: '.qa/375-chat-open.png' });
        await page.keyboard.press('Escape');
        assert.ok(await page.locator('#chatWindow').isHidden());
        assert.ok(await page.locator('#chatToggle').evaluate(el => el === document.activeElement));
        await context.route('**/config/runtime.mjs', route => route.fulfill({contentType:'text/javascript',body:'export const runtimeConfig = {mode: \'live\', baseUrl: \'\', contactMode: \'legacy\', chatMode: \'legacy\'};'}));
        await page.goto('http://127.0.0.1:4173/contact/');
        await page.waitForFunction(() => document.querySelector('#contactForm').noValidate);
        await page.getByRole('button', { name: 'Send Message', exact: false }).click();
        assert.equal(await page.locator('[aria-invalid=true]').count(), 3);
        await page.locator('#name').fill('QA Visitor');
        await page.locator('#email').fill('qa@example.com');
        await page.locator('#message').fill('Testing the preserved form contract.');
        let formBody;
        await page.route('http://127.0.0.1:4173/', async (route) => { formBody = route.request().postData(); await new Promise(r => setTimeout(r, 400)); await route.fulfill({ status: 200, body: 'OK' }); });
        await page.getByRole('button', { name: 'Send Message', exact: false }).click();
        assert.ok(await page.getByRole('button', { name: 'Sending…' }).isDisabled());
        await page.getByRole('button', { name: 'Send another' }).waitFor();
        assert.equal(new URLSearchParams(formBody).get('form-name'), 'contact-main');
        await page.getByRole('button', { name: 'Send another' }).click();
        assert.ok(await page.locator('#contactForm').isVisible());
        assert.equal(await page.locator('#name').inputValue(), '');
        assert.equal(errors.length, 0, errors.join('\n'));
        await context.close();
        assert.equal(failures.length, 0, failures.join('\n'));
        console.log(`PASS: ${checked} route/theme/width combinations, images, theme persistence, legacy routing, filters, certificate keyboard dialog, wall safety/cooldown/likes/report/offline retry, chat contract/focus/safe Markdown, and contact validation/sending/success.`);
    }
    finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
