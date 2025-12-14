import { embedText } from './embeddings.js'

const FALLBACK_INTENT = 'plan'

// Simple heuristic intent classifier; can be swapped with LLM if needed
export async function classifyIntent(text = '', source = 'planner') {
  const value = (text || '').toLowerCase()
  if (source === 'journal') return 'reflect'
  if (source === 'scan') return 'scan_followup'
  if (/requirement|acceptance criteria|spec|prd|turn .*into tasks/i.test(value)) return 'req_to_tasks'
  if (/impact|change|breaks|regression|risk|delta/i.test(value)) return 'change_impact'
  if (/remember|recall|where did|did we/i.test(value)) return 'recall'
  if (/what should i do|plan my day|priority|focus/i.test(value)) return 'plan'
  if (/create|add|make|schedule/i.test(value)) return 'create'
  if (/status|progress|update/i.test(value)) return 'status'
  if (/team|manager|blocker|who/i.test(value)) return 'team'
  if (/why|clarify|what do you mean/i.test(value)) return 'clarify'
  return FALLBACK_INTENT
}

export function buildOrchestrationPrompt({ intent, source, inputText, context, memory, knowledge }) {
  const systemPrompt = [
    'You are PlanCraft AI Planner. You are the single brain; do not defer to other bots.',
    'Use workspace context and optional memory to reason.',
    'Return a JSON object with: { "message": string, "summary": string, "followUps": string[], "decision": { "responseType": "message"|"proposal"|"action", "actions": [{ "type": "...", "payload": {...}, "confidence": number }] } }',
    'Only propose actions you can explain. Auto-execute only if confidence > 0.8.',
    'Never hallucinate data; reference only provided context/memory.',
  ].join('\n')

  const tasksSection = [
    'Tasks:',
    ...(context.tasks?.overdue || []).map((t) => `- [overdue] ${t.title}`),
    ...(context.tasks?.open || []).map((t) => `- [open] ${t.title}`),
    ...(context.tasks?.upcoming || []).map((t) => `- [upcoming] ${t.title}`),
  ].join('\n')

  const eventsSection = (context.events || [])
    .map((e) => `- ${e.title} (${e.dateStr || e.date || ''})`)
    .join('\n')

  const issuesSection = (context.issues || []).map((i) => `- ${i.title}`).join('\n')

  const memorySection = (memory || [])
    .map((m) => `- [${m.type}] ${m.title || m.preview}`)
    .join('\n')

  const knowledgeSection = (knowledge || [])
    .map((k, idx) => {
      const snippet = String(k.text || '').slice(0, 600)
      const prefix = k.metadata?.heading ? `${k.metadata.heading}: ` : ''
      return `- [${idx + 1}] ${prefix}${snippet}`
    })
    .join('\n')

  const userPrompt = [
    `Intent: ${intent}`,
    `Source: ${source}`,
    '',
    `User Input: ${inputText || '[voice input]'}`,
    '',
    `Workspace Type: ${context.workspaceType || 'personal'}`,
    `Workspace Name: ${context.workspaceName || 'Workspace'}`,
    `Description: ${context.description || 'n/a'}`,
    '',
    tasksSection,
    '',
    'Events:',
    eventsSection || 'none',
    '',
    'Issues:',
    issuesSection || 'none',
    '',
    'Relevant Workspace Memory:',
    memorySection || 'none',
    '',
    'Relevant knowledge snippets:',
    knowledgeSection || 'none',
    '',
    'Respond with JSON only. Do not include markdown. Keep message concise and actionable.',
  ].join('\n')

  return { systemPrompt, userPrompt }
}

export function parseDecision(text) {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      const slice = text.slice(start, end + 1)
      const parsed = JSON.parse(slice)
      return parsed
    }
  } catch {}
  return { message: text, decision: { responseType: 'message' } }
}
