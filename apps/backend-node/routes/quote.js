// import express from "express";
// import { getQuoteFromIdea } from "../services/openaiService.js";

// const router = express.Router();

// router.post("/", async (req, res) => {

//   const { idea } = req.body;
//   if (!idea) return res.status(400).json({ error: "Idea is required" });

//   try {
//     const result = await getQuoteFromIdea(idea);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;
import express from "express";
import { getQuoteFromIdea } from "../services/openaiService.js";

const router = express.Router();

// Preflight handler
router.options("/", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "https://www.prompt2quote.com", // Replace with your frontend domain in prod
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  });
  res.sendStatus(204);
});

router.post("/", async (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "https://www.prompt2quote.com", // Replace with your frontend domain
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  const { idea } = req.body;
  if (!idea) return res.status(400).json({ error: "Idea is required" });

  try {
    const result = await getQuoteFromIdea(idea);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
