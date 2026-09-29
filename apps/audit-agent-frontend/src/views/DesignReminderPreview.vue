<template>
  <PcAppShell active="today" :inbox-count="4" :user="{ name: 'Alex' }">
    <!-- Reminder-due state on Today: the reference for how a fired reminder looks in the app. -->
    <section class="rp-today" :class="{ 'rp-today--under-banner': reminderOpen }" aria-labelledby="rp-greeting">
      <div class="rp-today__head">
        <div>
          <h1 id="rp-greeting" class="rp-today__greeting">{{ greeting }}, Alex</h1>
          <p class="rp-today__date">{{ todayLabel }}</p>
        </div>
        <span class="rp-avatar" aria-hidden="true">A</span>
      </div>

      <h2 class="rp-today__question">What matters today?</h2>

      <div class="rp-today__list">
        <PcTaskRow
          v-for="task in tasks"
          :key="task.id"
          :title="task.title"
          :time="task.time"
          :meta="task.meta"
          :done="task.done"
          @toggle="task.done = !task.done"
        >
          <template v-if="task.focusable && !task.done" #action>
            <PcButton size="sm" :icon="Play">Focus</PcButton>
          </template>
        </PcTaskRow>
      </div>
    </section>

    <PcReminderBanner
      v-model:open="reminderOpen"
      title="Finish design system"
      detail="2:00 PM · Work"
      @focus="reminderOpen = false"
      @snooze="reminderOpen = false"
    />
  </PcAppShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Play } from 'lucide-vue-next'
import { PcAppShell, PcButton, PcTaskRow } from '@/design'
import PcReminderBanner from '@/design/components/PcReminderBanner.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Reminder preview | PlanCraft AI',
  description: 'Internal design system preview.',
  canonicalPath: '/design/reminder',
  noindex: true,
})

// Same sample data as the /design Today reference screen.
const tasks = reactive([
  { id: 1, title: 'Prepare for AWS interview', time: '9:00 AM', meta: '45 min', focusable: true, done: true },
  { id: 2, title: 'Finish design system', time: '2:00 PM', meta: 'Work', focusable: true, done: false },
  { id: 3, title: 'Call dentist', time: '4:00 PM', meta: '', focusable: false, done: false },
])

const reminderOpen = ref(true)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})
const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
</script>

<style scoped>
.rp-today {
  max-width: 40rem;
  margin: 0 auto;
  padding: var(--pc-space-8) var(--pc-space-4) var(--pc-space-6);
}

/* Keep the screen readable under the fixed banner in this reference view. */
.rp-today--under-banner {
  padding-top: calc(env(safe-area-inset-top) + 10.5rem);
}

.rp-today__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pc-space-4);
}

.rp-today__greeting {
  margin: 0;
  font-size: var(--pc-text-display);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.rp-today__date {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
}

.rp-avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-small);
  font-weight: 700;
}

.rp-today__question {
  margin: var(--pc-space-10) 0 var(--pc-space-3);
  padding-bottom: var(--pc-space-3);
  border-bottom: 1px solid var(--pc-border);
  font-size: var(--pc-text-body-lg);
  font-weight: 600;
}

.rp-today__list {
  display: grid;
  gap: var(--pc-space-1);
  margin: 0 calc(-1 * var(--pc-space-2));
}
</style>
