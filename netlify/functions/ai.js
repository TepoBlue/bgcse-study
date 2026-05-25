exports.handler = async function(event) {
  if(event.httpMethod !== "POST") return {statusCode:405, body:"Method Not Allowed"};

  try {
    const {prompt, system} = JSON.parse(event.body);
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://lucky-semolina-151d7b.netlify.app",
        "X-Title": "EduTee Tech BGCSE"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        max_tokens: 1200,
        messages: [
          {role:"system", content: system},
          {role:"user", content: prompt}
        ]
      })
    });
    const data = await r.json();
    if(data.error) throw new Error(data.error.message);
    const text = data.choices?.[0]?.message?.content || "";
    return {
      statusCode: 200,
      headers: {"Access-Control-Allow-Origin": "*"},
      body: JSON.stringify({text})
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: {"Access-Control-Allow-Origin": "*"},
      body: JSON.stringify({error: e.message})
    };
  }
};
