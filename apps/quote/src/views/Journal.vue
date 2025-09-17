<script setup>
import { computed, ref } from 'vue'

defineOptions({
  name: 'JournalPage',
})

const today = new Date()
const formattedDate = computed(() =>
  today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
)

const form = ref({
  date: today.toISOString().slice(0, 10),
  mood: 'Balanced',
  energy: 'Steady',
  focus: 'Clear',
  wins: '',
  gratitude: '',
  lessons: '',
  priorities: ['', '', ''],
  notes: '',
})

const moodLevels = ['Joyful', 'Balanced', 'Reflective', 'Stretched']
const energyLevels = ['Energized', 'Steady', 'Calm', 'Drained']
const focusLevels = ['Clear', 'Creative', 'Scattered', 'Distracted']

const promptSections = [
  {
    title: 'Daily Wins',
    description: 'Capture the meaningful moments or accomplishments from today.',
    modelKey: 'wins',
    placeholder: 'I made progress on...'
  },
  {
    title: 'Gratitude',
    description: 'Who or what are you thankful for in this season?',
    modelKey: 'gratitude',
    placeholder: 'Today I am grateful for...'
  },
  {
    title: 'Lessons Learned',
    description: 'Reflect on insights, feedback, or challenges you encountered.',
    modelKey: 'lessons',
    placeholder: 'An important lesson I want to remember is...'
  },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 py-12">
    <div class="mx-auto max-w-6xl space-y-10 px-6">
      <header class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 p-10 text-white shadow-xl">
        <div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-widest text-indigo-100">Daily Reflection</p>
            <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Journal</h1>
            <p class="mt-4 max-w-xl text-indigo-100">
              Take a mindful pause to capture your day — celebrate the wins, honor the challenges,
              and set gentle intentions for tomorrow.
            </p>
          </div>
          <div class="rounded-2xl bg-white/10 p-6 text-sm shadow-lg backdrop-blur">
            <p class="font-medium uppercase tracking-wider text-indigo-100">Today</p>
            <p class="mt-2 text-lg font-semibold">{{ formattedDate }}</p>
            <label class="mt-4 block text-xs font-medium uppercase tracking-widest text-indigo-100">
              Adjust Date
              <input
                v-model="form.date"
                type="date"
                class="mt-2 w-full rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-white focus:border-white focus:outline-none"
              />
            </label>
          </div>
        </div>
        <div class="absolute -top-12 right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      </header>

      <section class="grid gap-6 lg:grid-cols-3">
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 class="text-sm font-semibold uppercase tracking-widest text-slate-500">Mood</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="level in moodLevels"
              :key="level"
              type="button"
              class="rounded-full border px-4 py-2 text-sm font-medium transition"
              :class="[
                form.mood === level
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-500',
              ]"
              @click="form.mood = level"
            >
              {{ level }}
            </button>
          </div>
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 class="text-sm font-semibold uppercase tracking-widest text-slate-500">Energy</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="level in energyLevels"
              :key="level"
              type="button"
              class="rounded-full border px-4 py-2 text-sm font-medium transition"
              :class="[
                form.energy === level
                  ? 'border-amber-500 bg-amber-50 text-amber-600'
                  : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-500',
              ]"
              @click="form.energy = level"
            >
              {{ level }}
            </button>
          </div>
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 class="text-sm font-semibold uppercase tracking-widest text-slate-500">Focus</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="level in focusLevels"
              :key="level"
              type="button"
              class="rounded-full border px-4 py-2 text-sm font-medium transition"
              :class="[
                form.focus === level
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-500',
              ]"
              @click="form.focus = level"
            >
              {{ level }}
            </button>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-lg font-semibold text-slate-800">Reflection Prompts</h2>
        <div class="grid gap-6 lg:grid-cols-3">
          <article
            v-for="prompt in promptSections"
            :key="prompt.modelKey"
            class="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
          >
            <header>
              <h3 class="text-base font-semibold text-slate-800">{{ prompt.title }}</h3>
              <p class="mt-2 text-sm text-slate-500">{{ prompt.description }}</p>
            </header>
            <textarea
              v-model="form[prompt.modelKey]"
              :placeholder="prompt.placeholder"
              rows="6"
              class="mt-4 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </article>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 class="text-lg font-semibold text-slate-800">Top Priorities</h2>
          <p class="mt-2 text-sm text-slate-500">Set gentle intentions for the next day.</p>
          <ul class="mt-6 space-y-4">
            <li v-for="(priority, index) in form.priorities" :key="index" class="flex items-start gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-500">
                {{ index + 1 }}
              </span>
              <input
                v-model="form.priorities[index]"
                type="text"
                :placeholder="`Priority ${index + 1}`"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:bg-white focus:outline-none"
              />
            </li>
          </ul>
        </div>

        <div class="flex flex-col gap-6">
          <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 class="text-lg font-semibold text-slate-800">Free Notes</h2>
            <textarea
              v-model="form.notes"
              rows="8"
              placeholder="Anything else you want to remember about today?"
              class="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-100/60 p-6 text-center text-sm text-slate-500">
            <p class="font-semibold text-slate-700">Need a prompt?</p>
            <p class="mt-2">
              Try reflecting on a conversation that stuck with you, a small kindness you noticed, or something
              you would like to gently improve tomorrow.
            </p>
          </div>
        </div>
      </section>

      <footer class="flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 sm:flex-row">
        <div>
          <p class="font-medium text-slate-700">This space is yours.</p>
          <p>Show up imperfectly, breathe deeply, and write with kindness.</p>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
          >
            Reset
          </button>
          <button
            type="button"
            class="rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600"
          >
            Save Reflection
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
