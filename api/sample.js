module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt, modelTier } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GROQ_API_KEY — add it in Vercel's Environment Variables settings." });
    return;
  }

  const model = modelTier === "complex" ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 400,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      console.error("Groq error", groqRes.status, errText);
      res.status(groqRes.status === 429 ? 429 : 502).json({
        error: "AI request failed",
        debug_status: groqRes.status,
        debug_body: errText,
      });
      return;
    }

    const data = await groqRes.json();
    const text = data?.choices?.[0]?.message?.content || "";
    res.status(200).json({ text, truncated: false });
  } catch (e) {
    console.error("sample.js exception", e);
    res.status(502).json({ error: "AI request failed", debug_message: String(e) });
  }
};
