// Voice → structured tasks orchestration using OpenAI (with fallback)

const OPENAI_ENDPOINT = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function buildPrompt({ transcript, summary }) {
  const context = summary || transcript;
  return `You are PlanCraftAI's meeting analyst. Convert the transcript into actionable tasks.

Return JSON with this exact shape:
{
  "tasks": [
    {
      "title": string,
      "description": string,
      "assignees": string[],
      "status": "todo" | "in_progress" | "blocked" | "done",
      "priority": "low" | "medium" | "high",
      "due": ISO8601 string | null
    }
  ]
}

Transcript:
"""
${context}
"""`;
}

function fallbackTasks({ summary, transcript }) {
  return [
    {
      title: 'Review meeting notes',
      description: summary || transcript?.slice(0, 280) || '',
      status: 'todo',
      priority: 'medium',
      assignees: [],
      due: null,
      source: 'voice',
    },
  ];
}

export async function voiceToTasks({ transcript, summary, orgId }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const content = summary || transcript;
  if (!content) return [];

  if (!apiKey) {
    console.warn('[voiceToTasks] OPENAI_API_KEY missing — returning fallback task.');
    return fallbackTasks({ transcript, summary });
  }

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You convert meetings into actionable tasks.' },
          { role: 'user', content: buildPrompt({ transcript, summary }) },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[voiceToTasks] OpenAI API error', response.status, errorText);
      return fallbackTasks({ transcript, summary });
    }

    const json = await response.json();
    const message = json?.choices?.[0]?.message?.content;
    if (!message) return fallbackTasks({ transcript, summary });

    const cleaned = message.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
    const parsed = JSON.parse(cleaned);
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    return tasks.map((task) => ({
      title: task.title,
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignees: task.assignees || [],
      due: task.due || null,
      source: 'voice',
    }));
  } catch (err) {
    console.error('[voiceToTasks] failed to call OpenAI', err);
    return fallbackTasks({ transcript, summary });
  }
}
