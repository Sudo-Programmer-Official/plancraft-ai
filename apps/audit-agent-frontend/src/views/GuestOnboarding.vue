<template>
  <div class="guest-start">
    <main class="guest-start__main">
      <header class="guest-header">
        <RouterLink to="/" class="guest-brand" aria-label="PlanCraftAI home">
          <span class="guest-brand__mark"><img src="/icons/icon-96x96.png" alt="" width="40" height="40" /></span>
          <span class="guest-brand__copy">
            <strong>PlanCraftAI</strong>
            <small>Less planning. More doing.</small>
          </span>
        </RouterLink>
        <RouterLink to="/login" class="guest-sign-in">
          Already have an account? <span>Sign in <span aria-hidden="true">→</span></span>
        </RouterLink>
      </header>

      <section v-if="!ready && !errorMessage" class="guest-state guest-state--loading">
        <div class="guest-loader" aria-hidden="true" />
        <p class="guest-eyebrow">Preparing your space</p>
        <h1>One moment.</h1>
        <p>Your planning space will be ready in a moment.</p>
      </section>

      <section v-else-if="errorMessage" class="guest-state guest-state--error">
        <div class="guest-state__icon guest-state__icon--error" aria-hidden="true">!</div>
        <p class="guest-eyebrow">We hit a bump</p>
        <h1>Let’s get you unstuck.</h1>
        <p>We couldn’t open your planning space yet. Try again or sign in to continue.</p>
        <div class="guest-state__actions">
          <button type="button" class="guest-button guest-button--primary" @click="preparePlanningSpace">Try again</button>
          <RouterLink to="/login" class="guest-button guest-button--secondary">Sign in</RouterLink>
        </div>
      </section>

      <section v-else-if="!planReady" class="guest-capture">
        <div class="guest-capture__intro">
          <p class="guest-eyebrow">Start with one thing</p>
          <h1>What would make today feel lighter?</h1>
          <p>Type anything or say it out loud. PlanCraftAI will turn it into a clear next step.</p>
        </div>

        <div class="guest-capture-card">
          <div class="guest-input-shell">
            <label for="first-plan-input">What do you need to get done?</label>
            <textarea
              id="first-plan-input"
              v-model="firstTaskInput"
              rows="4"
              autofocus
              placeholder="Prepare for my interview tomorrow…"
              @keydown.meta.enter.prevent="startPlanning"
              @keydown.ctrl.enter.prevent="startPlanning"
            />
            <div class="guest-input-footer">
              <VoiceRecorder
                surface="first_capture"
                :icon-only="true"
                @transcribed="firstTaskInput = $event"
              />
              <button
                type="button"
                class="guest-button guest-button--primary guest-plan-button"
                :disabled="!firstTaskInput.trim() || starting"
                @click="startPlanning"
              >
                <span>{{ starting ? 'Planning…' : 'Plan it' }}</span>
                <span aria-hidden="true">✦</span>
              </button>
            </div>
          </div>

          <div class="guest-examples">
            <span>Try one:</span>
            <button v-for="example in examples" :key="example" type="button" @click="firstTaskInput = example">
              {{ example }}
            </button>
          </div>
        </div>

        <div class="guest-capture__trust">
          <span><span aria-hidden="true">✓</span> No account required</span>
          <span><span aria-hidden="true">✓</span> No credit card</span>
          <span><span aria-hidden="true">✓</span> Your first plan is free</span>
        </div>
      </section>

      <section v-else class="guest-success">
        <div class="guest-success-card">
          <div class="guest-state__icon guest-state__icon--success" aria-hidden="true">✓</div>
          <p class="guest-eyebrow">Your plan is ready</p>
          <h1>Keep your momentum.</h1>
          <p>Save your tasks and get reminders wherever you use PlanCraftAI.</p>

          <div class="guest-success__actions">
            <button type="button" class="guest-button guest-button--primary" :disabled="authBusy" @click="continueToAuth('google')">
              {{ authBusy && authMethod === 'google' ? 'Connecting…' : 'Continue with Google' }}
            </button>
            <button type="button" class="guest-button guest-button--secondary" :disabled="authBusy" @click="continueToAuth('apple')">
              {{ authBusy && authMethod === 'apple' ? 'Connecting…' : 'Continue with Apple' }}
            </button>
            <button type="button" class="guest-button guest-button--secondary" :disabled="authBusy" @click="continueToAuth('email_or_phone')">Email or phone</button>
            <p v-if="authErrorMessage" class="guest-auth-error" role="alert">{{ authErrorMessage }}</p>
          </div>

          <button type="button" class="guest-not-now" @click="continueWithoutSaving">Not now</button>
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
  trackGuestCompletedOnboarding,
  trackGuestReachedSignup,
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
const authBusy = ref(false)
const authMethod = ref('')
const authErrorMessage = ref('')

const isGuestSession = computed(() =>
  authStore?.guest === true || authStore?.isGuest === true || authStore?.user?.mode === 'guest',
)

async function preparePlanningSpace() {
  errorMessage.value = ''
  try {
    if (authStore.user?.uid && !isGuestSession.value) {
      await router.replace('/today')
      return
    }
    if (!authStore.user?.uid) await authStore.loginAsGuest()
    ready.value = true
    trackGuestReachedSignup({
      source: route.query.guestFromLanding === '1' ? 'landing' : 'direct',
    })
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
  trackGuestCompletedOnboarding({
    source: 'first_capture',
    task_count: tasks.length,
  })
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

async function continueToAuth(method) {
  if (authBusy.value) return
  trackSavePlanPromptAction({ action: 'authenticate', method })
  authErrorMessage.value = ''

  // Email and phone need their form/OTP UI. Google and Apple can use the
  // current click directly, avoiding a second provider-selection step.
  if (method === 'email_or_phone') {
    await router.push({
      path: '/login',
      query: {
        next: '/today',
        save_plan: '1',
        auth_method: method,
        mode: 'signIn',
      },
    })
    return
  }

  authBusy.value = true
  authMethod.value = method
  try {
    if (method === 'google') {
      await authStore.loginWithGoogle()
    } else {
      await authStore.loginWithApple()
    }

    if (authStore.user?.uid && !isGuestSession.value) {
      await router.push('/today')
      return
    }

    // Native/redirect auth may return before the browser session is hydrated.
    await router.push({
      path: '/login',
      query: {
        next: '/today',
        save_plan: '1',
        auth_method: method,
        mode: 'signIn',
      },
    })
  } catch (error) {
    console.warn('[GuestOnboarding] Provider authentication failed', error)
    const code = String(error?.code || '')
    if (code === 'auth/in-app-browser') {
      authErrorMessage.value = 'Google sign-in is blocked inside this app browser. Open PlanCraftAI in your browser or use email or phone.'
    } else if (code === 'feature-disabled/apple-auth') {
      authErrorMessage.value = 'Apple sign-in is temporarily unavailable. Use Google, email, or phone instead.'
    } else {
      authErrorMessage.value = 'That sign-in did not finish. Please try again or use email or phone.'
    }
  } finally {
    authBusy.value = false
    authMethod.value = ''
  }
}

onMounted(() => {
  preparePlanningSpace()
})
</script>

<style scoped>
.guest-start {
  --guest-ink: #111827;
  --guest-muted: #64748b;
  --guest-line: #e2e8f0;
  --guest-brand: #4f46e5;
  --guest-brand-dark: #3730a3;
  --guest-surface: rgba(255, 255, 255, 0.86);
  min-height: 100svh;
  isolation: isolate;
  background:
    radial-gradient(circle at 8% 12%, rgba(129, 140, 248, 0.18), transparent 30rem),
    radial-gradient(circle at 92% 82%, rgba(45, 212, 191, 0.13), transparent 28rem),
    #f8fafc;
  color: var(--guest-ink);
}

.guest-start__main {
  box-sizing: border-box;
  width: min(100%, 1120px);
  min-height: 100svh;
  margin: 0 auto;
  padding: max(1.25rem, calc(env(safe-area-inset-top, 0px) + 1rem)) 1.25rem max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem));
  display: flex;
  flex-direction: column;
}

.guest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.guest-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--guest-ink);
  text-decoration: none;
}

.guest-brand__mark {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border-radius: 0.9rem;
  background: linear-gradient(145deg, #5b5af7, #312e81);
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.24);
}

.guest-brand__mark img {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.7rem;
}

.guest-brand__copy {
  display: grid;
  gap: 0.05rem;
}

.guest-brand__copy strong {
  font-size: 1.08rem;
  letter-spacing: -0.02em;
}

.guest-brand__copy small {
  color: var(--guest-muted);
  font-size: 0.72rem;
}

.guest-sign-in {
  color: var(--guest-muted);
  font-size: 0.86rem;
  text-decoration: none;
}

.guest-sign-in span {
  color: var(--guest-brand-dark);
  font-weight: 700;
}

.guest-state,
.guest-capture,
.guest-success {
  width: min(100%, 760px);
  margin: auto;
}

.guest-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5rem 0;
  text-align: center;
}

.guest-state h1,
.guest-capture__intro h1,
.guest-success-card h1 {
  margin: 0.65rem 0 0;
  color: var(--guest-ink);
  font-size: clamp(2rem, 5vw, 3.6rem);
  font-weight: 750;
  letter-spacing: -0.055em;
  line-height: 1.04;
}

.guest-state > p:not(.guest-eyebrow),
.guest-capture__intro > p:not(.guest-eyebrow),
.guest-success-card > p:not(.guest-eyebrow) {
  max-width: 38rem;
  margin: 1rem auto 0;
  color: var(--guest-muted);
  font-size: 1.02rem;
  line-height: 1.65;
}

.guest-eyebrow {
  margin: 0;
  color: var(--guest-brand);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.guest-loader {
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: 1.5rem;
  border: 3px solid #e0e7ff;
  border-top-color: var(--guest-brand);
  border-radius: 999px;
  animation: guest-spin 0.9s linear infinite;
}

.guest-state__icon {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  margin-bottom: 1.5rem;
  border-radius: 1.35rem;
  font-size: 1.8rem;
  font-weight: 800;
}

.guest-state__icon--error {
  background: #fff1f2;
  color: #e11d48;
}

.guest-state__icon--success {
  background: #dcfce7;
  color: #15803d;
}

.guest-state__actions,
.guest-success__actions {
  display: grid;
  width: min(100%, 28rem);
  gap: 0.7rem;
  margin-top: 2rem;
}

.guest-capture {
  padding: clamp(3.5rem, 10vh, 7rem) 0 2rem;
  text-align: center;
}

.guest-capture__intro > p:not(.guest-eyebrow) {
  max-width: 42rem;
}

.guest-capture-card,
.guest-success-card {
  margin-top: 2.5rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 1.5rem;
  background: var(--guest-surface);
  box-shadow: 0 24px 70px rgba(30, 41, 59, 0.1);
  backdrop-filter: blur(18px);
}

.guest-input-shell {
  padding: 1rem;
  border: 1px solid #dbe3f0;
  border-radius: 1.05rem;
  background: #fff;
  text-align: left;
}

.guest-input-shell label {
  display: block;
  margin: 0 0 0.5rem;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.guest-input-shell textarea {
  display: block;
  width: 100%;
  min-height: 7rem;
  resize: vertical;
  border: 0;
  outline: 0;
  color: var(--guest-ink);
  font: inherit;
  font-size: 1.18rem;
  line-height: 1.65;
}

.guest-input-shell textarea::placeholder {
  color: #94a3b8;
}

.guest-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #eef2f7;
}

.guest-button {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem;
  border: 0;
  border-radius: 0.85rem;
  font: inherit;
  font-size: 0.94rem;
  font-weight: 750;
  text-decoration: none;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
  cursor: pointer;
}

.guest-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.guest-button:focus-visible,
.guest-examples button:focus-visible,
.guest-not-now:focus-visible,
.guest-sign-in:focus-visible,
.guest-brand:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.32);
  outline-offset: 3px;
}

.guest-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.guest-button--primary {
  color: #fff;
  background: linear-gradient(135deg, #5b5af7, #4338ca);
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.2);
}

.guest-button--secondary {
  border: 1px solid #dbe3f0;
  color: #334155;
  background: #fff;
}

.guest-button--secondary:hover:not(:disabled) {
  background: #f8fafc;
}

.guest-plan-button {
  min-width: 8.5rem;
}

.guest-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 1.15rem 0 0.2rem;
  color: #94a3b8;
  font-size: 0.8rem;
}

.guest-examples button {
  padding: 0.45rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  color: #475569;
  background: #fff;
  font: inherit;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
}

.guest-examples button:hover {
  border-color: #a5b4fc;
  color: var(--guest-brand-dark);
  background: #eef2ff;
}

.guest-capture__trust {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1.5rem;
  margin-top: 1.25rem;
  color: #64748b;
  font-size: 0.8rem;
}

.guest-capture__trust span span {
  margin-right: 0.25rem;
  color: #16a34a;
  font-weight: 800;
}

.guest-success {
  padding: 3rem 0;
}

.guest-success-card {
  max-width: 38rem;
  margin: auto;
  padding: clamp(2rem, 6vw, 4rem);
  text-align: center;
}

.guest-success-card .guest-state__icon {
  margin-right: auto;
  margin-left: auto;
}

.guest-success-card h1 {
  font-size: clamp(2rem, 5vw, 3rem);
}

.guest-not-now {
  margin-top: 1.2rem;
  padding: 0.4rem;
  border: 0;
  color: #64748b;
  background: transparent;
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;
}

.guest-not-now:hover {
  color: var(--guest-brand-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@keyframes guest-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .guest-header {
    align-items: flex-start;
  }

  .guest-sign-in {
    max-width: 8.5rem;
    text-align: right;
    line-height: 1.35;
  }

  .guest-brand__copy small {
    display: none;
  }

  .guest-capture {
    padding-top: 3.5rem;
  }

  .guest-capture__intro h1 {
    font-size: clamp(2.25rem, 12vw, 3.25rem);
  }

  .guest-input-footer {
    align-items: stretch;
  }

  .guest-plan-button {
    flex: 1;
  }
}
</style>
