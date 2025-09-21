import './assets/tailwind.scss'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { onMounted } from "vue"
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
// import { initMixpanel } from './utils/mixpanel'
import { useAuthStore } from "@/stores/authStore";
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() { console.log('New content available. Refresh!') },
  onOfflineReady() { console.log('App ready to work offline.') },
})

// import { VueGtag } from 'vue-gtag'

// ✅ Import your Firebase initialization (this is the important part)
import '@/firebase/init'
import { createHead } from '@vueuse/head'
const head = createHead()

// main.js
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
app.use(ElementPlus)
// initMixpanel()

// app.use(
//   VueGtag,
//   {
//     config: { id: 'G-N8V946JNDH' },
//   },
//   router,
// )
router.afterEach((to) => {
  window.gtag('config', 'G-N8V946JNDH', {
    page_path: to.fullPath,
  })
})
// router.afterEach((to) => {
//   VueGtag('config', 'G-N8V946JNDH', {
//     page_path: to.fullPath,
//   });
// })

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.component('VoiceRecorder', VoiceRecorder)
app.use(router)
app.use(head)
app.use(createPinia())
const authStore = useAuthStore();
authStore.init();

let deferredPrompt;

// window.addEventListener('beforeinstallprompt', (e) => {
//   e.preventDefault();
//   deferredPrompt = e;

//   const installBtn = document.getElementById('installBtn');
//   if (installBtn) {
//     installBtn.style.display = 'block';

//     installBtn.addEventListener('click', async () => {
//       deferredPrompt.prompt();
//       const { outcome } = await deferredPrompt.userChoice;
//       console.log(`User response: ${outcome}`);
//       deferredPrompt = null;
//     });
//   }
// });
// let deferredPrompt;

// window.addEventListener('beforeinstallprompt', (e) => {
//   e.preventDefault();
//   deferredPrompt = e;
//   // Show a custom install button in your UI
//   document.querySelector('#installBtn').style.display = 'block';
// });

// document.querySelector('#installBtn').addEventListener('click', () => {
//   deferredPrompt.prompt();
//   deferredPrompt.userChoice.then((choice) => {
//     if (choice.outcome === 'accepted') {
//       console.log('User accepted install');
//     }
//     deferredPrompt = null;
//   });
// });


// let deferredPrompt

onMounted(() => {
  // Run only when the DOM is ready
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredPrompt = e

    // Wait for Vue to render the button
    setTimeout(() => {
      const btn = document.querySelector("#installBtn")
      if (!btn) return // safe guard if it's not in DOM

      btn.style.display = "block"

      btn.addEventListener("click", async () => {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log("User choice:", outcome)
        deferredPrompt = null
        btn.style.display = "none"
      })
    }, 0)
  })
})

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  return ('standalone' in window.navigator) && window.navigator.standalone;
}

if (isIos() && !isInStandaloneMode()) {
  // Show your custom "Add to Home Screen" banner
  alert("📲 To install AuditAgent, tap Share → 'Add to Home Screen'");
}
app.mount('#app')
