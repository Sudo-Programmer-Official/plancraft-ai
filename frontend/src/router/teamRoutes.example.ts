// Example: Install Team routes into an existing Vue Router
// Usage:
// import installTeamRoutes from './router/teamRoutes.example'
// installTeamRoutes(router)

export default function installTeamRoutes(router: any) {
  const ENABLE_TEAMS = import.meta.env.VITE_ENABLE_TEAMS === 'true';

  router.addRoute({
    path: '/team/:orgId',
    component: () => import('../layouts/TeamLayout.vue'),
    beforeEnter: (_to: any, _from: any, next: any) => {
      if (!ENABLE_TEAMS) return next('/dashboard');
      return next();
    },
    children: [
      {
        path: '',
        name: 'team-projects',
        component: () => import('../views/TeamProjects.vue'),
      },
      {
        path: 'tasks',
        name: 'team-tasks',
        component: () => import('../views/TeamTasks.vue'),
      },
      {
        path: 'boards',
        name: 'team-boards',
        component: () => import('../views/TeamBoards.vue'),
      },
      {
        path: 'meetings',
        name: 'team-meetings',
        component: () => import('../views/TeamMeetings.vue'),
      },
      {
        path: 'meetings/:meetingId',
        name: 'team-meeting-detail',
        component: () => import('../views/TeamMeetingDetail.vue'),
      },
      {
        path: 'automations',
        name: 'team-automations',
        component: () => import('../views/TeamAutomations.vue'),
      },
    ],
  });
}
