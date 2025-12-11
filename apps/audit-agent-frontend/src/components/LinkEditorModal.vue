<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    :width="dialogWidth"
    :close-on-click-modal="false"
    class="link-editor-dialog"
    @closed="handleClose"
  >
    <div class="space-y-4">
      <div class="grid gap-3">
        <el-input v-model="form.title" placeholder="Link title" />
        <el-input v-model="form.url" placeholder="https://example.com" />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <el-select v-model="form.category" placeholder="Select category">
            <el-option
              v-for="cat in categoryOptions"
              :key="cat.id || cat.name"
              :label="`${cat.icon ? cat.icon + ' ' : ''}${cat.name}`"
              :value="cat.name"
            />
          </el-select>
          <el-input v-model="form.icon" placeholder="🔗" class="sm:col-span-1" />
          <el-switch
            v-model="form.starred"
            active-text="Starred"
            inactive-text="Normal"
            class="self-center"
          />
        </div>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Optional description or notes"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button class="bg-slate-800 text-slate-100 border-slate-700" @click="onCancel">
          Cancel
        </el-button>
        <el-button
          type="primary"
          class="px-4 py-2 rounded-lg text-white font-semibold shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700"
          @click="onSubmit"
        >
          Save Link
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElDialog, ElInput, ElButton, ElSelect, ElOption, ElSwitch } from 'element-plus'

const fallbackCategories = [
  { id: 'personal', name: 'Personal', icon: '🏠' },
  { id: 'work', name: 'Work', icon: '💼' },
  { id: 'learning', name: 'Learning', icon: '📚' },
  { id: 'tools', name: 'Tools', icon: '🧰' },
  { id: 'finance', name: 'Finance', icon: '💳' },
]

const props = defineProps({
  open: { type: Boolean, default: false },
  link: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'save'])

const visible = ref(false)
const form = reactive({
  title: '',
  url: '',
  category: 'Personal',
  icon: '🔗',
  starred: false,
  description: '',
})
const dialogWidth = computed(() =>
  typeof window !== 'undefined' && window.innerWidth < 640 ? '95%' : '640px',
)
const categoryOptions = computed(() =>
  Array.isArray(props.categories) && props.categories.length ? props.categories : fallbackCategories,
)
const dialogTitle = computed(() => (props.link ? 'Edit Link' : 'Add Link'))

watch(
  () => props.open,
  (val) => {
    visible.value = val
    if (val) {
      hydrateForm(props.link)
    }
  },
  { immediate: true },
)

watch(
  () => props.link,
  (val) => {
    if (props.open) hydrateForm(val)
  },
)

function hydrateForm(link) {
  const baseCategory = categoryOptions.value[0]?.name || 'Personal'
  form.title = link?.title || ''
  form.url = link?.url || ''
  form.category = link?.category || baseCategory
  form.icon = link?.icon || '🔗'
  form.starred = !!(link?.starred ?? link?.pinned)
  form.description = link?.description || ''
}

function normalizeUrl(url) {
  if (!url) return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function onSubmit() {
  emit('save', {
    ...form,
    title: form.title?.trim() || form.url || 'New Link',
    url: normalizeUrl(form.url),
  })
}

function onCancel() {
  visible.value = false
}

function handleClose() {
  emit('close')
}
</script>

<style lang="scss">
.link-editor-dialog .el-dialog {
  background: radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.12), transparent 25%),
    radial-gradient(circle at 90% 10%, rgba(56, 189, 248, 0.12), transparent 25%),
    linear-gradient(135deg, #0f172a, #0b1224);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.35);
  color: #e5e7eb;
}

.link-editor-dialog .el-dialog__title {
  color: #f8fafc;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.link-editor-dialog .el-input__wrapper,
.link-editor-dialog .el-textarea__inner,
.link-editor-dialog .el-select__wrapper {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: none;
  color: #e5e7eb;
}

.link-editor-dialog .el-input__inner::placeholder,
.link-editor-dialog .el-textarea__inner::placeholder {
  color: rgba(226, 232, 240, 0.6);
}
</style>
