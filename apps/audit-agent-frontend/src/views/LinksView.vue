<template>
  <main class="min-h-screen px-3 sm:px-6 py-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <p class="text-[11px] uppercase tracking-[0.35em] text-indigo-300/80">Quick Links Hub</p>
        <h1 class="text-2xl sm:text-3xl font-semibold">Organize and open faster</h1>
        <p class="text-sm text-slate-300 mt-1">Categories, search, and rich cards designed for scale.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="px-3 py-2 rounded-lg border border-slate-700 text-sm font-semibold bg-slate-900 hover:border-indigo-400 transition"
          @click="openEditor()"
        >
          + New Link
        </button>
        <button
          class="px-3 py-2 rounded-lg border border-slate-700 text-sm font-semibold bg-slate-900 hover:border-indigo-400 transition"
          @click="startAddCategory"
        >
          + New Category
        </button>
      </div>
    </header>

    <section class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <!-- Sidebar -->
      <aside class="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p class="text-xs uppercase tracking-[0.3em] text-indigo-200/70">Categories</p>
        <div class="space-y-1">
          <button
            v-for="cat in sidebarCategories"
            :key="cat.key"
            class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition"
            :class="activeCategory === cat.name ? 'bg-indigo-700 text-white border border-indigo-500/60' : 'bg-slate-800/70 text-slate-200 border border-slate-800 hover:border-indigo-400/40'"
            @click="setCategory(cat.name)"
          >
            <span class="flex items-center gap-2 truncate">
              <span>{{ cat.icon }}</span>
              <span class="truncate">{{ cat.name }}</span>
            </span>
            <span class="text-xs text-slate-300">{{ categoryCounts[cat.name] || 0 }}</span>
          </button>
        </div>

        <div class="pt-3 border-t border-slate-800 space-y-2">
          <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Custom</p>
          <div v-if="customCategories.length" class="space-y-1">
            <div
              v-for="cat in customCategories"
              :key="cat.id"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-800 hover:border-indigo-400/40 transition"
            >
              <div class="flex-1 min-w-0">
                <div v-if="editingCategoryId === cat.id" class="flex items-center gap-2">
                  <input
                    v-model="editingCategoryName"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-sm focus:outline-none"
                  />
                  <button
                    class="text-xs text-emerald-300 hover:text-emerald-200"
                    @click="saveCategoryEdit(cat)"
                  >
                    Save
                  </button>
                  <button
                    class="text-xs text-slate-400 hover:text-slate-200"
                    @click="cancelCategoryEdit"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  v-else
                  class="flex items-center gap-2 text-sm text-left w-full"
                  @click="setCategory(cat.name)"
                >
                  <span>{{ cat.icon || '🏷️' }}</span>
                  <span class="truncate">{{ cat.name }}</span>
                </button>
              </div>
              <button
                v-if="editingCategoryId !== cat.id"
                class="text-xs text-slate-300 hover:text-white"
                @click="startRenameCategory(cat)"
              >
                Edit
              </button>
            </div>
          </div>
          <div v-else class="text-xs text-slate-500">No custom categories yet.</div>
          <div v-if="addingCategory" class="space-y-2">
            <input
              v-model="newCategoryName"
              class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-indigo-500/50 text-sm focus:outline-none"
              placeholder="Category name"
              @keyup.enter="createCategory"
            />
            <div class="flex gap-2">
              <button
                class="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
                @click="createCategory"
              >
                Save
              </button>
              <button
                class="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm border border-slate-700"
                @click="cancelAddCategory"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <section class="lg:col-span-4 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div class="flex-1 flex items-center gap-3">
            <input
              v-model="search"
              type="search"
              placeholder="Search links by title or URL"
              class="w-full px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm focus:border-indigo-500 outline-none"
            />
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="mode in filterModes"
              :key="mode.value"
              class="px-3 py-1.5 rounded-full text-xs font-semibold transition border"
              :class="filterMode === mode.value ? 'bg-indigo-700 text-white border-indigo-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-indigo-400'"
              @click="setFilter(mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 shadow-md transition"
            @click="openEditor()"
          >
            + Add Link
          </button>
        </div>

        <div v-if="loading" class="text-slate-400 text-sm">Loading links…</div>

        <div
          v-else-if="displayedLinks.length"
          class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article
            v-for="link in displayedLinks"
            :key="link.id"
            class="group rounded-2xl border border-white/10 bg-slate-900/70 hover:border-indigo-500/60 transition p-4 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 truncate">
                <span class="text-2xl">{{ link.icon || '🔗' }}</span>
                <div class="truncate">
                  <p class="font-semibold text-white truncate">{{ link.title || link.url }}</p>
                  <a
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-indigo-200/80 hover:text-indigo-100 underline underline-offset-2 truncate block"
                    @click="() => touchLink(link.id)"
                  >
                    {{ link.url }}
                  </a>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="text-amber-300 hover:text-amber-200 transition"
                  :title="link.starred ? 'Unstar' : 'Star'"
                  @click="() => toggleStar(link)"
                >
                  {{ link.starred ? '★' : '☆' }}
                </button>
                <button
                  class="text-slate-300 hover:text-white transition opacity-0 group-hover:opacity-100"
                  title="Edit"
                  @click="openEditor(link)"
                >
                  ✎
                </button>
                <button
                  class="text-red-300 hover:text-red-200 transition opacity-0 group-hover:opacity-100"
                  title="Delete"
                  @click="() => confirmDelete(link)"
                >
                  🗑
                </button>
              </div>
            </div>
            <p v-if="link.description" class="text-sm text-slate-300 line-clamp-2">
              {{ link.description }}
            </p>
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
                {{ link.category || 'General' }}
              </span>
              <span v-if="link.lastUsedAt" class="text-slate-500">Last opened · {{ formatRelative(link.lastUsedAt) }}</span>
            </div>
          </article>
        </div>

        <div v-else class="text-slate-400 text-sm bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
          No links match this view. Try another filter or add a new link.
        </div>
      </section>
    </section>

    <LinkEditorModal
      :open="modalOpen"
      :link="editingLink"
      :categories="categories"
      @close="closeEditor"
      @save="handleSave"
    />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import LinkEditorModal from '@/components/LinkEditorModal.vue'
import {
  addLink,
  addLinkCategory,
  deleteLink,
  getLinkCategories,
  getLinks,
  touchLink as touchLinkService,
  updateLink,
  updateLinkCategory,
  watchLinkCategories,
  watchLinks,
} from '@/services/firebaseService'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const links = ref([])
const categories = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const editingLink = ref(null)
const activeCategory = ref('All')
const filterMode = ref('all')
const search = ref('')
const stopLinks = ref(null)
const stopCategories = ref(null)
const addingCategory = ref(false)
const newCategoryName = ref('')
const editingCategoryId = ref(null)
const editingCategoryName = ref('')
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)

const filterModes = [
  { label: 'All', value: 'all' },
  { label: 'Starred', value: 'starred' },
  { label: 'Recent', value: 'recent' },
]

const sidebarCategories = computed(() => [
  { key: 'all', name: 'All', icon: '✨' },
  { key: 'starred', name: 'Starred', icon: '★' },
  { key: 'recent', name: 'Recent', icon: '🕓' },
  ...categories.value.map((c) => ({
    key: c.id,
    name: c.name,
    icon: c.icon || '🏷️',
  })),
])

const customCategories = computed(() =>
  categories.value.filter((c) => !['Personal', 'Work', 'Learning', 'Tools', 'Finance'].includes(c.name)),
)

const categoryCounts = computed(() => {
  const counts = { All: links.value.length, Starred: links.value.filter((l) => l.starred).length, Recent: links.value.length }
  categories.value.forEach((c) => {
    counts[c.name] = links.value.filter((l) => l.category === c.name).length
  })
  return counts
})

const displayedLinks = computed(() => {
  let base = [...links.value]

  if (activeCategory.value && activeCategory.value !== 'All') {
    if (activeCategory.value === 'Starred') {
      base = base.filter((l) => l.starred)
    } else if (activeCategory.value === 'Recent') {
      base = base.sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
    } else {
      base = base.filter((l) => l.category === activeCategory.value)
    }
  }

  if (filterMode.value === 'starred') {
    base = base.filter((l) => l.starred)
  } else if (filterMode.value === 'recent') {
    base = base.sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
  }

  if (search.value) {
    const term = search.value.toLowerCase()
    base = base.filter(
      (l) => l.title?.toLowerCase().includes(term) || l.url?.toLowerCase().includes(term) || l.category?.toLowerCase().includes(term),
    )
  }

  return base
    .slice()
    .sort((a, b) => {
      if (a.starred !== b.starred) return Number(b.starred) - Number(a.starred)
      return (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0)
    })
})

async function hydrateData() {
  loading.value = true
  try {
    stopLinks.value?.()
    stopCategories.value?.()
  } catch {}
  try {
    const [initialLinks, initialCats] = await Promise.all([getLinks(), getLinkCategories()])
    links.value = initialLinks
    categories.value = initialCats
  } finally {
    loading.value = false
  }
  stopLinks.value = watchLinks((list) => {
    links.value = list
  })
  stopCategories.value = watchLinkCategories((cats) => {
    categories.value = cats
  })
}

onMounted(() => {
  hydrateData()
})

watch(activeWorkspaceId, () => {
  hydrateData()
})

onBeforeUnmount(() => {
  try {
    stopLinks.value?.()
    stopCategories.value?.()
  } catch {}
})

function openEditor(link = null) {
  editingLink.value = link
  modalOpen.value = true
}

function closeEditor() {
  modalOpen.value = false
  editingLink.value = null
}

async function handleSave(payload) {
  try {
    if (editingLink.value) {
      await updateLink(editingLink.value.id, payload)
      ElMessage.success('Link updated')
    } else {
      const created = await addLink(payload)
      links.value = [created, ...links.value]
      ElMessage.success('Link added')
    }
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to save link')
  } finally {
    closeEditor()
  }
}

async function toggleStar(link) {
  await updateLink(link.id, { starred: !link.starred })
}

async function confirmDelete(link) {
  try {
    await ElMessageBox.confirm(`Delete "${link.title || link.url}"?`, 'Delete Link', { type: 'warning' })
    await deleteLink(link.id)
    ElMessage.success('Link deleted')
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') ElMessage.error(err?.message || 'Failed to delete')
  }
}

function setCategory(name) {
  activeCategory.value = name
}

function setFilter(mode) {
  filterMode.value = mode
}

async function touchLink(id) {
  try {
    await touchLinkService(id)
  } catch {}
}

function startAddCategory() {
  addingCategory.value = true
  newCategoryName.value = ''
}

function cancelAddCategory() {
  addingCategory.value = false
  newCategoryName.value = ''
}

async function createCategory() {
  if (!newCategoryName.value.trim()) return
  try {
    await addLinkCategory({ name: newCategoryName.value.trim() })
    ElMessage.success('Category added')
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to add category')
  } finally {
    cancelAddCategory()
  }
}

function startRenameCategory(cat) {
  editingCategoryId.value = cat.id
  editingCategoryName.value = cat.name
}

async function saveCategoryEdit(cat) {
  if (!editingCategoryName.value.trim()) return
  try {
    await updateLinkCategory(cat.id, { name: editingCategoryName.value.trim() })
    ElMessage.success('Category renamed')
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to rename category')
  } finally {
    cancelCategoryEdit()
  }
}

function cancelCategoryEdit() {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

function formatRelative(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins || 1}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>
