<template>
  <el-dialog
    v-model="internalOpen"
    class="premium-activation-dialog"
    :show-close="false"
    :width="dialogWidth"
    append-to-body
    @close="handleClose"
  >
    <div class="premium-activation">
      <div class="premium-activation__topline">
        <div class="premium-activation__icon" aria-hidden="true">✦</div>
        <button
          type="button"
          class="premium-activation__close"
          aria-label="Close premium offer"
          @click="dismiss('close')"
        >
          ×
        </button>
      </div>
      <p class="premium-activation__eyebrow">You’ve found your planning rhythm</p>
      <h2 class="premium-activation__title">Keep the momentum going</h2>
      <p class="premium-activation__copy">
        Keep turning ideas into a dependable daily system with unlimited AI plans and smart reminders.
      </p>

      <div class="premium-activation__offer" aria-label="Solo Premium pricing">
        <div>
          <span class="premium-activation__offer-label">Solo Premium</span>
          <strong>$2/mo</strong>
        </div>
        <span class="premium-activation__offer-note">Cancel anytime</span>
      </div>

      <ul class="premium-activation__benefits">
        <li>Unlimited AI task plans</li>
        <li>Smart reminders across your channels</li>
        <li>Calendar and WhatsApp integration</li>
      </ul>

      <div class="premium-activation__actions">
        <button type="button" class="premium-activation__secondary" @click="dismiss">
          Not now
        </button>
        <button type="button" class="premium-activation__primary" @click="upgrade">
          Start Premium — $2/mo
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'upgrade', 'dismissed'])
const internalOpen = ref(props.modelValue)
const closingAction = ref('')
const dialogWidth = computed(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100% - 32px)' : '440px'))

watch(() => props.modelValue, (value) => {
  internalOpen.value = value
})

watch(internalOpen, (value) => {
  emit('update:modelValue', value)
})

function dismiss(reason = 'not_now') {
  closingAction.value = reason
  internalOpen.value = false
  emit('dismissed', reason)
}

function upgrade() {
  closingAction.value = 'upgrade'
  internalOpen.value = false
  emit('upgrade')
}

function handleClose() {
  const action = closingAction.value
  closingAction.value = ''
  emit('update:modelValue', false)
  if (!action) emit('dismissed', 'close')
}
</script>

<style scoped>
.premium-activation-dialog :deep(.el-dialog) {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 1.5rem;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
}

.premium-activation-dialog :deep(.el-dialog__header),
.premium-activation-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.premium-activation {
  padding: 2rem;
  color: #0f172a;
}

.premium-activation__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.premium-activation__icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border: 1px solid #c7d2fe;
  border-radius: 1rem;
  background: linear-gradient(135deg, #eef2ff, #f5f3ff);
  color: #4f46e5;
  font-size: 1.5rem;
}

.premium-activation__close {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: transparent;
  color: #64748b;
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1;
  transition: background 160ms ease, color 160ms ease;
}

.premium-activation__close:hover,
.premium-activation__close:focus-visible {
  background: #f1f3fa;
  color: #0f172a;
  outline: none;
}

.premium-activation__eyebrow {
  margin: 1.25rem 0 0.45rem;
  color: #4338ca;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.premium-activation__title {
  margin: 0;
  color: #0f172a;
  font-size: clamp(1.6rem, 5vw, 2rem);
  font-weight: 700;
  line-height: 1.15;
}

.premium-activation__copy {
  margin: 0.8rem 0 0;
  color: #475569;
  font-size: 0.98rem;
  line-height: 1.55;
}

.premium-activation__offer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.25rem;
  border: 1px solid #c7d2fe;
  border-radius: 1rem;
  background: #eef2ff;
  padding: 0.85rem 1rem;
}

.premium-activation__offer > div {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}

.premium-activation__offer-label {
  color: #3730a3;
  font-size: 0.8rem;
  font-weight: 700;
}

.premium-activation__offer strong {
  color: #0f172a;
  font-size: 1.15rem;
}

.premium-activation__offer-note {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.premium-activation__benefits {
  display: grid;
  gap: 0.75rem;
  margin: 1.35rem 0 0;
  padding: 0;
  color: #334155;
  list-style: none;
}

.premium-activation__benefits li {
  position: relative;
  padding-left: 1.45rem;
  line-height: 1.4;
}

.premium-activation__benefits li::before {
  position: absolute;
  top: 0.1rem;
  left: 0;
  color: #4f46e5;
  content: '✓';
  font-weight: 800;
}

.premium-activation__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.premium-activation__actions button {
  min-height: 2.9rem;
  flex: 1;
  border-radius: 0.9rem;
  padding: 0.75rem 1rem;
  font-weight: 700;
  transition: transform 160ms ease, filter 160ms ease, background 160ms ease;
}

.premium-activation__actions button:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}

.premium-activation__secondary {
  border: 1px solid #cbd5e1;
  background: #f1f3fa;
  color: #334155;
}

.premium-activation__primary {
  border: 0;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  box-shadow: 0 10px 26px rgba(99, 102, 241, 0.28);
}

html[data-pc-theme='dark'] .premium-activation-dialog :deep(.el-dialog) {
  border-color: rgba(192, 132, 252, 0.24);
  background: linear-gradient(145deg, rgba(30, 27, 75, 0.98), rgba(49, 46, 129, 0.98));
  box-shadow: 0 24px 80px rgba(8, 7, 30, 0.58);
}

html[data-pc-theme='dark'] .premium-activation {
  color: #fff;
}

html[data-pc-theme='dark'] .premium-activation__icon {
  border-color: rgba(216, 180, 254, 0.35);
  background: linear-gradient(135deg, rgba(217, 70, 239, 0.32), rgba(99, 102, 241, 0.42));
  color: #f5d0fe;
}

html[data-pc-theme='dark'] .premium-activation__close {
  color: #cbd5e1;
}

html[data-pc-theme='dark'] .premium-activation__close:hover,
html[data-pc-theme='dark'] .premium-activation__close:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

html[data-pc-theme='dark'] .premium-activation__eyebrow {
  color: #e9d5ff;
}

html[data-pc-theme='dark'] .premium-activation__title {
  color: #fff;
}

html[data-pc-theme='dark'] .premium-activation__copy {
  color: rgba(224, 231, 255, 0.82);
}

html[data-pc-theme='dark'] .premium-activation__offer {
  border-color: rgba(165, 180, 252, 0.35);
  background: rgba(99, 102, 241, 0.16);
}

html[data-pc-theme='dark'] .premium-activation__offer-label {
  color: #c4b5fd;
}

html[data-pc-theme='dark'] .premium-activation__offer strong {
  color: #fff;
}

html[data-pc-theme='dark'] .premium-activation__offer-note {
  color: #cbd5e1;
}

html[data-pc-theme='dark'] .premium-activation__benefits {
  color: rgba(245, 243, 255, 0.94);
}

html[data-pc-theme='dark'] .premium-activation__benefits li::before {
  color: #d8b4fe;
}

html[data-pc-theme='dark'] .premium-activation__secondary {
  border-color: rgba(224, 231, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #e0e7ff;
}

@media (max-width: 480px) {
  .premium-activation {
    padding: 1.5rem;
  }

  .premium-activation__actions {
    flex-direction: column-reverse;
  }
}
</style>
