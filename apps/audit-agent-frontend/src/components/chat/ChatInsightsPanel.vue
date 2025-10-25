<template>
  <aside class="chat-insights">
    <section class="actions">
      <button type="button" @click="$emit('summarize')">Summarize thread</button>
      <select v-model="tone">
        <option value="friendly">Friendly</option>
        <option value="concise">Concise</option>
        <option value="formal">Formal</option>
        <option value="upbeat">Upbeat</option>
      </select>
      <button type="button" @click="$emit('suggest', tone)">Suggest replies</button>
    </section>

    <section class="summary" v-if="summary?.summary">
      <h3>Summary</h3>
      <ul>
        <li v-for="(bullet, idx) in summary.bullets" :key="idx">{{ bullet }}</li>
      </ul>
      <div v-if="summary.tasks?.length" class="suggested">
        <h4>Suggested Tasks</h4>
        <ul>
          <li v-for="(task, idx) in summary.tasks" :key="idx">{{ task.title }}</li>
        </ul>
      </div>
    </section>

    <section class="replies" v-if="suggestions.length">
      <h3>Reply Ideas</h3>
      <ul>
        <li v-for="(item, idx) in suggestions" :key="idx">
          <button type="button" @click="$emit('use-reply', item)">{{ item }}</button>
        </li>
      </ul>
    </section>

    <section class="coach" v-if="coachMessage">
      <h3>Coach</h3>
      <p>{{ coachMessage }}</p>
    </section>

    <section class="search">
      <h3>Search</h3>
      <form @submit.prevent="$emit('search', query)">
        <input v-model="query" type="text" placeholder="Search chat / tasks / meetings" />
        <button type="submit">Search</button>
      </form>
      <ul v-if="results.length" class="results">
        <li v-for="(item, idx) in results" :key="idx">
          <strong>{{ item.type }}</strong>
          <span v-if="item.title"> · {{ item.title }}</span>
          <p>{{ item.text || item.summary || item.description }}</p>
        </li>
      </ul>
    </section>

    <section class="coach-actions">
      <label>
        Persona
        <select v-model="persona">
          <option value="mentor">Mentor</option>
          <option value="friend">Friend</option>
          <option value="zen">Zen</option>
        </select>
      </label>
      <button type="button" @click="$emit('coach', persona)">Ask coach</button>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  summary: { summary: string; bullets: string[]; tasks: any[]; model: string | null } | null
  suggestions: string[]
  coachMessage: string
  results: any[]
}>()

const emit = defineEmits(['summarize', 'suggest', 'use-reply', 'search', 'coach'])

const tone = ref('friendly')
const persona = ref('mentor')
const query = ref('')

watch(
  () => props.suggestions,
  () => {
    if (!props.suggestions?.length) tone.value = 'friendly'
  },
)
</script>

<style scoped>
.chat-insights { width: 260px; display: flex; flex-direction: column; gap: 16px; background: #fff; border-left: 1px solid rgba(15,23,42,0.08); padding: 16px; }
.actions, .coach-actions { display: flex; flex-direction: column; gap: 8px; }
.actions button, .coach-actions button { padding: 8px 12px; border: none; border-radius: 10px; background: linear-gradient(135deg, #4338ca, #6366f1); color: #fff; cursor: pointer; }
.actions select, .coach-actions select, .search input { border-radius: 8px; border: 1px solid rgba(15,23,42,0.15); padding: 6px; }
.summary ul, .replies ul, .search .results { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.replies ul li button { width: 100%; text-align: left; background: rgba(79,70,229,0.1); border: none; border-radius: 8px; padding: 8px; cursor: pointer; }
.search form { display: flex; gap: 6px; }
.results li { background: rgba(15,23,42,0.05); border-radius: 10px; padding: 8px; }
.coach { background: rgba(34,197,94,0.1); border-radius: 10px; padding: 10px; color: #047857; }
</style>
