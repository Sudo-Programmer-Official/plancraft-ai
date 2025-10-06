<template>
  <el-dialog
    v-model="visible"
    width="480px"
    :show-close="false"
    align-center
     :style="{
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
      color: '#e2e8f0',
      borderRadius: '1rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)'
    }"
  >
    <!-- HEADER -->
   <template #header>
  <div
    class="flex items-center justify-between px-5 py-3 rounded-t-xl
           bg-gradient-to-r from-[#3b0a6a] via-[#5521a5] to-[#6d28d9]
           shadow-[inset_0_-1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.4)] relative"
  >
    <div class="flex items-center gap-3">
      <span class="text-2xl drop-shadow-md animate-pulse-slow">🚀</span>
      <h2
        class="text-[17px] sm:text-lg font-semibold tracking-wide
               bg-gradient-to-r from-pink-300 via-fuchsia-200 to-indigo-300 
               bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
      >
        Sign in to Unlock Pro
      </h2>
    </div>

    <button
      class="text-slate-300 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all duration-200"
      @click="visible = false"
      aria-label="Close"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

    <!-- BODY -->
    <div
      class="px-6 py-5 bg-gradient-to-b from-[#1f1138] via-[#29145c] to-[#34186d] text-[15px] leading-relaxed"
    >
      <p class="mb-4 text-purple-100/90">
        Your free session is <span class="font-semibold text-white">temporary</span>.  
        To upgrade your plan and save your subscription securely, please sign in to your account.
      </p>

      <div
        class="bg-gradient-to-r from-purple-700/60 to-fuchsia-700/50 border border-purple-500/40 rounded-xl p-4 text-sm text-purple-50 shadow-inner"
      >
        ✨ <strong class="text-white">Pro Members</strong> enjoy  
        <span class="text-pink-300">unlimited AI insights</span>,  
        <span class="text-indigo-300">smart reminders</span>, and  
        <span class="text-fuchsia-300">WhatsApp/PWA sync</span> —  
        all safely stored across your devices.
      </div>
    </div>

    <!-- FOOTER -->
    <template #footer>
      <div
        class="flex justify-end gap-3 px-5 pb-4"
      >
        <el-button
          @click="visible = false"
          class="!bg-transparent !border-purple-400/40 !text-purple-200 hover:!bg-purple-600/30 hover:!text-white transition-all duration-200"
        >
          Maybe Later
        </el-button>

        <RouterLink
          to="/login"
          @click="visible = false"
          class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white font-medium shadow-lg hover:shadow-pink-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
        >
          <span>Sign In & Continue</span> <span>→</span>
        </RouterLink>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)

function showLoginPrompt(e) {
  console.log('[LoginPromptModal] Received login-required event', e.detail)
  visible.value = true
}

onMounted(() => {
  console.log('[LoginPromptModal] Mounted and listening for login-required')
  window.addEventListener('login-required', showLoginPrompt)

  // Fallback in case event fired early
  if (localStorage.getItem('showLoginPromptOnce') === '1') {
    visible.value = true
    localStorage.removeItem('showLoginPromptOnce')
  }
})

onUnmounted(() => {
  window.removeEventListener('login-required', showLoginPrompt)
})
</script>

<style scoped>
.login-prompt .el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Refined pulsing glow for premium look */
/* @keyframes dialogGlow {
  0%, 100% {
    box-shadow:
      0 0 15px rgba(147, 51, 234, 0.4),
      0 0 30px rgba(236, 72, 153, 0.3);
  }
  50% {
    box-shadow:
      0 0 25px rgba(147, 51, 234, 0.7),
      0 0 45px rgba(236, 72, 153, 0.5);
  }
} */
.login-prompt {
  animation: dialogGlow 7s ease-in-out infinite alternate;
}
</style>