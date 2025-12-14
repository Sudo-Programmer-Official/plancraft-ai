<template>
  <section class="bg-slate-900/60 border border-white/10 rounded-2xl shadow-lg p-5 sm:p-6 space-y-5">
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-indigo-300">Workspace Knowledge</p>
        <h3 class="text-xl font-semibold text-white">Docs → chunks → tasks</h3>
        <p class="text-sm text-slate-300">
          Paste or upload requirements, process them, then generate task proposals grounded in your workspace.
        </p>
      </div>
      <span
        v-if="proposals.length"
        class="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-500/20 text-emerald-200 px-3 py-1.5 rounded-full border border-emerald-400/40"
      >
        Using knowledge
      </span>
    </header>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-3">
        <label class="block text-sm text-slate-200">Title</label>
        <input
          v-model="title"
          type="text"
          class="w-full rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
          placeholder="Authentication requirements, Sprint PRD..."
          :disabled="uploadBusy || !canWrite"
        />

        <label class="block text-sm text-slate-200">Paste text</label>
        <textarea
          v-model="text"
          rows="5"
          class="w-full rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Paste requirements or notes..."
          :disabled="uploadBusy || !canWrite"
        ></textarea>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span>Max {{ maxChars.toLocaleString() }} chars</span>
          <span class="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
          <span>Chunk cap: {{ maxChunks }}</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60"
            :disabled="uploadBusy || !canWrite || !text.trim() || !activeWorkspaceId"
            @click="submitPaste"
          >
            {{ uploadBusy ? 'Saving…' : 'Upload paste' }}
          </button>
          <label
            class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 cursor-pointer hover:border-slate-500 disabled:opacity-60"
            :class="{ 'opacity-60 cursor-not-allowed': uploadBusy || !canWrite || !activeWorkspaceId }"
          >
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept=".txt,.md,.json"
              :disabled="uploadBusy || !canWrite || !activeWorkspaceId"
              @change="onFileChange"
            />
            {{ selectedFile ? selectedFile.name : 'Choose file (.txt, .md, .json)' }}
          </label>
          <button
            type="button"
            class="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm disabled:opacity-60"
            :disabled="uploadBusy || !canWrite || !selectedFile || !activeWorkspaceId"
            @click="submitFile"
          >
            {{ uploadBusy ? 'Uploading…' : 'Upload file' }}
          </button>
        </div>
        <p v-if="!canWrite" class="text-xs text-amber-300">Viewer role can read docs but cannot upload/process.</p>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-white">Docs (latest 50)</h4>
          <span class="text-xs text-slate-400">{{ docs.length }} loaded</span>
        </div>
        <div class="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          <div
            v-for="doc in docs"
            :key="doc.id"
            class="rounded-lg border border-slate-700 bg-slate-800/60 p-3 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-white">{{ doc.title }}</p>
                <p class="text-xs text-slate-400">{{ doc.source || 'paste' }}</p>
              </div>
              <span :class="['px-2 py-1 rounded-full text-xs font-semibold', statusClass(doc.status)]">
                {{ statusLabel(doc.status) }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span v-if="doc.processedChunks || doc.totalChunks">
                {{ doc.processedChunks }}/{{ doc.totalChunks || '?' }} chunks
              </span>
              <span v-if="doc.vectorStatus" class="px-2 py-0.5 rounded bg-slate-700 text-slate-200">
                vectors: {{ doc.vectorStatus }}
              </span>
              <span v-if="doc.updatedAt" class="text-slate-400">
                Updated {{ formatDate(doc.updatedAt) }}
              </span>
            </div>
            <p v-if="doc.error" class="text-xs text-amber-300">⚠️ {{ doc.error }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="canWrite"
                type="button"
                class="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs disabled:opacity-50"
                :disabled="processBusy === doc.id || !activeWorkspaceId"
                @click="triggerProcess(doc)"
              >
                {{ processBusy === doc.id ? 'Processing…' : doc.status === 'ready' ? 'Reprocess' : 'Process' }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-50"
                :disabled="generating || doc.status !== 'ready' || !activeWorkspaceId"
                @click="generateFromDoc(doc)"
              >
                {{ generating && proposalDocId === doc.id ? 'Thinking…' : 'Generate tasks' }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs disabled:opacity-50"
                :disabled="!activeWorkspaceId || doc.status !== 'ready'"
                @click="impactDocId = doc.id"
              >
                Check impact
              </button>
            </div>
          </div>
          <p v-if="!docs.length && !loadingDocs" class="text-sm text-slate-400">
            No workspace docs yet. Upload or paste to get started.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="impactDoc"
      class="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Change impact</p>
          <h4 class="text-lg text-white font-semibold">{{ impactDoc.title }}</h4>
        </div>
        <button
          type="button"
          class="text-xs text-slate-300 hover:text-white"
          @click="impactDocId = null"
        >
          Close
        </button>
      </div>
      <ChangeImpactPreview
        :source="{ type: 'doc', refId: impactDoc.id }"
      />
    </div>

    <div
      v-if="proposals.length"
      class="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-emerald-200">Proposed tasks</p>
          <h4 class="text-lg text-white font-semibold">Review then confirm</h4>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-60"
            :disabled="savingTasks"
            @click="confirmTasks"
          >
            {{ savingTasks ? 'Saving…' : 'Create tasks' }}
          </button>
          <button
            class="px-3 py-1.5 rounded bg-slate-800 text-slate-200 text-sm"
            :disabled="savingTasks"
            @click="clearProposals"
          >
            Dismiss
          </button>
        </div>
      </div>
      <ul class="space-y-2">
        <li
          v-for="task in proposals"
          :key="task.id"
          class="rounded-lg bg-slate-900/70 border border-slate-700 px-3 py-2"
        >
          <p class="text-white font-semibold">{{ task.title }}</p>
          <p v-if="task.description" class="text-sm text-slate-300">{{ task.description }}</p>
          <p v-if="task.date" class="text-xs text-slate-400">Due: {{ task.date }}</p>
        </li>
      </ul>
    </div>

    <div v-else-if="rawAiMessage" class="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4">
      <p class="text-xs uppercase tracking-[0.2em] text-indigo-200 mb-1">AI Reply</p>
      <p class="text-sm text-slate-100 whitespace-pre-wrap">{{ rawAiMessage }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { db } from '@/firebase/init'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import {
  extractTaskProposals,
  orchestrateKnowledgeTasks,
  processKnowledgeDoc,
  uploadKnowledgeFile,
  uploadKnowledgeText,
} from '@/services/knowledgeService'
import { addTaskToFirebase } from '@/services/firebaseService'
import ChangeImpactPreview from '@/components/ChangeImpactPreview.vue'

const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const activeRole = computed(() => workspaceStore.activeWorkspaceRole || 'viewer')
const canWrite = computed(() => ['admin', 'editor'].includes(activeRole.value))

const title = ref('')
const text = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)

const uploadBusy = ref(false)
const processBusy = ref('')
const autoProcessingDocId = ref('')
const generating = ref(false)
const savingTasks = ref(false)
const proposals = ref([])
const proposalDocId = ref(null)
const rawAiMessage = ref('')
const knowledgeHits = ref([])
const impactDocId = ref(null)

const docs = ref([])
const loadingDocs = ref(false)
let unsubscribe = null

const maxChars = Number(import.meta.env.VITE_KNOWLEDGE_MAX_DOC_CHARS || 200000)
const maxChunks = Number(import.meta.env.VITE_KNOWLEDGE_MAX_CHUNKS_PER_DOC || 300)
const impactDoc = computed(() => docs.value.find((d) => d.id === impactDocId.value) || null)

function statusClass(status) {
  const base = 'text-xs font-semibold px-2 py-1 rounded-full'
  if (status === 'ready') return `${base} bg-emerald-600/30 text-emerald-100 border border-emerald-500/40`
  if (status === 'failed') return `${base} bg-red-600/20 text-red-200 border border-red-500/40`
  return `${base} bg-amber-500/20 text-amber-100 border border-amber-400/40`
}

function formatDate(value) {
  try {
    const d = value?.toDate ? value.toDate() : new Date(value)
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return ''
  }
}

function mapDoc(docSnap) {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    title: data.title || 'Untitled document',
    source: data.source || 'paste',
    status: data.status || 'processing',
    updatedAt: data.updatedAt || data.updated_at || data.createdAt || data.created_at || null,
    processedChunks: data.processedChunks || 0,
    totalChunks: data.totalChunks || 0,
    vectorStatus: data.vectorStatus || null,
    error: data.error || null,
  }
}

function subscribeDocs() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  const wsId = activeWorkspaceId.value
  docs.value = []
  if (!wsId) return
  loadingDocs.value = true
  try {
    const q = query(
      collection(db, 'workspace_docs'),
      where('workspaceId', '==', wsId),
      orderBy('updatedAt', 'desc'),
      limit(50),
    )
    unsubscribe = onSnapshot(
      q,
      (snap) => {
        docs.value = snap.docs.map(mapDoc)
        loadingDocs.value = false
      },
      () => {
        loadingDocs.value = false
      },
    )
  } catch {
    loadingDocs.value = false
  }
}

function upsertLocalDoc(partial) {
  if (!partial?.id) return
  const idx = docs.value.findIndex((d) => d.id === partial.id)
  if (idx >= 0) {
    docs.value[idx] = { ...docs.value[idx], ...partial }
  } else {
    docs.value.unshift({
      id: partial.id,
      title: partial.title || 'Untitled document',
      source: partial.source || 'upload',
      status: partial.status || 'processing',
      processedChunks: partial.processedChunks || 0,
      totalChunks: partial.totalChunks || 0,
      updatedAt: new Date(),
      error: null,
    })
  }
}

function statusLabel(status) {
  if (status === 'ready') return 'Ready'
  if (status === 'processing') return 'Processing…'
  if (status === 'uploaded') return 'Uploaded'
  if (status === 'failed') return 'Failed'
  return status || 'processing'
}

async function submitPaste() {
  if (!activeWorkspaceId.value || !canWrite.value) return
  uploadBusy.value = true
  try {
    const result = await uploadKnowledgeText({
      workspaceId: activeWorkspaceId.value,
      title: title.value,
      text: text.value,
      source: 'paste',
    })
    if (result?.docId) {
      upsertLocalDoc({ id: result.docId, title: title.value, source: 'paste', status: 'processing' })
    }
    await autoProcess(result)
    if (result?.status === 'failed') {
      ElMessage.error(result?.error || 'Document failed validation')
    } else {
      ElMessage.success('Document saved. Processing will start automatically.')
    }
    text.value = ''
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to upload'
    ElMessage.error(msg)
  } finally {
    uploadBusy.value = false
  }
}

function onFileChange(event) {
  const file = event?.target?.files?.[0] || null
  selectedFile.value = file
}

async function submitFile() {
  if (!activeWorkspaceId.value || !canWrite.value || !selectedFile.value) return
  uploadBusy.value = true
  try {
    const fd = new FormData()
    fd.append('file', selectedFile.value)
    fd.append('workspaceId', activeWorkspaceId.value)
    fd.append('title', title.value || selectedFile.value.name)
    fd.append('source', 'upload')
    const result = await uploadKnowledgeFile(fd)
    if (result?.docId) {
      upsertLocalDoc({ id: result.docId, title: title.value || selectedFile.value.name, source: 'upload', status: 'processing' })
    }
    await autoProcess(result)
    if (result?.status === 'failed') {
      ElMessage.error(result?.error || 'Document failed validation')
    } else {
      ElMessage.success('File uploaded. Processing will start automatically.')
    }
    selectedFile.value = null
    try {
      if (fileInput.value) fileInput.value.value = ''
    } catch {}
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'File upload failed'
    ElMessage.error(msg)
  } finally {
    uploadBusy.value = false
  }
}

async function triggerProcess(doc) {
  if (!doc?.id || !canWrite.value) return
  processBusy.value = doc.id
  upsertLocalDoc({ id: doc.id, status: 'processing', error: null })
  try {
    await processKnowledgeDoc(doc.id, activeWorkspaceId.value)
    ElMessage.success('Processing started')
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to start processing'
    ElMessage.error(msg)
  } finally {
    processBusy.value = ''
  }
}

async function autoProcess(result) {
  const docId = result?.docId || result?.id
  if (!docId || result?.status === 'failed') return
  autoProcessingDocId.value = docId
  processBusy.value = docId
  upsertLocalDoc({ id: docId, status: 'processing', error: null })
  try {
    await processKnowledgeDoc(docId, activeWorkspaceId.value)
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to start processing'
    ElMessage.error(msg)
  } finally {
    if (processBusy.value === docId) processBusy.value = ''
    autoProcessingDocId.value = ''
  }
}

async function generateFromDoc(doc) {
  if (!doc?.id || doc.status !== 'ready') return
  generating.value = true
  proposals.value = []
  rawAiMessage.value = ''
  knowledgeHits.value = []
  proposalDocId.value = doc.id
  try {
    const prompt = `Using workspace knowledge, turn the document "${doc.title}" into actionable tasks grouped by sections. Ask before creating tasks.`
    const resp = await orchestrateKnowledgeTasks({
      workspaceId: activeWorkspaceId.value,
      docId: doc.id,
      prompt,
      useKnowledge: true,
    })
    knowledgeHits.value = Array.isArray(resp?.knowledgeHits) ? resp.knowledgeHits : []
    rawAiMessage.value =
      resp?.response?.message || resp?.response?.summary || resp?.raw || resp?.response?.decision?.message || ''
    const tasks = extractTaskProposals(resp)
    proposals.value = tasks
    if (!tasks.length && rawAiMessage.value) {
      ElMessage.info('AI responded without structured tasks. Showing the reply.')
    } else if (!tasks.length) {
      ElMessage.warning('No task proposals returned.')
    }
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Task generation failed'
    ElMessage.error(msg)
  } finally {
    generating.value = false
  }
}

async function confirmTasks() {
  if (!proposals.value.length) return
  savingTasks.value = true
  try {
    const docTitle = docs.value.find((d) => d.id === proposalDocId.value)?.title || ''
    const sourceRefs = knowledgeHits.value.map((h) => ({
      docId: h.docId || proposalDocId.value || null,
      chunkId: h.chunkId || null,
      score: h.score ?? null,
    }))
    for (const task of proposals.value) {
      await addTaskToFirebase({
        title: task.title,
        details: task.description || rawAiMessage.value || '',
        date: task.date || undefined,
        source: 'knowledge',
        metadata: {
          docId: proposalDocId.value,
          docTitle,
          sourceRefs,
        },
      })
    }
    ElMessage.success('Tasks created')
    clearProposals()
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Failed to create tasks'
    ElMessage.error(msg)
  } finally {
    savingTasks.value = false
  }
}

function clearProposals() {
  proposals.value = []
  rawAiMessage.value = ''
  proposalDocId.value = null
}

watch(activeWorkspaceId, () => {
  subscribeDocs()
  impactDocId.value = null
})

onMounted(() => {
  subscribeDocs()
})

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
})
</script>
