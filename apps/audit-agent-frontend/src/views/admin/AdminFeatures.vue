<template>
  <div class="max-w-5xl space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/70">Admin Controls</p>
        <h2 class="mt-2 text-3xl font-bold text-white">Feature Flags</h2>
        <p class="mt-2 text-sm text-indigo-100/75">
          Toggle unstable surfaces off without redeploying the frontend bundle.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          :disabled="flagsStore.loading"
          @click="reload"
        >
          Refresh
        </button>
        <button
          type="button"
          class="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save Flags' }}
        </button>
      </div>
    </div>

    <div
      v-if="flagsStore.error"
      class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
    >
      {{ flagsStore.error }}
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <article
        v-for="card in flagCards"
        :key="card.key"
        class="rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl backdrop-blur-xl"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-white">{{ card.meta.label }}</h3>
            <p class="mt-2 text-sm text-indigo-100/75">{{ card.meta.description }}</p>
          </div>
          <label class="inline-flex cursor-pointer items-center">
            <input
              v-model="draftFlags[card.key]"
              type="checkbox"
              class="peer sr-only"
              :disabled="card.locked || saving"
            />
            <span
              class="relative h-7 w-12 rounded-full bg-white/10 transition peer-checked:bg-gradient-to-r peer-checked:from-fuchsia-500 peer-checked:to-indigo-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              <span
                class="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5"
              ></span>
            </span>
          </label>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            class="rounded-full border px-2 py-1"
            :class="card.effective ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300'"
          >
            Effective: {{ card.effective ? 'ON' : 'OFF' }}
          </span>
          <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
            Remote: {{ card.remote ? 'ON' : 'OFF' }}
          </span>
          <span
            v-if="card.locked"
            class="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-amber-200"
          >
            Local override
          </span>
        </div>

        <p v-if="card.locked" class="mt-3 text-xs text-amber-100/80">
          This build has a local override for {{ card.key }}, so remote updates are stored but won’t take effect here.
        </p>
        <p v-else class="mt-3 text-xs text-indigo-100/65">
          {{ card.meta.disabledMessage }}
        </p>
      </article>
    </div>

    <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl backdrop-blur-xl">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">Last Update</h3>
          <p class="text-sm text-indigo-100/70">
            Remote flag changes are stored in Firestore collection <code>feature_flags/global</code>.
          </p>
        </div>
        <div class="text-sm text-indigo-100/75">
          <div>Updated at: {{ updatedAtLabel }}</div>
          <div>Updated by: {{ flagsStore.updatedBy || 'unknown' }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { DEFAULT_REMOTE_FLAGS } from '@/config/featureFlags'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'

const flagsStore = useFeatureFlagsStore()
const draftFlags = reactive({ ...DEFAULT_REMOTE_FLAGS })
const saving = ref(false)

const flagCards = computed(() =>
  flagsStore.FEATURE_FLAG_KEYS.map((key) => ({
    key,
    meta: flagsStore.FEATURE_FLAG_META[key],
    remote: Boolean((flagsStore.remoteFlags || {})[key] ?? DEFAULT_REMOTE_FLAGS[key]),
    effective: flagsStore.isEnabled(key),
    locked: flagsStore.hasLocalFlagOverride(key),
  })),
)

const updatedAtLabel = computed(() => {
  if (!flagsStore.updatedAt) return 'Never'
  const d = dayjs(flagsStore.updatedAt)
  return d.isValid() ? d.format('MMM D, YYYY h:mm A') : String(flagsStore.updatedAt)
})

watch(
  () => flagsStore.remoteFlags,
  (next) => {
    for (const key of flagsStore.FEATURE_FLAG_KEYS) {
      draftFlags[key] = Boolean((next || {})[key] ?? DEFAULT_REMOTE_FLAGS[key])
    }
  },
  { immediate: true, deep: true },
)

async function reload() {
  try {
    await flagsStore.loadFlags({ force: true, admin: true })
    ElMessage.success('Feature flags refreshed')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to refresh feature flags')
  }
}

async function save() {
  saving.value = true
  try {
    const payload = {}
    for (const key of flagsStore.FEATURE_FLAG_KEYS) {
      payload[key] = !!draftFlags[key]
    }
    await flagsStore.saveRemoteFlags(payload)
    ElMessage.success('Feature flags updated')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to save feature flags')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  flagsStore.loadFlags({ force: true, admin: true }).catch(() => {})
})
</script>
