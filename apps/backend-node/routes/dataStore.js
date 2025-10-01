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
}

