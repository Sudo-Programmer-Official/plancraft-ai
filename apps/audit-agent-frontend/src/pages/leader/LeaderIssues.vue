<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Issues</h1>
        <p class="text-slate-400 text-sm">Capture issues, assign to contacts or groups, and follow the timeline.</p>
      </div>
      <button
        class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500 text-sm"
        @click="load"
      >
        Refresh
      </button>
    </header>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wide text-slate-400">Issues list</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700">{{ issues.length }} total</span>
        </div>
        <div v-if="loading" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-14 bg-slate-800/60 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="issues.length === 0" class="text-sm text-slate-500">
          No issues yet. Add the first one on the right.
        </div>
        <div v-else class="space-y-3">
          <article
            v-for="issue in issues"
            :key="issue.id"
            class="p-3 rounded-xl border cursor-pointer transition"
            :class="[
              selectedIssue?.id === issue.id ? 'border-indigo-500 bg-indigo-900/10' : 'border-slate-800 bg-slate-900',
            ]"
            @click="selectIssue(issue)"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold">{{ issue.title }}</p>
                <p class="text-xs text-slate-400 line-clamp-2">{{ issue.description || 'No description' }}</p>
                <p class="text-[11px] text-slate-500">
                  {{ issue.priority || 'normal' }} • {{ issue.status || 'open' }}
                </p>
              </div>
              <button
                class="text-[11px] px-2 py-1 rounded bg-slate-800 border border-slate-700"
                @click.stop="updateStatus(issue)"
              >
                Advance
              </button>
            </div>
          </article>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-400">{{ form.id ? 'Edit issue' : 'Create issue' }}</p>
          <h3 class="text-lg font-semibold">{{ form.title || 'New issue' }}</h3>
        </div>
        <label class="space-y-1 text-sm text-slate-200 block">
          Title
          <input
            v-model="form.title"
            type="text"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="e.g., Water supply concern"
          />
        </label>
        <label class="space-y-1 text-sm text-slate-200 block">
          Description
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="Add context, location, or required help."
          ></textarea>
        </label>
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="space-y-1 text-sm text-slate-200">
            Status
            <select v-model="form.status" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Priority
            <select v-model="form.priority" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Assign to contact
            <select v-model="form.contactId" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              <option v-for="c in contacts" :key="c.contactId || c.id" :value="c.contactId || c.id">
                {{ c.name }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Assign to group
            <select v-model="form.groupId" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              <option v-for="g in groups" :key="g.groupId || g.id" :value="g.groupId || g.id">{{ g.name }}</option>
            </select>
          </label>
        </div>
        <label class="space-y-1 text-sm text-slate-200 block">
          Leader notes
          <textarea
            v-model="form.notes"
            rows="2"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="Add internal notes or next steps."
          ></textarea>
        </label>
        <div class="flex gap-2">
          <button
            class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Saving…' : form.id ? 'Update issue' : 'Create issue' }}
          </button>
          <button class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="resetForm">Reset</button>
        </div>

        <div v-if="selectedIssue" class="border-t border-slate-800 pt-3 space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold">Timeline</h4>
            <button class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700" @click="loadTimeline(selectedIssue.id)">
              Refresh
            </button>
          </div>
          <div v-if="timelineLoading" class="space-y-2">
            <div v-for="n in 3" :key="n" class="h-10 bg-slate-800/60 rounded-lg animate-pulse" />
          </div>
          <div v-else-if="timeline.length === 0" class="text-xs text-slate-500">No updates yet.</div>
          <ul v-else class="space-y-2">
            <li
              v-for="item in timeline"
              :key="item.id || item.timestamp"
              class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ item.title || item.action || 'Update' }}</span>
                <span class="text-[11px] text-slate-500">{{ formatDate(item.timestamp || item.date) }}</span>
              </div>
              <p class="text-slate-400">{{ item.description || item.note || '' }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { listIssues, createIssue, updateIssue, fetchIssueTimeline } from '@/services/leader/issues'
import { listContacts, listGroups } from '@/services/leader/contacts'

const issues = ref([])
const contacts = ref([])
const groups = ref([])
const loading = ref(false)
const saving = ref(false)
const timelineLoading = ref(false)
const selectedIssue = ref(null)
const timeline = ref([])

const form = reactive({
  id: null,
  title: '',
  description: '',
  status: 'open',
  contactId: '',
  groupId: '',
  priority: 'normal',
  notes: '',
})

function resetForm() {
  form.id = null
  form.title = ''
  form.description = ''
  form.status = 'open'
  form.contactId = ''
  form.groupId = ''
  form.priority = 'normal'
  form.notes = ''
}

function formatDate(value) {
  if (!value) return ''
  return dayjs(value).format('MMM D, YYYY')
}

async function load() {
  loading.value = true
  try {
    const [issuesRes, contactsRes, groupsRes] = await Promise.all([listIssues(), listContacts(), listGroups()])
    issues.value = issuesRes || []
    contacts.value = contactsRes || []
    groups.value = groupsRes || []
    if (!selectedIssue.value && issues.value.length) selectIssue(issues.value[0])
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to load issues')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.title) return ElMessage.warning('Title required')
  saving.value = true
  const payload = { ...form }
  try {
    if (form.id) {
      await updateIssue(form.id, payload)
    } else {
      await createIssue(payload)
    }
    await load()
    ElMessage.success(form.id ? 'Issue updated' : 'Issue created')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save issue')
  } finally {
    saving.value = false
  }
}

function selectIssue(issue) {
  selectedIssue.value = issue
  form.id = issue.id
  form.title = issue.title
  form.description = issue.description
  form.status = issue.status || 'open'
  form.contactId = issue.contactId || ''
  form.groupId = issue.groupId || ''
  form.priority = issue.priority || 'normal'
  form.notes = issue.notes || ''
  loadTimeline(issue.id)
}

async function loadTimeline(issueId) {
  timelineLoading.value = true
  try {
    timeline.value = await fetchIssueTimeline(issueId)
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to load timeline')
  } finally {
    timelineLoading.value = false
  }
}

async function updateStatus(issue) {
  const order = ['open', 'in_progress', 'resolved']
  const current = issue.status || 'open'
  const next = order[(order.indexOf(current) + 1) % order.length]
  try {
    await updateIssue(issue.id, { status: next })
    await load()
    ElMessage.success(`Status updated to ${next}`)
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to update status')
  }
}

load()
</script>
