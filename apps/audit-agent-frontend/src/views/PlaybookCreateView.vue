<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
      <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/70">Playbooks</p>
      <h1 class="mt-2 text-3xl font-bold text-white">Create Playbook</h1>
      <p class="mt-2 text-sm text-indigo-100/75">
        Capture a repeatable workflow and its steps in one place.
      </p>
    </section>

    <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPlaybook } from '@/services/playbookService'

const router = useRouter()
const saving = ref(false)
const name = ref('')
const steps = ref([
  { id: crypto.randomUUID(), title: '', dueDate: '' },
])

function addStep() {
  steps.value.push({ id: crypto.randomUUID(), title: '', dueDate: '' })
}

function removeStep(id) {
  steps.value = steps.value.filter((step) => step.id !== id)
}

async function submit() {
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
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to create playbook')
  } finally {
    saving.value = false
  }
}
</script>
