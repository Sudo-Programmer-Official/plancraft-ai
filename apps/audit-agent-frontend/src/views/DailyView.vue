<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
    <!-- Header -->
    <header class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Today's Tasks</h1>
      <p class="text-gray-600">Plan, act, and reflect — one day at a time.</p>
    </header>

    <!-- Task List -->
    <main class="max-w-3xl mx-auto space-y-4">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="bg-white p-4 rounded-xl shadow-md flex justify-between items-start"
      >
        <div class="flex items-start gap-3 w-full">
          <!-- Checkbox -->
          <input
            type="checkbox"
            v-model="task.completed"
            @change="toggleComplete(task)"
            class="mt-1 w-5 h-5 text-green-500 rounded"
          />

          <!-- Task Content -->
          <div class="flex-1">
            <div class="flex justify-between items-center">
              <input
                v-model="task.title"
                class="text-lg font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none"
                :class="{ 'line-through text-gray-400': task.completed }"
              />
              <span class="text-xs text-gray-400">{{ task.date }}</span>
            </div>

            <!-- Details -->
            <textarea
              v-model="task.details"
              placeholder="Add details or notes..."
              rows="2"
              class="mt-2 w-full text-sm text-gray-600 bg-transparent resize-none focus:outline-none border-b border-gray-200 focus:border-indigo-300"
            ></textarea>

            <!-- Reflection when completed -->
            <div v-if="task.completed" class="mt-2">
              <input
                v-model="task.reflection"
                placeholder="✍️ Reflection (optional)"
                class="w-full text-sm italic text-indigo-600 bg-transparent border-b border-dashed focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Task -->
    <div class="fixed bottom-8 right-8">
      <button
        @click="addTask"
        class="bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-lg text-2xl"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup>
import { useTasks } from '@/composables/useTasks'

const { tasks, addTask, toggleComplete } = useTasks()
</script>