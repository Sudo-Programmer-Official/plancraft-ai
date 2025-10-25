const OPENAI_ENDPOINT = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

function fallbackSummary(text = '') {
  const lines = text.split(/\n|\.|!/).map((line) => line.trim()).filter(Boolean);
  const top = lines.slice(-3);
  return top.join('. ').slice(0, 480) || 'No major updates were detected in this chat window.';
}

export async function summarizeChat({ transcript, orgId, roomId }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!transcript || !transcript.trim()) {
    return {
      summary: '',
      bullets: [],
      model: null,
      info: 'Transcript empty',
    };
  }

  if (!apiKey) {
    const summary = fallbackSummary(transcript);
    return {
      summary,
      bullets: summary ? [`Summary generated without OpenAI for org ${orgId}`] : [],
      model: null,
    };
  }

  try {
    const prompt = `You are PlanCraftAI's chat summarizer.
Summarize the following team chat transcript in 3 concise bullet points highlighting decisions, blockers, and key action candidates.
Return the summary in Markdown bullet format. The transcript may include timestamps or emojis. Ignore chatter and focus on actionable insight.

Transcript:
"""
${transcript.slice(-6000)}
"""
`;

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You provide concise, action-oriented meeting summaries.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[summarizeChat] OpenAI error', response.status, text);
      const summary = fallbackSummary(transcript);
      return { summary, bullets: summary ? [summary] : [], model: null };
    }

    const json = await response.json();
    const message = json?.choices?.[0]?.message?.content?.trim();
    const bullets = (message || '')
      .split('\n')
      .map((line) => line.replace(/^[-\*]\s*/, '').trim())
      .filter(Boolean);

    return {
      summary: bullets.join('\n'),
      bullets,
      model: OPENAI_MODEL,
    };
  } catch (err) {
    console.error('[summarizeChat] error', err);
    const summary = fallbackSummary(transcript);
    return {
      summary,
      bullets: summary ? [summary] : [],
      model: null,
      error: err?.message || String(err),
    };
  }
}

export default summarizeChat;
