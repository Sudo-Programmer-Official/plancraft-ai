<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold">User Feedback</h2>
        <p class="text-sm text-indigo-200">Recent submissions from the feedback collection.</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model.number="pageSize"
          @change="refresh"
          class="rounded bg-gray-800 px-3 py-2 text-white text-sm border border-gray-700"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
        <button
          @click="refresh"
          class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm border border-gray-600"
          :disabled="loading"
        >
          Refresh
        </button>
      </div>
    </div>

    <div class="overflow-auto rounded border border-white/10">
      <table class="min-w-full text-sm">
        <thead class="bg-white/5">
          <tr>
            <th class="text-left px-3 py-2 w-40">Date</th>
            <th class="text-left px-3 py-2 w-48">User</th>
            <th class="text-left px-3 py-2 w-40">Type / Rating</th>
            <th class="text-left px-3 py-2">Message</th>
            <th class="text-left px-3 py-2 w-72">Context</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="border-t border-white/10">
            <td colspan="5" class="px-3 py-4 text-center text-slate-300">Loading feedback...</td>
          </tr>
          <tr v-else-if="!feedback.length" class="border-t border-white/10">
            <td colspan="5" class="px-3 py-4 text-center text-slate-300">No feedback found.</td>
          </tr>
          <tr v-for="item in feedback" :key="item.id" class="border-t border-white/10 align-top">
            <td class="px-3 py-3">
              <div class="font-medium">{{ formatDate(item.createdAt) }}</div>
              <div class="text-xs text-slate-400">ID: {{ item.id }}</div>
            </td>
            <td class="px-3 py-3">
              <div class="font-semibold">{{ item.user?.name || 'Unknown user' }}</div>
              <div class="text-xs text-indigo-200">{{ item.user?.email || item.userId || 'N/A' }}</div>
              <div v-if="item.user?.plan" class="text-xs text-slate-400">Plan: {{ item.user.plan }} | Role: {{ item.user.role }}</div>
            </td>
            <td class="px-3 py-3">
              <div class="inline-flex items-center gap-2 mb-1">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-purple-500/20 text-purple-100 uppercase tracking-wide">
                  {{ item.type }}
                </span>
                <span v-if="item.rating" class="text-amber-200 text-xs">Rating: {{ item.rating }}/5</span>
                <span v-else class="text-slate-500 text-xs">-</span>
              </div>
            </td>
            <td class="px-3 py-3 whitespace-pre-line break-words leading-relaxed">
              {{ item.message || 'No message provided.' }}
            </td>
            <td class="px-3 py-3 text-xs text-indigo-200 space-y-1">
              <div v-if="item.context?.route">Route: {{ item.context.route }}</div>
              <div v-if="item.context?.source">Source: {{ item.context.source }}</div>
              <div v-if="item.context?.screen">Screen: {{ item.context.screen }}</div>
              <div v-if="item.metadata && Object.keys(item.metadata).length" class="text-slate-300">
                Meta: {{ formatMeta(item.metadata) }}
              </div>
              <div v-if="item.locale" class="text-slate-400">Locale: {{ item.locale }}</div>
              <div v-if="item.userAgent" class="text-slate-500">UA: {{ truncate(item.userAgent, 70) }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between text-sm text-slate-300">
      <div>Showing {{ feedback.length }} items</div>
      <div class="flex gap-2">
        <button
          @click="prevPageFn"
          :disabled="!prevStack.length || loading"
          class="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded border border-gray-700"
        >
          Previous
        </button>
        <button
          @click="nextPageFn"
          :disabled="!nextPage || loading"
          class="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded border border-gray-700"
        >
          Next
        </button>
      </div>
    </div>

    <div v-if="error" class="text-sm text-amber-300">Warning: {{ error }}</div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/api'

const feedback = ref([])
const loading = ref(false)
const error = ref('')
const nextPage = ref(null)
const prevStack = ref([])
const currentCursor = ref(null)
const pageSize = ref(25)

function formatDate(v) {
  try {
    return new Date(v).toLocaleString()
  } catch {
    return ''
  }
}

function truncate(value, max = 70) {
  if (!value) return ''
  const str = String(value)
  if (str.length <= max) return str
  return `${str.slice(0, max)}...`
}

function formatMeta(obj) {
  try {
    const str = JSON.stringify(obj)
    return truncate(str, 80)
  } catch {
    return ''
  }
}

async function fetchFeedback(cursor = null) {
  loading.value = true
  try {
    const params = { limit: pageSize.value || 25 }
    if (cursor) params.after = cursor
    const res = await api.get('/admin/feedback', { params })
    const data = res?.data || {}
    feedback.value = data.feedback || []
    nextPage.value = data.nextPage || null
    currentCursor.value = cursor
    error.value = ''
  } catch (e) {
    error.value = 'Failed to load feedback.'
    ElMessage.error('Failed to load feedback')
  } finally {
    loading.value = false
  }
}

function refresh() {
  prevStack.value = []
  fetchFeedback(null)
}

function nextPageFn() {
  if (!nextPage.value) return
  prevStack.value.push(currentCursor.value)
  fetchFeedback(nextPage.value)
}

function prevPageFn() {
  const prev = prevStack.value.pop() || null
  fetchFeedback(prev)
}

onMounted(() => {
  refresh()
})
</script>
