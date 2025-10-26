<template>
  <div v-if="enabled" class="org-switcher">
    <label class="sr-only" for="org-select">Switch team</label>
    <select id="org-select" v-model="selected" @change="onSwitch">
      <option v-for="org in orgs" :key="org.id" :value="org.id">
        {{ org.name || org.id }}
      </option>
    </select>
    <button type="button" @click="onCreate">Create Team</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'

const router = useRouter()
const orgStore = useOrgStore()

const enabled = orgStore.enabled
const orgs = computed(() => orgStore.orgs)
const selected = ref('')

onMounted(async () => {
  if (!enabled.value) return
  const list = await orgStore.fetchOrgs()
  if (list.length && !selected.value) {
    selected.value = orgStore.activeOrgId || list[0].id
  }
})

watch(() => orgStore.activeOrgId, (val) => {
  if (val) selected.value = val
})

function onSwitch() {
  if (!selected.value) return
  orgStore.setOrg(selected.value)
  router.push({ name: 'team-projects', params: { orgId: selected.value } })
}

async function onCreate() {
  const name = window.prompt('Team name?')
  if (!name) return
  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || null
    } catch {
      return null
    }
  })()
  const result = await orgStore.createOrg({ name, timezone })
  if (result?.id) {
    selected.value = result.id
    await orgStore.seedSampleProject(result.id)
    router.push({ name: 'team-projects', params: { orgId: result.id } })
  }
}
</script>

<style scoped>
.org-switcher {
  display: flex;
  gap: 10px;
  align-items: center;
}

select {
  min-width: 190px;
  padding: 6px 12px;
  border-radius: var(--input-radius, 10px);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

select:focus-visible {
  outline: none;
  border-color: var(--accent-primary-strong);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

button {
  padding: 8px 14px;
  min-width: 120px;
  border-radius: 999px;
  border: none;
  background: var(--accent-gradient);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(99, 102, 241, 0.22);
}

button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
