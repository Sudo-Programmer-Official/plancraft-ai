<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Projects</p>
        <h1 class="text-2xl font-semibold text-white">Team execution</h1>
      </div>
      <button
        class="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-600 transition"
        @click="showCreate = true"
      >
        New project
      </button>
    </div>

    <ProjectList :projects="projects" :loading="projectStore.loading" />
    <CreateProjectModal :open="showCreate" @close="showCreate = false" @created="onCreated" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ProjectList from '@/components/projects/ProjectList.vue'
import CreateProjectModal from '@/components/projects/CreateProjectModal.vue'
import { useProjectStore } from '@/stores/projectStore'

const projectStore = useProjectStore()
const projects = computed(() => projectStore.projects || [])
const showCreate = ref(false)

function onCreated() {
  showCreate.value = false
}
</script>
