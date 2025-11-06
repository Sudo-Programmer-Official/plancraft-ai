<template>
  <section class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">🔗 Quick Links</h3>
      <!-- <el-button
        size="small"
        type="primary"
        class="bg-gradient-to-r from-pink-500 to-indigo-600 border-0 shadow-md hover:from-pink-600 hover:to-indigo-700 rounded-full"
        @click="open = true"
      >
        + Add
      </el-button> -->
      <button
  @click="open = true"
  class="text-sm px-4 py-1 rounded-full font-semibold text-white shadow-md
         bg-gradient-to-r from-pink-500 to-indigo-600
         hover:from-pink-600 hover:to-indigo-700 transition"
>
  + Add
</button>
    </div>

    <!-- Links grid -->
    <div
      v-if="links.length"
      class="flex gap-3 overflow-x-auto pb-2 scrollbar-plan"
    >
    <a
      v-for="l in sortedLinks"
      :key="l.id"
      :href="l.url"
      target="_blank"
      @click="touch(l)"
      class="flex-shrink-0 w-48 rounded-lg border border-white/10 p-3 bg-slate-900/50 hover:bg-slate-800/60 transition"
    >
      <div class="flex items-center justify-between">
        <span class="text-xl">{{ l.icon || '🔗' }}</span>
        <span v-if="l.pinned" class="text-xs text-amber-300">★</span>
      </div>
      <p class="mt-2 text-sm font-medium line-clamp-2">{{ l.title || l.url }}</p>
      <p class="text-xs text-slate-400 truncate">{{ l.url }}</p>
    </a>
  </div>
    <p v-else class="text-slate-400 text-sm">No links yet. Add the pages you open daily.</p>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="open"
      :title="editing ? 'Edit Link' : 'Add Link'"
      :width="dialogWidth"
       :style="{
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
      color: '#e2e8f0',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)'
    }"
      class="quick-links-dialog"
    >
      <div class="space-y-3">
        <el-input v-model="form.title" placeholder="Title" />
        <el-input v-model="form.url" placeholder="https://…" required />
        <div class="flex gap-2">
          <el-input v-model="form.tagsRaw" placeholder="tags, comma-separated" />
          <el-input v-model="form.icon" placeholder="🔗" class="w-20 text-center" />
        </div>
        <el-checkbox v-model="form.pinned">Pinned</el-checkbox>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="close" class="bg-gray-700 text-white">Cancel</el-button>
          <el-button type="primary" class="px-4 ml-0-custom py-2 rounded-lg text-white font-medium shadow-md
        bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
        hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
        transition-all duration-300 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]" @click="save">Save</el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElButton, ElDialog, ElInput, ElCheckbox } from 'element-plus'
import { getLinks, addLink, updateLink } from '@/services/firebaseService'

const links = ref([])
const open = ref(false)
const editing = ref(null)
const form = ref({ title: '', url: '', tagsRaw: '', pinned: false, icon: '🔗' })
const screenWidth = ref(window.innerWidth)

window.addEventListener('resize', () => {
  screenWidth.value = window.innerWidth
})

const dialogWidth = computed(() => (screenWidth.value < 640 ? '90%' : '520px'))

onMounted(async () => {
  links.value = await getLinks()
})

const sortedLinks = computed(() =>
  [...links.value].sort((a, b) => b.pinned - a.pinned || a.order - b.order),
)

function close() {
  open.value = false
  editing.value = null
  form.value = { title: '', url: '', tagsRaw: '', pinned: false, icon: '🔗' }
}

async function save() {
  const payload = {
    title: form.value.title?.trim(),
    url: form.value.url?.trim(),
    tags: form.value.tagsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    pinned: !!form.value.pinned,
    icon: form.value.icon || '🔗',
  }
  if (editing.value) {
    await updateLink(editing.value.id, payload)
    Object.assign(editing.value, payload)
  } else {
    const created = await addLink(payload)
    links.value.unshift(created)
  }
  close()
}

async function touch(link) {
  try {
    await updateLink(link.id, { lastUsedAt: Date.now() })
  } catch {
    // ignore
  }
}
</script>

<style lang="scss">
/* Dark themed Quick Links dialog */
.quick-links-dialog .el-dialog {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  color: #e2e8f0;
  border-radius: 1rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
}

/* Header */
.quick-links-dialog .el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.quick-links-dialog .el-dialog__title {
  color: #f1f5f9 !important;
  font-weight: 600;
}

/* Inputs */
.quick-links-dialog .el-input__wrapper {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 0.5rem !important;
  box-shadow: none !important;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.quick-links-dialog .el-input__inner {
  color: #f8fafc !important;
  background: transparent !important;
}
.quick-links-dialog .el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

/* Checkbox */
.quick-links-dialog .el-checkbox__label {
  color: #f1f5f9 !important;
}

/* Footer */
.quick-links-dialog .el-dialog__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.quick-links-dialog .el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-weight: 600;
  .el-dialog__title {
    color: #f1f5f9 !important;
  }
}
</style>
