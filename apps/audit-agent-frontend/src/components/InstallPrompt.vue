<template>
  <!-- 🔹 Android/Chrome PWA prompt -->
  <transition name="fade-slide">
    <div
      v-if="visible"
      class="fixed bottom-6 inset-x-4 bg-indigo-600 text-white rounded-2xl shadow-xl p-4 flex items-center justify-between z-50"
    >
      <div>
        <h3 class="font-bold text-lg">📲 Install AuditAgent</h3>
        <p class="text-sm opacity-90">
          Add AuditAgent to your home screen for <br />
          1-tap access to tasks, journaling & insights.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-xl shadow hover:bg-indigo-100 transition"
          @click="install"
        >
          Install
        </button>
        <button
          class="text-sm opacity-80 underline"
          @click="dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  </transition>

  <!-- 🔹 iOS Safari hint -->
  <transition name="fade-slide">
    <div
      v-if="iosHint"
      class="fixed bottom-6 inset-x-4 bg-slate-800 text-white rounded-xl p-4 text-center shadow-lg z-50"
    >
      <p class="text-sm">
        📱 To install <strong>AuditAgent</strong>: tap
        <strong>Share</strong> → <strong>Add to Home Screen</strong>.
      </p>
      <button
        class="mt-2 text-xs opacity-80 underline"
        @click="dismissIos"
      >
        Got it
      </button>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from "vue"

const visible = ref(false)
const iosHint = ref(false)
let deferredPrompt = null

// --- LocalStorage helpers ---
const STORAGE_KEY = "auditagent_install_prompt_dismissed"
function alreadyDismissed() {
  const lastDismissed = localStorage.getItem(STORAGE_KEY)
  if (!lastDismissed) return false
  // expire after 7 days
  const diff = Date.now() - parseInt(lastDismissed, 10)
  return diff < 7 * 24 * 60 * 60 * 1000
}
function markDismissed() {
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
}

// --- PWA prompt for Chrome/Android ---
onMounted(() => {
  if (alreadyDismissed()) return
  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      e.preventDefault()
      deferredPrompt = e
      visible.value = true
    },
    { once: true } // ensure it only fires once
  )

  // --- iOS Safari hint ---
  const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
  const isStandalone = "standalone" in navigator && navigator.standalone
  if (!alreadyDismissed() && isIos && !isStandalone) {
    iosHint.value = true
  }
})

function install() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  deferredPrompt.userChoice.then(({ outcome }) => {
    if (outcome === "accepted") {
      console.log("✅ User accepted PWA install")
    } else {
      console.log("❌ User dismissed PWA install")
      markDismissed()
    }
    deferredPrompt = null
    visible.value = false
  })
}

function dismiss() {
  visible.value = false
  markDismissed()
}

function dismissIos() {
  iosHint.value = false
  markDismissed()
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>