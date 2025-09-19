<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 px-6 py-10 text-white">
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
        @click="selectedDay = day.value"
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

      <ul class="space-y-3">
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
              v-model="task.completed"
              @change="toggleComplete(task)"
              class="w-5 h-5 accent-indigo-500"
            />
          </div>
        </li>
      </ul>
    </section>

    <!-- View Monthly -->
    <div class="mt-8 text-center">
      <button class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full font-medium transition">
        View Monthly
      </button>
    </div>

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

        <input
          type="date"
          v-model="newTask.date"
          class="w-full border rounded-lg p-2 mb-4"
        />

        <div class="flex justify-end gap-3">
          <button
            @click="showAddTask = false"
            class="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="addTask"
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
import { ref, computed, onMounted } from "vue";
import { useTasks } from "@/composables/useTasks";

const { tasks, toggleComplete, loadTasks, addTaskToFirebase } = useTasks();

const days = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const selectedDay = ref(new Date().getDay());
const showAddTask = ref(false);

const newTask = ref({
  title: "",
  details: "",
  date: new Date().toISOString().slice(0, 10),
  completed: false,
});

const filteredTasks = computed(() =>
  tasks.value.filter((task) => new Date(task.date).getDay() === selectedDay.value)
);

const completedCount = computed(() => tasks.value.filter((t) => t.completed).length);
const remainingCount = computed(() => tasks.value.filter((t) => !t.completed).length);

const dayLabel = computed(() => {
  const day = days.find((d) => d.value === selectedDay.value);
  return day ? day.label : "";
});

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toDateString().slice(4, 10);
}

async function addTask() {
  if (!newTask.value.title.trim()) return;

  await addTaskToFirebase({ ...newTask.value });
  await loadTasks();

  newTask.value = {
    title: "",
    details: "",
    date: new Date().toISOString().slice(0, 10),
    completed: false,
  };
  showAddTask.value = false;
}

onMounted(loadTasks);
</script>