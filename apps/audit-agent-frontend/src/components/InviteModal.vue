<template>
  <el-dialog
    :model-value="open"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    @close="handleClose"
    class="invite-modal"
  >
    <template #header>
      <div class="modal-header">
        <h2>Invite a teammate</h2>
        <p class="subtitle">Theyll receive an email with a link to join this workspace.</p>
      </div>
    </template>

    <form class="modal-body" @submit.prevent="submit">
      <label class="form-field">
        <span>Email</span>
        <el-input
          v-model.trim="form.email"
          placeholder="teammate@company.com"
          size="large"
          :disabled="submitting"
          autocomplete="off"
        />
      </label>

      <label class="form-field">
        <span>Role</span>
        <el-select
          v-model="form.role"
          size="large"
          :disabled="submitting"
        >
          <el-option label="Member" value="member" />
          <el-option label="Viewer" value="viewer" />
          <el-option label="Admin" value="admin" />
        </el-select>
      </label>

      <p v-if="error" class="error-text">{{ error }}</p>
    </form>

    <template #footer>
      <div class="modal-actions">
        <el-button @click="handleClose" :disabled="submitting">Cancel</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!isValid"
          @click="submit"
        >
          Send invite
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submit', payload: { email: string; role: string }): void
}>()

const form = reactive({
  email: '',
  role: 'member',
})
const submitting = ref(false)
const error = ref('')

const isValidEmail = (value: string) => /.+@.+\..+/.test(value.trim())
const isValid = computed(() => isValidEmail(form.email))

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.email = ''
      form.role = 'member'
      error.value = ''
      submitting.value = false
    }
  },
)

function handleClose() {
  if (submitting.value) return
  emit('update:open', false)
}

async function submit() {
  if (!isValid.value) {
    error.value = 'Please enter a valid email.'
    return
  }
  error.value = ''
  submitting.value = true
  try {
    await emit('submit', { email: form.email.trim(), role: form.role })
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.message || 'Failed to send invite.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}
.subtitle {
  margin: 0;
  color: rgba(15, 23, 42, 0.7);
  font-size: 0.95rem;
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.85);
}
.error-text {
  color: #dc2626;
  font-size: 0.85rem;
  margin: 4px 0 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

<style>
.invite-modal .el-dialog__header {
  padding-bottom: 0;
}
.invite-modal .el-dialog__footer {
  padding-top: 0;
}
</style>
