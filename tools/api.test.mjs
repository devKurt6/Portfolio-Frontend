import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockWall } from '../services/wall-mock.mjs';
import { validateContact, validateWall } from '../lib/validation.mjs';
import { sendChat, sendContact, apiConfig, postWallMessage, wallCooldown, getWallMessages, getProjects, getProject } from '../services/api.mjs';
test('wall pagination, cooldown, pending links, likes, sorting and reports', async () => {
    let clock=1000000;
    const wall=createMockWall({delay:0,now:()=>clock});
    assert.equal((await wall.list()).total,0);
    for(let i=0;i<8;i++){await wall.post({name:'Test visitor',text:`Test message ${i}`,emoji:'',website:''});clock+=15001;}
    const first=await wall.list();assert.equal(first.items.length,6);assert.equal(first.total,8);
    assert.equal((await wall.list({offset:first.nextOffset})).items.length,2);
    const posted=await wall.post({name:'Visitor',text:'Hello from the test!',emoji:'👋',website:''});
    await assert.rejects(()=>wall.post({name:'Visitor',text:'Another message',emoji:'',website:''}),/Wait/);
    assert.equal((await wall.like(posted.id)).likes,1);
    assert.equal((await wall.list({sort:'top'})).items[0].id,posted.id);
    assert.equal((await wall.like(posted.id)).likes,0);
    clock+=15001;
    const pending=await wall.post({name:'Visitor',text:'See https://example.com',emoji:'',website:''});
    assert.equal(pending.status,'pending');assert.equal(pending.mine,true);
    await wall.report(posted.id);assert.ok(!(await wall.list({limit:100})).items.some(m=>m.id===posted.id));
    await assert.rejects(()=>wall.post({name:'Visitor',text:'Bot message',emoji:'',website:'spam'}));
});
test('old wall comments are cleared once and new comments persist',async()=>{
    const values=new Map([['kurt-wall-demo-v1',JSON.stringify({messages:[{id:'old-note'}]})]]);
    const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
    const wall=createMockWall({delay:0,storage});
    assert.equal((await wall.list()).total,0);assert.ok(!values.has('kurt-wall-demo-v1'));
    await wall.post({name:'Kurt',text:'My new comment',emoji:'',website:''});
    assert.equal((await createMockWall({delay:0,storage}).list()).items[0].text,'My new comment');
});
test('validation rejects oversized/profane wall notes and invalid contact payloads', () => { assert.ok(validateWall({ name: 'A', text: 'x'.repeat(301), emoji: '', website: '' }).text); assert.ok(validateWall({ name: 'Visitor', text: 'You are an idiot', emoji: '', website: '' }).text); assert.ok(validateContact({ name: 'X', email: 'invalid', message: 'short', 'form-name': 'contact-main', 'bot-field': '' }).email); });
test('plain domains and links in display names await approval',async()=>{
    const wall=createMockWall({delay:0});
    assert.equal((await wall.post({name:'Visitor',text:'See example.website',emoji:'',website:''})).status,'pending');
    const second=createMockWall({delay:0});
    assert.equal((await second.post({name:'example.website',text:'Hello everyone',emoji:'',website:''})).status,'pending');
});
test('real chat and contact adapters retain endpoint and payload contracts', async () => { const original = globalThis.fetch; const previous = apiConfig.mode; apiConfig.mode = 'live'; const calls = []; globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response('Assistant response', { status: 200 }); }; try {
    const payload = { question: 'Projects?', session_id: 'sess_test', username: 'Portfolio Visitor', history: [{ role: 'user', content: 'Projects?' }] };
    assert.equal(await sendChat(payload), 'Assistant response');
    assert.equal(calls[0].url, '/.netlify/functions/chat-groq');
    assert.deepEqual(JSON.parse(calls[0].options.body), payload);
    await sendContact({ name: 'Visitor', email: 'v@example.com', message: 'Hello from the test', 'form-name': 'contact-main', 'bot-field': '' });
    assert.equal(calls[1].url, '/');
    assert.equal(new URLSearchParams(calls[1].options.body).get('form-name'), 'contact-main');
    globalThis.fetch = async () => new Response('failed', { status: 503 });
    await assert.rejects(() => sendChat(payload));
    await assert.rejects(() => sendContact({ name: 'Visitor', email: 'v@example.com', message: 'Hello again', 'form-name': 'contact-main', 'bot-field': '' }));
}
finally {
    globalThis.fetch = original;
    apiConfig.mode = previous;
} });


test('live adapter maps 422 and 429 and preserves wall response shape', async () => {
    const original=globalThis.fetch, previous={...apiConfig};
    apiConfig.mode='live';apiConfig.baseUrl='https://test.invalid';
    try {
        globalThis.fetch=async (_url,options)=>{assert.match(options.headers['X-Visitor-Id'],/^[0-9a-f-]{36}$/);return new Response(JSON.stringify({error:{message:'Please wait.'}}),{status:429,headers:{'Retry-After':'15'}});};
        await assert.rejects(()=>postWallMessage({name:'Visitor',text:'Hello there',emoji:'',website:''}),error=>error.status===429&&error.retryAfter===15);
        assert.ok(wallCooldown()>14000);
        globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'Please keep it respectful.'}}),{status:422});
        await assert.rejects(()=>postWallMessage({name:'Visitor',text:'Hello there',emoji:'',website:''}),error=>error.status===422&&error.message.includes('respectful'));
        const expected={items:[],total:0,nextOffset:0};globalThis.fetch=async()=>new Response(JSON.stringify(expected));
        assert.deepEqual(await getWallMessages({sort:'top'}),expected);
    } finally {globalThis.fetch=original;Object.assign(apiConfig,previous);}
});

test('live projects use frontend JSON instead of the backend catalog', async () => {
    const originalFetch = globalThis.fetch;
    const previousMode = apiConfig.mode;
    const calls = [];
    apiConfig.mode = 'live';
    globalThis.fetch = async url => {
        calls.push(url);
        return new Response(JSON.stringify([{slug:'frontend-project',title:'Frontend content'}]), {status:200});
    };
    try {
        assert.equal((await getProjects())[0].title, 'Frontend content');
        assert.equal((await getProject('frontend-project')).title, 'Frontend content');
        assert.equal(await getProject('missing'), undefined);
        assert.deepEqual(calls, ['/data/projects.json','/data/projects.json','/data/projects.json']);
    } finally { globalThis.fetch = originalFetch; apiConfig.mode = previousMode; }
});
