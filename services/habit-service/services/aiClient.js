import axios from "axios";

export async function sendCoachPrompt(prompt, { userId }) {
  const endpoint = process.env.AI_ENDPOINT;
  const apiKey = process.env.AI_API_KEY;
  if (!endpoint || !apiKey) {
    return { message: fallbackMessage(prompt), model: "fallback" };
  }

  const res = await axios.post(
    endpoint,
    { prompt, userId },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 }
  );
  return res.data;
}

function fallbackMessage(prompt) {
  return `Coach stub: ${prompt.slice(0, 200)}`;
}
