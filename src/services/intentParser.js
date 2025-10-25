const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_INTENT_MODEL || 'gpt-4o-mini';
const openAiEndpoint = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';

const STATUS_KEYWORDS = {
  completed: ['complete', 'completed', 'done', 'finished', 'wrapped'],
  pending: ['pending', 'todo', 'to do', 'open', 'start'],
  'in_progress': ['progress', 'in progress', 'working', 'wip'],
  blocked: ['blocked', 'stuck', 'cannot'],
};

function detectStatus(text) {
  const lower = text.toLowerCase();
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return status;
  }
  return null;
}

function extractTitle(text, intent) {
  const lower = text.toLowerCase();
  let cleaned = text;

  if (intent === 'create_task') {
    cleaned = cleaned.replace(/^(please\s+)?(add|create|make|new)\s+(a\s+)?task\b/i, '').trim();
    cleaned = cleaned.replace(/^(called|named)\s+/i, '').trim();
  } else if (intent === 'update_task' || intent === 'complete_task') {
    cleaned = cleaned.replace(/^(please\s+)?(update|mark|set|complete)\s+/i, '').trim();
    cleaned = cleaned.replace(/\b(to|as)\b.+$/i, '').trim();
  }

  if (!cleaned) return null;

  if (lower.includes('task')) {
    const afterTask = text.split(/task/i)[1];
    if (afterTask && afterTask.trim().length) return afterTask.trim();
  }

  return cleaned;
}

function parseProgress(text) {
  const match = text.match(/(\d{1,3})\s?%/);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  return Math.min(100, Math.max(0, value));
}

function matchHeuristic(text) {
  const lower = text.toLowerCase();

  if (/(add|create|new)\s+task/.test(lower)) {
    return {
      intent: 'create_task',
      data: {
        title: extractTitle(text, 'create_task'),
      },
      confidence: 0.6,
    };
  }

  if (/(update|edit|change|mark).+task/.test(lower) || /mark.+(done|complete)/.test(lower)) {
    return {
      intent: 'update_task',
      data: {
        title: extractTitle(text, 'update_task'),
        status: detectStatus(text),
        progress: parseProgress(text),
        note: text,
      },
      confidence: 0.55,
    };
  }

  if (/what('| i)?s.+(status|progress)/.test(lower) || /how.+going/.test(lower)) {
    return {
      intent: 'get_status',
      data: { scope: 'project' },
      confidence: 0.5,
    };
  }

  if (/what.+tasks/.test(lower) || /show.+tasks/.test(lower) || /list.+tasks/.test(lower)) {
    return {
      intent: 'get_tasks',
      data: { scope: 'project' },
      confidence: 0.5,
    };
  }

  return null;
}

function intentPrompt(text) {
  return `You are PlanCraftAI's workspace assistant. Interpret the user's voice command and output JSON with this shape:
{
  "intent": "create_task" | "update_task" | "get_tasks" | "get_status" | "unknown",
  "data": {
    "title"?: string,
    "status"?: "pending" | "in_progress" | "blocked" | "completed",
    "progress"?: number,
    "note"?: string,
    "scope"?: "project" | "team" | "user"
  }
}

Command: "${text}"`
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parseIntent(text) {
  if (!text || !text.trim()) return { intent: 'unknown', data: {}, confidence: 0 };

  const heuristic = matchHeuristic(text);
  if (heuristic && (!openAiApiKey || heuristic.confidence >= 0.7)) {
    return heuristic;
  }

  if (!openAiApiKey) {
    return heuristic || { intent: 'unknown', data: {}, confidence: 0 };
  }

  try {
    const response = await fetch(openAiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You strictly output machine-readable JSON without additional commentary.',
          },
          { role: 'user', content: intentPrompt(text) },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parseIntent] OpenAI error', response.status, errorText);
      return heuristic || { intent: 'unknown', data: {}, confidence: 0 };
    }

    const json = await response.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) {
      return heuristic || { intent: 'unknown', data: {}, confidence: 0 };
    }
    const parsed = JSON.parse(raw);
    return {
      intent: parsed.intent || 'unknown',
      data: parsed.data || {},
      confidence: 0.85,
    };
  } catch (err) {
    console.error('[parseIntent] LLM fallback failed', err);
    return heuristic || { intent: 'unknown', data: {}, confidence: 0 };
  }
}

export default parseIntent;
