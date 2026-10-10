exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_API_KEY  = process.env.GROQ_API_KEY;
  const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;
  const PORTFOLIO_URL = process.env.PORTFOLIO_URL; // your netlify URL

  const { question, history = [] } = JSON.parse(event.body);

  // ✅ Fetch your own portfolio page content
  let siteContext = '';
  try {
    const siteRes = await fetch(PORTFOLIO_URL);
    const html = await siteRes.text();

    // Strip HTML tags to get plain text
    siteContext = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000); // limit to 3000 chars
  } catch (e) {
    siteContext = '';
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}
            
            --- PORTFOLIO WEBSITE CONTENT ---
            ${siteContext}
            ---------------------------------
            
            Use the above website content to answer questions about 
            where to find things on Kurt's portfolio.`
          },
          ...history,
        ]
      })
    });

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
