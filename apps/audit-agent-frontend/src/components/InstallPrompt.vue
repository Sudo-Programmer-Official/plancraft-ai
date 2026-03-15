<template>
  <!-- 🔹 Android/Chrome PWA prompt -->
  <transition name="fade-slide">
    <div
      v-if="visible"
      class="fixed bottom-6 inset-x-4 bg-indigo-600 text-white rounded-2xl shadow-xl p-4 flex items-center justify-between z-50"
    >
      <div>
        <h3 class="font-bold text-lg">📲 Install PlanCraftAI</h3>
        <p class="text-sm opacity-90">
          Add PlanCraftAI to your home screen for <br />
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

  <!-- 🔹 iOS Safari / Instagram hint -->
  <transition name="fade-slide">
    <div
      v-if="iosHint"
      class="fixed bottom-6 inset-x-4 bg-slate-800 text-white rounded-xl p-4 text-center shadow-lg z-50"
    >
      <div v-if="isInstagram">
        <p class="text-sm">
          ⚠️ You’re inside <strong>Instagram</strong>.<br />
          Please tap <strong>⋯</strong> → <strong>Open in Safari</strong>.  
          From Safari you can then <strong>Add to Home Screen</strong>.
        </p>
      </div>
      <div v-else>
        <p class="text-sm">
          📱 To install <strong>PlanCraftAI</strong>: tap
          <strong>Share</strong> → <strong>Add to Home Screen</strong>.
        </p>
      </div>
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
import { isNativePackagedApp } from "@/utils/nativeAuthSupport"

const visible = ref(false)
const iosHint = ref(false)
const isInstagram = ref(false)
let deferredPrompt = null

// --- LocalStorage helpers ---
const STORAGE_KEY = "auditagent_install_prompt_dismissed"
function alreadyDismissed() {
  const lastDismissed = localStorage.getItem(STORAGE_KEY)
  if (!lastDismissed) return false
  const diff = Date.now() - parseInt(lastDismissed, 10)
  return diff < 7 * 24 * 60 * 60 * 1000 // 7 days
}
function markDismissed() {
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
}

// --- PWA prompt for Chrome/Android ---
onMounted(() => {
  if (isNativePackagedApp()) return
  if (alreadyDismissed()) return
  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      e.preventDefault()
      deferredPrompt = e
      visible.value = true
    },
    { once: true }
  )

  // --- iOS Safari / Instagram detection ---
  const ua = navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)
  const standalone = "standalone" in navigator && navigator.standalone

  if (!alreadyDismissed() && isIos && !standalone) {
    iosHint.value = true
    isInstagram.value = ua.includes("instagram")
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
