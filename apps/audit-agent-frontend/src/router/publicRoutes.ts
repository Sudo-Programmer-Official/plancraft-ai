export default function installPublicRoutes(router) {
  const ENABLE_TEAMS = import.meta.env.VITE_ENABLE_TEAMS === 'true'

  router.addRoute({
    path: '/join',
    component: () => import('@/layouts/PublicLayout.vue'),
    meta: { requiresAuth: true, feature: 'teams' },
    beforeEnter: (_to, _from, next) => {
      if (!ENABLE_TEAMS) return next('/dashboard')
      return next()
    },
    children: [
      {
        path: '',
        name: 'public-join',
        component: () => import('@/views/JoinInvite.vue'),
      },
    ],
  })
}
