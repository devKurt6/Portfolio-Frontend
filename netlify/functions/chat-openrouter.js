exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const SYSTEM_PROMPT      = process.env.SYSTEM_PROMPT;

  const { question, history = [] } = JSON.parse(event.body);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://kurt-profile.netlify.app/', // replace with your actual URL
        'X-Title': 'My Portfolio'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          ...history,
        ]
      })
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: `Sorry, I'm having trouble responding right now. Please try again later.`
      };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: reply
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: `Sorry, something went wrong. Please try again later.`
    };
  }
};