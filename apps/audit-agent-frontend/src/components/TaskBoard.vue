<template>
  <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
      <div class="flex items-center gap-3">
        <h2 class="text-lg sm:text-xl font-semibold whitespace-nowrap">📋 Today's Tasks</h2>
        <div class="flex items-center gap-2 text-xs text-slate-200">
          <div class="h-2.5 w-28 rounded-full bg-slate-800 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-500 transition-all duration-300"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <span class="font-semibold">{{ completedCount }}/{{ totalCount }}</span>
        </div>
      </div>
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

    <div class="max-h-96 overflow-y-auto pr-2 scrollbar-plan space-y-4">
      <draggable
        v-model="activeTasks"
        item-key="id"
        class="space-y-3"
        handle=".drag-handle"
        :disabled="activeCategory !== 'All'"
        @end="persistOrder"
      >
        <template #item="{ element: task }">
          <div
            v-if="shouldRenderTask(task)"
            class="bg-slate-900/60 p-4 rounded-xl shadow border border-slate-700/50 transition-all duration-200 hover:border-indigo-400/60"
          >
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                :checked="task.completed"
                @change="() => toggleComplete(task)"
                class="mt-1 w-5 h-5 cursor-pointer accent-emerald-500 transition-transform duration-150 hover:scale-105"
              />

              <div class="flex-1">
                <div class="flex justify-between items-start gap-3 flex-wrap">
                  <div class="flex items-center gap-3">
                    <span class="text-base sm:text-lg font-semibold text-white">{{ task.title }}</span>
                    <div
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/70 text-xs font-medium shadow-sm"
                      :class="categoryColor(task.category)"
                    >
                      <span class="text-base leading-none">{{ categoryIcon(task.category) }}</span>
                      <span>{{ categoryLabel(task.category) }}</span>
                    </div>
                    <span
                      v-if="task?.source === 'google_calendar'"
                      class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-indigo-500/40 text-indigo-200 bg-indigo-900/40"
                    >
                      Google
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <a
                      v-if="meetingLink(task)"
                      :href="meetingLink(task).url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white"
                      :title="meetingLink(task).label"
                    >
                      {{ meetingLink(task).label }}
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
                  </div>
                </div>

                <transition name="fade">
                  <div v-if="expanded.has(task.id)" class="mt-3 space-y-3">
                    <p v-if="formattedDetails(task)" class="text-sm text-slate-300 whitespace-pre-line">
                      {{ formattedDetails(task) }}
                    </p>

                    <div v-if="task?.source === 'google_calendar'" class="text-xs text-slate-300 flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">Calendar</span>
                      <a v-if="task?.htmlLink" :href="task.htmlLink" target="_blank" rel="noopener" class="text-indigo-300 underline hover:text-indigo-200">Open in Google Calendar</a>
                    </div>

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

      <p v-if="activeTasks.length === 0" class="text-sm text-slate-400">
        No tasks in this category yet.
      </p>

      <div class="pt-2">
        <button
          class="flex items-center gap-2 text-xs text-slate-300 hover:text-indigo-200"
          @click="showCompleted = !showCompleted"
        >
          <span>{{ showCompleted ? '▾' : '▸' }}</span>
          <span>Completed today ({{ completedTasks.length }})</span>
        </button>
        <transition name="fade">
          <div v-if="showCompleted && completedTasks.length" class="mt-2 space-y-2">
            <div
              v-for="task in completedTasks"
              :key="task.id"
              class="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 flex items-start gap-2 text-slate-300"
            >
              <span class="text-emerald-300">✅</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-100">{{ task.title }}</p>
                <p class="text-[11px] text-slate-400">
                  Completed • {{ completionLabel(task) }}
                </p>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </section>

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
import { resolveReminderIso } from '@/utils/timeHelper.js'
import { resolveTaskMeetingLink } from '@/utils/taskLinks'
import { describeTaskDetails } from '@/utils/taskDisplay'

const { tasks, loadTasks, toggleComplete, deleteTask: deleteTaskFn, persistOrder } = useTasks()

const selectedTask = ref(null)
const showPlanner = ref(false)
const today = toLocalDateKey(new Date())
const showCompleted = ref(true)

// Track expanded task IDs
const expanded = ref(new Set())

const reminderActiveByTask = ref({})

const categories = ['All', 'Work', 'Health', 'Learning', 'Personal', 'Finance', 'Routine']
const activeCategory = ref('All')

const visibleTasks = computed(() =>
  tasks.value.filter((task) => activeCategory.value === 'All' || categoryLabel(task.category) === activeCategory.value),
)

const activeTasks = computed(() => visibleTasks.value.filter((t) => !t.completed))
const completedTasks = computed(() => visibleTasks.value.filter((t) => t.completed))
const totalCount = computed(() => visibleTasks.value.length)
const completedCount = computed(() => completedTasks.value.length)
const progressPercent = computed(() => (totalCount.value ? Math.round((completedCount.value / totalCount.value) * 100) : 0))

const authStore = useAuthStore()

const reminderTimeChange = ref(null)

const userPrefs = ref({ notifications: {}, integrations: {} })

const autoLoad = ref(false)

const showReminderDialog = ref(false)
const reminderTask = ref(null)
const reminderTime = ref(null)
const reminderLoading = ref(false)
const reminderHint = ref('')

watch(
  () => authStore.user?.uid,
  async (uid) => {
    if (!uid) return
    await loadTasks()
    await refreshReminderBadges(tasks.value)
  },
  { immediate: true },
)

watch(
  () => tasks.value.map((t) => t.id).join(','),
  () => {
    refreshReminderBadges(tasks.value)
  },
)

onMounted(async () => {
  await loadTasks()
})

function categoryLabel(category) {
  if (!category) return 'Routine'
  if (TASK_CATEGORY_FILTERS.includes(category)) return category
  return resolveCategory(category)
}

function categoryIcon(category) {
  return getCategoryIcon(categoryLabel(category))
}

function categoryColor(category) {
  return getCategoryColor(categoryLabel(category))
}

function shouldRenderTask(task) {
  return activeCategory.value === 'All' || categoryLabel(task.category) === activeCategory.value
}

function formattedDetails(task) {
  return task.details?.trim?.()
}

function completionLabel(task) {
  return task.completedAt
    ? new Date(task.completedAt?.toDate?.() || task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Just now'
}

function openPlanner() {
  selectedTask.value = null
  showPlanner.value = true
}

function closePlanner() {
  showPlanner.value = false
  selectedTask.value = null
}

function openDialog(task) {
  selectedTask.value = task
  showPlanner.value = true
}

function toggleExpand(taskId) {
  if (expanded.value.has(taskId)) expanded.value.delete(taskId)
  else expanded.value.add(taskId)
}

async function handleSave(payload) {
  if (Array.isArray(payload)) {
    await loadTasks()
    return
  }
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    payload.id = saved.id
  }
  await loadTasks()
  closePlanner()
}

function meetingLink(task) {
  return resolveTaskMeetingLink(task)
}

function formattedReminderTime(task) {
  if (!task?.reminderTime) return null
  try {
    const iso = resolveReminderIso(task.date, task.reminderTime, task.timezone || 'UTC')
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch (err) {
    console.warn('reminder-time-change', err)
    return task.reminderTime
  }
}

async function refreshReminderBadges(currentTasks = []) {
  if (!authStore?.user?.uid) return
  const uid = authStore.user.uid
  try {
    const results = await Promise.all(
      currentTasks.map(async (t) => {
        try {
          const r = await getReminderStatus(uid, t.id)
          return [t.id, !!r?.hasActive]
        } catch {
          return [t.id, false]
        }
      }),
    )
    const map = {}
    for (const [id, flag] of results) map[id] = flag
    reminderActiveByTask.value = map
  } catch (error) {
    console.warn('refreshReminderBadges failed', error)
  }
}

async function onReminderClick(task) {
  reminderTask.value = task
  reminderTime.value = task.reminderTime || null
  reminderHint.value = formattedReminderTime(task)
  showReminderDialog.value = true
}

async function handleReminderSave() {
  if (!reminderTask.value || !authStore?.user?.uid) return
  reminderLoading.value = true
  try {
    const iso = resolveReminderIso(reminderTask.value.date, reminderTime.value, reminderTask.value.timezone || 'UTC')
    await scheduleReminder({
      userId: authStore.user.uid,
      taskId: reminderTask.value.id,
      reminderTime: iso,
      timezone: reminderTask.value.timezone || 'UTC',
      channels: userPrefs.value?.notifications?.channels || [],
    })
    reminderActiveByTask.value = { ...reminderActiveByTask.value, [reminderTask.value.id]: true }
    showReminderDialog.value = false
  } catch (error) {
    console.warn('schedule reminder failed', error?.message || error)
  } finally {
    reminderLoading.value = false
  }
}
const deleteTask = async (task) => {
  await deleteTaskFn(task)
}
</script>
