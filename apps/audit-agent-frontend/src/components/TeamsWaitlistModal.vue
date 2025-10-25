<template>
  <transition name="waitlist-fade">
    <div v-if="visible" class="waitlist-backdrop" @click.self="close">
      <div class="waitlist-panel" role="dialog" aria-modal="true">
        <header class="waitlist-header">
          <div>
            <h2>Join the Teams Waitlist</h2>
            <p>We're staging access to keep quality high. Add your email and we'll notify you.</p>
          </div>
          <button type="button" class="close-btn" aria-label="Close" @click="close">✕</button>
        </header>

        <form class="waitlist-form" @submit.prevent="submit">
          <label class="field">
            <span>Name</span>
            <input v-model="form.name" type="text" placeholder="Ada Lovelace" required />
          </label>

          <label class="field">
            <span>Email</span>
            <input
              v-model="form.email"
              type="email"
              placeholder="you@company.com"
              required
            />
          </label>

          <label class="field">
            <span>Company size</span>
            <select v-model="form.companySize">
              <option value="" disabled>Select size</option>
              <option value="solo">Just me</option>
              <option value="2-5">2 – 5</option>
              <option value="6-20">6 – 20</option>
              <option value="21-50">21 – 50</option>
              <option value="50+">50+</option>
            </select>
          </label>

          <label class="field">
            <span>Use case</span>
            <textarea
              v-model="form.useCase"
              rows="3"
              placeholder="Voice-first standups, meeting follow-ups, etc."
            ></textarea>
          </label>

          <footer class="waitlist-footer">
            <button
              type="submit"
              class="submit-btn"
              :disabled="marketingStore.submitting"
            >
              <span v-if="marketingStore.submitting">Submitting…</span>
              <span v-else>Notify me</span>
            </button>
          </footer>
        </form>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMarketingStore } from '@/stores/marketingStore'
import { useToastStore } from '@/stores/toastStore'
import { trackEvent } from '@/services/analytics'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void; (e: 'submitted'): void }>()

const marketingStore = useMarketingStore()
const toastStore = useToastStore()
const form = reactive({
  name: '',
  email: '',
  companySize: '',
  useCase: '',
})
const errorMessage = ref('')

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

watch(visible, (value) => {
  if (value) {
    errorMessage.value = ''
    marketingStore.setUtmFromUrl()
  } else {
    resetForm()
  }
})

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email.trim())
}

async function submit() {
  if (!form.name.trim() || !validateEmail(form.email)) {
    errorMessage.value = 'Please enter a valid name and email.'
    return
  }
  errorMessage.value = ''
  try {
    await marketingStore.submitWaitlist({ ...form })
    trackEvent('teams_waitlist_submit', {
      location: 'landing-hero',
      companySize: form.companySize || 'unknown',
    })
    toastStore.push("You're on the list! We'll reach out soon.", {
      type: 'success',
      duration: 3600,
    })
    marketingStore.error = null
    visible.value = false
    emit('submitted')
  } catch (err) {
    const message = marketingStore.error || 'Could not submit waitlist entry. Please try again.'
    errorMessage.value = message
    toastStore.push(message, { type: 'error', duration: 3600 })
  }
}

function close() {
  visible.value = false
}

function resetForm() {
  form.name = ''
  form.email = ''
  form.companySize = ''
  form.useCase = ''
  errorMessage.value = ''
  marketingStore.error = null
}
</script>

<style scoped>
.waitlist-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 11, 19, 0.72);
  backdrop-filter: blur(12px);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.waitlist-panel {
  width: min(420px, 100%);
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 28px 60px rgba(8, 11, 19, 0.55);
  padding: 24px;
  color: #eef2ff;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.waitlist-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.waitlist-header h2 {
  margin: 0 0 6px;
  font-size: 1.45rem;
}

.waitlist-header p {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(203, 213, 225, 0.85);
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.waitlist-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
}

.field span {
  color: rgba(224, 231, 255, 0.92);
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.7);
  color: #f8fafc;
  padding: 12px;
  font-size: 0.95rem;
}

.field textarea {
  resize: vertical;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.45);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

.waitlist-footer {
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #5f3ef8, #8b5cf6);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 18px 32px rgba(91, 53, 234, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 24px 42px rgba(91, 53, 234, 0.55);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.error-text {
  color: #fca5a5;
  font-size: 0.85rem;
  margin: 0;
}

.waitlist-fade-enter-active,
.waitlist-fade-leave-active {
  transition: opacity 0.2s ease;
}
.waitlist-fade-enter-from,
.waitlist-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .waitlist-panel {
    padding: 20px;
  }
}
</style>
