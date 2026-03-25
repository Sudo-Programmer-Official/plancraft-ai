<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/70">Playbooks</p>
          <h1 class="mt-2 text-3xl font-bold text-white">Create Playbook</h1>
          <p class="mt-2 text-sm text-indigo-100/75">
            Capture a repeatable workflow and its steps in one place.
          </p>
        </div>
        <div
          v-if="showUsageIndicator"
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-indigo-100/85"
        >
          <p class="text-[11px] uppercase tracking-[0.24em] text-indigo-200/70">Usage</p>
          <p class="mt-1 font-semibold text-white">{{ usageHeadline }}</p>
          <p v-if="usageHint" class="mt-1 text-xs text-indigo-100/70">{{ usageHint }}</p>
        </div>
      </div>
    </section>

    <section
      v-if="isAtLimit"
      class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl"
    >
      <div class="space-y-4">
        <p class="text-xs uppercase tracking-[0.35em] text-amber-200/80">Free plan limit reached</p>
        <h2 class="text-2xl font-semibold text-white">You’ve reached your playbook limit</h2>
        <p class="max-w-2xl text-sm leading-7 text-indigo-100/75">
          This mobile app does not offer purchases. If this account already has premium access
          created outside the app, refresh access and your playbook limit will sync automatically.
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            @click="showLimitDialog = true"
          >
            Learn about Premium
          </button>
          <RouterLink
            to="/playbooks"
            class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Back to Playbooks
          </RouterLink>
        </div>
      </div>
    </section>

    <section
      v-else
      class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl"
    >
      <div class="space-y-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-indigo-100">Playbook name</span>
          <input
            v-model.trim="name"
            type="text"
            class="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-indigo-100/35 focus:border-fuchsia-300/50 focus:outline-none"
            placeholder="e.g. Weekly launch checklist"
          />
        </label>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Steps</h2>
            <button
              type="button"
              class="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
              @click="addStep"
            >
              + Add step
            </button>
          </div>

          <div v-if="!steps.length" class="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-indigo-100/70">
            Add at least one step to make the playbook useful.
          </div>

          <div v-for="(step, index) in steps" :key="step.id" class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
              <label class="space-y-2">
                <span class="text-xs uppercase tracking-[0.25em] text-indigo-200/65">Step {{ index + 1 }}</span>
                <input
                  v-model.trim="step.title"
                  type="text"
                  class="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white placeholder:text-indigo-100/35 focus:border-fuchsia-300/50 focus:outline-none"
                  placeholder="Step title"
                />
              </label>
              <label class="space-y-2">
                <span class="text-xs uppercase tracking-[0.25em] text-indigo-200/65">Due date</span>
                <input
                  v-model="step.dueDate"
                  type="date"
                  class="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white focus:border-fuchsia-300/50 focus:outline-none"
                />
              </label>
              <button
                type="button"
                class="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/15"
                @click="removeStep(step.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap justify-end gap-3">
          <RouterLink
            to="/playbooks"
            class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Cancel
          </RouterLink>
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
            :disabled="saving"
            @click="submit"
          >
            {{ saving ? 'Creating…' : 'Create Playbook' }}
          </button>
        </div>
      </div>
    </section>

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
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import FeatureLimitDialog from '@/components/FeatureLimitDialog.vue'
import { createPlaybook, fetchPlaybookUsageStatus } from '@/services/playbookService'

const router = useRouter()
const saving = ref(false)
const name = ref('')
const playbookUsage = ref({
  used: 0,
  limit: null,
  isUnlimited: true,
  atLimit: false,
  nearLimit: false,
})
const showLimitDialog = ref(false)
const steps = ref([
  { id: crypto.randomUUID(), title: '', dueDate: '' },
])

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
  if (isAtLimit.value) return 'Upgrade to continue creating playbooks.'
  if (isNearLimit.value) return 'You are close to your limit.'
  return ''
})

function addStep() {
  steps.value.push({ id: crypto.randomUUID(), title: '', dueDate: '' })
}

function removeStep(id) {
  steps.value = steps.value.filter((step) => step.id !== id)
}

async function loadUsage() {
  try {
    playbookUsage.value = await fetchPlaybookUsageStatus()
  } catch (err) {
    console.warn('[Playbooks] failed to load usage status', err?.message || err)
  }
}

async function handleUsageRefresh() {
  showLimitDialog.value = false
  await loadUsage()
}

async function submit() {
  if (isAtLimit.value) {
    showLimitDialog.value = true
    return
  }

  const trimmedName = String(name.value || '').trim()
  if (!trimmedName) {
    ElMessage.warning('Add a playbook name first')
    return
  }

  const normalizedSteps = steps.value
    .map((step) => ({
      title: String(step.title || '').trim(),
      dueDate: step.dueDate || null,
    }))
    .filter((step) => step.title)

  if (!normalizedSteps.length) {
    ElMessage.warning('Add at least one step')
    return
  }

  saving.value = true
  try {
    const payload = await createPlaybook({
      name: trimmedName,
      steps: normalizedSteps,
    })
    ElMessage.success('Playbook created')
    router.push(`/playbooks/${payload?.playbook?.id || payload?.id}`)
  } catch (err) {
    if (err?.response?.data?.code === 'playbook_limit_reached') {
      playbookUsage.value = {
        ...playbookUsage.value,
        ...(err?.response?.data?.details || {}),
      }
      showLimitDialog.value = true
      return
    }
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to create playbook')
  } finally {
    saving.value = false
  }
}

onMounted(loadUsage)
</script>
