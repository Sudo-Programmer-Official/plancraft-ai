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
  // const prompt = `
  // You are a senior software architect and product strategist.

  // Given the startup idea: "${idea}", generate a high-level feasibility report in JSON format.

  // Respond with:
  // {
  //   "stack": "Frontend + Backend + Database + Optional Infra",
  //   "timeline": "X-Y weeks",
  //   "estimate": "USD $X - $Y",
  //   "features": ["Feature 1", "Feature 2", "Optional Feature 3"],
  //   "marketInsight": "Short insight on the app's relevance in today’s market.",
  //   "notes": "Any assumptions or edge considerations."
  // }

  // Be concise but useful. Respond only with valid JSON.
  // `;
  const prompt = `
  You are a senior AI software strategist.

  Given the startup idea: "${idea}", generate a high-level project report in JSON format with the following sections:

  {
    "vision": "Brief summary of what this product is and who it’s for",
    "stack": "Recommended frontend, backend, database, infra",
    "architecture": "Optional high-level architectural breakdown (if applicable)",
    "features": ["List of MVP-level features"],
    "timeline": "Estimated delivery time (e.g. '6–10 weeks')",
    "estimate": "Estimated budget range in USD",
    "marketInsight": "Why this idea is relevant now",
    "notes": "Risks, assumptions, or dependencies",
    "nextSteps": "What should the user do next (e.g., refine features, build MVP, validate)"
  }

  Respond ONLY with valid JSON. Be concise but insightful.
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

export async function getChatReply(userPrompt, currentQuote = null) {
  const systemMessage = {
    role: "system",
    content:
      "You are a highly experienced AI consultant helping users refine software project estimates and features based on their feedback.",
  };

  const userMessage = {
    role: "user",
    content: `
Here is the current AI-generated quote:
${JSON.stringify(currentQuote, null, 2)}

The user says: ${userPrompt}

👉 If you're suggesting edits to stack, timeline, or estimate, please format like this:
🛠️ Suggested Stack Update: ...
⏱️ Updated Timeline: ...
💸 Revised Estimate: ...
🧩 Suggested Features: [Feature 1, Feature 2, ...]

Only include updates if applicable.
Respond concisely and clearly.
    `.trim(),
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [systemMessage, userMessage],
      temperature: 0.5,
    });

    const replyContent = response.choices[0].message.content;
    return { content: replyContent };
  } catch (error) {
    console.error("❌ GPT-4 Chat Reply Error:", error);
    return { content: "⚠️ Assistant failed. Please try again later." };
  }
}
