import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import LandingPage from '../views/LandingPage.vue'
// import { trackEvent } from '@/utils/mixpanel'
import AppLayout from '@/layouts/AppLayout.vue'
import PrivacyPolicy from '@/views/PrivacyPolicy.vue'
import Terms from '@/views/TermsOfService.vue'
import Contact from '@/views/ContactForm.vue'
import { useAuthStore } from '@/stores/authStore'
import AdminLayout from '@/layouts/AdminLayout.vue'

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
      }
    )
  })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: LandingPage },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/privacy', component: PrivacyPolicy },
    { path: '/terms', component: Terms },
    { path: '/contact', component: Contact },
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
      ]
    },
    // Blog (public)
    { path: '/blog', name: 'blog-index', component: () => import('@/views/BlogIndex.vue') },
    { path: '/blog/:slug', name: 'blog-post', component: () => import('@/views/BlogView.vue'), props: true },
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
        { path: 'reminders', name: 'reminders', component: () => import('@/components/RemindersOverview.vue') },
        { path: 'today', name: 'today', component: () => import('@/views/TodayView.vue') },
        { path: 'planner', name: 'planner', component: () => import('@/views/PlannerView.vue') },
        { path: 'timeline', name: 'timeline', component: () => import('@/views/TimelineView.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
        { path: 'pricing', name: 'pricing', component: () => import('@/views/PricingView.vue') },
        { path: 'subscription', name: 'subscription', component: () => import('@/views/PricingView.vue') },
        { path: 'help', name: 'help', component: () => import('@/views/HelpView.vue') },
      ]
    },

    { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
    { path: '/data-deletion', name: 'data-deletion', component: () => import('@/views/DataDeletion.vue') },
    // Note: '/terms' and '/contact' already declared above; avoid duplicates
  ]
})

router.beforeEach(async (to, from, next) => {
  // Skip auth guard for public routes or during SSG prerender
  if (!to.meta.requiresAuth || import.meta.env.SSR) return next()
  const user = await getCurrentUser()
  if (!user) return next({ path: '/login', query: { redirect: to.fullPath } })
  // Admin guard
  const wantsAdmin = to.meta.requiresAdmin || to.path.startsWith('/admin')
  if (wantsAdmin) {
    const authStore = useAuthStore()
    if (authStore?.user?.role !== 'admin') {
      return next({ path: '/dashboard' })
    }
  }
  next()
})

// router.afterEach((to) => {
//   trackEvent('Page View', { page: to.fullPath, name: to.name })
// })

export default router
