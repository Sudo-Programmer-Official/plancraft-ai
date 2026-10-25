import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CircleHelp,
  FileText,
  Inbox,
  Newspaper,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-vue-next'

// Keep navigation organized around user goals. Routes that are still useful
// but not part of the primary mental model remain reachable from their
// existing URLs without becoming permanent sidebar destinations.
export const PRIMARY_NAV = [
  { key: 'today', label: 'Today', icon: Sun, to: '/today' },
  { key: 'capture', label: 'Capture', icon: FileText, to: '/quick-add' },
  { key: 'inbox', label: 'Inbox', icon: Inbox, to: '/inbox' },
  { key: 'workspace', label: 'Workspace', icon: Building2, to: '/workspaces' },
]

export const MORE_GROUPS = [
  {
    label: 'Plan',
    items: [
      { key: 'planner', label: 'Planner', icon: CalendarDays, to: '/planner' },
      { key: 'focus', label: 'Focus', icon: Sparkles, action: 'focus' },
    ],
  },
  {
    label: 'Reflect',
    items: [
      { key: 'journal', label: 'Journal', icon: BookOpen, to: '/journal' },
      { key: 'insights', label: 'Insights', icon: BarChart3, to: '/reports' },
    ],
  },
  {
    label: 'Explore',
    items: [
      {
        key: 'intelligence',
        label: 'Intelligence',
        icon: Newspaper,
        to: '/intelligence',
        featureFlag: 'INTELLIGENCE_DESK',
        premium: true,
        infoTitle: 'Your live research desk',
        infoSummary: 'Try built-in live research free, then upgrade for custom agents and scheduled intelligence.',
        infoBullets: [
          '5 built-in research runs per month with citations',
          'Briefs for technology, markets, companies, and trends',
          'Premium adds custom agents, morning email, and task research',
        ],
      },
    ],
  },
]

export const ACCOUNT_NAV = [
  { key: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
  { key: 'help', label: 'Help', icon: CircleHelp, to: '/help' },
]
