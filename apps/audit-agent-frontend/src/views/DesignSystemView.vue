<template>
  <PcAppShell
    v-model:capture-open="captureOpen"
    active="today"
    :inbox-count="4"
    :user="{ name: 'Abhishek' }"
    :is-pro="previewPro"
    can-install
    @navigate="announce(`Go to ${$event.label}`)"
    @focus="announce('Focus')"
    @capture="addTask"
    @voice="announce('Voice capture')"
    @upgrade="upsellOpen = true"
    @install="announce('Install app')"
  >
    <p class="ds-preview-note">Design system preview · sample data</p>

    <!-- Today: the reference screen every other page will follow. -->
    <section class="ds-today" aria-labelledby="today-greeting">
      <div class="ds-today__head">
        <div>
          <h1 id="today-greeting" class="ds-today__greeting">{{ greeting }}, Abhishek</h1>
          <p class="ds-today__date">{{ todayLabel }}</p>
        </div>
        <div class="ds-today__head-actions">
          <PcIconButton :icon="Bell" label="Notifications" />
          <span class="ds-avatar" aria-hidden="true">A</span>
        </div>
      </div>

      <h2 class="ds-today__question">What matters today?</h2>

      <div class="ds-today__list">
        <PcTaskRow
          v-for="task in tasks"
          :key="task.id"
          :title="task.title"
          :time="task.time"
          :meta="task.meta"
          :done="task.done"
          @toggle="task.done = !task.done"
          @open="openTask(task)"
        >
          <template v-if="task.focusable && !task.done" #action>
            <PcButton size="sm" :icon="Play" @click="announce(`Focus: ${task.title}`)">Focus</PcButton>
          </template>
        </PcTaskRow>
      </div>

      <PcButton variant="ghost" :icon="Plus" class="ds-today__add" @click="captureOpen = true">Add task</PcButton>

      <section class="ds-assistant" aria-label="PlanCraft suggestion">
        <p class="ds-assistant__name"><Sparkles :size="16" aria-hidden="true" /> PlanCraft</p>
        <p class="ds-assistant__text">You have {{ remaining }} {{ remaining === 1 ? 'task' : 'tasks' }} left today.</p>
        <PcButton variant="primary" @click="announce('Plan my afternoon')">Plan my afternoon</PcButton>
      </section>
    </section>

    <!-- Reference: tokens and components. -->
    <section class="ds-reference" aria-labelledby="ref-title">
      <h2 id="ref-title" class="ds-section-title">Foundations</h2>

      <div class="ds-controls">
        <div class="ds-theme-switch" role="radiogroup" aria-label="Theme">
          <button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            class="ds-theme-switch__option"
            :aria-checked="preference === option.value"
            @click="setThemePreference(option.value)"
          >
            <component :is="option.icon" :size="16" aria-hidden="true" />
            <span>{{ option.label }}</span>
          </button>
        </div>
        <label class="ds-toggle">
          <input v-model="previewPro" type="checkbox" />
          Preview as Pro
        </label>
      </div>

      <h3 class="ds-subhead">Buttons: one primary per context</h3>
      <div class="ds-row">
        <PcButton variant="primary" :icon="Play">Focus</PcButton>
        <PcButton :icon="Sparkles">Help me</PcButton>
        <PcButton variant="ghost">Not now</PcButton>
        <PcButton variant="danger" :icon="Trash2">Delete</PcButton>
        <PcButton variant="primary" loading>Saving</PcButton>
        <PcMenu :items="taskMenu" @select="announce" />
      </div>

      <h3 class="ds-subhead">Colour</h3>
      <div class="ds-swatches">
        <div v-for="swatch in SWATCHES" :key="swatch" class="ds-swatch">
          <span class="ds-swatch__chip" :style="{ background: `var(--pc-${swatch})` }"></span>
          <code>{{ swatch }}</code>
        </div>
      </div>

      <h3 class="ds-subhead">Type</h3>
      <div class="ds-type">
        <p v-for="step in TYPE_SCALE" :key="step.token" :style="{ fontSize: `var(--pc-text-${step.token})`, fontWeight: step.weight }">
          {{ step.label }} <code>{{ step.token }}</code>
        </p>
      </div>

      <h3 class="ds-subhead">Mobile navigation</h3>
      <div class="ds-phone-nav">
        <PcTabBar preview active="today" :inbox-count="4" @capture="captureOpen = true" @select="announce" />
      </div>
    </section>

    <p class="pc-sr-only" aria-live="polite">{{ lastAction }}</p>
    <p v-if="lastAction" class="ds-toast" aria-hidden="true">{{ lastAction }}</p>

    <PcSheet v-model:open="sheetOpen" :title="activeTask?.title || ''" :subtitle="activeTask ? `Today · ${activeTask.time}` : ''">
      <template #actions>
        <PcMenu :items="taskMenu" @select="announce" />
      </template>
      <div v-if="activeTask" class="ds-task-detail">
        <p v-if="activeTask.tag" class="ds-tag">{{ activeTask.tag }}</p>
        <p class="ds-task-detail__prompt"><Sparkles :size="16" aria-hidden="true" /> What would you like to do?</p>
        <div class="ds-task-detail__actions">
          <PcButton variant="primary" size="lg" block :icon="Play" @click="announce(`Focus: ${activeTask.title}`)">Focus</PcButton>
          <PcButton size="lg" block :icon="Sparkles" @click="announce('Help me')">Help me</PcButton>
        </div>
        <dl class="ds-task-detail__facts">
          <div>
            <dt>Notes</dt>
            <dd>{{ activeTask.notes || 'No notes yet.' }}</dd>
          </div>
          <div>
            <dt>Reminder</dt>
            <dd>{{ activeTask.time }}</dd>
          </div>
        </dl>
      </div>
      <template #footer>
        <PcButton variant="ghost" block :icon="CircleCheck" @click="completeActive">Mark complete</PcButton>
      </template>
    </PcSheet>

    <PcUpsellSheet
      v-model:open="upsellOpen"
      body="You’ve used your 3 complimentary AI Actions this week."
      @upgrade="upsellOpen = false; announce('Open Pro checkout')"
    />
  </PcAppShell>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  Archive,
  ArrowRightLeft,
  Bell,
  CalendarArrowUp,
  CircleCheck,
  Copy,
  Monitor,
  Moon,
  Pencil,
  Play,
  Plus,
  Share2,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-vue-next'
import { PcAppShell, PcButton, PcIconButton, PcMenu, PcSheet, PcTabBar, PcTaskRow, PcUpsellSheet, useTheme } from '@/design'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({ title: 'Design System | PlanCraft AI', description: 'Internal design system preview.', canonicalPath: '/design', noindex: true })

const { preference, setThemePreference } = useTheme()

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]
const SWATCHES = ['bg', 'surface', 'surface-2', 'border', 'text', 'text-muted', 'text-subtle', 'accent', 'accent-soft', 'success', 'danger']
const TYPE_SCALE = [
  { token: 'display', label: 'Good morning', weight: 600 },
  { token: 'heading', label: 'What matters today?', weight: 600 },
  { token: 'title', label: 'Finish design system', weight: 600 },
  { token: 'body', label: 'Finish component documentation', weight: 400 },
  { token: 'small', label: 'Today · 2:00 PM', weight: 400 },
  { token: 'caption', label: 'Reminder', weight: 500 },
]

const taskMenu = [
  { key: 'Edit', label: 'Edit', icon: Pencil },
  { key: 'Move to another day', label: 'Move to another day', icon: CalendarArrowUp },
  { key: 'Change workspace', label: 'Change workspace', icon: ArrowRightLeft },
  { key: 'Duplicate', label: 'Duplicate', icon: Copy },
  { key: 'Share', label: 'Share', icon: Share2 },
  { key: 'Archive', label: 'Archive', icon: Archive, dividerBefore: true },
  { key: 'Delete', label: 'Delete', icon: Trash2, danger: true },
]

const tasks = reactive([
  { id: 1, title: 'Prepare for AWS interview', time: '9:00 AM', meta: '45 min', focusable: true, done: false },
  { id: 2, title: 'Finish design system', time: '2:00 PM', meta: 'Work', tag: 'Work', focusable: true, done: false, notes: 'Finish component documentation and review the task sheet on mobile.' },
  { id: 3, title: 'Call dentist', time: '4:00 PM', meta: '', focusable: false, done: false },
])

const sheetOpen = ref(false)
const captureOpen = ref(false)
const upsellOpen = ref(false)
const previewPro = ref(false)
const activeTask = ref(null)
const lastAction = ref('')
let toastTimer = null

const remaining = computed(() => tasks.filter((task) => !task.done).length)
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})
const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

function announce(action) {
  lastAction.value = `${action}`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (lastAction.value = ''), 2200)
}

function openTask(task) {
  activeTask.value = task
  sheetOpen.value = true
}

function completeActive() {
  if (activeTask.value) activeTask.value.done = true
  sheetOpen.value = false
  announce('Marked complete')
}

function addTask(text) {
  tasks.push({ id: Date.now(), title: text, time: '', meta: 'Inbox', focusable: true, done: false })
  captureOpen.value = false
  announce('Task added')
}
</script>

<style scoped>
.ds-preview-note {
  margin: 0;
  padding: calc(env(safe-area-inset-top) + var(--pc-space-2)) var(--pc-space-4) var(--pc-space-2);
  border-bottom: 1px dashed var(--pc-border);
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
  text-align: center;
}

.ds-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pc-space-4);
  margin-top: var(--pc-space-4);
}

.ds-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-2);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.ds-theme-switch {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
}

.ds-theme-switch__option {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-1);
  padding: var(--pc-space-1) var(--pc-space-3);
  border: none;
  border-radius: calc(var(--pc-radius-md) - 2px);
  background: none;
  color: var(--pc-text-muted);
  font-family: var(--pc-font);
  font-size: var(--pc-text-small);
  cursor: pointer;
}

.ds-theme-switch__option[aria-checked='true'] {
  background: var(--pc-surface-2);
  color: var(--pc-text);
  font-weight: 600;
}

.ds-today {
  max-width: 40rem;
  margin: 0 auto;
  padding: var(--pc-space-8) var(--pc-space-4) var(--pc-space-6);
}

.ds-today__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pc-space-4);
}

.ds-today__greeting {
  margin: 0;
  font-size: var(--pc-text-display);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.ds-today__date {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
}

.ds-today__head-actions {
  display: flex;
  align-items: center;
  gap: var(--pc-space-2);
}

.ds-avatar {
  display: inline-flex;
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

.ds-today__question {
  margin: var(--pc-space-10) 0 var(--pc-space-3);
  padding-bottom: var(--pc-space-3);
  border-bottom: 1px solid var(--pc-border);
  font-size: var(--pc-text-body-lg);
  font-weight: 600;
}

.ds-today__list {
  display: grid;
  gap: var(--pc-space-1);
  margin: 0 calc(-1 * var(--pc-space-2));
}

.ds-today__add {
  margin-top: var(--pc-space-3);
}

.ds-assistant {
  display: grid;
  justify-items: start;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-10);
  padding-top: var(--pc-space-5);
  border-top: 1px solid var(--pc-border);
}

.ds-assistant__name {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-2);
  margin: 0;
  color: var(--pc-accent-text);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.ds-assistant__text {
  margin: 0 0 var(--pc-space-2);
  color: var(--pc-text);
}

.ds-reference {
  max-width: 56rem;
  margin: var(--pc-space-8) auto 0;
  padding: var(--pc-space-8) var(--pc-space-4);
  border-top: 1px solid var(--pc-border);
}

.ds-section-title {
  margin: 0;
  font-size: var(--pc-text-heading);
  font-weight: 600;
}

.ds-subhead {
  margin: var(--pc-space-8) 0 var(--pc-space-3);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.ds-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pc-space-3);
}

.ds-swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: var(--pc-space-3);
}

.ds-swatch {
  display: grid;
  gap: var(--pc-space-2);
  font-size: var(--pc-text-caption);
  color: var(--pc-text-muted);
}

.ds-swatch__chip {
  height: 2.75rem;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
}

.ds-type {
  display: grid;
  gap: var(--pc-space-2);
}

.ds-type p {
  margin: 0;
}

.ds-type code,
.ds-swatch code {
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
  font-weight: 400;
}

.ds-phone-nav {
  max-width: 24rem;
  overflow: hidden;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
}

.ds-task-detail {
  display: grid;
  gap: var(--pc-space-5);
}

.ds-tag {
  justify-self: start;
  margin: 0;
  padding: 2px var(--pc-space-2);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface-2);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
  font-weight: 600;
}

.ds-task-detail__prompt {
  display: inline-flex;
  align-items: center;
  gap: var(--pc-space-2);
  margin: 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.ds-task-detail__actions {
  display: grid;
  gap: var(--pc-space-2);
}

.ds-task-detail__facts {
  display: grid;
  gap: var(--pc-space-4);
  margin: 0;
  padding-top: var(--pc-space-5);
  border-top: 1px solid var(--pc-border);
}

.ds-task-detail__facts dt {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
  font-weight: 600;
}

.ds-task-detail__facts dd {
  margin: var(--pc-space-1) 0 0;
}

.ds-toast {
  position: fixed;
  left: 50%;
  bottom: calc(5.5rem + env(safe-area-inset-bottom));
  z-index: calc(var(--pc-z-overlay) - 1);
  transform: translateX(-50%);
  margin: 0;
  padding: var(--pc-space-2) var(--pc-space-4);
  border-radius: var(--pc-radius-full);
  background: var(--pc-text);
  color: var(--pc-bg);
  font-size: var(--pc-text-small);
  box-shadow: var(--pc-shadow-overlay);
}

@media (min-width: 768px) {
  .ds-toast {
    bottom: var(--pc-space-8);
  }
}
</style>
