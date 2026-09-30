<template>
  <div class="app-page-shell workspace-page w-full max-w-full min-w-0 overflow-x-hidden box-border">
    <div class="app-page-frame w-full max-w-full min-w-0">
      <div class="workspace-switcher">
        <header class="workspace-switcher__header">
          <div class="workspace-switcher__heading">
            <p class="workspace-switcher__eyebrow">Workspace</p>
            <h1>Workspaces</h1>
            <p>Keep projects, tasks, and AI context organized separately.</p>
          </div>
          <PcButton variant="primary" :icon="Plus" @click="openCreate">New workspace</PcButton>
        </header>

        <div class="workspace-switcher__toolbar">
          <label class="workspace-search">
            <span class="sr-only">Search workspaces</span>
            <input v-model="workspaceSearch" type="search" placeholder="Search workspaces…" />
          </label>
          <div class="workspace-filters" role="group" aria-label="Workspace type">
            <button
              v-for="filter in workspaceFilters"
              :key="filter.value"
              type="button"
              :class="{ 'workspace-filter--active': workspaceFilter === filter.value }"
              @click="workspaceFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div v-if="!filteredWorkspaces.length && workspaceStore.loading" class="workspace-empty-state">
          Loading your workspaces…
        </div>
        <div v-else-if="!filteredWorkspaces.length" class="workspace-empty-state">
          <h2>{{ workspaceSearch || workspaceFilter !== 'all' ? 'No matching workspaces' : 'No workspaces yet' }}</h2>
          <p>
            {{ workspaceSearch || workspaceFilter !== 'all'
              ? 'Try another search or filter.'
              : 'Create your first workspace to keep a new area of work separate.' }}
          </p>
          <PcButton v-if="!workspaceSearch && workspaceFilter === 'all'" variant="primary" @click="openCreate">
            Create workspace
          </PcButton>
        </div>

        <div v-else class="workspace-grid">
          <article
            v-for="ws in filteredWorkspaces"
            :key="ws.id"
            class="workspace-card"
            :class="{ 'workspace-card--active': activeWorkspaceId === ws.id }"
            role="button"
            tabindex="0"
            @click="openWorkspace(ws)"
            @keydown.enter.prevent="openWorkspace(ws)"
            @keydown.space.prevent="openWorkspace(ws)"
          >
            <div class="workspace-card__header">
              <div class="workspace-card__identity">
                <span class="workspace-card__icon" aria-hidden="true">{{ ws.icon || '📦' }}</span>
                <div class="workspace-card__name-wrap">
                  <h2>{{ ws.name }}</h2>
                  <p>{{ typeLabel(ws.workspaceType) }}</p>
                </div>
              </div>
              <div class="workspace-card__actions" @click.stop>
                <span v-if="activeWorkspaceId === ws.id" class="workspace-card__active">Active</span>
                <PcMenu
                  :items="workspaceMenuItems(ws)"
                  :label="`More actions for ${ws.name}`"
                  @select="handleWorkspaceMenu($event, ws)"
                />
              </div>
            </div>

            <p class="workspace-card__description">
              {{ ws.description || 'Separate tasks, drafts, and AI memory for this focus area.' }}
            </p>

            <div class="workspace-card__meta">
              <span>Opened {{ formatDate(ws.lastOpenedAt || ws.updatedAt || ws.createdAt) }}</span>
              <span class="workspace-card__open">Open →</span>
            </div>
          </article>
        </div>
      </div>

      <div v-if="false">
      <header class="app-page-hero flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full max-w-full min-w-0">
        <div class="space-y-2 min-w-0">
          <p class="app-page-eyebrow">Workspaces</p>
          <h1 class="app-page-title !text-[clamp(2rem,3vw,2.9rem)]">Your universes inside PlanCraft</h1>
          <p class="app-page-description max-w-3xl text-sm sm:text-base">
            Switch contexts without losing focus. Every workspace keeps its own tasks, drafts, events, and AI memory.
          </p>
        </div>
        <div class="app-page-toolbar min-w-0 w-full sm:w-auto">
          <button
            class="px-4 py-2 rounded-xl border border-white/10 bg-slate-950/35 hover:border-indigo-300/60 text-sm font-semibold w-full sm:w-auto transition"
            @click="refresh"
          >
            Refresh
          </button>
          <button
            v-if="canManageMembers && activeWorkspaceId"
            class="px-4 py-2 rounded-xl border border-indigo-300/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-sm font-semibold text-indigo-100 w-full sm:w-auto"
            :disabled="!canInvite"
            @click="openInviteModal()"
          >
            Share workspace
          </button>
          <button
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-sm font-semibold shadow-lg shadow-indigo-950/35 w-full sm:w-auto transition"
            @click="openCreate"
          >
            + Create workspace
          </button>
        </div>
      </header>

      <section class="grid gap-4 lg:grid-cols-3 w-full max-w-full min-w-0">
        <div class="lg:col-span-2 space-y-4 w-full max-w-full min-w-0">
          <div
            v-if="!workspaces.length && workspaceStore.loading"
            class="app-page-section text-slate-300"
          >
            Loading your workspaces…
          </div>

          <div
            v-else-if="!workspaces.length"
            class="app-page-empty space-y-3 text-slate-200"
          >
            <h3 class="text-lg font-semibold text-slate-100">No workspaces yet</h3>
            <p class="text-sm text-slate-400">
              Create your first workspace to keep tasks, drafts, and reminders grouped by a theme.
            </p>
            <button
              class="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-sm font-semibold text-white"
              @click="openCreate"
            >
              Start with “Personal”
            </button>
          </div>

          <div class="grid sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
            <article
              v-for="ws in workspaces"
              :key="ws.id"
              class="w-full max-w-full min-w-0 rounded-3xl border bg-slate-950/30 p-4 space-y-3 transition hover:-translate-y-0.5 overflow-hidden box-border shadow-lg shadow-slate-950/10"
              :class="workspaceCardClass(ws)"
            >
              <div class="flex items-start justify-between gap-2 min-w-0">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="text-2xl">{{ ws.icon || '📦' }}</span>
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold">{{ ws.name }}</h3>
                    <div class="flex items-center gap-2 text-[11px] text-indigo-200/90">
                      <span class="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/40">
                        {{ typeLabel(ws.workspaceType) }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 line-clamp-2">
                      {{ ws.description || 'Separate tasks, drafts, and AI memory for this focus area.' }}
                    </p>
                  </div>
                </div>
                <span
                  v-if="activeWorkspaceId === ws.id"
                  class="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                >
                  Active
                </span>
              </div>

              <div class="flex min-w-0 flex-wrap items-center gap-3 text-[12px] text-slate-400">
                <span>Last opened: {{ formatDate(ws.lastOpenedAt || ws.updatedAt || ws.createdAt) }}</span>
                <span>•</span>
                <span>Theme: {{ ws.color }}</span>
              </div>

              <div class="flex min-w-0 flex-wrap items-center gap-2 w-full">
                <button
                  class="flex-1 min-w-[160px] sm:min-w-0 px-3 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 w-full sm:w-auto"
                  :disabled="activeWorkspaceId === ws.id"
                  @click="switchWorkspace(ws.id)"
                >
                  {{ activeWorkspaceId === ws.id ? 'Current workspace' : 'Switch here' }}
                </button>
                <button
                  v-if="['admin', 'owner'].includes(ws.role)"
                  class="px-3 py-2 rounded-lg border border-indigo-300/60 text-sm text-indigo-100 hover:bg-indigo-600/10 w-full sm:w-auto"
                  @click="openInviteModal(ws)"
                >
                  Members
                </button>
                <button
                  class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-indigo-400 w-full sm:w-auto"
                  @click="editWorkspace(ws)"
                >
                  Edit
                </button>
              </div>
            </article>
          </div>
        </div>

        <aside class="app-page-section app-page-section--compact space-y-4 h-fit w-full max-w-full min-w-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl">
              {{ activeWorkspace?.icon || '📦' }}
            </div>
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Active</p>
              <p class="text-lg font-semibold">{{ activeWorkspace?.name || 'Personal' }}</p>
              <p class="text-xs text-slate-400">Data is scoped to this workspace.</p>
            </div>
          </div>
          <ul class="space-y-2 text-sm text-slate-300">
            <li class="flex items-start gap-2">
              <span>✅</span>
              <span class="break-words">Planner tasks save to <code class="text-indigo-200 break-all">/workspaces/{{ activeWorkspaceId || '...' }}/tasks</code></span>
            </li>
            <li class="flex items-start gap-2">
              <span>📝</span>
              <span>Napkin notes and drafts stay inside this workspace.</span>
            </li>
            <li class="flex items-start gap-2">
              <span>📅</span>
              <span>Leader/Creator boards respect the active workspace context.</span>
            </li>
          </ul>
          <div class="border border-white/10 rounded-2xl p-3 bg-slate-950/25 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Creator mode</p>
                <p class="text-[12px] text-slate-400">Content & repurposing tools for this workspace.</p>
              </div>
              <el-switch
                v-model="modeForm.creator"
                :disabled="!canEditModes || modesSaving"
                @change="modesDirty = true"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Leader mode</p>
                <p class="text-[12px] text-slate-400">Team dashboards, delegation, and summaries.</p>
              </div>
              <el-switch
                v-model="modeForm.leader"
                :disabled="!canEditModes || modesSaving"
                @change="modesDirty = true"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-slate-400">
                Admins control modes. Integrations can request enablement, but admins override.
              </p>
              <el-button
                size="small"
                type="primary"
                :disabled="!modesDirty || modesSaving || !canEditModes"
                :loading="modesSaving"
                @click="saveModes"
              >
                Save modes
              </el-button>
            </div>
          </div>
          <button
            class="w-full px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm hover:border-indigo-300/50 transition"
            @click="openCreate"
          >
            + New workspace
          </button>
        </aside>
      </section>

      <section id="workspace-members" class="pb-8 w-full max-w-full min-w-0">
        <div class="app-page-section space-y-4 w-full max-w-full min-w-0">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Members</p>
              <h2 class="text-xl font-semibold text-slate-100">
                Access for {{ activeWorkspace?.name || 'your workspace' }}
              </h2>
              <p class="text-sm text-slate-400">
                Only admins can invite or remove members. Roles stay scoped to this workspace.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="px-3 py-2 rounded-xl border border-white/10 text-sm hover:border-indigo-300/60 disabled:opacity-50 transition"
                :disabled="membersLoading || !activeWorkspaceId"
                @click="loadMembers()"
              >
                Refresh members
              </button>
              <button
                v-if="canManageMembers"
                class="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold hover:from-fuchsia-400 hover:to-indigo-400 text-white disabled:opacity-60"
                :disabled="!activeWorkspaceId || !canInvite"
                @click="openInviteModal()"
              >
                Invite
              </button>
            </div>
          </div>

          <div v-if="!activeWorkspaceId" class="app-page-empty text-sm">
            Select a workspace to manage its members.
          </div>
          <div v-else>
            <div v-if="membersError" class="text-rose-200 text-sm bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              {{ membersError }}
            </div>
            <div v-else-if="membersLoading" class="text-slate-200 text-sm border border-white/10 rounded-2xl p-3 bg-slate-950/25">
              Loading members…
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="member in members"
                :key="member.userId"
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 rounded-2xl p-3 bg-slate-950/25 min-w-0"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold uppercase text-indigo-100">
                    {{ (member.name || member.email || 'M').slice(0, 2) }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-slate-100">
                      {{ member.name || member.email || 'Member' }}
                      <span v-if="member.userId === currentUserId" class="text-xs text-emerald-300 ml-1">(You)</span>
                    </p>
                    <p class="text-xs text-slate-400">
                      <span class="break-words">{{ member.email || 'No email on file' }}</span>
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 rounded-full text-[11px] bg-indigo-500/15 border border-indigo-400/40 text-indigo-100">
                    {{ roleLabel(member.role) }}
                  </span>
                  <template v-if="canManageMembers && member.userId !== currentUserId">
                    <select
                      class="bg-slate-900 border border-slate-700 text-sm rounded-lg px-2 py-1 text-slate-100"
                      :disabled="memberBusy[member.userId]"
                      :value="member.role"
                      @change="changeRole(member, $event.target.value)"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      class="text-sm px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-400 hover:text-rose-200 disabled:opacity-60"
                      :disabled="memberBusy[member.userId]"
                      @click="removeWorkspaceMember(member)"
                    >
                      Remove
                    </button>
                  </template>
                </div>
              </div>
              <div v-if="!members.length" class="text-slate-400 text-sm border border-dashed border-slate-700 rounded-xl p-3">
                No members yet. Invite teammates to collaborate.
              </div>
            </div>

            <div v-if="!membersError && !membersLoading && canManageMembers" class="mt-6 space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-sm text-slate-300 font-medium">Pending invites</p>
                <span class="text-xs text-slate-400">{{ invites.length }} waiting</span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="invite in invites"
                  :key="invite.id"
                  class="border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/60 flex items-center justify-between min-w-0"
                >
                  <div class="min-w-0">
                    <p class="text-sm text-slate-100 break-words">{{ invite.email }}</p>
                    <p class="text-xs text-slate-400">
                      Role: {{ roleLabel(invite.role) }} · Expires
                      {{ formatDate(invite.expires_at || invite.expiresAt) }}
                    </p>
                  </div>
                  <span class="text-[11px] px-2 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-100">
                    {{ invite.status || 'pending' }}
                  </span>
                </div>
                <div v-if="!invites.length" class="text-slate-500 text-sm border border-dashed border-slate-700 rounded-lg px-3 py-2">
                  No pending invites.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>

    <el-dialog
      v-model="membersOpen"
      width="560px"
      :close-on-click-modal="false"
      class="workspace-dialog"
      modal-class="workspace-dialog-overlay"
      :style="dialogChrome"
    >
      <template #header>
        <div class="workspace-dialog-heading">
          <p>Members</p>
          <h3>{{ activeWorkspace?.name || 'Workspace' }}</h3>
        </div>
      </template>

      <div class="workspace-members-dialog">
        <div v-if="membersError" class="workspace-dialog-alert workspace-dialog-alert--error">{{ membersError }}</div>
        <div v-else-if="membersLoading" class="workspace-dialog-loading">Loading members…</div>
        <div v-else class="workspace-members-list">
          <div v-for="member in members" :key="member.userId" class="workspace-member-row">
            <div class="workspace-member-row__identity">
              <span>{{ (member.name || member.email || 'M').slice(0, 2) }}</span>
              <div>
                <strong>{{ member.name || member.email || 'Member' }}</strong>
                <small>{{ member.email || 'No email on file' }}</small>
              </div>
            </div>
            <div class="workspace-member-row__actions">
              <span class="workspace-role">{{ roleLabel(member.role) }}</span>
              <template v-if="canManageMembers && member.userId !== currentUserId">
                <select
                  :disabled="memberBusy[member.userId]"
                  :value="member.role"
                  aria-label="Member role"
                  @change="changeRole(member, $event.target.value)"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" :disabled="memberBusy[member.userId]" @click="removeWorkspaceMember(member)">
                  Remove
                </button>
              </template>
            </div>
          </div>
          <p v-if="!members.length" class="workspace-dialog-muted">No members yet. Invite teammates to collaborate.</p>
        </div>

        <div v-if="canManageMembers" class="workspace-pending-invites">
          <div class="workspace-pending-invites__header">
            <strong>Pending invites</strong>
            <span>{{ invites.length }}</span>
          </div>
          <p v-if="!invites.length" class="workspace-dialog-muted">No pending invites.</p>
          <div v-for="invite in invites" :key="invite.id" class="workspace-invite-row">
            <span>{{ invite.email }}</span>
            <small>{{ roleLabel(invite.role) }} · {{ formatDate(invite.expires_at || invite.expiresAt) }}</small>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="workspace-dialog-footer">
          <PcButton variant="secondary" @click="membersOpen = false">Done</PcButton>
          <PcButton
            v-if="canManageMembers"
            variant="primary"
            :disabled="!canInvite"
            @click="membersOpen = false; openInviteModal(activeWorkspace)"
          >
            Share workspace
          </PcButton>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="createOpen"
      width="480px"
      :close-on-click-modal="false"
      class="workspace-dialog"
      modal-class="workspace-dialog-overlay"
      :style="dialogChrome"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.3em] text-indigo-400">
            {{ editingId ? 'Edit workspace' : 'Create workspace' }}
          </p>
          <h3 class="text-lg font-semibold text-slate-100">
            {{ editingId ? 'Update the details for this space' : 'Give it a name, icon, and vibe' }}
          </h3>
        </div>
      </template>

      <div class="space-y-4">
        <label class="block">
          <span class="text-sm text-slate-200">Name</span>
          <input
            v-model="form.name"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="Personal, Startup, Thesis…"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-sm text-slate-200">Icon</span>
            <input
              v-model="form.icon"
              class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="🌿"
              maxlength="4"
            />
          </label>
          <div>
            <span class="text-sm text-slate-200">Theme</span>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="preset in colorPresets"
                :key="preset.value"
                type="button"
                class="w-9 h-9 rounded-lg border transition"
                :class="[
                  preset.class,
                  form.color === preset.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-300' : 'border-slate-700'
                ]"
                @click="form.color = preset.value"
                :aria-label="`Use ${preset.label} theme`"
              ></button>
            </div>
          </div>
        </div>

        <div>
          <span class="text-sm text-slate-200">Workspace type</span>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="type in workspaceTypes"
              :key="type.value"
              type="button"
              class="px-3 py-1.5 rounded-full border text-xs font-semibold transition"
              :class="form.workspaceType === type.value ? 'bg-indigo-600 text-white border-indigo-400' : 'border-slate-700 text-slate-300 hover:border-indigo-300/60'"
              @click="form.workspaceType = type.value"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <label class="block">
          <span class="text-sm text-slate-200">Description (optional)</span>
          <textarea
            v-model="form.description"
            rows="2"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none resize-none"
            placeholder="What lives in this workspace?"
          ></textarea>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-slate-500"
            @click="closeCreate"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
            :disabled="!canSave || saving"
            @click="saveWorkspace"
          >
            {{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create workspace' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="inviteOpen"
      width="420px"
      :close-on-click-modal="false"
      class="workspace-dialog"
      modal-class="workspace-dialog-overlay"
      :style="dialogChrome"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.3em] text-indigo-400">Invite to {{ activeWorkspace?.name || 'workspace' }}</p>
          <h3 class="text-lg font-semibold text-slate-100">Add a teammate by email</h3>
        </div>
      </template>

      <div class="space-y-4">
        <label class="block">
          <span class="text-sm text-slate-200">Email</span>
          <input
            v-model="inviteForm.email"
            type="email"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="teammate@example.com"
          />
        </label>
        <label class="block">
          <span class="text-sm text-slate-200">Role</span>
          <select
            v-model="inviteForm.role"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="editor">Editor (create & update)</option>
            <option value="admin">Admin (manage members)</option>
          </select>
        </label>

        <div
          v-if="inviteEmailStatus === 'failed'"
          class="text-xs text-amber-100 bg-amber-500/10 border border-amber-400/40 rounded-lg px-3 py-2"
        >
          Email failed — copy the invite link below and share directly.
          <span v-if="inviteEmailError">({{ inviteEmailError }})</span>
        </div>

        <div v-if="inviteLink" class="text-xs text-slate-200 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span class="truncate">{{ inviteLink }}</span>
          <button
            class="px-2 py-1 rounded-md border border-indigo-400/60 text-indigo-100 text-xs hover:bg-indigo-600/10"
            @click="copyInviteLink()"
          >
            Copy
          </button>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-slate-500"
            @click="inviteOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
            :disabled="inviteSending || !inviteForm.email"
            @click="sendInvite"
          >
            {{ inviteSending ? 'Sending…' : 'Send invite' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import { PcButton, PcMenu } from '@/design'
import { Pencil, Plus, Share2, Settings2, Users } from 'lucide-vue-next'
import {
  fetchWorkspaceMembers,
  removeMember,
  sendWorkspaceInvite,
  updateMemberRole,
} from '@/services/workspaceService'
import { canUseFeature } from '@/utils/entitlements'
import { copyText } from '@/utils/nativeUi'

const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const router = useRouter()
const createOpen = ref(false)
const membersOpen = ref(false)
const saving = ref(false)
const editingId = ref(null)
const dialogChrome = Object.freeze({
  background: 'var(--pc-surface)',
  color: 'var(--pc-text)',
  borderRadius: 'var(--pc-radius-lg)',
  boxShadow: 'var(--pc-shadow-overlay)',
  border: '1px solid var(--pc-border)',
})
const form = reactive({
  name: '',
  icon: '📦',
  color: 'indigo',
  description: '',
  workspaceType: 'personal',
})
const members = ref([])
const invites = ref([])
const membersLoading = ref(false)
const membersError = ref('')
const inviteOpen = ref(false)
const inviteSending = ref(false)
const inviteForm = reactive({ email: '', role: 'editor' })
const inviteLink = ref(null)
const inviteEmailStatus = ref(null)
const inviteEmailError = ref('')
const memberBusy = reactive({})

const colorPresets = [
  { value: 'indigo', class: 'bg-indigo-500/30 border-indigo-300/60', label: 'Indigo' },
  { value: 'emerald', class: 'bg-emerald-500/30 border-emerald-300/60', label: 'Emerald' },
  { value: 'amber', class: 'bg-amber-400/30 border-amber-200/60', label: 'Amber' },
  { value: 'pink', class: 'bg-pink-500/30 border-pink-300/60', label: 'Pink' },
  { value: 'cyan', class: 'bg-cyan-500/30 border-cyan-300/60', label: 'Cyan' },
  { value: 'slate', class: 'bg-slate-500/20 border-slate-300/40', label: 'Slate' },
]
const workspaceTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'project', label: 'Project' },
  { value: 'creator', label: 'Creator' },
  { value: 'student', label: 'Student' },
  { value: 'team', label: 'Team' },
]

const workspaces = computed(() => workspaceStore.workspaces || [])
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || {})
const workspaceSearch = ref('')
const workspaceFilter = ref('all')
const workspaceFilters = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'team', label: 'Team' },
]
const filteredWorkspaces = computed(() => {
  const query = workspaceSearch.value.trim().toLowerCase()
  return workspaces.value.filter((workspace) => {
    const type = String(workspace?.workspaceType || '').toLowerCase()
    const matchesFilter =
      workspaceFilter.value === 'all' ||
      (workspaceFilter.value === 'personal' && type === 'personal') ||
      (workspaceFilter.value === 'team' && type !== 'personal')
    if (!matchesFilter) return false
    if (!query) return true
    return [workspace?.name, workspace?.description, typeLabel(workspace?.workspaceType)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })
})
const canSave = computed(() => !!form.name && form.name.trim().length > 1)
const activeRole = computed(() => workspaceStore.activeWorkspaceRole || 'viewer')
const canManageMembers = computed(() => ['admin', 'owner'].includes(activeRole.value))
const canInvite = computed(() => canUseFeature(activeWorkspace.value, activeRole.value, 'invites'))
const currentUserId = computed(() => authStore?.user?.uid || null)
// Retained for the legacy capability path while the mode controls are no longer
// part of the workspace switcher surface.
const canEditModes = computed(() => ['admin', 'owner'].includes(activeRole.value))
const modeForm = reactive({ creator: false, leader: false })
const modesDirty = ref(false)
const modesSaving = ref(false)

function typeLabel(value) {
  const found = workspaceTypes.find((t) => t.value === value)
  return found ? found.label : 'Personal'
}

function isPersonalWorkspace(workspace) {
  return String(workspace?.workspaceType || '').toLowerCase() === 'personal'
}

function canManageWorkspace(workspace) {
  return ['admin', 'owner'].includes(String(workspace?.role || '').toLowerCase())
}

function workspaceMenuItems(workspace) {
  const items = [
    { key: 'settings', label: 'Workspace settings', icon: Settings2 },
    { key: 'rename', label: 'Rename workspace', icon: Pencil },
  ]
  if (!isPersonalWorkspace(workspace) && canManageWorkspace(workspace)) {
    items.push(
      { key: 'members', label: 'Manage members', icon: Users },
      { key: 'share', label: 'Share workspace', icon: Share2 },
    )
  }
  return items
}

function normalizeInvites(list = []) {
  const map = new Map()
  for (const inv of Array.isArray(list) ? list : []) {
    if (!inv || inv.status !== 'pending') continue
    const key = (inv.emailLower || inv.email || inv.id || '').trim().toLowerCase()
    const existing = map.get(key)
    if (!existing) {
      map.set(key || inv.id, inv)
      continue
    }
    const existingTs = new Date(existing.expires_at || existing.expiresAt || 0).getTime()
    const nextTs = new Date(inv.expires_at || inv.expiresAt || 0).getTime()
    if (nextTs > existingTs) map.set(key, inv)
  }
  return Array.from(map.values())
}

onMounted(() => {
  workspaceStore.init()
})

function openCreate() {
  editingId.value = null
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
  editingId.value = null
  form.name = ''
  form.description = ''
  form.icon = '📦'
  form.color = 'indigo'
  form.workspaceType = 'personal'
}

async function saveWorkspace() {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      icon: form.icon || '📦',
      color: form.color || 'indigo',
      description: form.description || '',
      workspaceType: form.workspaceType || 'personal',
    }
    if (editingId.value) {
      await workspaceStore.updateWorkspace(editingId.value, payload)
      await workspaceStore.refresh()
      ElMessage.success('Workspace updated')
    } else {
      await workspaceStore.createWorkspace(payload)
      ElMessage.success('Workspace created and activated')
    }
    closeCreate()
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to save workspace')
  } finally {
    saving.value = false
  }
}

async function saveModes() {
  if (!activeWorkspaceId.value || !canEditModes.value || modesSaving.value) return
  modesSaving.value = true
  try {
    await workspaceStore.applyWorkspaceSettings(activeWorkspaceId.value, {
      creatorModeEnabled: modeForm.creator,
      leaderModeEnabled: modeForm.leader,
    })
    modesDirty.value = false
    ElMessage.success('Workspace modes updated')
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to update modes')
  } finally {
    modesSaving.value = false
  }
}

async function loadMembers(id = null) {
  const workspaceId = id || activeWorkspaceId.value
  if (!workspaceId) return
  if (!workspaces.value.length) return
  if (!['admin', 'owner'].includes(activeRole.value)) {
    members.value = []
    invites.value = []
    membersError.value = 'Only admins/owners can view members for this workspace.'
    return
  }
  membersLoading.value = true
  membersError.value = ''
  try {
    const { members: list, invites: pending } = await fetchWorkspaceMembers(workspaceId)
    members.value = list || []
    invites.value = normalizeInvites(pending || [])
  } catch (err) {
    members.value = []
    invites.value = []
    const status = err?.response?.status
    if (status === 403) {
      membersError.value = 'You need to be an admin/owner to view members for this workspace.'
    } else if (status === 400) {
      membersError.value = err?.response?.data?.error || 'workspaceId is required'
    } else {
      membersError.value = err?.response?.data?.error || err?.message || 'Failed to load members'
    }
  } finally {
    membersLoading.value = false
  }
}

async function openInviteModal(ws = null) {
  if (ws?.id && ws.id !== activeWorkspaceId.value) {
    await switchWorkspace(ws.id, { announce: false })
  }
  if (!['admin', 'owner'].includes(activeRole.value)) {
    ElMessage.error('Only admins can invite members')
    return
  }
  if (!canInvite.value) {
    ElMessage.warning('Sharing is not available for this workspace yet.')
    return
  }
  inviteForm.email = ''
  inviteForm.role = 'editor'
  inviteLink.value = null
  inviteEmailStatus.value = null
  inviteEmailError.value = ''
  inviteOpen.value = true
}

async function sendInvite() {
  if (!activeWorkspaceId.value) {
    ElMessage.error('Select a workspace first')
    return
  }
  if (!inviteForm.email) {
    ElMessage.error('Enter an email to invite')
    return
  }
  inviteForm.email = String(inviteForm.email).trim().toLowerCase()
  inviteEmailStatus.value = null
  inviteEmailError.value = ''
  inviteLink.value = null
  inviteSending.value = true
  try {
    const { invite, link, emailStatus, emailError, duplicate } = await sendWorkspaceInvite(
      activeWorkspaceId.value,
      inviteForm,
    )
    if (duplicate) {
      inviteEmailStatus.value = 'duplicate'
      inviteEmailError.value = emailError || 'Invite already pending for this email'
      ElMessage.warning(inviteEmailError.value)
      inviteSending.value = false
      return
    }
    inviteLink.value = link || null
    inviteEmailStatus.value = emailStatus || invite?.emailStatus || null
    inviteEmailError.value = emailError || invite?.emailError || ''
    if (invite) invites.value = normalizeInvites([...invites.value.filter((i) => i.id !== invite.id), invite])
    if (inviteEmailStatus.value === 'failed') {
      ElMessage.warning('Email failed — copy the invite link below.')
    } else if (link) {
      try {
        const copied = await copyText(link)
        if (!copied) throw new Error('Clipboard unavailable')
        ElMessage.success('Invite link copied')
      } catch {
        ElMessage.success('Invite created')
      }
    } else {
      ElMessage.success('Invite sent')
    }
    await loadMembers()
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to send invite')
  } finally {
    inviteSending.value = false
  }
}

async function copyInviteLink(link = null) {
  const value = link || inviteLink.value
  if (!value) return
  try {
    const copied = await copyText(value)
    if (!copied) throw new Error('Clipboard unavailable')
    ElMessage.success('Invite link copied')
  } catch {
    ElMessage.success('Invite link ready')
  }
}

async function changeRole(member, role) {
  if (!activeWorkspaceId.value || !member?.userId) return
  if (member.userId === currentUserId.value) {
    ElMessage.error('You cannot change your own role')
    return
  }
  memberBusy[member.userId] = true
  try {
    const updated = await updateMemberRole(activeWorkspaceId.value, member.userId, role)
    members.value = members.value.map((m) => (m.userId === member.userId ? { ...m, ...updated } : m))
    ElMessage.success('Role updated')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to update role')
  } finally {
    memberBusy[member.userId] = false
  }
}

async function removeWorkspaceMember(member) {
  if (!activeWorkspaceId.value || !member?.userId) return
  if (member.userId === currentUserId.value) {
    ElMessage.error('You cannot remove yourself')
    return
  }
  memberBusy[member.userId] = true
  try {
    await removeMember(activeWorkspaceId.value, member.userId)
    members.value = members.value.filter((m) => m.userId !== member.userId)
    ElMessage.success('Member removed')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to remove member')
  } finally {
    memberBusy[member.userId] = false
  }
}

function formatDate(value) {
  try {
    if (!value) return 'Just now'
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
    if (Number.isNaN(date.getTime())) return 'Just now'
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    if (isToday) return 'today'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Just now'
  }
}

async function switchWorkspace(id, { announce = true } = {}) {
  if (!id) return
  await workspaceStore.setActive(id)
  if (announce) ElMessage.success('Switched workspace')
}

async function openWorkspace(workspace) {
  if (!workspace?.id) return
  await switchWorkspace(workspace.id, { announce: false })
  if (router.currentRoute.value.path !== '/today') {
    await router.push('/today')
  }
}

async function openMembersModal(workspace) {
  if (!workspace?.id || !canManageWorkspace(workspace)) return
  await switchWorkspace(workspace.id, { announce: false })
  membersError.value = ''
  membersOpen.value = true
  await loadMembers(workspace.id)
}

function handleWorkspaceMenu(action, workspace) {
  if (action === 'settings' || action === 'rename') {
    editWorkspace(workspace)
  } else if (action === 'members') {
    openMembersModal(workspace)
  } else if (action === 'share') {
    openInviteModal(workspace)
  }
}

function editWorkspace(ws) {
  if (!ws) return
  editingId.value = ws.id
  createOpen.value = true
  form.name = ws.name || ''
  form.icon = ws.icon || '📦'
  form.color = ws.color || 'indigo'
  form.description = ws.description || ''
  form.workspaceType = ws.workspaceType || 'personal'
}

async function refresh() {
  try {
    await workspaceStore.refresh()
  } catch {
    /* Legacy hidden action; workspace init handles the visible page state. */
  }
}

function workspaceCardClass(ws) {
  const color = ws?.color || 'indigo'
  const base = {
    indigo: 'border-indigo-400/40 bg-indigo-900/20',
    emerald: 'border-emerald-400/40 bg-emerald-900/15',
    amber: 'border-amber-400/40 bg-amber-900/10',
    pink: 'border-pink-400/40 bg-pink-900/15',
    cyan: 'border-cyan-400/40 bg-cyan-900/15',
    slate: 'border-slate-700 bg-slate-900/70',
  }
  const hover = 'hover:border-indigo-400/80 hover:shadow-lg hover:shadow-indigo-900/30'
  return `${base[color] || base.indigo} ${hover}`
}

function roleLabel(role) {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'editor') return 'Editor'
  if (normalized === 'owner') return 'Owner'
  if (normalized === 'admin') return 'Admin'
  return 'Viewer'
}
</script>

<style scoped>
.workspace-page {
  min-height: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

.workspace-switcher {
  width: 100%;
  color: var(--pc-text);
}

.workspace-switcher__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--pc-space-6);
  margin-bottom: var(--pc-space-6);
}

.workspace-switcher__heading h1 {
  margin: 0.2rem 0 0;
  color: var(--pc-text);
  font-size: clamp(1.8rem, 3vw, 2.45rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.workspace-switcher__heading p:last-child {
  margin: 0.5rem 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-body);
}

.workspace-switcher__eyebrow {
  margin: 0;
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.workspace-switcher__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-4);
  margin-bottom: var(--pc-space-5);
}

.workspace-search {
  display: block;
  width: min(100%, 24rem);
}

.workspace-search input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0 var(--pc-space-4);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text);
  font: inherit;
  outline: none;
}

.workspace-search input::placeholder {
  color: var(--pc-text-subtle);
}

.workspace-search input:focus {
  border-color: var(--pc-accent);
  box-shadow: 0 0 0 3px var(--pc-focus-ring);
}

.workspace-filters {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface-2);
}

.workspace-filters button {
  min-height: 2rem;
  padding: 0 var(--pc-space-3);
  border: 0;
  border-radius: var(--pc-radius-full);
  background: transparent;
  color: var(--pc-text-muted);
  font: inherit;
  font-size: var(--pc-text-small);
  cursor: pointer;
}

.workspace-filters button:hover,
.workspace-filters button:focus-visible,
.workspace-filter--active {
  background: var(--pc-surface);
  color: var(--pc-accent-text) !important;
  outline: none;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--pc-space-4);
}

.workspace-card {
  display: flex;
  min-height: 13rem;
  flex-direction: column;
  gap: var(--pc-space-4);
  padding: var(--pc-space-5);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-surface);
  box-shadow: var(--pc-shadow-sm);
  color: var(--pc-text);
  cursor: pointer;
  transition: border-color var(--pc-duration-fast) var(--pc-ease), box-shadow var(--pc-duration-fast) var(--pc-ease), transform var(--pc-duration-fast) var(--pc-ease);
}

.workspace-card:hover,
.workspace-card:focus-visible {
  border-color: var(--pc-border-strong);
  box-shadow: var(--pc-shadow-overlay);
  outline: none;
  transform: translateY(-1px);
}

.workspace-card--active {
  border-color: color-mix(in srgb, var(--pc-accent) 48%, var(--pc-border));
  box-shadow: 0 0 0 3px var(--pc-accent-soft), var(--pc-shadow-sm);
}

.workspace-card__header,
.workspace-card__identity,
.workspace-card__actions,
.workspace-card__meta {
  display: flex;
  align-items: center;
}

.workspace-card__header {
  justify-content: space-between;
  gap: var(--pc-space-3);
}

.workspace-card__identity {
  min-width: 0;
  gap: var(--pc-space-3);
}

.workspace-card__icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface-2);
  font-size: 1.35rem;
}

.workspace-card--active .workspace-card__icon {
  border-color: var(--pc-accent-soft);
  background: var(--pc-accent-soft);
}

.workspace-card__name-wrap {
  min-width: 0;
}

.workspace-card__name-wrap h2 {
  margin: 0;
  overflow: hidden;
  color: var(--pc-text);
  font-size: 1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-card__name-wrap p {
  margin: 0.25rem 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.workspace-card__actions {
  flex: 0 0 auto;
  gap: 0.25rem;
}

.workspace-card__active {
  padding: 0.25rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--pc-accent) 28%, var(--pc-border));
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
}

.workspace-card__description {
  display: -webkit-box;
  min-height: 2.7rem;
  margin: 0;
  overflow: hidden;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-body);
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.workspace-card__meta {
  justify-content: space-between;
  gap: var(--pc-space-3);
  margin-top: auto;
  padding-top: var(--pc-space-3);
  border-top: 1px solid var(--pc-border);
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-small);
}

.workspace-card__open {
  color: var(--pc-accent-text);
  font-weight: 700;
}

.workspace-empty-state {
  display: grid;
  justify-items: start;
  gap: 0.65rem;
  padding: var(--pc-space-6);
  border: 1px dashed var(--pc-border-strong);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-surface);
  color: var(--pc-text-muted);
}

.workspace-empty-state h2,
.workspace-empty-state p {
  margin: 0;
}

.workspace-empty-state h2 {
  color: var(--pc-text);
  font-size: 1rem;
}

.workspace-switcher :deep(.pc-button) {
  flex: 0 0 auto;
}

.workspace-dialog-heading p {
  margin: 0;
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workspace-dialog-heading h3 {
  margin: 0.25rem 0 0;
  color: var(--pc-text);
  font-size: 1.15rem;
}

.workspace-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--pc-space-3);
}

.workspace-dialog-alert,
.workspace-dialog-loading,
.workspace-dialog-muted {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.workspace-dialog-alert--error {
  color: var(--pc-danger);
}

.workspace-members-dialog,
.workspace-members-list,
.workspace-pending-invites {
  display: grid;
  gap: var(--pc-space-3);
}

.workspace-member-row,
.workspace-invite-row,
.workspace-pending-invites {
  padding: var(--pc-space-3);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface-2);
}

.workspace-member-row,
.workspace-invite-row,
.workspace-pending-invites__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-3);
}

.workspace-member-row__identity,
.workspace-member-row__actions {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  min-width: 0;
}

.workspace-member-row__identity > span {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-small);
  font-weight: 700;
  text-transform: uppercase;
}

.workspace-member-row__identity div,
.workspace-invite-row {
  min-width: 0;
}

.workspace-member-row__identity strong,
.workspace-member-row__identity small,
.workspace-invite-row span,
.workspace-invite-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-member-row__identity small,
.workspace-invite-row small {
  margin-top: 0.2rem;
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
}

.workspace-role {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-caption);
}

.workspace-member-row__actions select,
.workspace-member-row__actions button {
  min-height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-sm);
  background: var(--pc-surface);
  color: var(--pc-text);
  font: inherit;
  font-size: var(--pc-text-caption);
}

.workspace-member-row__actions button:hover {
  border-color: var(--pc-danger);
  color: var(--pc-danger);
}

.workspace-pending-invites__header span {
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
}

:global(.workspace-dialog .el-overlay-dialog) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

:global(.workspace-dialog .el-dialog) {
  background: var(--pc-surface);
  color: var(--pc-text);
  border-radius: var(--pc-radius-lg);
  border: 1px solid var(--pc-border);
  box-shadow: var(--pc-shadow-overlay);
}

:global(.workspace-dialog .el-dialog__header) {
  margin: 0;
  padding: 18px 22px 10px;
  border-bottom: 1px solid var(--pc-border);
}

:global(.workspace-dialog .el-dialog__title) {
  letter-spacing: 0.08em;
  color: var(--pc-accent-text);
  font-weight: 700;
  font-size: 0.85rem;
}

:global(.workspace-dialog .el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}

:global(.workspace-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: var(--pc-text-muted);
}

:global(.workspace-dialog .el-dialog__body) {
  padding: 18px 22px 8px;
  background: transparent;
}

:global(.workspace-dialog input),
:global(.workspace-dialog textarea),
:global(.workspace-dialog .el-input__wrapper),
:global(.workspace-dialog .el-input__inner),
:global(.workspace-dialog .el-textarea__inner) {
  background-color: var(--pc-surface-2) !important;
  border: 1px solid var(--pc-border) !important;
  color: var(--pc-text) !important;
  box-shadow: none !important;
}

:global(.workspace-dialog input::placeholder),
:global(.workspace-dialog textarea::placeholder),
:global(.workspace-dialog .el-input__inner::placeholder),
:global(.workspace-dialog .el-textarea__inner::placeholder) {
  color: var(--pc-text-subtle) !important;
}

:global(.workspace-dialog .el-dialog__footer) {
  padding: 12px 22px 18px;
  border-top: 1px solid var(--pc-border);
}

:global(.workspace-dialog-overlay) {
  background-color: var(--pc-scrim);
  backdrop-filter: blur(6px);
}

@media (max-width: 900px) {
  .workspace-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .workspace-page {
    padding-bottom: calc(6.5rem + var(--safe-area-bottom));
  }

  .workspace-switcher__header,
  .workspace-switcher__toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-switcher :deep(.pc-button) {
    width: 100%;
  }

  .workspace-search {
    width: 100%;
  }

  .workspace-filters {
    width: 100%;
  }

  .workspace-filters button {
    flex: 1 1 0;
  }

  .workspace-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace-member-row,
  .workspace-member-row__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-member-row__actions {
    width: 100%;
  }
}
</style>
