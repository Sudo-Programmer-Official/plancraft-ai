export const marketingPages = [
  {
    path: '/',
    label: 'Home',
    changefreq: 'daily',
    priority: 1.0,
    keywords: ['PlanCraftAI', 'AI task planner', 'AI daily planner', 'voice reminder app'],
  },
  {
    path: '/features',
    label: 'Features',
    changefreq: 'weekly',
    priority: 0.92,
    keywords: ['AI task planner features', 'AI daily planner', 'voice reminder app features'],
  },
  {
    path: '/ai-task-planner',
    label: 'AI Task Planner',
    changefreq: 'weekly',
    priority: 0.91,
    keywords: ['AI task planner', 'AI daily planner', 'voice task planner'],
  },
  {
    path: '/ai-daily-planner',
    label: 'AI Daily Planner',
    changefreq: 'weekly',
    priority: 0.9,
    keywords: ['AI daily planner', 'daily planner AI', 'AI planner app'],
  },
  {
    path: '/voice-planning',
    label: 'Voice Planning',
    changefreq: 'weekly',
    priority: 0.9,
    keywords: ['voice planning', 'AI daily planner', 'voice journaling assistant'],
  },
  {
    path: '/voice-reminder-app',
    label: 'Voice Reminder App',
    changefreq: 'weekly',
    priority: 0.89,
    keywords: ['voice reminder app', 'spoken reminder app', 'voice reminder app for tasks'],
  },
  {
    path: '/ai-reminders',
    label: 'AI Reminders',
    changefreq: 'weekly',
    priority: 0.88,
    keywords: ['AI reminders', 'smart reminders', 'habit prompts'],
  },
  {
    path: '/recurring-reminder-app',
    label: 'Recurring Reminder App',
    changefreq: 'weekly',
    priority: 0.87,
    keywords: ['recurring reminder app', 'repeating reminders app', 'daily reminder app'],
  },
  {
    path: '/google-calendar-integration',
    label: 'Google Calendar Integration',
    changefreq: 'weekly',
    priority: 0.88,
    keywords: ['Google Calendar integration', 'calendar sync', 'AI meeting planner'],
  },
  {
    path: '/blog',
    label: 'Blog',
    changefreq: 'daily',
    priority: 0.86,
    keywords: ['AI productivity guides', 'PlanCraft blog'],
  },
  {
    path: '/pricing',
    label: 'Pricing',
    changefreq: 'monthly',
    priority: 0.8,
    keywords: ['PlanCraft pricing', 'AI planner plans'],
  },
  {
    path: '/contact',
    label: 'Contact',
    changefreq: 'monthly',
    priority: 0.6,
    keywords: ['contact PlanCraft', 'support'],
  },
  {
    path: '/privacy',
    label: 'Privacy Policy',
    changefreq: 'yearly',
    priority: 0.4,
  },
  {
    path: '/terms',
    label: 'Terms of Service',
    changefreq: 'yearly',
    priority: 0.4,
  },
  {
    path: '/delete-account',
    label: 'Delete Account',
    changefreq: 'yearly',
    priority: 0.4,
  },
  {
    path: '/help',
    label: 'Help Center',
    changefreq: 'monthly',
    priority: 0.5,
  },
]

export const restrictedPaths = [
  '/login',
  '/signup',
  '/billing/upgrade',
  '/dashboard',
  '/daily',
  '/weekly',
  '/monthly',
  '/today',
  '/planner',
  '/timeline',
  '/journal',
  '/habits',
  '/reports',
  '/settings',
  '/subscription',
  '/talk-to-planner',
  '/reminders',
  '/admin',
  '/app',
  '/profile',
  '/creator',
  '/leader',
  '/workspaces',
  '/workspaces/new',
]

export function getMarketingRoutes() {
  return marketingPages.map((item) => ({ ...item }))
}

export function getRestrictedPaths() {
  return [...new Set(restrictedPaths)]
}
