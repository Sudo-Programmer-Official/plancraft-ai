<template>
  <!-- Added: Standardized Add Task header and Monthly link -->
  <!-- <div class="flex items-center justify-between mb-4">
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

    <RouterLink 
      to="/monthly" 
      class="text-sm sm:text-base text-indigo-600 hover:text-indigo-800 underline"
    >
      📆 View Monthly
    </RouterLink>
  </div> -->
  <div class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white overflow-x-hidden">
    <!-- Page Container -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
      <!-- Header -->
      <header class="text-center mb-8">
        <h1 class="text-3xl font-bold">Weekly Tasks</h1>
        <p class="text-gray-300">
          {{ completedCount }} tasks completed, {{ remainingCount }} remaining
        </p>
      </header>

      <!-- Days of the Week -->
      <nav class="flex justify-between mb-6">
        <button
          v-for="day in days"
          :key="day.label"
          @click="selectedDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + day.value)"
          :class="[
            'px-3 py-1 rounded-lg font-medium transition',
            selectedDay === day.value
              ? 'bg-indigo-500 text-white'
              : (todayIndex !== null && todayIndex === day.value)
                ? 'bg-indigo-700/50 text-white border border-indigo-400'
                : 'text-gray-400 hover:text-white'
          ]"
        >
          {{ day.label }}
        </button>
      </nav>

      <!-- Task List -->
      <section class="bg-black/30 rounded-2xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Tasks for {{ dayLabel }}</h2>
          <!-- <button
            @click="showAddTask = true"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
          >
            + Add Task
          </button> -->
        </div>

        <TransitionGroup name="fade-move" tag="ul" class="space-y-3">
          <li
            v-for="task in filteredTasks"
            :key="task.id"
            class="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl"
          >
            <div>
              <p
                :class="[
                  'font-medium',
                  task.completed ? 'line-through text-gray-400' : 'text-white'
                ]"
              >
                {{ task.title }}
              </p>
              <p v-if="task.details" class="text-sm text-gray-400">{{ task.details }}</p>
            </div>

            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-400">
                {{ formatDate(task.date) }}
              </span>
              <input
                type="checkbox"
                :checked="task.completed"
                @change="toggleComplete(task)"
                class="w-5 h-5 accent-indigo-500"
              />
            </div>
          </li>
        </TransitionGroup>
      </section>

      <!-- View Monthly -->
      <!-- <div class="mt-8 text-center">
        <button class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full font-medium transition">
          View Monthly
        </button>
      </div> -->
    </div>
  </div>
  <!-- Added: Centralized Task Planner Dialog reuse -->
  <TaskPlannerDialog
    v-if="showPlanner"
    :open="showPlanner"
    :date="plannerDate"
    @saved="reload"
    @close="closePlanner"
  />
</template>

<script setup>
// Added: Task planner state + imports
import { ref as vueRef } from 'vue'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { toLocalDateKey as _toLocalDateKey } from '@/utils/dateHelper.js'

const showPlanner = vueRef(false)
const plannerDate = _toLocalDateKey(new Date())
const openPlanner = () => { showPlanner.value = true }
const closePlanner = () => { showPlanner.value = false }
const reload = () => {}
import { ref, computed, watch, onMounted } from "vue";
import { useTasks } from "@/composables/useTasks";

const { tasks, toggleComplete, loadTasksForRange, addTask } = useTasks();

const days = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

const selectedDate = ref(new Date());
const showAddTask = ref(false);

// --- Helpers ---
function toYMD(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // local midnight
  return d.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
}

// ✅ Always store as YYYY-MM-DD string
const newTask = ref({
  title: "",
  details: "",
  date: toYMD(new Date()),
  completed: false,
});

// --- Filtering ---
const filteredTasks = computed(() => {
  const target = toYMD(selectedDate.value);
  return tasks.value.filter((task) => {
    const taskDate = typeof task.date === "string" ? task.date : toYMD(task.date);
    return taskDate === target;
  });
});

// --- Stats ---
const completedCount = computed(() => tasks.value.filter((t) => t.completed).length);
const remainingCount = computed(() => tasks.value.filter((t) => !t.completed).length);

const dayLabel = computed(() =>
  selectedDate.value.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
);

const currentWeekStart = computed(() => startOfWeek(selectedDate.value));

// --- Indexing ---
const selectedDay = computed(() => {
  const s = currentWeekStart.value;
  const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const sel = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), selectedDate.value.getDate());
  return Math.round((sel - start) / (1000 * 60 * 60 * 24));
});

const todayIndex = computed(() => {
  const now = new Date();
  const sameWeek = toYMD(startOfWeek(now)) === toYMD(currentWeekStart.value);
  if (!sameWeek) return null;
  return Math.round((now - currentWeekStart.value) / (1000 * 60 * 60 * 24));
});

// --- Format (no UTC shift) ---
function formatDate(dateStr) {
  return dateStr; // already YYYY-MM-DD, safe to display
}

// --- Add Task ---
async function addTaskLocal() {
  if (!newTask.value.title.trim()) return;
  newTask.value.date = toYMD(selectedDate.value); // ✅ normalize
  await addTask({ ...newTask.value });
  await loadWeek();
  newTask.value = { title: "", details: "", date: toYMD(new Date()), completed: false };
  showAddTask.value = false;
}

// --- Week Helpers ---
function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // Sun=0..Sat=6
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

async function loadWeek() {
  const s = startOfWeek(selectedDate.value);
  const e = endOfWeek(selectedDate.value);
  await loadTasksForRange(toYMD(s), toYMD(e));
}

watch(selectedDate, loadWeek);
onMounted(() => {
  const now = new Date();
  selectedDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // normalized
  loadWeek();
});
</script>

<style scoped>
.fade-move-enter-active, .fade-move-leave-active {
  transition: all 200ms ease;
}
.fade-move-enter-from, .fade-move-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
