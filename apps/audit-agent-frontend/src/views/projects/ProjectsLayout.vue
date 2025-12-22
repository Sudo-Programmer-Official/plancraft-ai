<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1020] text-slate-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div class="grid gap-6 lg:grid-cols-[280px,1fr]">
        <ProjectsSidebar
          :projects="projects"
          :selected-id="selectedId"
          :loading="projectStore.loading"
          @refresh="load"
        />
        <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-4 sm:p-6 min-h-[70vh]">
          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProjectsSidebar from '@/components/projects/ProjectsSidebar.vue'
import { useProjectStore } from '@/stores/projectStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const route = useRoute()

const selectedId = computed(() => route.params.projectId || null)
const projects = computed(() => projectStore.projects || [])

async function load() {
  if (!workspaceStore.activeWorkspaceId) return
  await projectStore.loadProjects().catch(() => {})
}

onMounted(async () => {
  if (!workspaceStore.hydrated) {
    await workspaceStore.init()
  }
  await load()
})

watch(
  () => workspaceStore.activeWorkspaceId,
  async () => {
    await load()
  },
)
</script>
