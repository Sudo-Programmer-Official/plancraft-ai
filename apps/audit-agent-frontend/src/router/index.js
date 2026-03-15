import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import LandingPage from '../views/LandingPage.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import PrivacyPolicy from '@/views/PrivacyPolicy.vue'
import Terms from '@/views/TermsOfService.vue'
import Contact from '@/views/ContactForm.vue'
import { useAuthStore } from '@/stores/authStore'
import CreatorLayout from '@/layouts/CreatorLayout.vue'
import PublicLeaderLayout from '@/layouts/PublicLeaderLayout.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

const getCurrentUser = () =>
  new Promise((resolve) => {
    const existingUser = getAuth().currentUser
    if (existingUser) {
      resolve(existingUser)
      return
    }

    let settled = false
    let timeoutId = null
    let removeListener = null
    const finish = (user) => {
      if (settled) return
      settled = true
      try {
        if (timeoutId) clearTimeout(timeoutId)
      } catch {}
      try {
        if (removeListener) removeListener()
      } catch {}
      resolve(user)
    }

    try {
      timeoutId = window.setTimeout(() => {
        console.warn('[Router] Timed out waiting for Firebase auth state; continuing with fallback checks')
        finish(getAuth().currentUser || null)
      }, isNativePackagedApp() ? 4000 : 7000)
    } catch {}

    removeListener = onAuthStateChanged(
      getAuth(),
      (user) => {
        finish(user)
      },
      () => {
        finish(null)
      },
    )
  })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ✅ Public routes
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/signup', name: 'signup', component: () => import('@/views/GuestOnboarding.vue') },
    { path: '/app-auth/complete', name: 'native-auth-complete', component: () => import('@/views/NativeAuthCompleteView.vue') },
    { path: '/billing/upgrade', name: 'billing-upgrade', component: () => import('@/views/BillingUpgradeView.vue') },
    { path: '/privacy', component: PrivacyPolicy },
    { path: '/terms', component: Terms },
    { path: '/contact', component: Contact },
    { path: '/features', name: 'features', component: () => import('@/views/FeaturesView.vue') },
    { path: '/voice-planning', name: 'voice-planning', component: () => import('@/views/VoicePlanningView.vue') },
    { path: '/ai-reminders', name: 'ai-reminders', component: () => import('@/views/AiRemindersView.vue') },
    { path: '/invite/:token', name: 'workspace-invite', component: () => import('@/views/WorkspaceInviteView.vue') },
    {
      path: '/integrations/gpt',
      name: 'gpt-connect',
      component: () => import('@/views/GptConnectView.vue'),
    },
    {
      path: '/connect/oauth',
      name: 'gpt-oauth',
      component: () => import('@/views/GptOAuthBridge.vue'),
    },
    {
      path: '/social/connect/success',
      name: 'social-connect-success',
      component: () => import('@/views/SocialConnectSuccess.vue'),
    },
    {
      path: '/social/connect/error',
      name: 'social-connect-error',
      component: () => import('@/views/SocialConnectError.vue'),
    },
    {
      path: '/google-calendar-integration',
      name: 'google-calendar-integration',
      component: () => import('@/views/CalendarIntegrationView.vue'),
    },
    { path: '/feedback', name: 'feedback-public', component: () => import('@/views/FeedbackView.vue') },

    // ✅ Blog (public)
    {
      path: '/blog',
      name: 'blog-index',
      component: () => import('@/views/BlogIndex.vue'),
    },
    {
      path: '/blog/:slug',
      name: 'blog-post',
      component: () => import('@/views/BlogView.vue'),
      props: true,
    },

    // ✅ Admin routes (unchanged, all restored)
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', name: 'AdminDashboard', component: () => import('@/views/admin/AdminDashboard.vue') },
        { path: 'features', name: 'AdminFeatures', component: () => import('@/views/admin/AdminFeatures.vue') },
        { path: 'notifications', name: 'AdminNotifications', component: () => import('@/views/admin/AdminNotifications.vue') },
        { path: 'retention', name: 'AdminRetention', component: () => import('@/views/admin/AdminRetention.vue') },
        { path: 'feedback', name: 'AdminFeedback', component: () => import('@/views/admin/AdminFeedback.vue') },
        { path: 'users', name: 'AdminUsers', component: () => import('@/views/admin/AdminUsers.vue') },
        { path: 'payments', name: 'AdminPayments', component: () => import('@/views/admin/AdminPayments.vue') },
        { path: 'blogs', name: 'AdminBlogs', component: () => import('@/views/admin/AdminBlogs.vue') },
        { path: 'settings', name: 'AdminSettings', component: () => import('@/views/admin/AdminSettings.vue') },
      ],
    },

    // ✅ Protected app routes (no changes)
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'daily', name: 'daily', component: () => import('@/views/DailyView.vue') },
        { path: 'weekly', name: 'weekly', component: () => import('@/views/WeeklyView.vue') },
        { path: 'monthly', name: 'monthly', component: () => import('@/views/MonthlyView.vue') },
        { path: 'journal', name: 'journal', component: () => import('@/views/JournalView.vue') },
        { path: 'reports', name: 'reports', component: () => import('@/views/ReportsView.vue') },
        { path: 'habits', name: 'habits', component: () => import('@/views/HabitDashboard.vue') },
        { path: 'meetings', name: 'meetings', component: () => import('@/views/MeetingsView.vue') },
        { path: 'reminders', name: 'reminders', component: () => import('@/components/RemindersOverview.vue') },
        { path: 'talk-to-planner', name: 'talk-to-planner', component: () => import('@/views/TalkToPlanner.vue') },
        { path: 'today', name: 'today', component: () => import('@/views/TodayView.vue') },
        { path: 'planner', name: 'planner', component: () => import('@/views/PlannerView.vue') },
        { path: 'tasks', name: 'tasks', component: () => import('@/views/AllTasksView.vue') },
        { path: 'quick-add', name: 'quick-add', component: () => import('@/views/NapkinView.vue') },
        { path: 'napkin', name: 'napkin', component: () => import('@/views/NapkinView.vue') },
        { path: 'timeline', name: 'timeline', component: () => import('@/views/TimelineView.vue') },
        { path: 'goals', name: 'goals', component: () => import('@/views/GoalsView.vue') },
        { path: 'links', name: 'links', component: () => import('@/views/LinksView.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
        { path: 'pricing', name: 'pricing', component: () => import('@/views/PricingView.vue') },
        { path: 'subscription', name: 'subscription', component: () => import('@/views/PricingView.vue') },
        { path: 'workspaces', name: 'workspaces', component: () => import('@/views/WorkspacesView.vue') },
        { path: 'workspaces/new', name: 'workspace-new', component: () => import('@/views/WorkspaceOnboarding.vue') },
        { path: 'app', name: 'workspace-app', component: () => import('@/views/WorkspaceAppView.vue') },
        { path: 'help', name: 'help', component: () => import('@/views/HelpView.vue') },
      ],
    },

    // ✅ Creator Mode workspace (isolated layout)
    {
      path: '/creator',
      component: CreatorLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'creator-home', component: () => import('@/views/creator/CreatorHome.vue') },
        { path: 'calendar', name: 'creator-calendar', component: () => import('@/views/creator/CreatorCalendar.vue') },
        { path: 'editor/:id', name: 'creator-editor', component: () => import('@/views/creator/CreatorEditor.vue') },
        { path: 'repurpose', name: 'creator-repurpose', component: () => import('@/views/creator/CreatorRepurpose.vue') },
        { path: 'preview/:id', name: 'creator-preview', component: () => import('@/views/creator/CreatorPreview.vue') },
        { path: 'publish/:id', name: 'creator-publish', component: () => import('@/views/creator/CreatorPublish.vue') },
      ],
    },

    // ✅ Leader Mode
    {
      path: '/leader',
      component: PublicLeaderLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'leader-dashboard', component: () => import('@/pages/leader/LeaderDashboard.vue') },
        { path: 'events', name: 'leader-events', component: () => import('@/pages/leader/LeaderEvents.vue') },
        { path: 'events/:id', name: 'leader-event-details', component: () => import('@/pages/leader/LeaderEventDetails.vue') },
        { path: 'occasions', name: 'leader-occasions', component: () => import('@/pages/leader/LeaderOccasions.vue') },
        { path: 'issues', name: 'leader-issues', component: () => import('@/pages/leader/LeaderIssues.vue') },
        { path: 'issues/:id', name: 'leader-issue-details', component: () => import('@/pages/leader/LeaderIssueDetails.vue') },
        { path: 'contacts', name: 'leader-contacts', component: () => import('@/pages/leader/LeaderContacts.vue') },
        { path: 'maps', name: 'leader-maps', component: () => import('@/pages/leader/LeaderMaps.vue') },
        { path: 'messages', name: 'leader-messages', component: () => import('@/pages/leader/LeaderMessages.vue') },
      ],
    },

    // ✅ Legacy and misc
    { path: '/privacy-policy', redirect: '/privacy' },
    {
      path: '/data-deletion',
      name: 'data-deletion',
      component: () => import('@/views/DataDeletion.vue'),
    },
    { path: '/404', name: 'not-found', component: NotFoundView },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: NotFoundView,
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  const wantsTeamSignup = to.path === '/signup' && to.query?.mode === 'team'
  if (wantsTeamSignup) {
    const nextTarget =
      (typeof to.query?.next === 'string' && to.query.next.length && to.query.next) ||
      '/workspaces/new'
    try {
      localStorage.setItem('postLoginRedirect', nextTarget)
    } catch {}
    const isGuest =
      authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
    if (authStore?.user && !isGuest) {
      return next(nextTarget)
    }
    return next({ path: '/login', query: { mode: 'team', next: nextTarget } })
  }

  // If navigating to login or signup: only redirect away when fully signed-in (not guest)
  if (to.path === '/login' || to.path === '/signup') {
    try {
      const isGuest = authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
      const nextTarget =
        (typeof to.query?.next === 'string' && to.query.next.length && to.query.next) ||
        '/dashboard'
      if (authStore?.user && !isGuest) return next(nextTarget)
    } catch {}
    return next()
  }

  // Skip auth guard for public routes
  if (!to.meta.requiresAuth || import.meta.env.SSR) return next()

  const user = await getCurrentUser()
  if (!user) {
    // Allow offline fallback if we have cached identity
    try {
      const cachedUser = localStorage.getItem('user')
      const cachedToken = localStorage.getItem('token')
      if (authStore?.user || (cachedUser && cachedToken)) {
        return next()
      }
    } catch {}
    if (to.path === '/workspaces/new') {
      return next({ path: '/signup', query: { mode: 'team', next: '/workspaces/new' } })
    }
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  const isGuest =
    authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
  if (isGuest && (to.path === '/workspaces/new' || to.path === '/app')) {
    try {
      localStorage.setItem('postLoginRedirect', to.fullPath || '/workspaces/new')
    } catch {}
    return next({ path: '/login', query: { mode: 'team', next: to.fullPath || '/workspaces/new' } })
  }

  // Admin guard
  const wantsAdmin = to.meta.requiresAdmin || to.path.startsWith('/admin')
  if (wantsAdmin) {
    if (authStore?.user?.role !== 'admin') {
      return next({ path: '/dashboard' })
    }
  }

  next()
})

export default router
