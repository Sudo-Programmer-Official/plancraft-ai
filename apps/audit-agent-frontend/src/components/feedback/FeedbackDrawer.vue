<template>
  <transition name="fade">
    <div
      v-if="store.drawerVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm"
    >
      <div class="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-pc-border bg-pc-surface p-6 text-pc-text shadow-2xl sm:p-7">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-pc-text-subtle">
              {{ supportMode ? 'Support request' : 'We’d love to hear from you' }}
            </p>
            <h2 class="mt-1 text-2xl font-semibold text-pc-text">
              {{ supportMode ? 'Raise a support ticket' : 'How can we improve PlanCraft?' }}
            </h2>
          </div>
          <button class="text-pc-text-subtle hover:text-pc-text" aria-label="Close" @click="store.closeDrawer">✕</button>
        </div>

        <div class="mt-6 space-y-4 text-sm text-pc-text-muted">
          <label class="block text-xs font-semibold uppercase tracking-widest text-pc-text-subtle">
            {{ supportMode ? 'Urgency' : 'How was your experience?' }}
            <div class="mt-2 flex gap-2">
              <button
                v-for="value in [1,2,3,4,5]"
                :key="value"
                class="flex-1 rounded-xl border px-2 py-2 text-base transition"
                :class="store.form.rating === value ? 'border-pc-accent bg-pc-accent-soft text-pc-accent-text' : 'border-pc-border bg-pc-surface-2 text-pc-text-muted hover:border-pc-border-strong'"
                @click="store.form.rating = value"
              >
                {{ value }}
              </button>
            </div>
          </label>

          <label class="block text-xs font-semibold uppercase tracking-widest text-pc-text-subtle">
            Feedback type
            <select
              v-model="store.form.type"
              class="mt-2 w-full rounded-2xl border border-pc-border bg-pc-surface px-3 py-2 text-sm text-pc-text focus:outline-none focus:ring-2 focus:ring-pc-accent"
            >
              <option value="support">Support ticket</option>
              <option value="idea">Feature idea</option>
              <option value="issue">Something broke</option>
              <option value="love">Love it</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label class="block text-xs font-semibold uppercase tracking-widest text-pc-text-subtle">
            Tell us more
            <textarea
              v-model="store.form.message"
              rows="4"
              class="mt-2 w-full rounded-2xl border border-pc-border bg-pc-surface px-3 py-2 text-sm text-pc-text placeholder:text-pc-text-subtle focus:outline-none focus:ring-2 focus:ring-pc-accent"
              :placeholder="supportMode ? 'What happened, what did you expect, and which screen were you using?' : 'Drop details, ideas, or links. The more context, the better we can help.'"
            />
          </label>

          <label class="flex items-center gap-2 text-xs text-pc-text-muted">
            <input type="checkbox" v-model="store.form.allowContact" class="accent-pc-accent" />
            You can reach out if you need more information.
          </label>
        </div>

        <p v-if="store.errorMessage" class="mt-3 text-sm text-rose-600">{{ store.errorMessage }}</p>
        <p v-if="store.submitSuccess" class="mt-3 text-sm text-emerald-600">
          {{ supportMode ? 'Your ticket was sent to the admin queue.' : 'Thanks! We’ll keep building with your note.' }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-xl border border-pc-border px-5 py-2 text-sm font-semibold text-pc-text-muted hover:border-pc-border-strong hover:text-pc-text"
            @click="store.closeDrawer"
            :disabled="store.submitting"
          >
            Cancel
          </button>
          <button
            class="rounded-xl bg-[image:var(--pc-accent-fill)] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[image:var(--pc-accent-fill-hover)] disabled:opacity-60"
            @click="handleSubmit"
            :disabled="store.submitting"
          >
            {{ store.submitting ? 'Sending...' : supportMode ? 'Send ticket' : 'Send feedback' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useAuthStore } from '@/stores/authStore'

const store = useFeedbackStore()
const authStore = useAuthStore()
const route = useRoute()
const supportMode = computed(() => store.context?.kind === 'support-ticket')

function handleSubmit() {
  if (supportMode.value && !store.form.message.trim()) {
    store.errorMessage = 'Please describe the issue before sending the ticket.'
    return
  }
  store.sendFeedback(authStore.user?.uid, { route: route.name || route.path })
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
