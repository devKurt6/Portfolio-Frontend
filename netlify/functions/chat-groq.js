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

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;

  const { question, history = [] } = JSON.parse(event.body);

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

      const error = await response.text();

      console.error(error);

      return {
        statusCode: 500,
        body: "Sorry, I'm having trouble responding right now. Please try again later."
      };

    }

    const data = await response.json();

    const reply = data.choices[0].message.content;

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