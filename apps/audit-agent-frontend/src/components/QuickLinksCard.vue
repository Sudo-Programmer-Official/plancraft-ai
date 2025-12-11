<template>
  <section class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg border border-white/5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <p class="text-[11px] uppercase tracking-[0.3em] text-indigo-300/70">Quick Links</p>
        <h3 class="text-lg font-semibold text-white">Starred essentials</h3>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          to="/links"
          class="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700 hover:border-indigo-400 text-indigo-100 transition"
        >
          View All ({{ links.length }})
        </router-link>
        <button
          @click="openEditor()"
          class="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 shadow-md transition"
        >
          + Add Link
        </button>
      </div>
    </div>

    <p class="text-slate-400 text-sm mb-3">Top starred links for this workspace.</p>

    <div v-if="featuredLinks.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <article
        v-for="link in featuredLinks"
        :key="link.id"
        class="group relative rounded-xl border border-white/10 bg-slate-900/70 hover:border-indigo-400/60 transition p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 truncate">
            <span class="text-xl">{{ link.icon || '🔗' }}</span>
            <div class="truncate">
              <p class="text-sm font-semibold text-white truncate">{{ link.title || link.url }}</p>
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                @click="() => touchLink(link.id)"
                class="text-xs text-indigo-200/80 hover:text-indigo-100 underline underline-offset-2 truncate block"
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
          </div>
        </div>
        <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span class="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
            {{ link.category || 'General' }}
          </span>
          <span v-if="link.lastUsedAt" class="text-slate-500">Recently opened</span>
        </div>
      </article>
    </div>
    <p v-else class="text-slate-400 text-sm">No starred links yet. Add your daily go-tos.</p>

    <LinkEditorModal
      :open="modalOpen"
      :link="editingLink"
      :categories="categories"
      @close="closeEditor"
      @save="handleSave"
    />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LinkEditorModal from '@/components/LinkEditorModal.vue'
import {
  addLink,
  getLinks,
  updateLink,
  watchLinks,
  watchLinkCategories,
  touchLink as touchLinkService,
} from '@/services/firebaseService'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const links = ref([])
const categories = ref([])
const modalOpen = ref(false)
const editingLink = ref(null)
const stopLinks = ref(null)
const stopCategories = ref(null)
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)

const featuredLinks = computed(() => {
  const starred = links.value.filter((l) => l.starred).slice(0, 3)
  const remainder = links.value.filter((l) => !l.starred).slice(0, 3 - starred.length)
  return [...starred, ...remainder]
})

async function hydrateLinks() {
  try {
    stopLinks.value?.()
    stopCategories.value?.()
  } catch {}
  links.value = await getLinks()
  stopLinks.value = watchLinks((list) => {
    links.value = list
  })
  stopCategories.value = watchLinkCategories((cats) => {
    categories.value = cats
  })
}

onMounted(() => {
  hydrateLinks()
})

watch(activeWorkspaceId, () => {
  hydrateLinks()
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
  if (editingLink.value) {
    await updateLink(editingLink.value.id, payload)
  } else {
    const created = await addLink(payload)
    links.value = [created, ...links.value]
  }
  closeEditor()
}

async function toggleStar(link) {
  await updateLink(link.id, { starred: !link.starred })
}

async function touchLink(id) {
  try {
    await touchLinkService(id)
  } catch {
    /* ignore */
  }
}
</script>
