<template>
  <div class="bg-gradient-to-b from-blue-50 to-white text-gray-800">
    <!-- Section 1: Hero -->
    <section class="min-h-screen flex flex-col justify-center items-center text-center px-6">
      <h1 class="text-5xl font-bold mb-4 leading-tight">Your Peaceful Daily Reflection</h1>
      <p class="text-lg max-w-xl mb-6">AuditAgent helps you pause, reflect, and grow — one voice note at a time.</p>
      <div class="flex gap-4">
        <el-button type="primary" size="large" @click="goToLogin">Log In</el-button>
        <el-button plain size="large" @click="continueAsGuest">Continue as Guest</el-button>
      </div>
    </section>

    <!-- Section 2: How It Helps -->
    <section class="py-20 bg-white">
      <div class="max-w-6xl mx-auto px-6 text-center">
        <h2 class="text-3xl font-semibold mb-12">Why Use AuditAgent?</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <el-icon><i-ep-microphone /></el-icon>
            <h3 class="text-xl font-medium mt-4">Voice Journaling</h3>
            <p class="mt-2 text-gray-600">Speak your thoughts, let AI transcribe and summarize your day.</p>
          </div>
          <div>
            <el-icon><i-ep-calendar /></el-icon>
            <h3 class="text-xl font-medium mt-4">Smart Planner</h3>
            <p class="mt-2 text-gray-600">Track goals, carry forward unfinished tasks, and stay on course.</p>
          </div>
          <div>
            <el-icon><i-ep-star /></el-icon>
            <h3 class="text-xl font-medium mt-4">Mood Reflections</h3>
            <p class="mt-2 text-gray-600">Get emotional insights and trends over time through AI.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: A Calm Daily Journey -->
    <section class="py-20 bg-blue-50">
      <div class="max-w-5xl mx-auto px-6 text-center">
        <h2 class="text-3xl font-semibold mb-12">Your Calm Daily Flow</h2>
        <div class="grid md:grid-cols-4 gap-6">
          <div class="p-4">
            <h4 class="text-lg font-bold">🌤 Morning Plan</h4>
            <p class="text-sm mt-2">Set goals with clarity and intention</p>
          </div>
          <div class="p-4">
            <h4 class="text-lg font-bold">🎙️ Midday Voice Log</h4>
            <p class="text-sm mt-2">Quick voice capture of progress</p>
          </div>
          <div class="p-4">
            <h4 class="text-lg font-bold">🌙 Evening Reflection</h4>
            <p class="text-sm mt-2">Summarize emotions and wins</p>
          </div>
          <div class="p-4">
            <h4 class="text-lg font-bold">📈 Growth Stats</h4>
            <p class="text-sm mt-2">Review trends and mood charts</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: Feature Badges -->
    <section class="py-20 bg-white">
      <div class="max-w-6xl mx-auto px-6 text-center">
        <h2 class="text-3xl font-semibold mb-8">Built for Calm Productivity</h2>
        <div class="flex flex-wrap justify-center gap-4">
          <span class="bg-blue-100 text-blue-800 py-2 px-4 rounded-full text-sm font-medium">Vue 3</span>
          <span class="bg-purple-100 text-purple-800 py-2 px-4 rounded-full text-sm font-medium">Element Plus</span>
          <span class="bg-teal-100 text-teal-800 py-2 px-4 rounded-full text-sm font-medium">TailwindCSS</span>
          <span class="bg-yellow-100 text-yellow-800 py-2 px-4 rounded-full text-sm font-medium">Firebase</span>
          <span class="bg-pink-100 text-pink-800 py-2 px-4 rounded-full text-sm font-medium">OpenAI Codex</span>
        </div>
      </div>
    </section>

    <!-- Section 5: Final CTA -->
    <section class="py-20 bg-blue-100 text-center">
      <h2 class="text-3xl font-bold mb-4">Start your mindful journey now</h2>
      <p class="mb-6">No sign-up needed. Try it as a guest or log in for full tracking.</p>
      <el-button type="primary" size="large" @click="goToLogin">Get Started</el-button>
    </section>

    <!-- Footer -->
    <footer class="bg-white py-6 text-center text-sm text-gray-500">
      Built with ❤️ by Abhishek • AuditAgent 2025
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function goToLogin() {
  router.push('/auth')
}
function continueAsGuest() {
  router.push('/journal')
}
</script>

<style scoped>
el-icon {
  font-size: 2rem;
  color: #3b82f6;
}
</style>