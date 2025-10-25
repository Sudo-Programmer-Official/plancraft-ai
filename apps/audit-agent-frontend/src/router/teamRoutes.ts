export default function installTeamRoutes(router) {
  const ENABLE_TEAMS = import.meta.env.VITE_ENABLE_TEAMS === 'true'

  router.addRoute({
    path: '/team/:orgId',
    component: () => import('@/layouts/TeamLayout.vue'),
     meta: { requiresAuth: true, feature: 'teams' },
    beforeEnter: (_to, _from, next) => {
      if (!ENABLE_TEAMS) return next('/dashboard')
      return next()
    },
    children: [
      {
        path: '',
        name: 'team-projects',
        component: () => import('@/views/TeamProjects.vue'),
      },
      {
        path: 'boards',
        name: 'team-boards',
        component: () => import('@/views/TeamBoards.vue'),
      },
      {
        path: 'tasks',
        name: 'team-tasks',
        component: () => import('@/views/TeamTasks.vue'),
      },
      {
        path: 'chat',
        name: 'team-chat',
        component: () => import('@/views/TeamChat.vue'),
      },
      {
        path: 'pulse',
        name: 'team-pulse',
        component: () => import('@/views/TeamPulse.vue'),
      },
      {
        path: 'meetings',
        name: 'team-meetings',
        component: () => import('@/views/TeamMeetings.vue'),
      },
      {
        path: 'meetings/:meetingId',
        name: 'team-meeting-detail',
        component: () => import('@/views/TeamMeetingDetail.vue'),
      },
      {
        path: 'meetings/:meetingId/live',
        name: 'team-meeting-room',
        component: () => import('@/views/TeamMeetingRoom.vue'),
      },
      {
        path: 'feed',
        name: 'team-feed',
        component: () => import('@/views/OrgFeed.vue'),
      },
      {
        path: 'vault',
        name: 'team-vault',
        component: () => import('@/views/TeamVault.vue'),
      },
      {
        path: 'analytics',
        name: 'team-analytics',
        component: () => import('@/views/OrgAnalytics.vue'),
      },
      {
        path: 'automations',
        name: 'team-automations',
        component: () => import('@/views/TeamAutomations.vue'),
      },
    ],
  })
}
