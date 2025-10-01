<template>
  <div class="max-w-4xl mx-auto py-12 px-6 text-white">
    <h1 class="text-2xl sm:text-3xl font-bold mb-6">🛠️ Feature Journey</h1>
    <p class="text-indigo-200 mb-8">Internal overview of shipped features and roadmap.</p>

    <div class="relative border-l border-gray-700 pl-6 space-y-8">
      <div v-for="(f, i) in features" :key="i" class="relative">
        <span class="absolute -left-3 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-sm">{{ f.icon }}</span>
        <h3 class="text-lg font-semibold">{{ f.title }}</h3>
        <p class="text-sm text-indigo-300">{{ f.desc }}</p>
        <div class="mt-2 text-xs text-gray-400">{{ f.date }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const features = [
  { icon: '🔔', title: 'Notifications', desc: 'Dropdown with releases and tips', date: '2025-10-01' },
  { icon: '🚀', title: 'Premium Upgrade', desc: 'Pricing + Stripe checkout flow', date: '2025-10-01' },
  { icon: '⚙️', title: 'Settings Enhancements', desc: 'Integrations + responsive UI', date: '2025-10-01' },
]
</script>

