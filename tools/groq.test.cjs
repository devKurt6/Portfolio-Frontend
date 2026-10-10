const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/chat-groq.js');

test('Groq defaults system prompt and preserves current question', async () => {
  const previous = { key: process.env.GROQ_API_KEY, prompt: process.env.SYSTEM_PROMPT, fetch: global.fetch };
  process.env.GROQ_API_KEY = 'test-key'; delete process.env.SYSTEM_PROMPT;
  try {
    global.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.ok(payload.messages.every(message => typeof message.content === 'string'));
      assert.equal(payload.messages.at(-1).content, 'Projects?');
      assert.equal(payload.messages.filter(message => message.role === 'user').length, 1);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Test answer' } }] }));
    };
    assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ question: 'Projects?', history: [{ role:'user', content:'Projects?' }] }) })).body, 'Test answer');
    assert.equal((await handler({ httpMethod: 'POST', body: '{invalid' })).statusCode, 400);
    delete process.env.GROQ_API_KEY;
    assert.equal((await handler({ httpMethod: 'POST', body: '{}' })).statusCode, 503);
    process.env.GROQ_API_KEY = 'test-key';
    global.fetch = async () => new Response('provider private diagnostics', { status:401 });
    const response = await handler({ httpMethod:'POST', body:JSON.stringify({question:'Hello'}) });
    assert.equal(response.statusCode,502); assert.match(response.body,/authentication failed/);
    assert.ok(!response.body.includes('private diagnostics'));
  } finally {
    global.fetch = previous.fetch;
    if (previous.key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previous.key;
    if (previous.prompt === undefined) delete process.env.SYSTEM_PROMPT; else process.env.SYSTEM_PROMPT = previous.prompt;
  }
});
