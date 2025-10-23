// Polished main.ts example: Pinia + Router + token provider hook
// Replace imports below with your actual App and router modules.

import { createApp } from 'vue'
import { createPinia } from 'pinia'
// If you have your own App and router, adjust these paths:
// import App from './App.vue'
// import router from './router'

// Optional: if you want to explicitly provide a token
// import { setAuthTokenProvider } from './lib/api'
// import { getAuth } from 'firebase/auth'
// setAuthTokenProvider(async () => {
//   const user = getAuth().currentUser
//   return user ? user.getIdToken() : null
// })

export function boot(appRoot: any, router: any) {
  const app = createApp(appRoot)
  const pinia = createPinia()
  app.use(pinia)
  if (router) app.use(router)
  app.mount('#app')
}

// Example usage if you wire your own:
// import App from './App.vue'
// import router from './router'
// boot(App, router)

