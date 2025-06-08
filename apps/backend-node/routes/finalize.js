import express from "express";
import { getQuoteFromIdea, getChatReply } from "../services/openaiService.js";
import { extractTextFromUrl } from "../utils/responseFormatter.js";

const router = express.Router();

const allowedOrigins = [
  "https://www.prompt2quote.com",
  "https://prompt2quote.com",
  "http://localhost:5173",
];

// CORS Preflight
router.options("/", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    });
  }
  res.sendStatus(204);
});

// Main Quote Generation
router.post("/", async (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  const { idea, fileUrl } = req.body;
  if (!idea) return res.status(400).json({ error: "Idea is required" });

  try {
    let fullPrompt = idea;

    if (fileUrl) {
      const fileText = await extractTextFromUrl(fileUrl);
      fullPrompt = `${idea}\n\nAdditional context from file:\n${fileText}`;
    }

    const result = await getQuoteFromIdea(fullPrompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🆕 Finalize Quote (Chat + Quote)
router.post("/finalize", async (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  const { quote, chatLog } = req.body;
  if (!quote || !Array.isArray(chatLog)) {
    return res.status(400).json({ error: "Quote and chatLog are required." });
  }

  try {
    const fullPrompt = `
You are an expert AI strategist. Summarize and finalize the following quote and conversation:

📦 Quote:
${JSON.stringify(quote, null, 2)}

💬 Chat Log:
${chatLog.map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n")}

Return a clean, valid JSON object with updated fields:
{
  "vision": "...",
  "stack": { "frontend": "...", "backend": "...", ... },
  "architecture": "...",
  "features": ["...", "..."],
  "timeline": "...",
  "estimate": "...",
  "marketInsight": "...",
  "notes": "...",
  "nextSteps": "..."
}
Only return JSON.
`.trim();

    const reply = await getChatReply(fullPrompt);
    const cleanJson = JSON.parse(reply.content);

    res.json(cleanJson);
  } catch (err) {
    console.error("❌ Finalize failed:", err);
    res.status(500).json({ error: "Failed to finalize quote." });
  }
});

export default router;
