<template>
  <el-dialog
    v-model="visible"
    width="480px"
    align-center
    class="login-prompt"
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
      <div class="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🚀</span>
          <h2 class="text-lg sm:text-xl font-semibold text-white">
            Sign in to Unlock Pro
          </h2>
        </div>
        <button
          class="text-slate-300 hover:text-white transition"
          @click="visible = false"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </template>

    <!-- BODY -->
    <div class="px-5 py-5 space-y-4 text-[15px] leading-relaxed text-slate-200">
      <p>
        Your free session is <span class="font-semibold text-white">temporary</span>.  
        To upgrade your plan and save your subscription securely, please sign in to your account.
      </p>

      <div
        class="bg-gradient-to-r from-purple-700/60 to-fuchsia-700/50 border border-purple-500/40 rounded-xl p-4 text-sm text-slate-100 shadow-inner"
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
        class="flex justify-end gap-3 px-5 pb-4 border-t border-white/10"
      >
        <el-button
          @click="visible = false"
          class="flex-1 sm:flex-none !bg-transparent !border-slate-500/40 !text-slate-300 hover:!bg-slate-700/50 hover:!text-white transition-all duration-200"
        >
          Maybe Later
        </el-button>

        <RouterLink
          to="/login"
          @click="visible = false"
          class="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg 
            bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 
            text-white font-medium shadow-md 
            hover:shadow-purple-500/30 hover:scale-[1.03] active:scale-[0.98] 
            transition-all duration-300"
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
  window.addEventListener('login-required', showLoginPrompt)

  // fallback if event fired early
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
/* Dialog header text glow */
.login-prompt .el-dialog__header {
  background: linear-gradient(90deg, rgba(79,70,229,0.3), rgba(147,51,234,0.3));
}

/* Consistent pulsing glow with your Planner dialog */
@keyframes dialogGlow {
  0%, 100% {
    box-shadow: 0 0 15px rgba(147,51,234,0.4), 0 0 30px rgba(236,72,153,0.3);
  }
  50% {
    box-shadow: 0 0 25px rgba(147,51,234,0.7), 0 0 45px rgba(236,72,153,0.5);
  }
}
.login-prompt {
  animation: dialogGlow 7s ease-in-out infinite alternate;
}
</style>