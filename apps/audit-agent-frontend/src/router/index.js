import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import LandingView from '../views/LandingView.vue'
import { trackEvent } from '@/utils/mixpanel'

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
    {
      path: '/',
      name: 'landing',
      component: LandingView, // Set as homepage
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    // {
    //   path: '/blog/:slug',
    //   name: 'BlogPost',
    //   component: () => import('../views/BlogView.vue'),
    //   props: true,
    // },
    {
      path: '/blog/:slug',
      name: 'BlogPost',
      component: () => import('@/views/BlogPost.vue'),
      props: true,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/journal',
      name: 'journal',
      component: () => import('@/views/JournalView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/planner',
      name: 'planner',
      component: () => import('@/views/PlannerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: () => import('@/views/TimelineView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
    { path: '/terms', component: () => import('@/views/TermsOfService.vue') },
    { path: '/contact', component: () => import('@/views/ContactForm.vue') },
  ],
})

router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  const user = await getCurrentUser()

  if (!user) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  next()
})

router.afterEach((to) => {
  trackEvent('Page View', {
    page: to.fullPath,
    name: to.name,
  })
})

export default router
