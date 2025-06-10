import './assets/tailwind.scss'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import { initMixpanel } from './utils/mixpanel'
import VueGtag from 'vue-gtag'

// ✅ Import your Firebase initialization (this is the important part)
import '@/firebase/init'
import { createHead } from '@vueuse/head'
const head = createHead()

// main.js
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
app.use(ElementPlus)
initMixpanel()

app.use(
  VueGtag,
  {
    config: { id: 'G-N8V946JNDH' },
  },
  router,
)

// router.afterEach((to) => {
//   VueGtag('config', 'G-N8V946JNDH', {
//     page_path: to.fullPath,
//   });
// })

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(router)
app.use(head)
app.use(createPinia())
app.mount('#app')
