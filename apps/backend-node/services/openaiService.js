import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getQuoteFromIdea(idea) {
  //   const prompt = `
  // You are a senior software architect. Given the idea: "${idea}", return the following:
  // - Tech Stack (frontend + backend)
  // - Estimated Timeline (in weeks)
  // - Ballpark Cost (in USD)

  // Respond in JSON like:
  // {
  //   "stack": "Next.js + Node.js + MongoDB",
  //   "timeline": "4-6 weeks",
  //   "estimate": "$4,000 - $7,000"
  // }
  // `;
  const prompt = `
  You are a senior software architect and product strategist.

  Given the startup idea: "${idea}", generate a high-level feasibility report in JSON format.

  Respond with:
  {
    "stack": "Frontend + Backend + Database + Optional Infra",
    "timeline": "X-Y weeks",
    "estimate": "USD $X - $Y",
    "features": ["Feature 1", "Feature 2", "Optional Feature 3"],
    "marketInsight": "Short insight on the app's relevance in today’s market.",
    "notes": "Any assumptions or edge considerations."
  }

  Be concise but useful. Respond only with valid JSON.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful and highly experienced AI software consultant.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
  });

  const message = response.choices[0].message.content;
  return JSON.parse(message);
}
