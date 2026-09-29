<template>
  <div class="marketing-light guest-start min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 text-slate-900">
    <main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-8">
      <header class="flex items-center justify-between gap-4">
        <RouterLink to="/" class="flex items-center gap-3" aria-label="PlanCraftAI home">
          <img src="/icons/icon-96x96.png" alt="" width="40" height="40" class="rounded-xl" />
          <span class="text-lg font-semibold tracking-tight">PlanCraftAI</span>
        </RouterLink>
        <RouterLink to="/login" class="text-sm text-indigo-200 transition hover:text-white">
          Sign in
        </RouterLink>
      </header>

      <section v-if="!ready" class="flex flex-1 items-center justify-center py-16">
        <div class="max-w-md text-center">
          <div class="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
          <h1 class="text-2xl font-semibold">Getting PlanCraft ready…</h1>
          <p class="mt-3 text-sm leading-6 text-indigo-100/70">Your planning space will be ready in a moment.</p>
          <p v-if="errorMessage" class="mt-5 text-sm text-rose-300">{{ errorMessage }}</p>
        </div>
      </section>

      <section v-else-if="!planReady" class="flex flex-1 items-center justify-center py-12 sm:py-16">
        <div class="w-full max-w-3xl">
          <div class="mb-8 text-center sm:mb-10">
            <p class="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">PlanCraft</p>
            <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">What do you need to get done?</h1>
            <p class="mx-auto mt-5 max-w-2xl text-base leading-7 text-indigo-100/75 sm:text-lg">
              Type anything or say it out loud. PlanCraft will turn it into a clear plan for today.
            </p>
          </div>

          <div class="capture-card rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <div class="rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
              <label for="first-plan-input" class="sr-only">What do you need to get done?</label>
              <textarea
                id="first-plan-input"
                v-model="firstTaskInput"
                rows="4"
                autofocus
                class="w-full resize-none bg-transparent px-2 py-1 text-lg leading-8 text-white outline-none placeholder:text-indigo-200/45 sm:text-xl"
                placeholder="Prepare for my interview tomorrow…"
                @keydown.meta.enter.prevent="startPlanning"
                @keydown.ctrl.enter.prevent="startPlanning"
              />
              <div class="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <VoiceRecorder
                  surface="first_capture"
                  :icon-only="true"
                  @transcribed="firstTaskInput = $event"
                />
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 px-5 py-3 font-semibold text-white shadow-lg transition hover:from-pink-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-45"
                  :disabled="!firstTaskInput.trim() || starting"
                  @click="startPlanning"
                >
                  {{ starting ? 'Planning…' : 'Plan it ✨' }}
                </button>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-indigo-100/70">
              <span class="mr-1 text-indigo-200/55">Try:</span>
              <button
                v-for="example in examples"
                :key="example"
                type="button"
                class="rounded-full border border-white/10 px-3 py-1.5 transition hover:border-indigo-300/60 hover:bg-white/5 hover:text-white"
                @click="firstTaskInput = example"
              >
                {{ example }}
              </button>
            </div>
          </div>

          <p class="mt-6 text-center text-xs text-indigo-200/55">Your plan will appear in Today.</p>
        </div>
      </section>

      <section v-else class="flex flex-1 items-center justify-center py-12 sm:py-16">
        <div class="w-full max-w-xl rounded-3xl border border-emerald-300/20 bg-emerald-950/30 p-7 text-center shadow-2xl sm:p-10">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-3xl text-emerald-300">✓</div>
          <p class="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Your plan is ready</p>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Keep your tasks with you.</h1>
          <p class="mt-4 text-base leading-7 text-emerald-50/75">
            Save your tasks and get reminders wherever you use PlanCraft.
          </p>

          <div class="mt-8 grid gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-indigo-50"
              @click="continueToAuth('google')"
            >
              Continue with Google
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
              @click="continueToAuth('apple')"
            >
              Continue with Apple
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
              @click="continueToAuth('email_or_phone')"
            >
              Email or phone
            </button>
          </div>

          <button type="button" class="mt-6 text-sm text-indigo-200/75 underline-offset-4 hover:text-white hover:underline" @click="continueWithoutSaving">
            Not now
          </button>
        </div>
      </section>
    </main>

    <TaskPlannerDialog
      v-if="showPlanner"
      :open="showPlanner"
      :date="todayKey"
      :compact="true"
      :auto-generate="true"
      :initial-input="firstTaskInput"
      @close="closePlanner"
      @saved="onPlanSaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import {
  trackFirstCaptureStarted,
  trackFirstTaskCreated,
  trackSavePlanPromptAction,
  trackSavePlanPromptShown,
} from '@/services/analytics'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useSeoMeta } from '@/composables/useSeoMeta'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

useSeoMeta({
  title: 'PlanCraftAI | Start planning',
  description: 'Tell PlanCraftAI what you need to get done and turn it into a plan.',
  canonicalPath: '/signup',
  noindex: true,
})

const examples = [
  'Prepare for my interview tomorrow',
  'Remind me to call the dentist at 4',
  'Plan my afternoon',
]
const todayKey = toLocalDateKey(new Date())
const firstTaskInput = ref('')
const ready = ref(false)
const starting = ref(false)
const showPlanner = ref(false)
const planReady = ref(false)
const errorMessage = ref('')

const isGuestSession = computed(() =>
  authStore?.guest === true || authStore?.isGuest === true || authStore?.user?.mode === 'guest',
)

async function preparePlanningSpace() {
  try {
    if (authStore.user?.uid && !isGuestSession.value) {
      await router.replace('/today')
      return
    }
    if (!authStore.user?.uid) await authStore.loginAsGuest()
    ready.value = true
    trackFirstCaptureStarted({
      source: route.query.guestFromLanding === '1' ? 'landing' : 'direct',
    })
  } catch (error) {
    console.error('Could not prepare planning space', error)
    errorMessage.value = 'Could not start PlanCraft. Please try again.'
  }
}

function startPlanning() {
  if (!firstTaskInput.value.trim() || starting.value) return
  starting.value = true
  showPlanner.value = true
}

function onPlanSaved(tasks = []) {
  if (!Array.isArray(tasks) || !tasks.length) return
  starting.value = false
  showPlanner.value = false
  planReady.value = true
  trackFirstTaskCreated({ source: 'first_capture', task_count: tasks.length, guest: true })
  trackSavePlanPromptShown({ task_count: tasks.length, source: 'first_capture' })
}

function closePlanner() {
  starting.value = false
  showPlanner.value = false
}

function continueWithoutSaving() {
  trackSavePlanPromptAction({ action: 'not_now' })
  router.push('/today')
}

function continueToAuth(method) {
  trackSavePlanPromptAction({ action: 'authenticate', method })
  router.push({
    path: '/login',
    query: {
      next: '/today',
      save_plan: '1',
      auth_method: method,
    },
  })
}

onMounted(() => {
  preparePlanningSpace()
})
</script>

<style scoped>
.guest-start {
  isolation: isolate;
}

.capture-card {
  box-shadow: 0 28px 90px rgba(15, 23, 42, 0.45);
}
</style>
