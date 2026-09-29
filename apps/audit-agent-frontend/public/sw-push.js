/* Lightweight push handler for VitePWA generateSW build */
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'Reminder'
    const body = data.body || 'You have a new reminder.'
    const icon = data.icon || '/icons/icon-192x192.png'
    const tag = data.tag || 'plancraftai-reminder'
    // Only non-content fields are kept, for open tracking in the app.
    const meta = data.data || {}
    const notificationData = {
      type: meta.type || null,
      reminderType: meta.reminderType || null,
      reminderId: meta.reminderId || null,
      taskId: meta.taskId || null,
    }
    // Also tell any open app window, so it can show the reminder in-app.
    const notifyClients = clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => list.forEach((client) => client.postMessage({ type: 'pc-push-received', title, body, data: notificationData })))
    event.waitUntil(
      Promise.all([self.registration.showNotification(title, { body, icon, tag, data: notificationData }), notifyClients]),
    )
  } catch (e) {
    event.waitUntil(self.registration.showNotification('Reminder', { body: 'You have a new reminder.' }))
  }
})

// Optional: handle notificationclick to focus/open the app
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  event.notification.close()
  // The app picks pc_notif up on load and records the open (see analytics.js).
  const params = new URLSearchParams()
  if (data.type) params.set('pc_notif', data.type)
  if (data.reminderType) params.set('pc_rtype', data.reminderType)
  if (data.taskId) params.set('pc_task', '1')
  const query = params.toString()
  const url = query ? `/?${query}` : '/' // landing route inside the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'pc-notification-opened', data })
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

