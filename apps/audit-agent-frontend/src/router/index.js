import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import LandingPage from '../views/LandingPage.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import PrivacyPolicy from '@/views/PrivacyPolicy.vue'
import Terms from '@/views/TermsOfService.vue'
import Contact from '@/views/ContactForm.vue'
import { useAuthStore } from '@/stores/authStore'
import { useOrgStore } from '@/stores/orgStore'
import { trackEvent } from '@/services/analytics'
import installTeamRoutes from './teamRoutes'

const getCurrentUser = () =>
  new Promise((resolve) => {
    const removeListener = onAuthStateChanged(
      getAuth(),
      (user) => {
        removeListener()
        resolve(user)
      },
      () => {
        removeListener()
        resolve(null)
      },
    )
  })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ✅ Public routes
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/privacy', component: PrivacyPolicy },
    { path: '/terms', component: Terms },
    { path: '/contact', component: Contact },
    {
      path: '/teams',
      name: 'teams-entry',
      async beforeEnter(to, from, next) {
        trackEvent('teams_route_opened', { from: from?.fullPath || null })
        const authStore = useAuthStore()
        const orgStore = useOrgStore()
        const user = await getCurrentUser()

        if (!user) {
          return next({ path: '/login', query: { redirect: to.fullPath } })
        }

        if (!authStore.user) {
          authStore.user = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: authStore.user?.role || 'user',
          }
        }

        await orgStore.fetchOrgs()

        const targetOrgId = orgStore.activeOrgId || orgStore.lastOrgId
        if (targetOrgId) {
          orgStore.setOrg(targetOrgId)
          return next({ path: `/team/${targetOrgId}` })
        }

        orgStore.requestTeamsEntry()
        return next({ path: '/dashboard', query: { teamsEntry: '1' } })
      },
    },

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
        { path: 'reminders', name: 'reminders', component: () => import('@/components/RemindersOverview.vue') },
        { path: 'today', name: 'today', component: () => import('@/views/TodayView.vue') },
        { path: 'planner', name: 'planner', component: () => import('@/views/PlannerView.vue') },
        { path: 'timeline', name: 'timeline', component: () => import('@/views/TimelineView.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
        { path: 'pricing', name: 'pricing', component: () => import('@/views/PricingView.vue') },
        { path: 'subscription', name: 'subscription', component: () => import('@/views/PricingView.vue') },
        { path: 'help', name: 'help', component: () => import('@/views/HelpView.vue') },
      ],
    },

    // ✅ Fallback and misc
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      redirect: '/',
    },
    { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
    {
      path: '/data-deletion',
      name: 'data-deletion',
      component: () => import('@/views/DataDeletion.vue'),
    },
  ],
})

installTeamRoutes(router)

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const orgStore = useOrgStore()

  // If navigating to login: only redirect away when fully signed-in (not guest)
  if (to.path === '/login') {
    try {
      const isGuest = authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
      if (authStore?.user && !isGuest) return next('/dashboard')
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
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (orgStore.enabled) {
    const last = orgStore.ensureLastOrgLoaded(user.uid)
    if (last && !orgStore.activeOrgId) {
      const match = orgStore.orgs.find((org) => org.id === last)
      if (match) orgStore.setOrg(match.id)
    }
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
