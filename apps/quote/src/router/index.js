import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import { trackEvent } from '@/utils/mixpanel'

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
    { path: '/privacy-policy', component: () => import('@/views/PrivacyPolicy.vue') },
    { path: '/terms', component: () => import('@/views/TermsOfService.vue') },
    { path: '/contact', component: () => import('@/views/ContactForm.vue') },
  ],
})

router.afterEach((to) => {
  trackEvent('Page View', {
    page: to.fullPath,
    name: to.name,
  })
})

export default router
