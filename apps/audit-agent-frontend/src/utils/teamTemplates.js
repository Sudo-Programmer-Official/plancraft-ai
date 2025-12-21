export const TEAM_TEMPLATES = [
  {
    key: 'startup-sprint',
    title: 'Startup Sprint',
    description: 'Align on a sprint goal, owners, and a mid-week check-in.',
    recommended: true,
    tasks: [
      {
        title: 'Define this sprint goal + success metric',
        details: 'Write the 1-line outcome and how we’ll measure it.',
        category: 'Planning',
      },
      {
        title: 'Assign owners for top 3 priorities',
        details: 'Tag owners and due dates so follow-ups stay clear.',
        category: 'Collaboration',
      },
      {
        title: 'Schedule a mid-week checkpoint',
        details: 'Drop a 15-minute sync to unblock the team early.',
        category: 'Meetings',
      },
      {
        title: 'Enable Voice AI nudges for blockers',
        details: 'Let Voice AI remind owners and capture quick updates.',
        category: 'Reminders',
      },
    ],
  },
  {
    key: 'content-team',
    title: 'Content Team',
    description: 'Plan a calm content cadence with clear owners.',
    tasks: [
      {
        title: 'Publish this week’s content calendar',
        details: 'List posts, channels, and owners for the week.',
        category: 'Planning',
      },
      {
        title: 'Draft outline for the next long-form piece',
        details: 'Add talking points and sources before writing.',
        category: 'Writing',
      },
      {
        title: 'Assign editor + due dates',
        details: 'Give edit/approval dates so publishing stays smooth.',
        category: 'Collaboration',
      },
      {
        title: 'Voice AI reminders for follow-ups',
        details: 'Set nudges for drafts, visuals, and final QA.',
        category: 'Reminders',
      },
    ],
  },
  {
    key: 'personal-team',
    title: 'Personal + Team',
    description: 'Blend your personal focus with team visibility.',
    tasks: [
      {
        title: 'Share today’s top 3 priorities',
        details: 'Make them visible to your team for quick alignment.',
        category: 'Planning',
      },
      {
        title: 'Sync calendar to this workspace',
        details: 'Import meetings to keep prep tasks linked.',
        category: 'Calendar',
      },
      {
        title: 'Add two personal tasks to the team board',
        details: 'Keep focus items visible without over-sharing.',
        category: 'Focus',
      },
      {
        title: 'Evening recap reminder',
        details: 'Let Voice AI capture progress and nudge next steps.',
        category: 'Reflection',
      },
    ],
  },
]

export const EMPTY_TEMPLATE = {
  key: 'empty',
  title: 'Start empty',
  description: 'Create your workspace with no starter tasks.',
  tasks: [],
}

export function findTeamTemplate(key) {
  return TEAM_TEMPLATES.find((t) => t.key === key) || null
}
