<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :title="null"
    :width="dialogWidth"
    class="payment-error-dialog"
     :style="{
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
      color: '#e2e8f0',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)'
    }"
    destroy-on-close
    @close="visible = false"
  >
    <div class="text-center px-4 py-2">
      <!-- <el-icon class="text-red-400 text-4xl mb-3">
        <CircleCloseFilled />
      </el-icon> -->
      <h3 class="text-lg font-semibold text-slate-100 mb-2">
        {{ title }}
      </h3>
      <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
        {{ message }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-center gap-3">
        <el-button class="retry-btn" @click="emitRetry">
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
import { CircleCloseFilled } from '@element-plus/icons-vue'

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

const dialogWidth = ref(window.innerWidth < 640 ? '90%' : '420px')

watch(() => props.modelValue, val => visible.value = val)
watch(visible, val => emit('update:modelValue', val))

function emitRetry() {
  emit('retry')
  visible.value = false
}
</script>

<style scoped>
.payment-error-dialog .el-dialog {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95); /* dark indigo gradient */
  color: #e2e8f0;
  border-radius: 1rem;
  box-shadow: 0 8px 30px rgba(0,0,0,0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

/* Hide default header */
.payment-error-dialog .el-dialog__header {
  display: none;
}

/* Footer buttons */
.retry-btn {
  background: linear-gradient(90deg, #9333ea, #ec4899); /* purple → pink */
  border: none;
  color: white;
  font-weight: 600;
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
}
.retry-btn:hover {
  opacity: 0.9;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  font-weight: 500;
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}
</style>