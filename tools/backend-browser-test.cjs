/* Requires a running API on 8000 and frontend on 4173; no production submissions. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
    let browser;
    try { browser = await chromium.launch({ headless: true }); }
    catch { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const config = mode => `export const runtimeConfig = ${JSON.stringify({mode,baseUrl:'http://127.0.0.1:8000',contactMode:'legacy',chatMode:'legacy'})};`;
    await page.route('**/config/runtime.mjs', route => route.fulfill({contentType:'text/javascript',body:config('live')}));
    let contactCalls = 0, chatCalls = 0;
    await page.route('**/.netlify/functions/chat-groq', route => { chatCalls++; return route.fulfill({contentType:'text/plain',body:'Kurt works with Python and computer vision.'}); });
    await page.route('http://127.0.0.1:4173/', route => {
        if (route.request().method() === 'POST') { contactCalls++; assert.ok(route.request().postData().includes('form-name=contact-main')); return route.fulfill({body:'ok'}); }
        return route.continue();
    });
    try {
        await page.goto('http://127.0.0.1:4173/projects/');
        await page.waitForSelector('#projectGrid .project-card');
        assert.equal(await page.locator('#projectGrid .project-card').count(),7);
        await page.locator('#projectSearch').fill('Helmet');
        assert.equal(await page.locator('#projectGrid .project-card:visible').count(),1);
        await page.goto('http://127.0.0.1:4173/projects/smart-helmet/');
        await page.waitForSelector('.project-detail h1');
        assert.equal(await page.locator('h1').textContent(),'IoT Smart Helmet for Riders');
        assert.equal(await page.locator('.project-detail').count(),1);
        await page.goto('http://127.0.0.1:4173/');
        await page.locator('#wall').scrollIntoViewIfNeeded();
        await page.waitForSelector('#wallForm');
        await page.locator('#wallName').fill('QA Visitor');
        await page.locator('#wallText').fill('Local backend browser verification');
        await page.locator('#wallPost').click();
        await page.waitForFunction(() => document.querySelector('#wallNotes')?.textContent.includes('Local backend browser verification'));
        const note = page.locator('#wallNotes article').filter({hasText:'Local backend browser verification'});
        await note.locator('.note-actions button').first().click();
        await page.waitForTimeout(300);
        assert.ok((await note.locator('.note-actions button').first().textContent()).includes('1'));
        await note.locator('.report-btn').click();
        await page.waitForFunction(() => !document.querySelector('#wallNotes')?.textContent.includes('Local backend browser verification'));
        await page.goto('http://127.0.0.1:4173/contact/');
        await page.locator('input[name="name"]').fill('QA Visitor');
        await page.locator('input[name="email"]').fill('qa@example.com');
        await page.locator('textarea[name="message"]').fill('Local verification only, no actual submission.');
        await page.locator('form button[type="submit"]').click();
        await page.waitForTimeout(600);
        assert.equal(contactCalls,1);
        await page.locator('#chatToggle').click();
        await page.waitForSelector('#chatInput');
        await page.locator('#chatInput').fill('What projects?');
        await page.locator('.chat-form').evaluate(form => form.requestSubmit());
        await page.waitForTimeout(600);
        assert.equal(chatCalls,1);
        await page.unroute('**/config/runtime.mjs');
        await page.route('**/config/runtime.mjs', route => route.fulfill({contentType:'text/javascript',body:config('mock')}));
        await page.goto('http://127.0.0.1:4173/');
        const result = await page.evaluate(async () => {
            const api = await import('/services/api.mjs');
            const contact = await api.sendContact({name:'Visitor',email:'qa@example.com',message:'Mock message only','form-name':'contact-main','bot-field':''});
            const chat = await api.sendChat({question:'Projects?',session_id:'test',username:'Visitor',history:[]});
            return {contact,chat};
        });
        assert.equal(result.contact.ok,true); assert.ok(result.chat.includes('Embedded System'));
        assert.equal(contactCalls,1); assert.equal(chatCalls,1); assert.deepEqual(errors,[]);
        console.log('PASS: live projects/detail/filter, wall post/like/report, legacy contact/chat, isolated mock mode, no browser errors.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
