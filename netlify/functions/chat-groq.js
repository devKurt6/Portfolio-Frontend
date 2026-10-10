const fs = require("fs");
const path = require("path");

async function retrieveContext(question) {
  const folder = path.join(process.cwd(), "portfolio");

  let context = "";

  if (!fs.existsSync(folder)) {
    return "";
  }

  const files = fs.readdirSync(folder);

  for (const file of files) {
    const fullPath = path.join(folder, file);

    try {
      if (file.endsWith(".json")) {
        const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));

        context += `\n===== ${file} =====\n`;
        context += JSON.stringify(json, null, 2);
        context += "\n";
      }

      if (file.endsWith(".txt")) {
        context += `\n===== ${file} =====\n`;
        context += fs.readFileSync(fullPath, "utf8");
        context += "\n";
      }

    } catch (err) {
      console.error(`Error reading ${file}:`, err);
    }
  }

  return context;
}

exports.handler = async function (event) {

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
  const SYSTEM_PROMPT = (process.env.SYSTEM_PROMPT || '').trim() ||
    "You are Kurt Decena's portfolio assistant. Answer using the provided portfolio information. Do not invent experience or project details. If information is unavailable, say so. Keep answers helpful and concise.";

  if (!GROQ_API_KEY) {
    return { statusCode: 503, body: 'Chat is not configured. Set GROQ_API_KEY in the Netlify Functions environment and redeploy.' };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Send a valid chat message.' }; }
  if (!payload || typeof payload.question !== 'string' || !payload.question.trim() || payload.question.length > 2000) {
    return { statusCode: 400, body: 'Write a message of 1–2000 characters.' };
  }
  const question = payload.question.trim();
  const history = Array.isArray(payload.history) ? payload.history.slice(-20).filter(item =>
    item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string' && item.content.length <= 4000
  ).map(item => ({ role: item.role, content: item.content })) : [];
  if (history.at(-1)?.role !== 'user' || history.at(-1)?.content !== question) history.push({ role: 'user', content: question });

  // Load portfolio data
  const context = await retrieveContext(question);

  try {

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },

        body: JSON.stringify({

          model: "openai/gpt-oss-120b",

          messages: [

            {
              role: "system",
              content: SYSTEM_PROMPT
            },

            {
              role: "system",
              content:
`Use the following portfolio information when answering.

${context}`
            },

            ...history

          ]

        })

      }
    );

    if (!response.ok) {

      console.error('Groq request failed with HTTP status:', response.status);

      return {
        statusCode: response.status === 429 ? 429 : 502,
        body: response.status === 401 ? 'Groq authentication failed. Check the GROQ_API_KEY in Netlify and redeploy.' :
          response.status === 429 ? 'The AI service has reached its usage limit. Please try again later.' :
          response.status === 400 || response.status === 403 || response.status === 404 ? 'The AI provider rejected the request. Check the Groq model access and Netlify function logs.' :
          "The AI service is temporarily unavailable. Please try again later."
      };

    }

    const data = await response.json();

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('Missing assistant response');

    return {

      statusCode: 200,

      headers: {
        "Content-Type": "text/plain"
      },

      body: reply

    };

  } catch (err) {

    console.error(err);

    return {

      statusCode: 500,

      body: "Sorry, something went wrong. Please try again later."

    };

  }

};
