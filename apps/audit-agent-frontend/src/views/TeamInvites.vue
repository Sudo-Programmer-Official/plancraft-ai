<template>
  <section class="team-invites">
    <header class="invites-header">
      <div>
        <h1>Team invites</h1>
        <p>Send teammates a link to join this workspace.</p>
      </div>
      <el-button type="primary" @click="openInviteModal">+ Invite teammate</el-button>
    </header>

    <el-card v-if="loading" class="invites-card">
      <div class="empty">Loading invites…</div>
    </el-card>

    <el-card v-else-if="error" class="invites-card">
      <div class="empty error">
        <p>{{ error }}</p>
        <el-button size="small" @click="loadInvites">Retry</el-button>
      </div>
    </el-card>

    <el-card v-else-if="!invites.length" class="invites-card">
      <div class="empty">
        <h3>No invites yet</h3>
        <p>Send your first invite to get teammates onboard.</p>
      </div>
    </el-card>

    <el-card v-else class="invites-card">
      <el-table :data="invites" border>
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role" label="Role" width="120" />
        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <el-tag type="info" v-if="row.status === 'pending'">Pending</el-tag>
            <el-tag type="success" v-else-if="row.status === 'accepted'">Accepted</el-tag>
            <el-tag type="danger" v-else>Revoked</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Created" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="200">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              text
              @click="handleResend(row)"
            >Resend</el-button>
            <el-button
              size="small"
              type="danger"
              text
              @click="handleRevoke(row)"
            >Revoke</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <InviteModal v-model:open="inviteModalOpen" @submit="sendInvite" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import InviteModal from '@/components/InviteModal.vue'
import { trackEvent } from '@/services/analytics'

const route = useRoute()
const orgStore = useOrgStore()

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})

const invites = computed(() => (orgId.value ? orgStore.invitesByOrg[orgId.value] || [] : []))
const loading = computed(() => orgStore.invitesLoading)
const error = computed(() => orgStore.invitesError)
const inviteModalOpen = ref(false)

async function loadInvites() {
  if (!orgId.value) return
  await orgStore.fetchInvites(orgId.value)
}

function openInviteModal() {
  trackEvent('invite_modal_opened', { orgId: orgId.value })
  inviteModalOpen.value = true
}

async function sendInvite(payload: { email: string; role: string }) {
  if (!orgId.value) return
  await orgStore.sendInvite(orgId.value, payload.email, payload.role)
}

async function handleResend(invite: any) {
  if (!orgId.value) return
  await orgStore.sendInvite(orgId.value, invite.email, invite.role)
  trackEvent('invite_resend', { orgId: orgId.value })
}

async function handleRevoke(invite: any) {
  if (!orgId.value) return
  try {
    await orgStore.revokeInvite(orgId.value, invite.id)
    trackEvent('invite_revoked', { orgId: orgId.value })
  } catch {}
}

function formatDate(value: any) {
  try {
    const date = value?.toDate?.() || value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString()
  } catch {
    return '—'
  }
}

onMounted(() => {
  loadInvites()
})
</script>

<style scoped>
.team-invites {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.invites-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.invites-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #0f172a;
}

.invites-header p {
  margin: 4px 0 0;
  color: rgba(15, 23, 42, 0.6);
}

.invites-card {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.empty {
  text-align: center;
  padding: 32px;
  color: rgba(15, 23, 42, 0.6);
}

.empty.error {
  color: #dc2626;
}
</style>
