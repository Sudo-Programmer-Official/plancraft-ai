const OPENAI_ENDPOINT = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_REPLY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const tonePrompts = {
  friendly: 'friendly and encouraging',
  concise: 'short, to-the-point',
  formal: 'professional and formal',
  upbeat: 'positive and high-energy',
};

function fallbackReplies({ lastMessage, tone = 'friendly' }) {
  const base = lastMessage || 'Thanks for the update!';
  const variations = [
    `${base} Appreciate the quick sync.`,
    `Sounds good. Let's keep moving.`,
    `Noted. I'll follow up shortly.`,
  ];
  if (tone === 'formal') return [`Understood. Thank you for the update.`];
  if (tone === 'concise') return [`Acknowledged.`];
  if (tone === 'upbeat') return [`Awesome! Let's keep the momentum going.`];
  return variations;
}

export async function suggestReplies({ transcript, lastMessage, tone = 'friendly' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { suggestions: fallbackReplies({ lastMessage, tone }), model: null };
  }

  try {
    const prompt = `You are helping a user respond in a team chat.
Provide three ${tonePrompts[tone] || 'friendly'} reply suggestions based on the conversation context.
Each reply should be a single sentence and actionable when possible.

Context (latest messages last):
"""
${transcript.slice(-1500)}
"""

Return replies as numbered list.`;

    const res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You draft concise reply suggestions for team chats.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[suggestReplies] OpenAI error', res.status, text);
      return { suggestions: fallbackReplies({ lastMessage, tone }), model: null };
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content || '';
    const suggestions = content
      .split('\n')
      .map((line) => line.replace(/^\d+[\).\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return { suggestions: suggestions.length ? suggestions : fallbackReplies({ lastMessage, tone }), model: OPENAI_MODEL };
  } catch (err) {
    console.error('[suggestReplies] error', err);
    return { suggestions: fallbackReplies({ lastMessage, tone }), model: null };
  }
}

export default suggestReplies;
