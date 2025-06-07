import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getQuoteFromIdea(idea) {
  const prompt = `
You are a senior software architect. Given the idea: "${idea}", return the following:
- Tech Stack (frontend + backend)
- Estimated Timeline (in weeks)
- Ballpark Cost (in USD)

Respond in JSON like:
{
  "stack": "Next.js + Node.js + MongoDB",
  "timeline": "4-6 weeks",
  "estimate": "$4,000 - $7,000"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a startup technical advisor." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const message = response.choices[0].message.content;
  return JSON.parse(message);
}
