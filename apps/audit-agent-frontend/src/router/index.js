// import { createRouter, createWebHistory } from 'vue-router'
// import { getAuth, onAuthStateChanged } from 'firebase/auth'
// import LandingPage from '../views/LandingPage.vue'
// import { trackEvent } from '@/utils/mixpanel'

// const getCurrentUser = () =>
//   new Promise((resolve) => {
//     const removeListener = onAuthStateChanged(
//       getAuth(),
//       (user) => {
//         removeListener()
//         resolve(user)
//       },
//       () => {
//         removeListener()
//         resolve(null)
//       },
//     )
//   })

// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [
//     {
//       path: '/',
//       name: 'landing',
//       component: LandingPage, // Set as homepage
//     },
//     {
//       path: '/about',
//       name: 'about',
//       component: () => import('../views/AboutView.vue'),
//     },
//     // {
//     //   path: '/blog/:slug',
//     //   name: 'BlogPost',
//     //   component: () => import('../views/BlogView.vue'),
//     //   props: true,
//     // },
//     {
//       path: '/blog/:slug',
//       name: 'BlogPost',
//       component: () => import('@/views/BlogPost.vue'),
//       props: true,
//     },
//     {
//       path: '/login',
//       name: 'login',
//       component: () => import('@/views/LoginView.vue'),
//     },
//     {
//       path: '/journal',
//       name: 'journal',
//       component: () => import('@/views/JournalView.vue'),
//       meta: { requiresAuth: true },
//     },
//     {
//       path: '/planner',
//       name: 'planner',
//       component: () => import('@/views/PlannerView.vue'),
//       meta: { requiresAuth: true },
//     },
//     {
//       path: '/timeline',
//       name: 'timeline',
//       component: () => import('@/views/TimelineView.vue'),
//       meta: { requiresAuth: true },
//     },
//     { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
//     { path: '/terms', component: () => import('@/views/TermsOfService.vue') },
//     { path: '/contact', component: () => import('@/views/ContactForm.vue') },
//   ],
// })

// router.beforeEach(async (to, from, next) => {
//   if (!to.meta.requiresAuth) {
//     next()
//     return
//   }

//   const user = await getCurrentUser()

//   if (!user) {
//     next({ path: '/login', query: { redirect: to.fullPath } })
//     return
//   }

//   next()
// })

// router.afterEach((to) => {
//   trackEvent('Page View', {
//     page: to.fullPath,
//     name: to.name,
//   })
// })

// export default router


// import { createRouter, createWebHistory } from 'vue-router'
// import { getAuth, onAuthStateChanged } from 'firebase/auth'
// import LandingPage from '../views/LandingPage.vue'
// import { trackEvent } from '@/utils/mixpanel'

// // ✅ Auth utility
// const getCurrentUser = () =>
//   new Promise((resolve) => {
//     const removeListener = onAuthStateChanged(
//       getAuth(),
//       (user) => {
//         removeListener()
//         resolve(user)
//       },
//       () => {
//         removeListener()
//         resolve(null)
//       }
//     )
//   })

// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [
//     { path: '/', name: 'landing', component: LandingPage },

//     // 🔑 Auth
//     { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },

//     // 📒 Journal
//     { path: '/journal', name: 'journal', component: () => import('@/views/JournalView.vue'), meta: { requiresAuth: true } },

//     // 🗓️ Planner
//     { path: '/planner', name: 'planner', component: () => import('@/views/PlannerView.vue'), meta: { requiresAuth: true } },

//     // 📈 Timeline
//     { path: '/timeline', name: 'timeline', component: () => import('@/views/TimelineView.vue'), meta: { requiresAuth: true } },

//     // 📊 Dashboard (new)
//     { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { requiresAuth: true } },

//     // 📅 Daily Tasks
//     { path: '/daily', name: 'daily', component: () => import('@/views/DailyView.vue'), meta: { requiresAuth: true } },

//     // 📆 Weekly Tasks
//     { path: '/weekly', name: 'weekly', component: () => import('@/views/WeeklyView.vue'), meta: { requiresAuth: true } },

//     // 🗓️ Monthly Tasks
//     { path: '/monthly', name: 'monthly', component: () => import('@/views/MonthlyView.vue'), meta: { requiresAuth: true } },

//     // 🌟 Today’s Focus
//     { path: '/today', name: 'today', component: () => import('@/views/TodayView.vue'), meta: { requiresAuth: true } },

//     // Static Pages
//     { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
//     { path: '/terms', component: () => import('@/views/TermsOfService.vue') },
//     { path: '/contact', component: () => import('@/views/ContactForm.vue') },
//   ]
// })

// // ✅ Navigation Guard
// router.beforeEach(async (to, from, next) => {
//   if (!to.meta.requiresAuth) {
//     next()
//     return
//   }
//   const user = await getCurrentUser()
//   if (!user) {
//     next({ path: '/login', query: { redirect: to.fullPath } })
//     return
//   }
//   next()
// })

// // ✅ Mixpanel Page Tracking
// router.afterEach((to) => {
//   trackEvent('Page View', { page: to.fullPath, name: to.name })
// })

// export default router

import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import LandingPage from '../views/LandingPage.vue'
// import { trackEvent } from '@/utils/mixpanel'
import AppLayout from '@/layouts/AppLayout.vue'
import PrivacyPolicy from '@/views/PrivacyPolicy.vue'
import Terms from '@/views/TermsOfService.vue'
import Contact from '@/views/ContactForm.vue'
// import { useAuthStore } from '@/stores/authStore'

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
        { path: 'today', name: 'today', component: () => import('@/views/TodayView.vue') },
        { path: 'planner', name: 'planner', component: () => import('@/views/PlannerView.vue') },
        { path: 'timeline', name: 'timeline', component: () => import('@/views/TimelineView.vue') },
      ]
    },

    { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
    // Note: '/terms' and '/contact' already declared above; avoid duplicates
  ]
})

router.beforeEach(async (to, from, next) => {
  // Skip auth guard for public routes or during SSG prerender
  if (!to.meta.requiresAuth || import.meta.env.SSR) return next()
  const user = await getCurrentUser()
  if (!user) return next({ path: '/login', query: { redirect: to.fullPath } })
  next()
})

// router.afterEach((to) => {
//   trackEvent('Page View', { page: to.fullPath, name: to.name })
// })

export default router
