<template>
  <!-- Task Board -->
  <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
    <!-- Header with button -->
    <!-- <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg sm:text-xl font-semibold">📋 Today's Tasks</h2>
      <button
        @click="openPlanner"
        class="flex items-center gap-2 
               bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500
               hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600
               text-white px-3 sm:px-4 py-1.5 sm:py-2 
               rounded-lg shadow-md text-sm sm:text-base font-medium 
               transition-all duration-200"
      >
        <span class="text-base sm:text-lg">➕</span>
        <span>Add Task</span>
      </button>
    </div> -->
    <div class="flex justify-between items-center mb-4 gap-2">
      <h2 class="text-lg sm:text-xl font-semibold whitespace-nowrap">📋 Today's Tasks</h2>
      <button
        @click="openPlanner"
        class="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-md text-sm sm:text-base font-medium"
      >
        <span class="text-base sm:text-lg">+</span>
        <span>Add Task</span>
      </button>
    </div>

    <div class="flex gap-3 overflow-x-auto pb-2 mb-4 mt-2">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        @click="activeCategory = category"
        :class="[
          'flex-shrink-0 px-3 py-1 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out',
          activeCategory === category
            ? 'bg-indigo-700 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
        ]"
      >
        <span class="mr-1 text-base leading-none">{{ categoryIcon(category) }}</span>
        {{ category }}
      </button>
    </div>

    <!-- Draggable tasks -->
    <div class="max-h-96 overflow-y-auto pr-2 scrollbar-plan">
      <draggable
        v-model="tasks"
        item-key="id"
        class="space-y-3"
        handle=".drag-handle"
        :disabled="activeCategory !== 'All'"
        @end="persistOrder"
      >
        <template #item="{ element: task }">
          <div
            v-if="shouldRenderTask(task)"
            class="bg-slate-900/40 p-4 rounded-xl shadow border border-slate-700/50 transition-all"
          >
            <div class="flex items-start gap-3">
              <!-- Checkbox -->
              <input
                type="checkbox"
                :checked="task.completed"
                @change="() => toggleComplete(task)"
                class="mt-1 w-5 h-5 cursor-pointer accent-green-500"
              />

              <!-- Main body -->
              <div class="flex-1">
                <div class="flex justify-between items-start gap-3 flex-wrap">
                  <div class="flex items-center gap-3">
                    <span
                      class="text-base sm:text-lg font-medium"
                      :class="{ 'line-through text-slate-500': task.completed }"
                    >
                      {{ task.title }}
                    </span>
                    <div
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/70 text-xs font-medium shadow-sm"
                      :class="categoryColor(task.category)"
                    >
                      <span class="text-base leading-none">{{ categoryIcon(task.category) }}</span>
                      <span>{{ categoryLabel(task.category) }}</span>
                    </div>
                  </div>
                    <div class="flex items-center gap-2">
                    <a
                      v-if="task?.join?.url"
                      :href="task.join.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white"
                      :title="`Join ${task?.join?.provider || 'meeting'}`"
                    >
                      Join
                    </a>
                    <span class="text-xs text-slate-400">{{ task.date }}</span>
                    <button
                      @click.stop="openDialog(task)"
                      class="text-slate-400 text-sm hover:text-slate-200"
                      title="Edit task"
                    >
                      ✏️
                    </button>
                    <button
                      v-if="reminderActiveByTask[task.id]"
                      @click.stop="onReminderClick(task)"
                      class="text-yellow-400 text-sm hover:opacity-80"
                      title="Reminder active — click to manage"
                    >
                      🔔
                    </button>
                    <!-- Expand toggle -->
                    <!-- <button
                    @click="toggleExpand(task.id)"
                    class="text-slate-400 hover:text-slate-200"
                  >
                    {{ expanded.has(task.id) ? "▾" : "▸" }}
                  </button> -->
                  </div>
                </div>

                <!-- Expanded details -->
                <!-- Expanded details -->
                <transition name="fade">
                  <div v-if="expanded.has(task.id)" class="mt-3 space-y-3">
                    <p v-if="task.details" class="text-sm text-slate-300">
                      {{ task.details }}
                    </p>

                    <!-- Meeting extras -->
                    <div v-if="task?.source === 'google_calendar'" class="text-xs text-slate-300 flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">Calendar</span>
                      <a v-if="task?.htmlLink" :href="task.htmlLink" target="_blank" rel="noopener" class="text-indigo-300 underline hover:text-indigo-200">Open in Google Calendar</a>
                    </div>

                    <!-- Optional Link -->
                    <p v-if="task.link" class="text-sm">
                      <a
                        :href="task.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                      >
                        🔗 Open Link
                      </a>
                    </p>

                    <ul v-if="task.logs?.length" class="space-y-1 text-xs text-slate-400">
                      <li v-for="(log, idx) in task.logs" :key="idx">– {{ log }}</li>
                    </ul>

                    <div class="flex gap-2">
                      <button
                        @click="openDialog(task)"
                        class="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        @click="deleteTask(task)"
                        class="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </transition>
              </div>

              <!-- Drag handle with expand toggle -->
              <button
                @click.stop="toggleExpand(task.id)"
                class="drag-handle cursor-grab text-slate-500 ml-2 hover:text-slate-300"
                title="Expand/Collapse"
              >
                {{ expanded.has(task.id) ? '▾' : '☰' }}
              </button>
            </div>
          </div>
        </template>
      </draggable>
      <p
        v-if="visibleTasks.length === 0"
        class="text-sm text-slate-400 mt-4"
      >
        No tasks in this category yet.
      </p>
    </div>
  </section>

  <!-- Task dialog -->
  <TaskPlannerDialog
    v-if="showPlanner"
    :open="showPlanner"
    :edit-mode="!!selectedTask"
    :date="today"
    :task="selectedTask"
    @saved="handleSave"
    @close="closePlanner"
  />
</template>

<script setup>
import draggable from 'vuedraggable'
import { ref, onMounted, watch, computed } from 'vue'
import { useTasks } from '@/composables/useTasks'
import { addTaskToFirebase, updateTaskInFirebase } from '@/services/firebaseService'
import TaskPlannerDialog from './TaskPlannerDialog.vue'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useAuthStore } from '@/stores/authStore'
import { getReminderStatus, scheduleReminder } from '@/services/reminderService'
import api from '@/services/api'
import { getPreferences as getUserPreferences } from '@/services/settingsService'
import { TASK_CATEGORY_FILTERS, getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'

const { tasks, loadTasks, toggleComplete, deleteTask, persistOrder } = useTasks()

const selectedTask = ref(null)
const showPlanner = ref(false)
const today = toLocalDateKey(new Date())

// Track expanded task IDs
const expanded = ref(new Set())

// Reminder badges map: { [taskId]: true }
const reminderActiveByTask = ref({})
const userPrefs = ref({ notifications: {}, integrations: {} })
const authStore = useAuthStore()
const categories = TASK_CATEGORY_FILTERS
const activeCategory = ref('All')

const visibleTasks = computed(() => {
  if (activeCategory.value === 'All') return tasks.value
  const selected = activeCategory.value
  return tasks.value.filter((task) => resolveCategory(task?.category) === selected)
})

function categoryIcon(value) {
  return getCategoryIcon(value)
}

function categoryColor(value) {
  return getCategoryColor(value)
}

function categoryLabel(value) {
  return resolveCategory(value)
}

function shouldRenderTask(task) {
  if (!task) return false
  if (activeCategory.value === 'All') return true
  return resolveCategory(task?.category) === activeCategory.value
}

function toggleExpand(id) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

function openPlanner() {
  showPlanner.value = true
}
function closePlanner() {
  showPlanner.value = false
  selectedTask.value = null
}

function buildLocalIso(ymd, hhmm) {
  try {
    const [y, m, d] = String(ymd || '').split('-').map((n) => parseInt(n, 10))
    const [hh, mm] = String(hhmm || '00:00').split(':').map((n) => parseInt(n, 10))
    if (!y || !m || !d) throw new Error('invalid date parts')
    const local = new Date(y, (m - 1), d, (hh || 0), (mm || 0), 0, 0)
    return local.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

async function handleSave(payload) {
  if (Array.isArray(payload)) {
    await loadTasks()
    return closePlanner()
  }
  let savedId = payload.id
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    savedId = saved?.id || savedId
    if (saved?.__notifyMeta) payload.__notifyMeta = saved.__notifyMeta
  }

  // Sync reminder after task is saved and we have an id
  try {
    const uid = authStore?.user?.uid
    if (uid && savedId) {
      const notifyMeta = payload.__notifyMeta || null
      if (payload.__notifyMeta) delete payload.__notifyMeta
      const scheduledByBackend = !!notifyMeta?.scheduled
      if (payload?.reminderTime) {
        if (scheduledByBackend) return
        const iso = buildLocalIso(payload.date, payload.reminderTime)
        const prefs = userPrefs.value?.notifications || {}
        await scheduleReminder(uid, savedId, payload.title, iso, prefs)
      } else {
        await api.post('/reminders/cancel', { userId: uid, taskId: savedId })
      }
    }
  } catch (e) {
    console.warn('Reminder sync (board) failed:', e?.response?.data || e?.message)
  }

  await loadTasks()
  closePlanner()
}

function openDialog(task = null) {
  selectedTask.value = task
  showPlanner.value = true
}

onMounted(loadTasks)

// Load user preferences for dynamic reminder channels
onMounted(async () => {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      const res = await getUserPreferences(uid)
      userPrefs.value = res || { notifications: {}, integrations: {} }
    }
  } catch (e) {
    console.warn('Failed to load user prefs in TaskBoard:', e)
  }
})

// Refresh reminder badges whenever tasks list changes (ids/dates) or user changes
async function refreshReminderBadges() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) { reminderActiveByTask.value = {}; return }
    const arr = Array.isArray(tasks.value) ? tasks.value : []
    const results = await Promise.all(
      arr.map(async (t) => {
        try {
          const r = await getReminderStatus(uid, t.id)
          return [t.id, !!r?.hasActive]
        } catch {
          return [t.id, false]
        }
      })
    )
    const map = {}
    for (const [id, flag] of results) map[id] = flag
    reminderActiveByTask.value = map
  } catch (e) {
    console.warn('refreshReminderBadges failed', e)
  }
}

watch(
  () => ({ ids: (tasks.value || []).map(t => t.id).join(','), dates: (tasks.value || []).map(t => t.date).join(',') }),
  () => { refreshReminderBadges() },
  { immediate: true }
)

async function onReminderClick(task) {
  try {
    const uid = authStore?.user?.uid
    if (!uid || !task?.id) return
    const choice = window.prompt('Reminder active. Type "cancel" to cancel, or leave empty to dismiss:')
    if (choice && choice.toLowerCase() === 'cancel') {
      await api.post('/reminders/cancel', { userId: uid, taskId: task.id })
      await refreshReminderBadges()
    }
  } catch (e) {
    console.warn('Reminder manage failed', e?.response?.data || e?.message)
  }
}

</script>

<style scoped>
.v-move,
.v-enter-active,
.v-leave-active {
  transition: all 180ms ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
