import express from "express";
import { extractTextFromUrl } from "../utils/responseFormatter.js";
import { getQuoteFromIdea } from "../services/openaiService.js";

const router = express.Router();

const allowedOrigins = [
  "https://www.prompt2quote.com",
  "https://prompt2quote.com",
  "http://localhost:5173",
];

// CORS preflight
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

// POST: Upload + Extract + Generate Quote
router.post("/", async (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  try {
    const { fileUrl, idea } = req.body;
    if (!fileUrl || !idea) {
      return res
        .status(400)
        .json({ error: "Both fileUrl and idea are required" });
    }

    // Extract text from file
    const fileText = await extractTextFromUrl(fileUrl);

    // Merge into final prompt
    const fullPrompt = `${idea}\n\nAdditional context from file:\n${fileText}`;

    // Get quote from OpenAI
    const quote = await getQuoteFromIdea(fullPrompt);

    res.status(200).json({
      fileUrl,
      extractedText: fileText,
      quote,
    });
  } catch (err) {
    console.error("Upload + Quote error:", err);
    res.status(500).json({ error: "Failed to process upload and quote" });
  }
});

export default router;
