<template>
  <main class="app-page-shell links-page">
    <div class="app-page-frame links-page__frame">
      <header class="app-page-hero flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="app-page-eyebrow">Quick Links Hub</p>
          <h1 class="app-page-title !text-[clamp(2rem,3vw,2.7rem)]">Organize and open faster</h1>
          <p class="app-page-description">
            Faster first paint, cleaner surfaces, and the same visual rhythm as the dashboard.
          </p>
        </div>
        <div class="app-page-toolbar">
          <button
            class="px-3 py-2 rounded-xl border border-white/10 text-sm font-semibold bg-slate-950/35 hover:border-indigo-300/60 transition"
            @click="openEditor()"
          >
            + New Link
          </button>
          <button
            class="px-3 py-2 rounded-xl border border-white/10 text-sm font-semibold bg-slate-950/35 hover:border-indigo-300/60 transition"
            @click="startAddCategory"
          >
            + New Category
          </button>
        </div>
      </header>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <aside class="app-page-section app-page-section--compact space-y-3 lg:col-span-1">
          <p class="app-page-eyebrow !tracking-[0.28em]">Categories</p>
          <div class="space-y-1">
            <button
              v-for="cat in sidebarCategories"
              :key="cat.key"
              class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition"
              :class="
                activeCategory === cat.name
                  ? 'bg-indigo-500/90 text-white border border-indigo-300/70 shadow-lg shadow-indigo-950/25'
                  : 'bg-slate-950/30 text-slate-100 border border-white/10 hover:border-indigo-300/40'
              "
              @click="setCategory(cat.name)"
            >
              <span class="flex items-center gap-2 truncate">
                <span>{{ cat.icon }}</span>
                <span class="truncate">{{ cat.name }}</span>
              </span>
              <span class="text-xs text-slate-300">{{ categoryCounts[cat.name] || 0 }}</span>
            </button>
          </div>

          <div class="pt-3 border-t border-white/10 space-y-2">
            <p class="text-[11px] uppercase tracking-[0.25em] text-slate-300/60">Custom</p>
            <div v-if="customCategories.length" class="space-y-1">
              <div
                v-for="cat in customCategories"
                :key="cat.id"
                class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/20 border border-white/10 hover:border-indigo-300/40 transition"
              >
                <div class="flex-1 min-w-0">
                  <div v-if="editingCategoryId === cat.id" class="flex items-center gap-2">
                    <input
                      v-model="editingCategoryName"
                      class="w-full px-3 py-2 rounded-lg bg-slate-950/35 border border-indigo-400/50 text-sm text-white focus:outline-none"
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
                class="w-full px-3 py-2 rounded-lg bg-slate-950/35 border border-indigo-400/50 text-sm text-white focus:outline-none"
                placeholder="Category name"
                @keyup.enter="createCategory"
              />
              <div class="flex gap-2">
                <button
                  class="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white text-sm font-semibold hover:from-fuchsia-400 hover:to-indigo-400 transition"
                  @click="createCategory"
                >
                  Save
                </button>
                <button
                  class="px-3 py-2 rounded-xl bg-slate-950/30 text-slate-200 text-sm border border-white/10"
                  @click="cancelAddCategory"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section class="lg:col-span-4 min-w-0 space-y-4">
          <div class="app-page-section app-page-section--compact flex flex-col gap-3 md:flex-row md:items-center">
            <div class="flex-1 flex items-center gap-3 min-w-0">
              <input
                v-model="search"
                type="search"
                placeholder="Search title, URL, notes, or category"
                class="w-full px-4 py-2 rounded-xl bg-slate-950/35 border border-white/10 text-sm text-white focus:border-indigo-400 outline-none"
              />
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="mode in filterModes"
                :key="mode.value"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition border"
                :class="
                  filterMode === mode.value
                    ? 'bg-indigo-500/90 text-white border-indigo-300/70'
                    : 'bg-slate-950/30 text-slate-200 border-white/10 hover:border-indigo-300/50'
                "
                @click="setFilter(mode.value)"
              >
                {{ mode.label }}
              </button>
            </div>
            <button
              class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-sm font-semibold bg-slate-950/35 hover:border-indigo-300/60 transition disabled:opacity-60"
              :disabled="loading || refreshing"
              :title="refreshing ? 'Refreshing links' : 'Refresh links'"
              @click="refreshLinks"
            >
              <svg
                class="h-4 w-4 refresh-icon"
                :class="{ 'refresh-icon--spin': refreshing }"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" />
                <path d="M16.5 4.5V8h-3.5" />
              </svg>
              <span>{{ refreshing ? 'Refreshing' : 'Refresh' }}</span>
            </button>
            <button
              class="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-400 shadow-md transition"
              @click="openEditor()"
            >
              + Add Link
            </button>
          </div>

          <div class="app-page-section app-page-section--compact space-y-3 min-w-0">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-sm text-slate-300">
                Showing {{ displayedLinks.length }} of {{ links.length }} links
                <span v-if="lastUpdatedAt" class="text-slate-500"> · Updated {{ formatRelative(lastUpdatedAt) }}</span>
              </div>
              <button
                v-if="search || filterMode !== 'all' || activeCategory !== 'All'"
                class="text-xs font-semibold text-indigo-200 hover:text-white transition"
                @click="resetFilters"
              >
                Clear filters
              </button>
            </div>

            <div class="links-results-shell">
              <div v-if="loading" class="links-results-scroll">
                <div class="links-results-grid">
                  <div v-for="n in 6" :key="n" class="app-page-skeleton h-48" />
                </div>
              </div>

              <div v-else-if="displayedLinks.length" class="links-results-scroll">
                <div class="links-results-grid">
                  <article
                    v-for="link in displayedLinks"
                    :key="link.id"
                    class="links-card rounded-3xl border border-white/10 bg-slate-950/30 hover:border-indigo-300/60 transition p-4 flex flex-col gap-3 shadow-lg shadow-slate-950/10"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 truncate min-w-0">
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
                      <div class="flex items-center gap-2 shrink-0">
                        <button
                          class="text-amber-300 hover:text-amber-200 transition"
                          :title="link.starred ? 'Unstar' : 'Star'"
                          @click="() => toggleStar(link)"
                        >
                          {{ link.starred ? '★' : '☆' }}
                        </button>
                        <button
                          class="text-slate-300 hover:text-white transition"
                          title="Edit"
                          @click="openEditor(link)"
                        >
                          ✎
                        </button>
                        <button
                          class="text-red-300 hover:text-red-200 transition"
                          title="Delete"
                          @click="() => confirmDelete(link)"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div class="links-card__body">
                      <p v-if="link.description" class="text-sm text-slate-300 whitespace-pre-wrap break-words">
                        {{ link.description }}
                      </p>
                      <p v-else class="text-sm text-slate-500">No notes added yet.</p>
                    </div>

                    <div class="flex items-center justify-between gap-3 text-xs text-slate-400">
                      <span class="px-2 py-0.5 rounded-full bg-slate-950/35 border border-white/10 truncate">
                        {{ link.category || 'General' }}
                      </span>
                      <span v-if="link.lastUsedAt" class="text-slate-500 shrink-0">
                        Last opened · {{ formatRelative(link.lastUsedAt) }}
                      </span>
                    </div>
                  </article>
                </div>
              </div>

              <div v-else class="links-results-scroll">
                <div class="app-page-empty text-sm text-center">
                  No links match this view. Try another filter or add a new link.
                </div>
              </div>
            </div>
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
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import LinkEditorModal from '@/components/LinkEditorModal.vue'
import {
  addLink,
  addLinkCategory,
  deleteLink,
  getDefaultLinkCategories,
  getLinks,
  getLinkCategories,
  touchLink as touchLinkService,
  updateLink,
  updateLinkCategory,
} from '@/services/firebaseService'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const links = ref([])
const categories = ref(getDefaultLinkCategories())
const loading = ref(true)
const refreshing = ref(false)
const modalOpen = ref(false)
const editingLink = ref(null)
const activeCategory = ref('All')
const filterMode = ref('all')
const search = ref('')
const addingCategory = ref(false)
const newCategoryName = ref('')
const editingCategoryId = ref(null)
const editingCategoryName = ref('')
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const lastUpdatedAt = ref(0)

let loadSequence = 0

const filterModes = [
  { label: 'All', value: 'all' },
  { label: 'Starred', value: 'starred' },
  { label: 'Recent', value: 'recent' },
]

const sidebarCategories = computed(() => [
  { key: 'all', name: 'All', icon: '✨' },
  { key: 'starred', name: 'Starred', icon: '★' },
  { key: 'recent', name: 'Recent', icon: '🕓' },
  ...categories.value.map((category) => ({
    key: category.id,
    name: category.name,
    icon: category.icon || '🏷️',
  })),
])

const customCategories = computed(() =>
  categories.value.filter((category) => !['Personal', 'Work', 'Learning', 'Tools', 'Finance'].includes(category.name)),
)

const categoryCounts = computed(() => {
  const counts = {
    All: links.value.length,
    Starred: links.value.filter((link) => link.starred).length,
    Recent: links.value.length,
  }
  categories.value.forEach((category) => {
    counts[category.name] = links.value.filter((link) => link.category === category.name).length
  })
  return counts
})

const displayedLinks = computed(() => {
  let base = [...links.value]
  const isRecentView = activeCategory.value === 'Recent' || filterMode.value === 'recent'

  if (activeCategory.value && activeCategory.value !== 'All') {
    if (activeCategory.value === 'Starred') {
      base = base.filter((link) => link.starred)
    } else if (activeCategory.value === 'Recent') {
      base = base.sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
    } else {
      base = base.filter((link) => link.category === activeCategory.value)
    }
  }

  if (filterMode.value === 'starred') {
    base = base.filter((link) => link.starred)
  } else if (filterMode.value === 'recent') {
    base = base.sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
  }

  if (search.value) {
    const term = search.value.trim().toLowerCase()
    base = base.filter(
      (link) =>
        link.title?.toLowerCase().includes(term) ||
        link.url?.toLowerCase().includes(term) ||
        link.category?.toLowerCase().includes(term) ||
        link.description?.toLowerCase().includes(term),
    )
  }

  return base
    .slice()
    .sort((a, b) => {
      if (isRecentView) {
        return (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0)
      }
      if (a.starred !== b.starred) return Number(b.starred) - Number(a.starred)
      return (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0)
    })
})

function markUpdated() {
  lastUpdatedAt.value = Date.now()
}

async function loadLinksData(options = {}) {
  const requestId = ++loadSequence
  const uid = authStore.user?.uid

  if (!uid) {
    links.value = []
    categories.value = getDefaultLinkCategories()
    loading.value = false
    refreshing.value = false
    lastUpdatedAt.value = 0
    return
  }

  const preserveState = !!options.preserveState && links.value.length > 0
  if (preserveState) refreshing.value = true
  else loading.value = true

  const [linksResult, categoriesResult] = await Promise.allSettled([getLinks(), getLinkCategories()])
  if (requestId !== loadSequence) return

  let hadError = false

  if (linksResult.status === 'fulfilled' && Array.isArray(linksResult.value)) {
    links.value = linksResult.value
  } else {
    hadError = true
    if (!preserveState) links.value = []
    console.warn('[Links] failed to load links', linksResult.status === 'rejected' ? linksResult.reason : 'unknown')
  }

  if (categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value) && categoriesResult.value.length) {
    categories.value = categoriesResult.value
  } else {
    hadError = true
    if (!categories.value.length) categories.value = getDefaultLinkCategories()
    console.warn(
      '[Links] failed to load categories',
      categoriesResult.status === 'rejected' ? categoriesResult.reason : 'unknown',
    )
  }

  if (!hadError || preserveState) markUpdated()

  if (options.notify) {
    if (hadError) ElMessage.error('Could not refresh every link surface right now')
    else ElMessage.success('Links refreshed')
  }

  loading.value = false
  refreshing.value = false
}

watch(
  () => [authStore.user?.uid, activeWorkspaceId.value],
  () => {
    void loadLinksData()
  },
  { immediate: true },
)

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
      const linkId = editingLink.value.id
      await updateLink(linkId, payload)
      links.value = links.value.map((link) => (link.id === linkId ? { ...link, ...payload } : link))
      ElMessage.success('Link updated')
    } else {
      const created = await addLink(payload)
      links.value = [created, ...links.value]
      ElMessage.success('Link added')
    }
    markUpdated()
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to save link')
  } finally {
    closeEditor()
  }
}

async function toggleStar(link) {
  const nextStarred = !link.starred
  await updateLink(link.id, { starred: nextStarred })
  links.value = links.value.map((entry) => (entry.id === link.id ? { ...entry, starred: nextStarred } : entry))
  markUpdated()
}

async function confirmDelete(link) {
  try {
    await ElMessageBox.confirm(`Delete "${link.title || link.url}"?`, 'Delete Link', { type: 'warning' })
    await deleteLink(link.id)
    links.value = links.value.filter((entry) => entry.id !== link.id)
    markUpdated()
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
  const openedAt = Date.now()
  links.value = links.value.map((entry) => (entry.id === id ? { ...entry, lastUsedAt: openedAt } : entry))
  markUpdated()
  try {
    await touchLinkService(id)
  } catch {
    /* ignore */
  }
}

function resetFilters() {
  search.value = ''
  filterMode.value = 'all'
  activeCategory.value = 'All'
}

function refreshLinks() {
  void loadLinksData({ preserveState: true, notify: true })
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
  const name = newCategoryName.value.trim()
  if (!name) return

  try {
    const created = await addLinkCategory({ name })
    categories.value = [...categories.value, created].sort((a, b) => (a.order || 0) - (b.order || 0))
    activeCategory.value = created.name
    markUpdated()
    ElMessage.success('Category added')
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to add category')
  } finally {
    cancelAddCategory()
  }
}

function startRenameCategory(category) {
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

async function saveCategoryEdit(category) {
  const previousName = category.name
  const nextName = editingCategoryName.value.trim()
  if (!nextName) return

  try {
    await updateLinkCategory(category.id, { name: nextName })
    categories.value = categories.value.map((entry) => (entry.id === category.id ? { ...entry, name: nextName } : entry))
    links.value = links.value.map((entry) => (entry.category === previousName ? { ...entry, category: nextName } : entry))
    if (activeCategory.value === previousName) activeCategory.value = nextName
    markUpdated()
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

<style scoped>
.links-page {
  overflow-x: hidden;
}

.links-page__frame {
  min-width: 0;
}

.links-results-shell {
  min-height: 22rem;
}

.links-results-scroll {
  height: 100%;
  min-height: inherit;
  overflow-y: auto;
  padding-right: 0.35rem;
  -webkit-overflow-scrolling: touch;
}

.links-results-grid {
  display: grid;
  gap: 1rem;
  align-content: start;
  grid-template-columns: minmax(0, 1fr);
}

.links-card {
  min-height: 13.5rem;
  max-height: 13.5rem;
  min-width: 0;
}

.links-card__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.links-results-scroll::-webkit-scrollbar,
.links-card__body::-webkit-scrollbar {
  width: 8px;
}

.links-results-scroll::-webkit-scrollbar-thumb,
.links-card__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.refresh-icon--spin {
  animation: links-spin 0.8s linear infinite;
}

@media (min-width: 640px) {
  .links-results-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .links-results-shell {
    max-height: calc(100dvh - 19rem);
  }
}

@media (min-width: 1280px) {
  .links-results-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .links-results-shell,
  .links-results-scroll {
    max-height: none;
    overflow: visible;
  }

  .links-card,
  .links-card__body {
    max-height: none;
  }
}

@keyframes links-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
