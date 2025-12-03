// Simple in-memory data store for development
// In production, replace with Firestore/Stripe data sources
export const dataStore = {
  notifications: [
    { id: 'n1', title: 'Welcome', message: 'Admin notifications live', date: Date.now() - 86400000 },
  ],
  users: [
    { id: 'u1', name: 'Demo Admin', email: 'admin@example.com', role: 'admin', plan: 'premium' },
    { id: 'u2', name: 'Demo User', email: 'user@example.com', role: 'user', plan: 'free' },
  ],
  payments: [
    { id: 'p1', userId: 'u1', userEmail: 'admin@example.com', plan: 'monthly', status: 'active', renewsAt: Date.now() + 20*86400000 },
  ],
  feedback: [
    {
      id: 'f1',
      userId: 'u1',
      type: 'general',
      rating: 5,
      message: 'Loving the planner experience - keep it up!',
      context: { route: '/dashboard' },
      metadata: {},
      locale: 'en-US',
      userAgent: 'demo',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'f2',
      userId: 'u2',
      type: 'bug',
      rating: 3,
      message: 'Tasks page was a bit slow on mobile.',
      context: { route: '/tasks' },
      metadata: {},
      locale: 'en-US',
      userAgent: 'demo',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ],
}
