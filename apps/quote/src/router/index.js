import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'

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
      component: () => import('@/components/BlogPost.vue'),
      props: true,
    },
  ],
})

export default router
