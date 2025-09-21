<template>
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
          <button
            @click="showAddTask = true"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
          >
            + Add Task
          </button>
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
      <div class="mt-8 text-center">
        <button class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full font-medium transition">
          View Monthly
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
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

function toYMD(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // local midnight
  return d.toLocaleDateString("en-CA"); // "2025-09-20"
}

const newTask = ref({
  title: "",
  details: "",
  date: toYMD(new Date()), // ✅ fixed
  completed: false,
});

const filteredTasks = computed(() =>
  tasks.value.filter(task => toYMD(task.date) === toYMD(selectedDate.value))
);

const completedCount = computed(() => tasks.value.filter((t) => t.completed).length);
const remainingCount = computed(() => tasks.value.filter((t) => !t.completed).length);

const dayLabel = computed(() =>
  selectedDate.value.toLocaleDateString("en-US", { weekday: "long" })
);

const currentWeekStart = computed(() => startOfWeek(selectedDate.value));

// Index of selected day within the current week (Mon=0 .. Sun=6)
const selectedDay = computed(() => {
  const s = currentWeekStart.value;
  const d = selectedDate.value;
  const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const sel = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((sel - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(6, diffDays));
});

// Highlight today's day if the viewed week is the current week
const todayIndex = computed(() => {
  const now = new Date();
  const sameWeek = startOfWeek(now).toDateString() === currentWeekStart.value.toDateString();
  if (!sameWeek) return null;
  const s = currentWeekStart.value;
  const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((todayStart - start) / (1000 * 60 * 60 * 24));
});

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toDateString().slice(4, 10);
}

async function addTaskLocal() {
  if (!newTask.value.title.trim()) return;
  await addTask({ ...newTask.value });
  await loadWeek();
  newTask.value = {
    title: "",
    details: "",
    date: toYMD(new Date()), // ✅ fixed
    completed: false,
  };
  showAddTask.value = false;
}

function startOfWeek(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function ymd(d) {
  return toYMD(d); // ✅ delegate to fixed helper
}

async function loadWeek() {
  const s = startOfWeek(selectedDate.value);
  const e = endOfWeek(selectedDate.value);
  await loadTasksForRange(ymd(s), ymd(e));
}

watch(selectedDate, loadWeek);
onMounted(() => {
  const now = new Date();
  selectedDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight
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
