<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :title="null"
    :width="dialogWidth"
    class="payment-error-dialog"
    destroy-on-close
    @close="visible = false"
  >
    <div class="payment-error-dialog__content">
      <div class="payment-error-dialog__icon" aria-hidden="true">×</div>
      <h3 class="payment-error-dialog__title">
        {{ title }}
      </h3>
      <p class="payment-error-dialog__message">
        {{ message }}
      </p>
    </div>

    <template #footer>
      <div class="payment-error-dialog__footer">
        <el-button class="retry-btn" type="primary" @click="emitRetry">
          Retry
        </el-button>
        <el-button class="close-btn" @click="visible = false">
          Close
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Payment Service Unavailable' },
  message: { 
    type: String, 
    default: 'We couldn’t reach the payment service. Please try again later.' 
  }
})

const emit = defineEmits(['update:modelValue', 'retry'])
const visible = ref(props.modelValue)

const dialogWidth = ref(typeof window !== 'undefined' && window.innerWidth < 640 ? '90%' : '420px')

watch(() => props.modelValue, val => visible.value = val)
watch(visible, val => emit('update:modelValue', val))

function emitRetry() {
  emit('retry')
  visible.value = false
}
</script>

<style scoped>
.payment-error-dialog {
  border: 1px solid var(--pc-border, #e2e8f0) !important;
  border-radius: 1.25rem !important;
  background: var(--pc-surface, #ffffff) !important;
  color: var(--pc-text, #0f172a) !important;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18) !important;
}

.payment-error-dialog :deep(.el-dialog__header) {
  display: none;
}

.payment-error-dialog :deep(.el-dialog__body),
.payment-error-dialog :deep(.el-dialog__footer) {
  color: var(--pc-text, #0f172a);
}

.payment-error-dialog__content {
  padding: 0.5rem 1rem 0;
  text-align: center;
}

.payment-error-dialog__icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  margin: 0 auto 0.75rem;
  place-items: center;
  border-radius: 999px;
  background: var(--pc-danger-soft, rgba(201, 48, 44, 0.08));
  color: var(--pc-danger, #c9302c);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}

.payment-error-dialog__title {
  margin: 0;
  color: var(--pc-text, #0f172a);
  font-size: 1.125rem;
  font-weight: 700;
}

.payment-error-dialog__message {
  margin: 0.6rem 0 0;
  color: var(--pc-text-muted, #475569);
  font-size: 0.9375rem;
  line-height: 1.55;
}

.payment-error-dialog__footer {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.retry-btn {
  min-width: 6.5rem;
  border: 1px solid rgba(79, 70, 229, 0.35) !important;
  border-radius: 0.75rem !important;
  background: var(--pc-accent-fill, linear-gradient(135deg, #4f46e5, #7c3aed)) !important;
  color: #fff !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.24);
}

.retry-btn:hover,
.retry-btn:focus-visible {
  background: var(--pc-accent-fill-hover, linear-gradient(135deg, #4338ca, #6d28d9)) !important;
}

.close-btn {
  min-width: 6.5rem;
  border: 1px solid var(--pc-border-strong, #cbd5e1) !important;
  border-radius: 0.75rem !important;
  background: #fff !important;
  color: var(--pc-text-muted, #475569) !important;
  font-weight: 700 !important;
}

.close-btn:hover,
.close-btn:focus-visible {
  border-color: #818cf8 !important;
  background: var(--pc-accent-soft, rgba(79, 70, 229, 0.08)) !important;
  color: var(--pc-accent-text, #4338ca) !important;
}
</style>
