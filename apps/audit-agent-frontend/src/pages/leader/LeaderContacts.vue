<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Contacts & Groups</h1>
        <p class="text-slate-400 text-sm">Manage people, tags, bulk import, and AI clustering.</p>
      </div>
      <div class="flex gap-2">
        <label class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm cursor-pointer hover:border-indigo-500">
          Import CSV
          <input type="file" class="hidden" accept=".csv" @change="onImport" />
        </label>
        <button
          class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500 text-sm"
          @click="runClustering"
        >
          {{ clustering ? 'Clustering…' : 'AI cluster contacts' }}
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
          @click="openCreate"
        >
          + Add contact
        </button>
      </div>
    </header>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wide text-slate-400">Contacts</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700">{{ contacts.length }} total</span>
        </div>
        <div v-if="loading" class="space-y-2">
          <div v-for="n in 5" :key="n" class="h-12 bg-slate-800/60 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="contacts.length === 0" class="text-sm text-slate-500">
          No contacts yet. Add one to get started.
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="c in contacts"
            :key="c.contactId || c.id"
            class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
          >
            <div>
              <p class="font-semibold">{{ c.name }}</p>
              <p class="text-xs text-slate-400">
                {{ c.phone || 'No phone' }} • {{ c.email || 'No email' }}
              </p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="tag in c.tags || []"
                  :key="tag"
                  class="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700" @click="openEdit(c)">Edit</button>
              <button class="text-xs px-2 py-1 rounded bg-rose-800/70 border border-rose-700" @click="remove(c)">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wide text-slate-400">Groups</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700">{{ groups.length }} total</span>
        </div>
        <div v-if="groups.length === 0" class="text-sm text-slate-500">No groups returned yet.</div>
        <ul class="space-y-2">
          <li
            v-for="g in groups"
            :key="g.groupId || g.id"
            class="p-3 rounded-xl bg-slate-900 border border-slate-800"
          >
            <p class="font-semibold">{{ g.name }}</p>
            <p class="text-xs text-slate-400">{{ (g.tags || []).join(', ') || 'No tags' }}</p>
          </li>
        </ul>

        <div v-if="clusters.length" class="border-t border-slate-800 pt-3 space-y-2">
          <h4 class="text-sm font-semibold">AI clusters</h4>
          <div v-for="(cluster, idx) in clusters" :key="idx" class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <p class="font-semibold">Cluster {{ idx + 1 }}</p>
            <p class="text-slate-400">{{ formatCluster(cluster) }}</p>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="w-full max-w-lg p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">{{ form.id ? 'Edit contact' : 'New contact' }}</p>
            <h3 class="text-xl font-semibold">{{ form.name || 'Contact' }}</h3>
          </div>
          <button class="text-slate-400 hover:text-white" @click="closeModal">✕</button>
        </div>
        <label class="space-y-1 text-sm text-slate-200 block">
          Name
          <input
            v-model="form.name"
            type="text"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="Full name"
          />
        </label>
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="space-y-1 text-sm text-slate-200">
            Phone
            <input v-model="form.phone" type="text" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-sm text-slate-200">
            Email
            <input v-model="form.email" type="email" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm" />
          </label>
        </div>
        <label class="space-y-1 text-sm text-slate-200 block">
          Tags
          <input
            v-model="form.tags"
            type="text"
            class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
            placeholder="Comma separated tags (birthday, VIP, leader-zone)"
          />
        </label>
        <div class="flex gap-2">
          <button
            class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Saving…' : form.id ? 'Update' : 'Create' }}
          </button>
          <button class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="closeModal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listContacts,
  listGroups,
  createContact,
  updateContact,
  deleteContact,
  importContactsCsv,
  clusterContacts,
} from '@/services/leader/contacts'

const contacts = ref([])
const groups = ref([])
const clusters = ref([])
const loading = ref(false)
const saving = ref(false)
const clustering = ref(false)
const showModal = ref(false)
const form = reactive({
  id: null,
  name: '',
  phone: '',
  email: '',
  tags: '',
})

function resetForm() {
  form.id = null
  form.name = ''
  form.phone = ''
  form.email = ''
  form.tags = ''
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(contact) {
  form.id = contact.id || contact.contactId
  form.name = contact.name
  form.phone = contact.phone || ''
  form.email = contact.email || ''
  form.tags = (contact.tags || []).join(', ')
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function load() {
  loading.value = true
  try {
    const [c, g] = await Promise.all([listContacts(), listGroups()])
    contacts.value = c || []
    groups.value = g || []
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to load contacts')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.name) return ElMessage.warning('Name is required')
  saving.value = true
  const payload = {
    name: form.name,
    phone: form.phone,
    email: form.email,
    tags: form.tags
      ? form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  }
  try {
    if (form.id) {
      await updateContact(form.id, payload)
    } else {
      await createContact(payload)
    }
    await load()
    showModal.value = false
    ElMessage.success(form.id ? 'Contact updated' : 'Contact created')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save contact')
  } finally {
    saving.value = false
  }
}

async function remove(contact) {
  try {
    await ElMessageBox.confirm(`Delete ${contact.name}?`, 'Confirm', { type: 'warning' })
    await deleteContact(contact.id || contact.contactId)
    await load()
    ElMessage.success('Contact deleted')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.error || 'Failed to delete contact')
  }
}

async function onImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      const text = evt.target?.result
      if (!text || typeof text !== 'string') return ElMessage.error('Empty file')
      await importContactsCsv(text)
      ElMessage.success('Imported contacts')
      await load()
    } catch (err) {
      ElMessage.error(err?.response?.data?.error || 'Import failed')
    }
  }
  reader.readAsText(file)
}

async function runClustering() {
  clustering.value = true
  try {
    clusters.value = await clusterContacts({ contacts: contacts.value })
    if (!clusters.value?.length) {
      ElMessage.info('No clusters returned')
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Clustering failed')
  } finally {
    clustering.value = false
  }
}

function formatCluster(cluster) {
  if (!cluster) return ''
  if (typeof cluster === 'string') return cluster
  if (Array.isArray(cluster)) return cluster.join(', ')
  return JSON.stringify(cluster)
}

load()
</script>
