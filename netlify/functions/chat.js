exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NGROK_URL = process.env.NGROK_URL; // hidden env variable on Netlify

  try {
    const response = await fetch(`${NGROK_URL}/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body
    });

    const text = await response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};