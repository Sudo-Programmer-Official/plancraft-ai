export const marketingPages = [
  {
    path: '/',
    label: 'Home',
    changefreq: 'daily',
    priority: 1.0,
    keywords: ['PlanCraft AI', 'AI task manager', 'voice journaling assistant'],
  },
  {
    path: '/features',
    label: 'Features',
    changefreq: 'weekly',
    priority: 0.92,
    keywords: ['AI productivity app features', 'AI task manager', 'smart planning'],
  },
  {
    path: '/voice-planning',
    label: 'Voice Planning',
    changefreq: 'weekly',
    priority: 0.9,
    keywords: ['voice planning', 'AI daily planner', 'voice journaling assistant'],
  },
  {
    path: '/ai-reminders',
    label: 'AI Reminders',
    changefreq: 'weekly',
    priority: 0.88,
    keywords: ['AI reminders', 'smart reminders', 'habit prompts'],
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
    path: '/privacy-policy',
    label: 'Privacy Policy Legacy',
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
    path: '/data-deletion',
    label: 'Data Deletion',
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
]

export function getMarketingRoutes() {
  return marketingPages.map((item) => ({ ...item }))
}

export function getRestrictedPaths() {
  return [...new Set(restrictedPaths)]
}
