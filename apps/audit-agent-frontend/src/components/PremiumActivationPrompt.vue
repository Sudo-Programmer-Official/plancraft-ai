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
      <div class="premium-activation__icon" aria-hidden="true">✦</div>
      <p class="premium-activation__eyebrow">You’ve found your planning rhythm</p>
      <h2 class="premium-activation__title">Keep the momentum going</h2>
      <p class="premium-activation__copy">
        Premium gives you more room to turn ideas into a dependable daily system.
      </p>

      <ul class="premium-activation__benefits">
        <li>Unlimited AI task plans</li>
        <li>Smart reminder coverage across your channels</li>
        <li>More integrations as your workflow grows</li>
      </ul>

      <div class="premium-activation__actions">
        <button type="button" class="premium-activation__secondary" @click="dismiss">
          Not now
        </button>
        <button type="button" class="premium-activation__primary" @click="upgrade">
          Upgrade
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
const dialogWidth = computed(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100% - 32px)' : '440px'))

watch(() => props.modelValue, (value) => {
  internalOpen.value = value
})

watch(internalOpen, (value) => {
  emit('update:modelValue', value)
})

function dismiss() {
  internalOpen.value = false
  emit('dismissed')
}

function upgrade() {
  internalOpen.value = false
  emit('upgrade')
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.premium-activation-dialog :deep(.el-dialog) {
  overflow: hidden;
  border: 1px solid rgba(192, 132, 252, 0.24);
  border-radius: 1.5rem;
  background: linear-gradient(145deg, rgba(30, 27, 75, 0.98), rgba(49, 46, 129, 0.98));
  box-shadow: 0 24px 80px rgba(8, 7, 30, 0.58);
}

.premium-activation-dialog :deep(.el-dialog__header),
.premium-activation-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.premium-activation {
  padding: 2rem;
  color: #fff;
}

.premium-activation__icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border: 1px solid rgba(216, 180, 254, 0.35);
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(217, 70, 239, 0.32), rgba(99, 102, 241, 0.42));
  color: #f5d0fe;
  font-size: 1.5rem;
}

.premium-activation__eyebrow {
  margin: 1.25rem 0 0.45rem;
  color: #e9d5ff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.premium-activation__title {
  margin: 0;
  color: #fff;
  font-size: clamp(1.6rem, 5vw, 2rem);
  font-weight: 700;
  line-height: 1.15;
}

.premium-activation__copy {
  margin: 0.8rem 0 0;
  color: rgba(224, 231, 255, 0.82);
  font-size: 0.98rem;
  line-height: 1.55;
}

.premium-activation__benefits {
  display: grid;
  gap: 0.75rem;
  margin: 1.35rem 0 0;
  padding: 0;
  color: rgba(245, 243, 255, 0.94);
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
  color: #d8b4fe;
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
  border: 1px solid rgba(224, 231, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #e0e7ff;
}

.premium-activation__primary {
  border: 0;
  background: linear-gradient(90deg, #c026d3, #6366f1);
  color: #fff;
  box-shadow: 0 10px 26px rgba(99, 102, 241, 0.28);
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
