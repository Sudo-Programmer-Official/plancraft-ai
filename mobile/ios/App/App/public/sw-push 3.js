/* Lightweight push handler for VitePWA generateSW build */
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {}
    const title = data.title || 'Reminder'
    const body = data.body || 'You have a new reminder.'
    const icon = data.icon || '/icons/icon-192x192.png'
    const tag = data.tag || 'plancraftai-reminder'
    event.waitUntil(self.registration.showNotification(title, { body, icon, tag }))
  } catch (e) {
    event.waitUntil(self.registration.showNotification('Reminder', { body: 'You have a new reminder.' }))
  }
})

// Optional: handle notificationclick to focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = '/' // landing route inside the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

