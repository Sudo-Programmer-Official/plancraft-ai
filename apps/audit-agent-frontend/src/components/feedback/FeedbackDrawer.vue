<template>
  <transition name="fade">
    <div
      v-if="store.drawerVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
    >
      <div class="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-fuchsia-200/70">We’d love to hear from you</p>
            <h2 class="mt-1 text-2xl font-semibold text-white">How can we improve PlanCraft?</h2>
          </div>
          <button class="text-slate-400 hover:text-white" @click="store.closeDrawer">✕</button>
        </div>

        <div class="mt-6 space-y-4 text-sm text-slate-200">
          <label class="block text-xs uppercase tracking-widest text-slate-400">
            How was your experience?
            <div class="mt-2 flex gap-2">
              <button
                v-for="value in [1,2,3,4,5]"
                :key="value"
                class="flex-1 rounded-xl border px-2 py-2 text-base transition"
                :class="store.form.rating === value ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white' : 'border-white/10 bg-black/40 text-slate-300 hover:border-white/30'"
                @click="store.form.rating = value"
              >
                {{ value }}
              </button>
            </div>
          </label>

          <label class="block text-xs uppercase tracking-widest text-slate-400">
            Feedback type
            <select
              v-model="store.form.type"
              class="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="idea">Feature idea</option>
              <option value="issue">Something broke</option>
              <option value="love">Love it</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label class="block text-xs uppercase tracking-widest text-slate-400">
            Tell us more
            <textarea
              v-model="store.form.message"
              rows="4"
              class="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
              placeholder="Drop details, ideas, or links. The more context, the better we can help."
            />
          </label>

          <label class="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" v-model="store.form.allowContact" class="accent-fuchsia-500" />
            You can reach out if you need more info.
          </label>
        </div>

        <p v-if="store.errorMessage" class="mt-3 text-sm text-red-300">{{ store.errorMessage }}</p>
        <p v-if="store.submitSuccess" class="mt-3 text-sm text-emerald-300">Thanks! We’ll keep building with your note.</p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            class="rounded-full border border-white/20 px-5 py-2 text-sm text-slate-200 hover:border-white/40"
            @click="store.closeDrawer"
            :disabled="store.submitting"
          >
            Cancel
          </button>
          <button
            class="rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
            @click="handleSubmit"
            :disabled="store.submitting"
          >
            {{ store.submitting ? 'Sending...' : 'Send feedback' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useAuthStore } from '@/stores/authStore'

const store = useFeedbackStore()
const authStore = useAuthStore()
const route = useRoute()

function handleSubmit() {
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
