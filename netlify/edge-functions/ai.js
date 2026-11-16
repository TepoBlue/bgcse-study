// Netlify Edge Function: keeps the Hugging Face token on the server.
// Set in Netlify > Site configuration > Environment variables:
//   HF_TOKEN  (required)  your NEW Hugging Face token
//   HF_MODEL  (optional)  defaults to the model below

const API_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";
const TIMEOUT_MS = 38000;

const send = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (request) => {
  // TEMPORARY CHECK: open /api/ai?check=1 in the browser to see why AI fails.
  // It never shows your token. Remove this block once Notes works.
  if (request.method === "GET" && new URL(request.url).searchParams.get("check") === "1") {
    const tk = Netlify.env.get("HF_TOKEN");
    const mdl = Netlify.env.get("HF_MODEL") || DEFAULT_MODEL;
    const out = { token_set: !!tk, token_starts_with_hf: !!tk && tk.startsWith("hf_"), model: mdl };
    if (!tk) return send(200, out);
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" },
        body: JSON.stringify({ model: mdl, messages: [{ role: "user", content: "Say hi" }], max_tokens: 5 }),
      });
      out.hf_status = r.status;
      out.hf_reply = (await r.text()).slice(0, 300);
    } catch (e) {
      out.hf_status = "request_failed";
      out.hf_reply = String(e && e.message ? e.message : e).slice(0, 300);
    }
    return send(200, out);
  }

  if (request.method !== "POST") return send(405, { error: "method_not_allowed" });

  // Only allow calls coming from this site, so strangers cannot use your token.
  const here = new URL(request.url).host;
  const from = request.headers.get("origin") || request.headers.get("referer") || "";
  let fromHost = "";
  try { fromHost = new URL(from).host; } catch (e) { fromHost = ""; }
  if (fromHost !== here) return send(403, { error: "forbidden" });

  const token = Netlify.env.get("HF_TOKEN");
  if (!token) return send(500, { error: "server_not_configured" });
  const model = Netlify.env.get("HF_MODEL") || DEFAULT_MODEL;

  let data;
  try { data = await request.json(); } catch (e) { return send(400, { error: "bad_request" }); }

  const prompt = String(data.prompt || "");
  const system = String(data.system || "");
  if (!prompt || prompt.length > 8000 || system.length > 4000) {
    return send(400, { error: "bad_request" });
  }
  const maxTokens = Math.min(Math.max(parseInt(data.max_tokens, 10) || 900, 100), 1500);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.5,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.log(JSON.stringify({ event: "hf_error", status: res.status }));
      const busy = res.status === 429 || res.status === 503;
      return send(busy ? 503 : 502, { error: busy ? "busy_try_again" : "ai_failed" });
    }

    const json = await res.json();
    const text =
      json && json.choices && json.choices[0] && json.choices[0].message
        ? String(json.choices[0].message.content || "").trim()
        : "";
    if (!text) return send(502, { error: "empty_reply" });

    console.log(JSON.stringify({ event: "ai_ok" })); // count these in Netlify logs = real usage
    return send(200, { text: text });
  } catch (e) {
    const timedOut = e && e.name === "AbortError";
    return send(timedOut ? 504 : 500, { error: timedOut ? "timeout" : "server_error" });
  } finally {
    clearTimeout(timer);
  }
};

export const config = { path: "/api/ai" };
