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
            selectedDay === day.value ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'
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

const newTask = ref({
  title: "",
  details: "",
  date: new Date().toISOString().slice(0, 10),
  completed: false,
});

function toYMD(date) {
  return new Date(date).toISOString().split("T")[0];
}

const filteredTasks = computed(() =>
  tasks.value.filter(
    (task) => toYMD(task.date) === toYMD(selectedDate.value)
  )
);

const completedCount = computed(() => tasks.value.filter((t) => t.completed).length);
const remainingCount = computed(() => tasks.value.filter((t) => !t.completed).length);

const dayLabel = computed(() => selectedDate.value.toLocaleDateString('en-US', { weekday: 'long' }));

const currentWeekStart = computed(() => startOfWeek(selectedDate.value))

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
    date: new Date().toISOString().slice(0, 10),
    completed: false,
  };
  showAddTask.value = false;
}

function startOfWeek(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0,0,0,0)
  return s;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23,59,59,999)
  return e;
}

function ymd(d) { return d.toISOString().split('T')[0] }

async function loadWeek() {
  const s = startOfWeek(selectedDate.value)
  const e = endOfWeek(selectedDate.value)
  await loadTasksForRange(ymd(s), ymd(e))
}

watch(selectedDate, loadWeek)
onMounted(loadWeek)
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
