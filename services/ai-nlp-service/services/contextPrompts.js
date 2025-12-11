function formatTasksSection(tasksObj = {}) {
  const lines = []
  if (tasksObj.overdue?.length) {
    lines.push('Overdue:')
    tasksObj.overdue.forEach((t) =>
      lines.push(`- [${t.category || 'Other'}] ${t.title}${t.dueDate ? ` (due ${t.dueDateStr || t.dueDate})` : ''}`),
    )
  }
  if (tasksObj.open?.length) {
    lines.push('Open / Today:')
    tasksObj.open.forEach((t) =>
      lines.push(`- [${t.category || 'Other'}] ${t.title}${t.dueDate ? ` (due ${t.dueDateStr || t.dueDate})` : ''}`),
    )
  }
  if (tasksObj.upcoming?.length) {
    lines.push('Upcoming:')
    tasksObj.upcoming.forEach((t) =>
      lines.push(`- [${t.category || 'Other'}] ${t.title}${t.dueDate ? ` (due ${t.dueDateStr || t.dueDate})` : ''}`),
    )
  }
  return lines.join('\n')
}

function formatNotesSection(notes = []) {
  if (!notes?.length) return 'None logged recently.'
  return notes
    .map((n) => `- ${n.text}${n.tags?.length ? ` (#${n.tags.slice(0, 3).join(', #')})` : ''}`)
    .join('\n')
}

function formatDraftsSection(drafts = []) {
  if (!drafts?.length) return 'No active drafts.'
  return drafts
    .map((d) => `- ${d.title}${d.status === 'scheduled' && d.scheduledAtStr ? ` (scheduled ${d.scheduledAtStr})` : ''}`)
    .join('\n')
}

function formatEventsIssuesSection(events = [], issues = []) {
  const parts = []
  if (events?.length) {
    parts.push('Upcoming events:')
    events.forEach((e) => parts.push(`- ${e.title}${e.dateStr ? ` on ${e.dateStr}` : ''}`))
  }
  if (issues?.length) {
    parts.push('Open issues:')
    issues.forEach((i) => parts.push(`- ${i.title}${i.status ? ` [${i.status}]` : ''}`))
  }
  return parts.length ? parts.join('\n') : 'No upcoming events or open issues.'
}

export function buildWorkspaceSummaryPrompt(context, userQuestion) {
  const { workspaceName, workspaceType, description, tasks, napkin, drafts, events, issues } = context

  const tasksSection = formatTasksSection(tasks || {})
  const notesSection = formatNotesSection(napkin || [])
  const draftsSection = formatDraftsSection(drafts || [])
  const eventsIssuesSection = formatEventsIssuesSection(events || [], issues || [])
  const question = userQuestion?.trim() || 'Help me understand what to focus on next.'
  const memorySection =
    Array.isArray(context.memoryHits) && context.memoryHits.length
      ? 'Most relevant past items:\n' +
        context.memoryHits
          .map(
            (m) =>
              `- [${(m.type || 'item').toUpperCase()}] ${m.title || m.preview || ''}${m.createdAt ? ` (${m.createdAt})` : ''}`,
          )
          .join('\n')
      : null

  const prompt = `
You are an assistant helping the user plan and understand their current workspace.

Workspace:
- Name: ${workspaceName || 'Untitled'}
- Type: ${workspaceType || 'personal'}
- Description: ${description || 'Not provided.'}

Current tasks:
${tasksSection}

Recent notes and napkin ideas:
${notesSection}

Creator drafts:
${draftsSection}

Events and issues:
${eventsIssuesSection}

${memorySection ? `${memorySection}\n` : ''}

User question:
"${question}"

Instructions:
- Start with a 2–3 sentence overview of where things stand in this workspace.
- Then list 3–6 concrete next actions, grouped by theme (e.g., "Deep work", "Admin", "Relationships").
- Reference specific tasks, notes, drafts, or events when useful.
- Keep the tone encouraging, practical, and concise.
`.trim()

  return { systemPrompt: 'You are a focused, concise assistant.', userPrompt: prompt }
}

function formatContentSeedsSection(context = {}) {
  const lines = []

  if (context.drafts?.length) {
    lines.push('Existing drafts and topics:')
    context.drafts.forEach((d) => {
      lines.push(`- ${d.title}${d.summary ? ` — ${d.summary}` : ''}`)
    })
  }

  const contentNotes = (context.napkin || []).filter((n) =>
    (n.tags || []).some((t) => ['idea', 'content', 'post', 'hook'].includes((t || '').toLowerCase())),
  )

  if (contentNotes.length) {
    lines.push('Recent content-related notes:')
    contentNotes.forEach((n) => lines.push(`- ${n.text}`))
  }

  return lines.length ? lines.join('\n') : 'No strong content seeds yet.'
}

export function buildWorkspaceInspirationPrompt(context, options = {}) {
  const { workspaceName, workspaceType, description } = context
  const count = options.count || 6
  const seedsSection = formatContentSeedsSection(context)
  const memorySection =
    Array.isArray(context.memoryHits) && context.memoryHits.length
      ? 'Relevant past items:\n' +
        context.memoryHits
          .map((m) => `- [${(m.type || 'item').toUpperCase()}] ${m.title || m.preview || ''}`)
          .join('\n')
      : null

  const prompt = `
You are an expert content strategist helping the user create content for this workspace.

Workspace:
- Name: ${workspaceName || 'Untitled'}
- Type: ${workspaceType || 'creator'}
- Description: ${description || 'Not provided.'}

Here are their current drafts and ideas:
${seedsSection}

${memorySection ? `${memorySection}\n` : ''}

Task:
Generate ${count} specific content ideas tailored to this workspace. Vary formats (short post, thread, reel, email, etc.) when appropriate.

For each idea, respond as JSON with this shape:
{
  "title": "...",
  "summary": "...",
  "angle": "...",
  "suggestedPlatforms": ["instagram", "linkedin"],
  "hook": "..."
}

Guidelines:
- Make ideas concrete, not generic.
- Reuse and remix the existing drafts and notes.
- Match the tone to the workspace type (e.g., more analytical for "project", more educational for "student", more vulnerable/story-driven for "personal" and "creator").
`.trim()

  return { systemPrompt: 'You are a sharp, concise content strategist.', userPrompt: prompt }
}

function extractJsonArray(text) {
  if (!text) return null
  try {
    const direct = JSON.parse(text)
    if (Array.isArray(direct)) return direct
  } catch {}
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const slice = text.slice(start, end + 1)
    const parsed = JSON.parse(slice)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return null
  }
  return null
}

export function parseIdeasOutput(raw, count = 5) {
  const ideas = []
  const parsed = extractJsonArray(raw)
  if (Array.isArray(parsed)) {
    parsed.forEach((item) => {
      if (!item) return
      ideas.push({
        title: item.title || item.name || 'Idea',
        summary: item.summary || item.description || '',
        suggestion: item.suggestion || item.angle || item.hook || '',
        platforms: Array.isArray(item.suggestedPlatforms)
          ? item.suggestedPlatforms
          : Array.isArray(item.platforms)
          ? item.platforms
          : typeof item.platform === 'string'
          ? [item.platform]
          : [],
      })
    })
  }

  if (!ideas.length && raw) {
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^[\\-\\*\\d\\.\\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, count)
    lines.forEach((line) => {
      ideas.push({
        title: line.split('. ')[0] || line,
        summary: line,
        suggestion: '',
        platforms: [],
      })
    })
  }

  return ideas.slice(0, count)
}
