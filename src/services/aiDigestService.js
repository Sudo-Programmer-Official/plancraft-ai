const OPENAI_COMPLETIONS_ENDPOINT =
  process.env.OPENAI_COMPLETIONS_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const OPENAI_DIGEST_MODEL = process.env.OPENAI_DIGEST_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function callOpenAI({ model, messages }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      choices: [
        {
          message: {
            content: 'OpenAI API key missing. Configure OPENAI_API_KEY to enable digests.',
          },
        },
      ],
    };
  }

  const response = await fetch(OPENAI_COMPLETIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI digest error: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function generateAIDigest(items = [], period = 'weekly') {
  const snippets = items
    .slice(0, 20)
    .map((item) => {
      const type = item.type || 'note';
      const text = item.searchText || item.summary || item.content || '';
      const truncated = text.length > 200 ? `${text.slice(0, 197)}…` : text;
      return `• [${type}] ${truncated}`;
    })
    .join('\n');

  const prompt = [
    {
      role: 'system',
      content:
        'You are an assistant generating concise organizational summaries highlighting themes, decisions, and blockers.',
    },
    {
      role: 'user',
      content: `Create a ${period} digest highlighting the top insights, decisions, and risks based on the following context:\n${snippets}`,
    },
  ];

  try {
    const completion = await callOpenAI({ model: OPENAI_DIGEST_MODEL, messages: prompt });
    return completion?.choices?.[0]?.message?.content?.trim() || 'No summary generated.';
  } catch (err) {
    console.error('[aiDigestService] failed to generate digest', err);
    return 'Digest generation unavailable.';
  }
}

export async function generateWeeklyReport({ items = [], analytics = null }) {
  const digest = await generateAIDigest(items, 'weekly');
  const headline = digest.split('\n').find((line) => line.trim().length) || 'Weekly activity recap';

  const stats = analytics?.totals || {};
  const since = analytics?.since ? new Date(analytics.since) : null;
  const subjectDate = since ? since.toLocaleDateString() : 'this week';

  const card = {
    title: 'Weekly Activity Report',
    headline,
    summary: digest,
    stats,
  };

  return {
    subject: `PlanCraft Teams — Weekly summary (${subjectDate})`,
    preview: headline,
    body: digest,
    card,
  };
}

export default {
  generateAIDigest,
  generateWeeklyReport,
};
