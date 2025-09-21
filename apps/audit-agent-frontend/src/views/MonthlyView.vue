<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-900 via-blue-900 to-blue-800 px-6 py-10 text-white">
    <!-- Header -->
    <header class="text-center mb-8">
      <h1 class="text-3xl font-bold">Monthly Task Overview</h1>
      <p class="text-gray-300">{{ tasksForSelectedDay.length }} tasks on {{ selectedDateLabel }}</p>
    </header>

    <!-- Calendar -->
    <section class="bg-black/30 rounded-2xl p-6 shadow-lg mb-8">
      <div class="flex justify-between items-center mb-4">
        <button @click="prevMonth" class="px-3 py-1 bg-indigo-600 rounded">‹</button>
        <h2 class="text-xl font-semibold">
          {{ currentMonthLabel }} {{ currentYear }}
        </h2>
        <button @click="nextMonth" class="px-3 py-1 bg-indigo-600 rounded">›</button>
      </div>

      <div class="grid grid-cols-7 gap-2 text-center">
        <div v-for="d in daysOfWeek" :key="d" class="text-gray-400 font-medium">{{ d }}</div>

        <div
          v-for="day in calendarDays"
          :key="day.date.toISOString()"
          @click="selectDate(day.date)"
          :class="[
            'cursor-pointer rounded-lg py-2',
            day.isCurrentMonth ? 'text-white' : 'text-gray-500',
            isToday(day.date) ? 'border border-indigo-400' : '',
            isSelected(day.date) ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-500/40'
          ]"
        >
          {{ day.date.getDate() }}
        </div>
      </div>
    </section>

    <!-- Task List for Selected Date -->
    <section class="bg-black/30 rounded-2xl p-6 shadow-lg">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Tasks for {{ selectedDateLabel }}</h2>
        <button
          @click="showAddTask = true"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
        >
          + Add Task
        </button>
      </div>

      <TransitionGroup name="fade-move" tag="ul" class="space-y-3">
        <li
          v-for="task in tasksForSelectedDay"
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

    <!-- Add Task Modal -->
    <div
      v-if="showAddTask"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    >
      <div class="bg-white text-gray-900 rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 class="text-lg font-bold mb-4">Add Task</h2>

        <input
          v-model="newTask.title"
          placeholder="Task title"
          class="w-full border rounded-lg p-2 mb-3"
        />

        <textarea
          v-model="newTask.details"
          placeholder="Details (optional)"
          rows="3"
          class="w-full border rounded-lg p-2 mb-3"
        ></textarea>

        <div class="flex justify-end gap-3">
          <button
            @click="showAddTask = false"
            class="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="addTaskLocal"
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useTasks } from "@/composables/useTasks";

const { tasks, toggleComplete, loadTasksForRange, addTask } = useTasks();

const today = new Date();
const selectedDate = ref(new Date());
const currentMonth = ref(today.getMonth());
const currentYear = ref(today.getFullYear());
const showAddTask = ref(false);

const newTask = ref({
  title: "",
  details: "",
  date: toYMD(new Date()),
  completed: false,
});

const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

function getCalendarDays(month, year) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  const startDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: new Date(year, month, i - startDayOfWeek + 1), isCurrentMonth: false });
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  const remaining = 42 - days.length; // 6 weeks grid
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

// function toYMD(date) {
//   return new Date(date).toISOString().split("T")[0];
// }
function toYMD(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0) // local midnight
  return d.toLocaleDateString("en-CA") // "2025-09-20"
}

const calendarDays = computed(() => getCalendarDays(currentMonth.value, currentYear.value));

function isToday(date) {
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isSelected(date) {
  return (
    date.getDate() === selectedDate.value.getDate() &&
    date.getMonth() === selectedDate.value.getMonth() &&
    date.getFullYear() === selectedDate.value.getFullYear()
  );
}

function selectDate(date) {
  selectedDate.value = date;
}

const currentMonthLabel = computed(() =>
  new Date(currentYear.value, currentMonth.value).toLocaleString("default", { month: "long" })
);

// const selectedDateLabel = computed(() => selectedDate.value.toDateString());
const selectedDateLabel = computed(() =>
  selectedDate.value.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
);

// const tasksForSelectedDay = computed(() =>
//   tasks.value.filter(
//     (task) =>
//       new Date(task.date).toDateString() === selectedDate.value.toDateString()
//   )
// );
const tasksForSelectedDay = computed(() =>
  tasks.value.filter(
    (task) => toYMD(task.date) === toYMD(selectedDate.value)
  )
);

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
}

async function addTaskLocal() {
  if (!newTask.value.title.trim()) return;
  newTask.value.date = selectedDate.value.toISOString().slice(0, 10);
  await addTask({ ...newTask.value });
  await loadMonth();
  newTask.value = { title: "", details: "", date: today.toISOString().slice(0, 10), completed: false };
  showAddTask.value = false;
}

function ymd(d) { return d.toISOString().split('T')[0] }
async function loadMonth() {
  const start = new Date(currentYear.value, currentMonth.value, 1)
  const end = new Date(currentYear.value, currentMonth.value + 1, 0)
  await loadTasksForRange(ymd(start), ymd(end))
}

watch([currentMonth, currentYear], loadMonth)
watch(selectedDate, loadMonth)
// onMounted(loadMonth);
onMounted(() => {
  // Normalize today to midnight so comparisons work
  const now = new Date()
  selectedDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Load current month tasks immediately
  loadMonth()
})
</script>

<style scoped>
.fade-move-enter-active, .fade-move-leave-active { transition: all 200ms ease; }
.fade-move-enter-from, .fade-move-leave-to { opacity: 0; transform: translateY(4px); }
</style>
