<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-4xl">
      <div class="bg-slate-900/70 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div class="px-8 py-6 flex items-center justify-between border-b border-white/10">
          <div>
            <p class="text-indigo-300 text-xs uppercase tracking-[0.35em]">Guest onboarding</p>
            <h1 class="text-2xl font-semibold mt-1">PlanCraft AI</h1>
          </div>
          <div class="text-right text-sm text-indigo-200/80">
            <p>Guest mode activated</p>
            <p class="text-xs text-indigo-300/80">No credit card required</p>
          </div>
        </div>

        <div class="px-8 py-10 space-y-6">
          <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500"
              :style="{ width: progressWidth }"
            ></div>
          </div>

          <div v-if="currentStep">
            <p class="text-indigo-200/80 text-sm uppercase tracking-widest mb-3">
              Step {{ currentStepIndex + 1 }} / {{ steps.length }}
            </p>
            <h2 class="text-3xl sm:text-4xl font-bold mb-4 flex items-center gap-3">
              <span class="text-4xl">{{ currentStep.icon }}</span>
              <span>{{ currentStep.title }}</span>
            </h2>
            <p class="text-indigo-100/90 text-base leading-relaxed max-w-2xl">
              {{ currentStep.description }}
            </p>

            <ul v-if="currentStep.highlights" class="mt-6 space-y-3">
              <li
                v-for="item in currentStep.highlights"
                :key="item"
                class="flex items-start gap-3 text-indigo-100/90"
              >
                <span class="text-lg">✨</span>
                <span>{{ item }}</span>
              </li>
            </ul>

            <div v-if="currentStep.type === 'personalize'" class="mt-8 space-y-6">
              <div>
                <p class="text-sm uppercase tracking-widest text-indigo-300/80 mb-2">
                  Pick today’s focus
                </p>
                <div class="grid sm:grid-cols-3 gap-3">
                  <button
                    v-for="option in focusOptions"
                    :key="option.value"
                    type="button"
                    class="rounded-2xl border px-4 py-3 text-left transition"
                    :class="[
                      selectedFocus === option.value
                        ? 'border-indigo-400 bg-indigo-500/20 shadow-lg'
                        : 'border-white/10 hover:border-indigo-300/60 hover:bg-white/5'
                    ]"
                    @click="selectedFocus = option.value"
                  >
                    <p class="font-semibold text-white">{{ option.label }}</p>
                    <p class="text-xs text-indigo-100/80 mt-1">{{ option.detail }}</p>
                  </button>
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm uppercase tracking-widest text-indigo-300/80 mb-2">
                    Reminder tone
                  </p>
                  <select
                    v-model="reminderTone"
                    class="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-100"
                  >
                    <option v-for="tone in reminderOptions" :key="tone.value" :value="tone.value">
                      {{ tone.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <p class="text-sm uppercase tracking-widest text-indigo-300/80 mb-2">
                    Preferred energy
                  </p>
                  <select
                    v-model="energyRhythm"
                    class="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-100"
                  >
                    <option value="morning">Morning focus</option>
                    <option value="afternoon">Afternoon creative time</option>
                    <option value="evening">Evening reflection</option>
                  </select>
                </div>
              </div>

              <div>
                <p class="text-sm uppercase tracking-widest text-indigo-300/80 mb-2">
                  Anything you want to share?
                </p>
                <textarea
                  v-model="intentionNote"
                  rows="3"
                  class="w-full bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-100"
                  placeholder="E.g. “Planning a calm launch week”"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-white/5">
            <button
              type="button"
              class="text-indigo-200/80 hover:text-white transition disabled:opacity-20"
              :disabled="currentStepIndex === 0"
              @click="prevStep"
            >
              ← Back
            </button>
            <div class="flex gap-3">
              <button
                type="button"
                class="px-5 py-2.5 rounded-xl border border-white/15 text-sm text-indigo-100 hover:border-white/40 transition"
                @click="skipFlow"
              >
                Skip
              </button>
              <button
                type="button"
                class="px-6 py-2.5 rounded-xl font-semibold text-white shadow-lg transition"
                :class="isLastStep ? 'bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400' : 'bg-white/10 hover:bg-white/20'"
                :disabled="finishing"
                @click="handlePrimary"
              >
                {{ isLastStep ? (finishing ? 'Preparing your space…' : 'Start planning') : 'Next' }}
              </button>
            </div>
          </div>

          <p class="text-xs text-indigo-200/70">
            Need to use an existing account?
            <RouterLink to="/login" class="text-white font-semibold underline-offset-2 hover:underline"
              >Go back to login</RouterLink
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import { trackGuestCompletedOnboarding, trackGuestReachedSignup, trackSignupCompleted } from '@/services/analytics'
import { seedGuestStarterTasks } from '@/utils/guestTasks'
import { useSeoMeta } from '@/composables/useSeoMeta'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
useSeoMeta({
  title: 'Sign up | PlanCraft AI Guest Onboarding',
  description:
    'Try PlanCraft AI in guest mode before creating an account. Start planning with AI, calendar sync, and voice reminders.',
  canonicalPath: '/signup',
  noindex: true,
})

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to your mindful workspace',
    description: 'You’ll get a quiet space to plan your day, talk to the planner, and capture reflections without creating an account yet.',
    icon: '🌿',
    highlights: [
      'Voice-plan tasks or journal entries in seconds',
      'Compassionate reminders keep you on track',
      'Guest mode keeps everything private until you upgrade',
    ],
  },
  {
    id: 'benefits',
    title: 'What you can do as a guest',
    description: 'PlanCraft AI guides you through a gentle rhythm: capture tasks, sync to your Google Calendar later, and keep momentum with soft nudges.',
    icon: '🧭',
    highlights: [
      'Plan your day with AI prioritization',
      'Try speaking to the planner hands-free',
      'Start a micro-journal to check in with yourself',
    ],
  },
  {
    id: 'personalize',
    type: 'personalize',
    title: 'Quick personalization',
    description: 'A few signals help the assistant prepare starter tasks suited to how you like to work.',
    icon: '🎯',
  },
]

const focusOptions = [
  { label: 'Plan my day', value: 'daily_flow', detail: 'Prioritize tasks + block time' },
  { label: 'Stay accountable', value: 'accountability', detail: 'Gentle reminders + streaks' },
  { label: 'Journal & reflect', value: 'reflection', detail: 'Evening prompts + recaps' },
]

const reminderOptions = [
  { label: 'Gentle nudges only', value: 'gentle' },
  { label: 'Keep me motivated', value: 'motivational' },
  { label: 'Hold me accountable', value: 'accountable' },
]

const currentStepIndex = ref(0)
const selectedFocus = ref(focusOptions[0].value)
const reminderTone = ref(reminderOptions[0].value)
const energyRhythm = ref('morning')
const intentionNote = ref('')
const finishing = ref(false)

const progressWidth = computed(() => `${((currentStepIndex.value + 1) / steps.length) * 100}%`)
const currentStep = computed(() => steps[currentStepIndex.value] || null)
const isLastStep = computed(() => currentStepIndex.value === steps.length - 1)

function nextStep() {
  if (currentStepIndex.value < steps.length - 1) {
    currentStepIndex.value += 1
  }
}

function prevStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value -= 1
  }
}

function skipFlow() {
  currentStepIndex.value = steps.length - 1
}

async function handlePrimary() {
  if (isLastStep.value) {
    await completeGuestSetup()
    return
  }
  nextStep()
}

async function completeGuestSetup() {
  if (finishing.value) return
  finishing.value = true
  try {
    if (!authStore.user?.uid) {
      await authStore.loginAsGuest()
    }
    const uid = authStore.user?.uid
    const alreadySeeded = authStore.user?.firstVisitInitialized === true
    if (uid && !alreadySeeded) {
      try {
        await seedGuestStarterTasks(uid, {
          focus: selectedFocus.value,
          reminderTone: reminderTone.value,
          energyRhythm: energyRhythm.value,
          intentionNote: intentionNote.value.trim(),
          source: 'guest_onboarding',
        })
        authStore.user = {
          ...(authStore.user || {}),
          firstVisitInitialized: true,
        }
      } catch (error) {
        console.warn('Guest onboarding seed failed', error?.message || error)
      }
    }

    trackGuestCompletedOnboarding({
      focus: selectedFocus.value,
      reminderTone: reminderTone.value,
      energyRhythm: energyRhythm.value,
      noteProvided: intentionNote.value.trim().length > 0,
      source: route.query.guestFromLanding === '1' ? 'landing' : 'direct',
    })
    trackSignupCompleted({ method: 'guest' })
    router.push('/dashboard')
  } catch (error) {
    console.error('Guest onboarding failed', error)
    ElMessage.error('Could not start guest session. Please try again.')
    finishing.value = false
  }
}

watch(
  () => authStore.user?.uid,
  (uid) => {
    try {
      if (!uid) return
      const guestMode = authStore.guest === true || authStore.isGuest === true || authStore.user?.mode === 'guest'
      if (!guestMode) {
        router.replace('/dashboard')
      }
    } catch {
      /* noop */
    }
  },
  { immediate: true }
)

onMounted(() => {
  trackGuestReachedSignup({
    source: route.query.guestFromLanding === '1' ? 'landing' : 'direct',
  })
})
</script>
