<template>
  <el-dialog
    v-model="visible"
    :width="420"
    class="plancraft-dialog"
  >
    <div class="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-purple-950/90 to-indigo-900/90 border border-violet-700/40 shadow-2xl text-white">
      <h2 class="text-2xl font-bold mb-3 flex items-center gap-2 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">
        <span>🔔</span> Stay on track!
      </h2>

      <p class="text-slate-300 mb-6 text-sm leading-relaxed">
        Set up your notification channels so you never miss a reminder.
      </p>

      <div class="flex flex-col gap-3">
        <RouterLink
          to="/settings?tab=notifications"
          class="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400
                 text-white px-5 py-2.5 rounded-xl text-center font-medium transition-all duration-200
                 shadow-md hover:shadow-violet-500/30 active:scale-[0.98]"
          @click.native="close"
        >
          Go to Notification Settings
        </RouterLink>

        <button
          @click="close"
          class="text-slate-400 text-sm underline hover:text-slate-200 transition-colors mt-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])
const visible = ref(props.modelValue)

watch(() => props.modelValue, (v) => { visible.value = v })
watch(visible, (v) => emit('update:modelValue', v))
function close() { visible.value = false }
</script>

<style scoped>
/* Hide the default Element background and shadow */
.plancraft-dialog ::v-deep(.el-dialog) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  border-radius: 1rem !important;
}

.plancraft-dialog ::v-deep(.el-overlay-dialog) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.plancraft-dialog ::v-deep(.el-dialog__header) {
  display: none;
}

.plancraft-dialog ::v-deep(.el-dialog__body) {
  padding: 0 !important;
  background: transparent !important;
}

.plancraft-dialog {
  backdrop-filter: blur(18px);
}
</style>