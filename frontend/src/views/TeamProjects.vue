<template>
  <section class="team-projects">
    <!-- Header -->
    <header class="projects-header">
      <div>
        <h1 class="title">Team Projects</h1>
        <p v-if="currentOrg" class="subtitle">
          {{ currentOrg.name }} workspace
        </p>
      </div>

      <button
        type="button"
        class="primary-btn"
        @click="onCreate"
        :disabled="!orgId || creating"
      >
        {{ creating ? "Creating…" : "➕ New Project" }}
      </button>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="projects-loading">Loading projects…</div>

    <!-- Error state -->
    <div v-else-if="error" class="projects-error">
      <p>Failed to load projects. Please try again.</p>
      <button class="secondary-btn" @click="retryLoading">Retry</button>
    </div>

    <!-- Projects list -->
    <ul v-else-if="projects && projects.length > 0" class="projects-list">
      <li
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="openProject(project.id)"
        tabindex="0"
        @keyup.enter="openProject(project.id)"
      >
        <strong class="project-name">{{ project.name }}</strong>
        <span class="meta">
          {{ project.key }} · {{ project.status || "active" }}
        </span>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-else class="projects-empty">
      <p>No projects yet. Create one to get started.</p>
      <button
        type="button"
        class="secondary-btn"
        @click="onCreate"
        :disabled="!orgId || creating"
      >
        {{ creating ? "Creating…" : "Create your first project" }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useOrgStore } from "../stores/orgStore";
import { useProjectStore } from "../stores/projectStore";

// Stores & routing
const route = useRoute();
const router = useRouter();
const orgStore = useOrgStore();
const projectStore = useProjectStore();

// State
const creating = ref(false);
const error = ref<Error | null>(null);
const orgId = computed(() => {
  const param = route.params.orgId;
  const id =
    typeof param === "string" ? param : Array.isArray(param) ? param[0] : null;
  return id || orgStore.activeOrgId;
});
const currentOrg = computed(() => orgStore.currentOrg);

// Initialize projects store
projectStore.$reset(); // Reset store state

// Safer projects computation with null checks
const projects = computed(() => {
  try {
    return projectStore.projects ?? [];
  } catch (err) {
    error.value = err as Error;
    return [];
  }
});
const loading = computed(() => projectStore.loading);

// Watch for orgId changes with better error handling
watch(
  orgId,
  async (id) => {
    if (!id) return;
    error.value = null;
    try {
      orgStore.setOrg(id);
      await projectStore.load(id);
    } catch (err) {
      error.value = err as Error;
      console.error("Failed to load projects:", err);
    }
  },
  { immediate: true }
);

// Handlers
async function onCreate() {
  if (!orgId.value) return;
  const name = window.prompt("Enter a new project name:");
  if (!name || !name.trim()) return;
  try {
    creating.value = true;
    await projectStore.create(orgId.value, { name: name.trim() });
  } catch (err) {
    console.error("Failed to create project:", err);
    alert("Failed to create project. Please try again.");
  } finally {
    creating.value = false;
  }
}

function openProject(id: string) {
  if (!orgId.value) return;
  router.push({
    name: "TeamProjectDetail",
    params: { orgId: orgId.value, projectId: id },
  });
}

// Retry handler
async function retryLoading() {
  if (!orgId.value) return;
  error.value = null;
  try {
    await projectStore.load(orgId.value);
  } catch (err) {
    error.value = err as Error;
    console.error("Failed to load projects:", err);
  }
}
</script>

<style scoped>
.team-projects {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
}

/* Header */
.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
}
.subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

/* List */
.projects-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1rem;
}
.project-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  transition: all 0.15s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}
.project-card:hover,
.project-card:focus {
  border-color: #6366f1;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
}
.project-name {
  font-size: 1.1rem;
  font-weight: 600;
}
.meta {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Empty / Loading states */
.projects-loading,
.projects-empty,
.projects-error {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}
.projects-empty p,
.projects-error p {
  margin-bottom: 1rem;
}

/* Buttons */
.primary-btn,
.secondary-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.primary-btn {
  background: #111827;
  color: #fff;
}
.primary-btn:hover:not([disabled]) {
  background: #1f2937;
}
.secondary-btn {
  background: #eef2ff;
  color: #4338ca;
}
.secondary-btn:hover:not([disabled]) {
  background: #e0e7ff;
}
button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>