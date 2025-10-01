<template>
  <div class="max-w-4xl space-y-6">
    <h2 class="text-2xl font-bold">Feature Journey</h2>
    <div class="relative border-l border-gray-700 pl-6 space-y-6">
      <div v-for="(f, i) in features" :key="i" class="relative">
        <span class="absolute -left-3 top-4 w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-sm">{{ f.icon }}</span>
        <div class="bg-white/10 border border-white/10 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ f.title }}</h3>
            <span class="text-xs px-2 py-1 rounded bg-purple-600/30 border border-purple-400/30">{{ f.type }}</span>
          </div>
          <p class="text-sm text-indigo-200 mt-1">{{ f.desc }}</p>
          <div class="mt-2 text-xs text-gray-400">{{ f.date }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const features = [
  { icon: '🔔', title: 'Notifications', type: 'release', desc: 'Dropdown with releases and tips', date: '2025-10-01' },
  { icon: '🚀', title: 'Premium Upgrade', type: 'release', desc: 'Pricing + Stripe checkout flow', date: '2025-10-01' },
  { icon: '⚙️', title: 'Settings Enhancements', type: 'fix', desc: 'Integrations + responsive UI', date: '2025-10-01' },
]
</script>
