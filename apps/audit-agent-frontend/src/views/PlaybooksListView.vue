<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/70">Playbooks</p>
          <h1 class="mt-2 text-3xl font-bold text-white">Action Playbooks</h1>
          <p class="mt-2 text-sm text-indigo-100/75">
            Create repeatable multi-step workflows and track them like a calm checklist.
          </p>
        </div>
        <div class="flex flex-col items-start gap-3 sm:items-end">
          <div
            v-if="showUsageIndicator"
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-indigo-100/85"
          >
            <p class="text-[11px] uppercase tracking-[0.24em] text-indigo-200/70">Usage</p>
            <p class="mt-1 font-semibold text-white">{{ usageHeadline }}</p>
            <p v-if="usageHint" class="mt-1 text-xs text-indigo-100/70">{{ usageHint }}</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition"
            :class="createButtonClasses"
            @click="handleCreateClick"
          >
            {{ createButtonLabel }}
          </button>
        </div>
      </div>
    </section>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-48 rounded-3xl border border-white/10 bg-white/5 animate-pulse"
      ></div>
    </div>

    <section
      v-else-if="!playbooks.length"
      class="rounded-3xl border border-dashed border-white/15 bg-slate-950/25 p-10 text-center text-indigo-100/75"
    >
      <div class="text-4xl">📚</div>
      <h2 class="mt-4 text-2xl font-semibold text-white">No playbooks yet</h2>
      <p class="mt-2 text-sm">Start with a morning checklist, launch workflow, or meeting prep routine.</p>
      <button
        type="button"
        class="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        @click="handleCreateClick"
      >
        {{ isAtLimit ? 'Upgrade to continue' : 'Create your first playbook' }}
      </button>
    </section>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="playbook in playbooks"
        :key="playbook.id"
        :to="`/playbooks/${playbook.id}`"
        class="rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/70">Playbook</p>
            <h2 class="mt-2 text-xl font-semibold text-white">{{ playbook.name }}</h2>
          </div>
          <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-indigo-100/80">
            {{ progressPercent(playbook.progress) }}%
          </span>
        </div>

        <div class="mt-5 space-y-3">
          <div class="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400"
              :style="{ width: `${progressPercent(playbook.progress)}%` }"
            ></div>
          </div>
          <div class="flex items-center justify-between text-sm text-indigo-100/75">
            <span>{{ playbook.progress?.completed || 0 }} completed</span>
            <span>{{ playbook.progress?.total || 0 }} total steps</span>
          </div>
          <p class="text-xs text-indigo-100/50">
            Updated {{ formatDate(playbook.updatedAt || playbook.createdAt) }}
          </p>
        </div>
      </RouterLink>
    </div>

    <FeatureLimitDialog
      :open="showLimitDialog"
      feature-label="playbooks"
      :used="playbookUsage.used"
      :limit="playbookUsage.limit || 0"
      plan-label="Free plan"
      @close="showLimitDialog = false"
      @refreshed="handleUsageRefresh"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import FeatureLimitDialog from '@/components/FeatureLimitDialog.vue'
import { fetchPlaybooks } from '@/services/playbookService'

const router = useRouter()
const loading = ref(true)
const playbooks = ref([])
const playbookUsage = ref({
  used: 0,
  limit: null,
  isUnlimited: true,
  atLimit: false,
  nearLimit: false,
})
const showLimitDialog = ref(false)

const isAtLimit = computed(() => playbookUsage.value?.atLimit === true)
const isNearLimit = computed(() => playbookUsage.value?.nearLimit === true && !isAtLimit.value)
const showUsageIndicator = computed(() => !playbookUsage.value?.isUnlimited && Number(playbookUsage.value?.limit || 0) > 0)
const usageHeadline = computed(() => {
  const used = Number(playbookUsage.value?.used || 0)
  const limit = Number(playbookUsage.value?.limit || 0)
  if (!showUsageIndicator.value) return `${used} used`
  return `${used} / ${limit} used (Free plan)`
})
const usageHint = computed(() => {
  if (isAtLimit.value) return 'You have reached your free playbook limit.'
  if (isNearLimit.value) return 'You are close to your limit.'
  return ''
})
const createButtonLabel = computed(() => (isAtLimit.value ? 'Upgrade to continue' : '+ New Playbook'))
const createButtonClasses = computed(() => (
  isAtLimit.value
    ? 'bg-white/10 border border-white/15 hover:bg-white/15'
    : 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:scale-[1.02]'
))

function progressPercent(progress = {}) {
  const total = Number(progress?.total || 0)
  const completed = Number(progress?.completed || 0)
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)))
}

function formatDate(value) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function loadPlaybooks() {
  loading.value = true
  try {
    const payload = await fetchPlaybooks()
    playbooks.value = payload?.playbooks || []
    playbookUsage.value = payload?.usage || playbookUsage.value
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to load playbooks')
  } finally {
    loading.value = false
  }
}

function handleCreateClick() {
  if (isAtLimit.value) {
    showLimitDialog.value = true
    return
  }
  router.push('/playbooks/new')
}

async function handleUsageRefresh() {
  showLimitDialog.value = false
  await loadPlaybooks()
}

onMounted(loadPlaybooks)
</script>
