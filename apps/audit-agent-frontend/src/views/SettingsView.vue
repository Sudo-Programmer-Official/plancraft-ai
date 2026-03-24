<template>
  <div class="app-page-shell text-white">
    <!-- Header -->
    <main class="settings-shell app-page-frame space-y-8 sm:space-y-10">
    <header class="app-page-hero mb-0 text-center">
      <h1 class="text-3xl sm:text-4xl font-bold mb-2 text-white">⚙️ Settings</h1>
      <p class="app-page-description mx-auto">Manage your notifications, integrations, and account preferences.</p>
    </header>

    <div class="space-y-8 sm:space-y-10">
      <!-- Settings navigation -->
      <nav class="settings-panel nav-panel">
        <div class="nav-scroll">
          <div class="nav-grid">
            <div v-for="group in tabGroups" :key="group.id" class="space-y-2 min-w-[220px]">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-300">{{ group.label }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tab in group.tabs"
                  :key="tab.id"
                  type="button"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-sm border transition min-w-[140px] text-left',
                    activeTab === tab.id
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                      : 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-slate-500'
                  ]"
                  @click="setActiveTab(tab.id)"
                >
                  <span class="inline-flex items-center gap-2">
                    <span v-if="tab.icon" aria-hidden="true">{{ tab.icon }}</span>
                    <span>{{ tab.label }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div v-if="activeTab === 'workspace-knowledge'">
        <KnowledgePanel />
      </div>

      <div v-if="activeTab === 'workspace-proposals'">
        <ProposalInbox />
      </div>

      <section
        v-if="activeTab === 'workspace-policies'"
        class="settings-panel"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🛡️ Policies</h2>
        <p class="text-sm text-indigo-200">
          Approval and action policies live here. Manage auto-approve/reject rules, admin-only approvals, and two-approver flags.
        </p>
        <p class="text-sm text-slate-300 mt-3">
          Coming soon to UI — policies are already enforced server-side. Ask an admin to adjust workspace policies in the backend for now.
        </p>
      </section>

      <!-- Plan status and usage -->
      <section
        v-if="activeTab === 'billing-subscription'"
        class="settings-panel space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-slate-300">Billing</p>
            <h2 class="text-lg sm:text-xl font-semibold mb-1">🌟 Subscription & Usage</h2>
            <p class="text-sm text-indigo-200">
              {{ billingSectionIntro }}
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-300/40 text-indigo-50 text-sm">
              <span class="text-[11px] uppercase tracking-[0.18em] text-indigo-100/80">Plan</span>
              <strong class="text-white">{{ normalizedPlanLabel }}</strong>
            </span>
            <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 text-slate-200 text-sm">
              <span class="text-[11px] uppercase tracking-[0.18em] text-slate-300">AI today</span>
              <span>{{ aiUsed }} / {{ aiLimitLabel }}</span>
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1.05fr,1fr] gap-4">
          <div class="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 space-y-4 shadow-lg">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-indigo-200 font-semibold">Personal plan</p>
                <p class="text-xs text-slate-300">
                  Daily AI limit {{ aiLimitLabel }}, reminders {{ remindersLimitLabel }} / day.
                </p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-if="!isPremium"
                  @click="upgradePlan"
                  class="bg-gradient-to-r from-purple-500 to-pink-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-white shadow-lg hover:from-purple-600 hover:to-pink-700 transition text-sm sm:text-base"
                >
                  {{ personalPlanCtaLabel }}
                </button>
                <el-button v-if="!isAppleBillingSafeMode" size="small" plain @click="openSubscriptionPage">Manage in billing</el-button>
                <el-button v-else size="small" plain @click="copyBillingWebsite">Copy website</el-button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-slate-800/70 border border-white/10 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-200 mb-1">AI generations</p>
                <p class="text-2xl font-semibold text-white">
                  {{ aiUsed }}
                  <span class="text-sm text-slate-300">/ {{ aiLimitLabel }}</span>
                </p>
              </div>
              <div class="rounded-lg bg-slate-800/70 border border-white/10 p-3">
                <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-200 mb-1">Reminders</p>
                <p class="text-2xl font-semibold text-white">
                  {{ remindersUsed }}
                  <span class="text-sm text-slate-300">/ {{ remindersLimitLabel }}</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <el-button size="small" @click="planOpen = true">Usage breakdown</el-button>
              <p v-if="isPremium && subStore.subscription?.remainingDays > 0" class="text-xs text-indigo-300">
                ⏳ Ends on {{ premiumEndsOn }}
              </p>
              <p v-if="isAppleBillingSafeMode" class="text-xs text-indigo-200/80">
                Billing changes are handled on {{ billingWebHost }}.
              </p>
            </div>
          </div>

          <div v-if="isAppleBillingSafeMode" class="rounded-2xl border border-indigo-400/30 bg-indigo-900/60 p-4 sm:p-5 space-y-4 shadow-lg">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.25em] text-indigo-200">Workspace upgrades</p>
                <h3 class="text-xl font-semibold text-white">Paid workspaces are managed on the web</h3>
                <p class="text-sm text-indigo-100/90">
                  Create, upgrade, or manage shared workspaces on {{ billingWebHost }}. The app will reflect those changes after your next refresh.
                </p>
              </div>
            </div>
            <div class="rounded-xl border border-white/10 bg-slate-950/50 p-4 space-y-2">
              <p class="text-sm font-semibold text-white">Included in paid workspaces</p>
              <ul class="text-sm text-indigo-100/90 space-y-1">
                <li>Shared workspace access and invites</li>
                <li>Role-based collaboration</li>
                <li>Voice AI reminders and team workflows</li>
              </ul>
            </div>
            <div class="flex flex-wrap gap-3">
              <button
                class="px-3 py-2 rounded-lg bg-white text-indigo-800 font-semibold text-sm hover:bg-slate-100 transition"
                @click="openSubscriptionPage"
              >
                Upgrade on web
              </button>
              <button
                class="px-3 py-2 rounded-lg border border-white/15 bg-slate-900/60 text-white font-semibold text-sm hover:border-indigo-300/40 transition"
                @click="copyBillingWebsite"
              >
                Copy website
              </button>
            </div>
          </div>
          <div v-else class="rounded-2xl border border-indigo-400/30 bg-indigo-900/60 p-4 sm:p-5 space-y-3 shadow-lg">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.25em] text-indigo-200">Teams pricing</p>
                <h3 class="text-xl font-semibold text-white">Seat-based workspaces</h3>
                <p class="text-sm text-indigo-100/90">
                  Starter from $6/seat · Pro from $10/seat. Roles, invites, and Voice AI reminders.
                </p>
              </div>
              <button
                class="px-3 py-1.5 rounded-lg bg-white text-indigo-800 font-semibold text-sm hover:bg-slate-100 transition"
                @click="goToTeamsPricing"
              >
                View plans
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="rounded-xl border border-white/10 bg-slate-950/50 p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-lg font-semibold text-white">Team Starter</h4>
                  <span class="text-[11px] px-2 py-1 rounded-full bg-white/10 text-indigo-100">Launch teams</span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-bold text-white">$6</span>
                  <span class="text-xs text-indigo-200">/ seat / month</span>
                </div>
                <ul class="text-xs text-indigo-100/90 space-y-1">
                  <li>✅ Shared workspace & invites</li>
                  <li>✅ Role-based access</li>
                  <li>✅ Voice AI reminders</li>
                </ul>
                <button
                  class="w-full mt-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
                  @click="handleTeamCta('starter')"
                >
                  {{ starterCtaLabel }}
                </button>
              </div>
              <div class="rounded-xl border border-indigo-300/40 bg-gradient-to-br from-indigo-900/80 via-slate-900 to-indigo-950 p-3 space-y-2 shadow ring-1 ring-indigo-400/30">
                <div class="flex items-center justify-between">
                  <h4 class="text-lg font-semibold text-white">Team Pro</h4>
                  <span class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-300/50 text-indigo-100">
                    Admin controls
                  </span>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-bold text-white">$10</span>
                  <span class="text-xs text-indigo-200">/ seat / month</span>
                </div>
                <ul class="text-xs text-indigo-100/90 space-y-1">
                  <li>✅ Everything in Starter</li>
                  <li>✅ Advanced admin controls (Coming soon)</li>
                  <li>✅ Priority support</li>
                </ul>
                <button
                  class="w-full mt-2 px-3 py-2 rounded-lg bg-white text-indigo-800 font-semibold text-sm hover:bg-slate-100 transition"
                  @click="handleTeamCta('pro')"
                >
                  {{ proCtaLabel }}
                </button>
              </div>
            </div>

            <p class="text-xs text-indigo-100/80">Seats = teammates you invite. Billing adjusts automatically when seats change.</p>
          </div>
        </div>
      </section>

      <section
        v-if="activeTab === 'account-profile'"
        class="settings-panel"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🙋 Profile</h2>
        <p class="text-sm text-indigo-200">Profile editing lives in your account menu. A dedicated editor will arrive here soon.</p>
        <p class="text-sm text-slate-300 mt-2">Signed in as: <strong>{{ authStore.user?.email || 'Unknown user' }}</strong></p>
      </section>

      <section
        v-if="activeTab === 'account-preferences'"
        class="settings-panel"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">⚙️ Preferences</h2>
        <p class="text-sm text-indigo-200">Workspace-specific preferences (theme, locale, AI persona) will be managed here soon.</p>
      </section>

      <section
        v-if="activeTab === 'account-quick-setup'"
        class="settings-panel space-y-5"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-200/80">Setup Assistant</p>
            <h2 class="text-lg sm:text-xl font-semibold text-white">✨ Quick Setup</h2>
            <p class="text-sm text-indigo-100/85 max-w-2xl">
              Reopen the onboarding assistant any time to finish reminder channels, timezone, and phone setup.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-indigo-400 hover:to-fuchsia-500"
            @click="openQuickSetupPanel"
          >
            <span aria-hidden="true">✨</span>
            <span>{{ quickSetupState?.completed ? 'Review setup' : 'Finish setup' }}</span>
          </button>
        </div>

        <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-300">Progress</p>
              <p class="text-sm text-slate-100">
                {{ quickSetupState?.completedSteps || 0 }}/{{ quickSetupState?.totalSteps || 0 }} setup items complete
              </p>
            </div>
            <span
              class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
              :class="quickSetupState?.requiredComplete ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/40 bg-amber-500/10 text-amber-100'"
            >
              {{ quickSetupState?.requiredComplete ? 'Core setup complete' : 'Setup incomplete' }}
            </span>
          </div>

          <div class="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-500 to-fuchsia-500 transition-all"
              :style="{ width: `${quickSetupState?.completionPercent || 0}%` }"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <span
              v-for="step in quickSetupState?.steps || []"
              :key="step.key"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
              :class="step.complete ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-300'"
            >
              <span>{{ step.complete ? '✓' : '•' }}</span>
              <span>{{ step.label }}</span>
            </span>
          </div>

          <p v-if="quickSetupMissingLabels.length" class="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Finish setup to unlock calmer reminders: {{ quickSetupMissingLabels.join(', ') }}.
          </p>
          <p v-else class="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Quick Setup is complete. You can reopen it any time to review or change your setup.
          </p>
        </div>
      </section>

      <!-- Notification Preferences -->
      <section
        v-if="activeTab === 'account-notifications'"
        ref="notificationsSection"
        :class="['settings-panel',
                 highlightNotifications ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent' : '']"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔔 Notification Preferences</h2>
        <p class="text-sm text-indigo-200 mb-4">Choose how you’d like to be reminded about tasks, reflections, and insights.</p>

        <div class="space-y-3">
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.email" class="accent-indigo-500" @change="dirty = true" />
            <span>Email Notifications</span>
          </label>
          <label class="flex items-center gap-3" v-if="canUseBrowserPush">
            <input type="checkbox" v-model="prefs.pwa" class="accent-indigo-500" @change="dirty = true" />
            <span>Push Notifications (PWA)</span>
          </label>
          <div v-if="canUseBrowserPush && prefs.pwa" class="pl-7 mt-2">
            <el-button size="small" @click="enablePush" class="bg-slate-800 hover:bg-slate-700">Enable Browser Push</el-button>
          </div>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.whatsapp" class="accent-indigo-500" @change="dirty = true" />
            <span>WhatsApp Alerts</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.sms" class="accent-indigo-500" @change="dirty = true" />
            <span>SMS</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.voice_call" class="accent-indigo-500" @change="dirty = true" />
            <span>Voice Call</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.discord" class="accent-indigo-500" disabled />
            <span>Discord Channel (coming soon)</span>
          </label>
        </div>

        <!-- Delivery endpoints -->
        <div v-if="prefs.whatsapp" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">WhatsApp Phone Number</label>
          <el-input v-model="integrationEndpoints.whatsapp.phone" placeholder="+1 234 567 8901" clearable class="w-full" @input="dirty = true" />
          <small class="text-slate-400">Format: +12135551234 (E.164)</small>
        </div>

        <div v-if="prefs.sms || prefs.voice_call" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">Phone Number (for SMS)</label>
          <el-input v-model="integrationEndpoints.sms.phone" placeholder="+1 234 567 8901" clearable class="w-full" @input="dirty = true" />
          <p v-if="effectiveTwilioPhone" class="text-xs text-slate-400 mt-1">
            💬 SMS and voice calls will be sent to {{ effectiveTwilioPhone }}.
            <span class="text-slate-400">You can update this under <strong>Integrations → Phone</strong>.</span>
          </p>
        </div>

        <div v-if="prefs.discord" class="mt-4">
          <label class="block text-sm text-slate-300 mb-1">Discord Webhook URL</label>
          <el-input v-model="integrationEndpoints.discord.webhook" placeholder="https://discord.com/api/webhooks/..." clearable class="w-full" @input="dirty = true" />
        </div>

        <div class="mt-6 text-center" v-if="dirty">
          <p class="text-sm text-yellow-300 mb-2">⚠️ You have unsaved changes.</p>
          <el-button type="primary" @click="saveSettings" class="bg-gradient-to-r from-indigo-600 to-purple-600">💾 Save Settings</el-button>
        </div>
      </section>

      <section
        v-if="activeTab === 'account-social'"
        class="settings-panel"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🌐 Social Accounts</h2>
        <p class="text-sm text-indigo-200">Connect LinkedIn, GitHub, and other accounts to sync ownership context. Social linking UI will land here.</p>
      </section>

      <!-- Integrations -->
      <section
        v-if="activeTab === 'workspace-integrations'"
        class="settings-panel"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔗 Integrations</h2>
        <p class="text-sm text-indigo-200 mb-4">Connect your favorite platforms to sync tasks and reminders.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <button
            v-for="i in integrationOptions"
            :key="i.key"
            @click="() => { i.selected = !i.selected; dirty = true }"
            :class="[ 'flex flex-col items-center justify-center p-4 rounded-lg transition', i.selected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/50 hover:bg-slate-800']"
          >
            <span class="text-2xl mb-2">{{ i.icon }}</span>
            <span class="text-sm">{{ i.name }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <!-- GPT integration card -->
          <div
            ref="gptCardRef"
            :class="[
              'integration-card rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-4 transition',
              highlightGpt ? 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/20' : ''
            ]"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="font-semibold flex items-center gap-2">
                  🤖 PlanCraft GPT
                  <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-100 uppercase tracking-wide">Beta</span>
                </div>
                <p class="text-xs text-slate-300 mt-1">
                  Generate a short-lived link code and paste it inside ChatGPT to connect the PlanCraft GPT Actions.
                </p>
                <p v-if="gptLink.expiresAt" class="text-[11px] text-slate-400">
                  {{ gptLinkExpired ? 'Expired' : 'Expires' }} {{ gptLinkExpiryLabel }}
                </p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  class="px-3 py-1.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm disabled:opacity-60"
                  :disabled="gptLink.loading || !authStore.user"
                  @click="generateGptCode"
                >
                  {{ gptLink.loading ? 'Generating…' : gptLink.code ? 'Refresh Code' : 'Generate Code' }}
                </button>
                <button
                  v-if="gptLink.code"
                  class="px-3 py-1.5 rounded border border-indigo-500/50 text-indigo-100 hover:bg-indigo-500/10 text-sm disabled:opacity-40"
                  :disabled="gptLink.copied"
                  @click="copyGptCode"
                >
                  {{ gptLink.copied ? 'Copied!' : 'Copy Code' }}
                </button>
                <button
                  v-if="gptLink.code && gptLaunchUrl"
                  class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm text-white flex items-center gap-1"
                  @click="openChatGpt"
                >
                  Open ChatGPT ↗
                </button>
              </div>
            </div>
            <div v-if="gptLink.code" class="rounded-lg border border-indigo-500/30 bg-slate-950/50 p-4 space-y-3">
              <div>
                <p class="text-xs text-slate-400 uppercase tracking-[0.2em]">Link Code</p>
                <p class="text-3xl font-mono tracking-[0.25em] text-white break-all">{{ gptLink.code }}</p>
              </div>
              <ul class="list-decimal list-inside text-xs text-slate-300 space-y-1">
                <li>Open ChatGPT and launch the PlanCraft AI GPT.</li>
                <li>Say “Link my account” and paste this code when prompted.</li>
                <li>Approve the connection to sync tasks, reminders, and journal entries.</li>
              </ul>
              <a :href="gptHelpUrl" target="_blank" rel="noreferrer" class="text-indigo-300 text-xs inline-flex items-center gap-1 hover:text-indigo-200">
                Need help? <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p v-else class="text-xs text-slate-400">
              Codes expire after a few minutes. Generate a fresh one whenever you want to connect ChatGPT.
            </p>
            <p v-if="gptLink.error" class="text-xs text-red-300">⚠️ {{ gptLink.error }}</p>
          </div>

          <!-- Google Calendar Card -->
          <div class="integration-card rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-3">
            <div v-if="googleLoading" class="space-y-4 animate-pulse">
              <div class="h-5 w-40 bg-slate-800/60 rounded"></div>
              <div class="h-4 w-3/4 bg-slate-800/40 rounded"></div>
              <div class="h-10 bg-slate-800/50 rounded"></div>
            </div>
            <template v-else>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div class="font-semibold flex items-center gap-2">📆 Google Calendar
                  <span v-if="google.enabled" :class="['text-xs px-2 py-0.5 rounded', google.connected ? 'bg-emerald-700/50 text-emerald-200' : 'bg-yellow-700/40 text-yellow-200']">
                    {{ google.connected ? `${google.accounts.length} account${google.accounts.length > 1 ? 's' : ''} connected` : 'Not Connected' }}
                  </span>
                  <span v-else class="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">Disabled by server</span>
                </div>
                <p class="text-xs text-slate-300 mt-1">
                  Import meetings and show Join links in your tasks.
                  <span v-if="activeGoogleAccount?.lastRun">Last sync: {{ formatGoogleLastSync(activeGoogleAccount.lastRun) }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-if="google.enabled && authStore.user"
                  @click="connectGoogle"
                  :disabled="googleLoading"
                  class="px-3 py-1.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm disabled:opacity-50"
                >
                  {{ google.connected ? 'Add account' : 'Connect' }}
                </button>
                <button
                  v-if="google.connected && activeGoogleAccount"
                  @click="syncNow"
                  :disabled="activeGoogleAccount.syncing"
                  class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-2 disabled:opacity-60"
                >
                  <span
                    v-if="activeGoogleAccount.syncing"
                    class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  ></span>
                  <span>{{ activeGoogleAccount.syncing ? 'Syncing…' : 'Sync Now' }}</span>
                </button>
                <button
                  v-if="google.connected && activeGoogleAccount"
                  @click="disconnectGoogle(activeGoogleAccount.accountId)"
                  class="px-3 py-1.5 rounded bg-red-700/80 hover:bg-red-700 text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <div v-if="google.connected && google.accounts.length" class="mt-3 flex items-center gap-3 flex-wrap">
              <label class="text-sm text-slate-300">Active account:</label>
              <select
                :value="activeGoogleAccountId"
                @change="(e) => setActiveGoogleAccount(e.target.value)"
                class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              >
                <option v-for="acc in google.accounts" :key="acc.accountId" :value="acc.accountId">
                  {{ acc.accountEmail || acc.accountId }} {{ acc.primary ? '(primary)' : '' }}
                </option>
              </select>
              <span v-if="activeGoogleAccount?.status" class="text-xs text-slate-400">Status: {{ activeGoogleAccount.status }}</span>
              <span v-if="activeGoogleAccount?.lastRun" class="text-xs text-slate-400">Last sync: {{ formatGoogleLastSync(activeGoogleAccount.lastRun) }}</span>
            </div>

            <!-- Calendars selection -->
            <div v-if="google.connected && activeGoogleAccount" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label v-for="cal in activeCalendars" :key="cal.id" class="flex items-center gap-2 bg-slate-800/40 border border-slate-700/40 rounded p-2">
                <input type="checkbox" v-model="cal.selected" class="accent-indigo-500">
                <div class="flex-1">
                  <div class="text-sm">{{ cal.summary || cal.id }}</div>
                  <div class="text-xs text-slate-400">{{ cal.timeZone || '—' }}</div>
                </div>
                <span v-if="cal.primary" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700/50">primary</span>
              </label>
            </div>

            <!-- Window + save -->
            <div v-if="google.connected && activeGoogleAccount" class="mt-3 flex items-center gap-3 flex-wrap">
              <label class="text-sm text-slate-300">Look-ahead window:</label>
              <select v-model.number="activeGoogleAccount.windowDays" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm">
                <option :value="7">7 days</option>
                <option :value="14">14 days</option>
                <option :value="30">30 days</option>
                <option :value="60">60 days</option>
              </select>
              <button @click="saveSelection" class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save Selection</button>
              <span v-if="activeGoogleAccount.status" class="text-xs text-slate-400">Status: {{ activeGoogleAccount.status }}</span>
            </div>

              <div v-if="google.enabled" class="pt-3 border-t border-white/5 space-y-3">
                <label class="flex items-center gap-3 text-sm text-slate-200">
                  <input type="checkbox" v-model="meetingPrefs.autoCreate" @change="markDirty" class="accent-indigo-500" />
                  Auto-create tasks from calendar events
                </label>
                <div class="flex items-center gap-2 text-sm text-slate-200 flex-wrap">
                  <span>Default meeting reminder:</span>
                  <select
                    v-model.number="meetingPrefs.defaultReminderMinutes"
                    @change="markDirty"
                    class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <option :value="5">5 minutes</option>
                    <option :value="10">10 minutes</option>
                    <option :value="15">15 minutes</option>
                    <option :value="30">30 minutes</option>
                    <option :value="60">1 hour</option>
                  </select>
                  <span class="text-xs text-slate-400">Adjust reminder lead time for meetings.</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- Social Accounts -->
      <div class="mt-8">
        <SocialIntegrationPanel />
      </div>

      <!-- Account -->
      <section class="settings-panel">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">👤 Account</h2>
        <div class="profile-identity mb-4">
          <AvatarUploader
            :url="authStore.user?.photoURL || authStore.user?.avatarUrl"
            :name="profileForm.name || authStore.user?.displayName || authStore.user?.name"
            :email="profileForm.email || authStore.user?.email"
            class="profile-identity-uploader"
            @updated="onAvatarUpdated"
          />
          <div class="profile-identity-copy">
            <p class="font-medium">{{ profileForm.name || authStore.user?.displayName || 'Guest User' }}</p>
            <p class="text-sm text-indigo-300">{{ profileForm.email || authStore.user?.email }}</p>
          </div>
        </div>

        <div v-if="!profileComplete" class="mb-3 text-yellow-300 text-sm">
          ⚠️ Your profile is incomplete — add your name to personalize your experience.
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          <el-input v-model="profileForm.name" placeholder="Your name" clearable />
          <el-input v-model="profileForm.email" placeholder="Email (optional)" type="email" clearable />
          <el-input v-model="profileForm.phone" placeholder="Phone (optional)" type="tel" clearable />
        </div>
        <div v-if="emailNeedsReauth" class="mb-4 text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-300/30 rounded px-3 py-2 flex items-center justify-between gap-3">
          <span>
            Changing your email requires a recent login. Re-authenticate to continue.
          </span>
          <el-button size="small" type="primary" @click="reauthenticate">Re-authenticate</el-button>
        </div>
        <div class="flex items-center justify-end gap-3 mb-6">
          <el-button type="primary" class="bg-gradient-to-r from-indigo-600 to-purple-600" :loading="profileSaving" @click="saveProfile">Save Changes</el-button>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
          <RouterLink to="/help" class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-gray-800 hover:bg-gray-700 transition">💬 Help & Feedback</RouterLink>
          <button class="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg bg-red-600 hover:bg-red-700 transition" @click="handleLogout">Logout</button>
        </div>
      </section>
    </div>
    </main>
  </div>
  <PlanSummaryModal :open="planOpen" @close="planOpen=false" />
  <!-- Re-auth dialog -->
  <el-dialog v-model="reauthOpen" title="Re-authenticate" width="420px" :append-to-body="true">
    <div v-if="reauthStep === 0" class="space-y-3">
      <p class="text-sm text-slate-300">Choose a method to verify your identity.</p>
      <el-radio-group v-model="reauthMethod" class="flex flex-col gap-2">
        <el-radio v-if="reauthHasGoogle && !isNativePackagedApp()" label="google">Google Popup</el-radio>
        <el-radio v-if="reauthHasPhone" label="phone">Phone ({{ maskedPhone }})</el-radio>
      </el-radio-group>
      <div class="flex justify-end gap-2 pt-2">
        <el-button @click="reauthOpen=false">Cancel</el-button>
        <el-button type="primary" :disabled="!reauthMethod" @click="startReauth">Continue</el-button>
      </div>
    </div>
    <div v-else-if="reauthMethod === 'phone'" class="space-y-3">
      <p class="text-sm text-slate-300">Enter the 6-digit code sent to {{ maskedPhone }}.</p>
      <el-input v-model="otp" placeholder="OTP code" maxlength="6" />
      <div class="text-xs text-slate-400 flex items-center justify-between">
        <span>Didn't receive the code?</span>
        <div class="flex items-center gap-1">
          <el-tooltip effect="dark" placement="top" :content="`You can request a new code every ${cooldownDefault}s. Multiple attempts may trigger a longer wait.`">
            <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-600/40 text-slate-200 cursor-help">i</span>
          </el-tooltip>
          <el-button
            link
            type="primary"
            :loading="reauthLoading"
            :disabled="!canResend"
            @click="resendOtp"
          >
            Resend OTP<span v-if="!canResend"> ({{ resendCooldown }}s)</span>
          </el-button>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <el-button link type="primary" @click="resetReauth">Use different method</el-button>
        <div class="flex gap-2">
          <el-button @click="reauthOpen=false">Cancel</el-button>
          <el-button type="primary" :loading="reauthLoading" @click="verifyOtp">Verify</el-button>
        </div>
      </div>
    </div>
    <div v-else-if="reauthMethod === 'google'" class="space-y-3">
      <p class="text-sm text-slate-300">We’ll open a Google sign-in popup to verify.</p>
      <div class="flex justify-between items-center">
        <el-button link type="primary" @click="resetReauth">Use different method</el-button>
        <div class="flex gap-2">
          <el-button @click="reauthOpen=false">Cancel</el-button>
          <el-button type="primary" :loading="reauthLoading" @click="doGoogleReauth">Continue</el-button>
        </div>
      </div>
    </div>
  </el-dialog>
  <!-- Hidden container for re-auth phone reCAPTCHA -->
  <div id="reauth-recaptcha" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden" />
</template>
<script setup>
import { reactive, ref, onMounted, computed, watch, onBeforeUnmount, nextTick } from "vue"
import { useAuthStore } from "@/stores/authStore"
import { useRouter, useRoute } from "vue-router"
import { ElMessage } from "element-plus"
import { normalizePhone, guessCountryFromLocale } from '@/utils/phoneUtils'
import { getGoogleStatus, getGoogleCalendars, saveGoogleCalendarSelection, triggerGoogleSyncNow, requestGoogleConnectUrl, disconnectGoogleIntegration } from '@/stores/integrationsStore'
import { getPreferences as apiGetPrefs, updatePreferences as apiUpdatePrefs, getIntegrations, updateIntegrations, getProfile as getSettingsProfile, updateProfile as updateSettingsProfile } from "@/services/settingsService"
import { createGptLinkCode } from '@/services/gptService'
import SocialIntegrationPanel from '@/components/settings/SocialIntegrationPanel.vue'
import { subscribeUserToPush } from "@/services/pwaService"
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { resolvePlanKey } from "@/services/planService"
import PlanSummaryModal from "@/components/PlanSummaryModal.vue"
import KnowledgePanel from "@/components/KnowledgePanel.vue"
import ProposalInbox from "@/components/ProposalInbox.vue"
import { useIsPremium } from "@/composables/useIsPremium"
import { trackLinkedInConversion } from '@/utils/ads'
import { getAuth, updateProfile as updateFirebaseProfile, updateEmail, GoogleAuthProvider, reauthenticateWithPopup, RecaptchaVerifier, PhoneAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import AvatarUploader from '@/components/AvatarUploader.vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { getNativeAuthRestriction, isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { BILLING_WEB_HOST, isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { copyText, openExternalUrl } from '@/utils/nativeUi'
import {
  buildQuickSetupState,
  dispatchQuickSetupUpdated,
  getIncompleteQuickSetupLabels,
  normalizeQuickSetupChannels,
  writeQuickSetupState,
} from '@/utils/quickSetup'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()
const { refresh: refreshPremium } = useIsPremium()
const workspaceStore = useWorkspaceStore()
const quickSetupStore = useQuickSetupStore()
const canUseBrowserPush = computed(() => !isNativePackagedApp())
const billingWebHost = BILLING_WEB_HOST
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const quickSetupState = computed(() => quickSetupStore.setupState)
const quickSetupMissingLabels = computed(() => getIncompleteQuickSetupLabels(quickSetupState.value))
const teamWorkspaces = computed(() =>
  (workspaceStore.workspaces || []).filter((w) => (w.workspaceType || w.type) === 'team'),
)
const activeTeamWorkspace = computed(() => {
  const active = workspaceStore.activeWorkspace
  if (active && ((active.workspaceType || active.type) === 'team')) return active
  return teamWorkspaces.value[0] || null
})

function normalizeTab(tab) {
  const t = String(tab || '').trim().toLowerCase()
  if (!t) return ''
  const alias = {
    notifications: 'account-notifications',
    notification: 'account-notifications',
    'account-notifications': 'account-notifications',
    integrations: 'workspace-integrations',
    'workspace-integrations': 'workspace-integrations',
    knowledge: 'workspace-knowledge',
    'workspace-knowledge': 'workspace-knowledge',
    proposals: 'workspace-proposals',
    'workspace-proposals': 'workspace-proposals',
    policies: 'workspace-policies',
    'workspace-policies': 'workspace-policies',
    profile: 'account-profile',
    'account-profile': 'account-profile',
    preferences: 'account-preferences',
    'account-preferences': 'account-preferences',
    'quick-setup': 'account-quick-setup',
    quicksetup: 'account-quick-setup',
    'account-quick-setup': 'account-quick-setup',
    social: 'account-social',
    'account-social': 'account-social',
    billing: 'billing-subscription',
    subscription: 'billing-subscription',
    'subscription-usage': 'billing-subscription',
    'billing-subscription': 'billing-subscription',
    help: 'workspace-knowledge',
    onboarding: 'workspace-knowledge',
    'help-onboarding': 'workspace-knowledge',
  }
  return alias[t] || t
}

const tabGroups = [
  {
    id: 'workspace',
    label: 'Workspace',
    tabs: [
      { id: 'workspace-knowledge', label: 'Knowledge' },
      { id: 'workspace-proposals', label: 'Impact & Proposals' },
      { id: 'workspace-policies', label: 'Policies' },
      { id: 'workspace-integrations', label: 'Integrations' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    tabs: [
      { id: 'account-profile', label: 'Profile' },
      { id: 'account-preferences', label: 'Preferences' },
      { id: 'account-quick-setup', label: 'Quick Setup', icon: '✨' },
      { id: 'account-notifications', label: 'Notifications' },
      { id: 'account-social', label: 'Social' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    tabs: [{ id: 'billing-subscription', label: 'Subscription & Usage' }],
  },
]

const DEFAULT_SETTINGS_TAB = 'account-profile'
const activeTab = ref(normalizeTab(route.query?.tab) || DEFAULT_SETTINGS_TAB)

watch(
  () => route.query?.tab,
  (tab) => {
    const target = normalizeTab(tab) || DEFAULT_SETTINGS_TAB
    if (activeTab.value !== target) activeTab.value = target
    if (target === 'account-notifications') focusNotifications()
  },
)

function setActiveTab(id) {
  const target = normalizeTab(id) || DEFAULT_SETTINGS_TAB
  if (activeTab.value !== target) activeTab.value = target
  router.replace({ query: { ...route.query, tab: target } }).catch(() => {})
  if (target === 'account-notifications') focusNotifications()
}

function openQuickSetupPanel() {
  quickSetupStore.refreshQuickSetupState()
  quickSetupStore.openQuickSetup({ source: 'manual' })
}
const dirty = ref(false) // tracks unsaved changes
const notificationsSection = ref(null)
const highlightNotifications = ref(false)

function markDirty() {
  dirty.value = true
}

function focusNotifications() {
  nextTick(() => {
    try { notificationsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    highlightNotifications.value = true
    setTimeout(() => { highlightNotifications.value = false }, 1600)
  })
}

const DEFAULT_MEETING_REMINDER = Number(import.meta.env.VITE_CALENDAR_REMINDER_MINUTES || 10)

function sanitizeReminderMinutes(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return DEFAULT_MEETING_REMINDER
  return Math.min(Math.max(Math.round(num), 1), 24 * 60)
}

// Account profile state
const auth = getAuth()
const profileForm = reactive({ name: '', email: '', phone: '' })
const profileSaving = ref(false)
const emailNeedsReauth = ref(false)
const profileComplete = ref(true)
// Re-auth state
const reauthOpen = ref(false)
const reauthMethod = ref('')
const reauthHasGoogle = ref(false)
const reauthHasPhone = ref(false)
const reauthLoading = ref(false)
const reauthVerificationId = ref('')
const otp = ref('')
const reauthStep = ref(0)
const maskedPhone = computed(() => {
  try {
    const raw = auth?.currentUser?.phoneNumber || profileForm.phone || ''
    if (!raw) return ''
    const s = String(raw)
    if (s.length <= 4) return s
    return s.slice(0, 4) + '…' + s.slice(-2)
  } catch { return '' }
})

// Reusable invisible reCAPTCHA instance for phone re-auth
let reauthRecaptcha = null
async function ensureReauthRecaptcha(force = false) {
  try {
    if (force && reauthRecaptcha) {
      try { reauthRecaptcha.clear() } catch {}
      reauthRecaptcha = null
    }
    if (!reauthRecaptcha) {
      reauthRecaptcha = new RecaptchaVerifier(auth, 'reauth-recaptcha', { size: 'invisible' })
      try { await reauthRecaptcha.render() } catch {}
    }
  } catch {}
  return reauthRecaptcha
}

// Env-configurable resend cooldown (bounds: 5–120s; default 10s)
function getCooldownSeconds() {
  const raw = Number(import.meta.env.VITE_OTP_RESEND_COOLDOWN)
  if (!Number.isFinite(raw)) return 10
  return Math.min(Math.max(Math.floor(raw), 5), 120)
}
let lastOtpSentAt = 0
const cooldownDefault = getCooldownSeconds()

// Notification preferences state
const prefs = reactive({
  email: true,
  pwa: canUseBrowserPush.value,
  whatsapp: true,
  sms: false,
  voice_call: false,
  discord: false,
  calls: false, // legacy toggle, derived below
})

function withTimeout(promise, ms = 8000, label = 'request') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function applySettingsPreferences(res = {}) {
  const n = res?.notifications || {}
  const ints = res?.integrations || {}
  const chans = Array.isArray(n?.channels) ? n.channels : null
  if (chans) {
    const set = new Set(chans)
    prefs.email = set.has('email') || !!n.email || true
    prefs.pwa = canUseBrowserPush.value ? (set.has('pwa') || !!n.push || true) : false
    prefs.whatsapp = set.has('whatsapp') || !!n.whatsapp || true
    prefs.sms = set.has('sms') || !!n.sms || false
    prefs.voice_call = set.has('voice_call') || !!n.voice_call || false
  } else {
    prefs.email = n.email !== undefined ? !!n.email : true
    prefs.pwa = canUseBrowserPush.value ? (n.push !== undefined ? !!n.push : true) : false
    prefs.whatsapp = n.whatsapp !== undefined ? !!n.whatsapp : true
    prefs.sms = !!n.sms
    prefs.voice_call = !!n.voice_call
  }
  prefs.discord = !!n.discord
  prefs.calls = !!(n.calls || prefs.sms || prefs.voice_call)

  notifPhones.value = { sms: n.phone_sms || '', voice: n.phone_voice || '' }
  integrationOptions.forEach((i) => { i.selected = !!ints[i.key] })

  const meetingsPref = res?.meetings || {}
  meetingPrefs.autoCreate = meetingsPref.autoCreateCalendarTasks !== false
  meetingPrefs.defaultReminderMinutes = sanitizeReminderMinutes(
    meetingsPref.defaultReminderMinutes ?? meetingsPref.defaultMeetingReminderMinutes ?? DEFAULT_MEETING_REMINDER,
  )
}

function applyIntegrationEndpoints(resInts = {}) {
  integrationEndpoints.value = {
    whatsapp: { phone: resInts?.whatsapp?.phone || '' },
    sms: { phone: resInts?.sms?.phone || '' },
    discord: { webhook: resInts?.discord?.webhook || '' },
    slack: { userId: resInts?.slack?.userId || '', token: resInts?.slack?.token || '' },
    email: resInts?.email || authStore.user?.email || ''
  }
}

function applyProfileFields(user, data = {}) {
  profileForm.name = data?.name || user?.displayName || ''
  profileForm.email = data?.email || user?.email || ''
  profileForm.phone = data?.phone || user?.phoneNumber || authStore.user?.phone || ''
  profileComplete.value = !!(data?.name || user?.displayName)
}

function currentQuickSetupTimezone() {
  try {
    return (
      localStorage.getItem('user_timezone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'
    )
  } catch {
    return 'UTC'
  }
}

function deriveQuickSetupPhone() {
  const candidates = [
    notifPhones.value?.sms,
    notifPhones.value?.voice,
    integrationEndpoints.value?.sms?.phone,
    integrationEndpoints.value?.whatsapp?.phone,
    profileForm.phone,
    authStore.user?.phone,
  ]
  return (
    candidates
      .map((value) => String(value || '').trim())
      .find(Boolean) || ''
  )
}

function deriveQuickSetupChannels() {
  return normalizeQuickSetupChannels([
    prefs.email && 'email',
    canUseBrowserPush.value && prefs.pwa && 'pwa',
    prefs.whatsapp && 'whatsapp',
    prefs.sms && 'sms',
    prefs.voice_call && 'voice_call',
  ])
}

function syncQuickSetupFromSettings() {
  const nextState = buildQuickSetupState({
    timezone: currentQuickSetupTimezone(),
    channels: deriveQuickSetupChannels(),
    phone: deriveQuickSetupPhone(),
    pushGranted: canUseBrowserPush.value ? !!prefs.pwa : false,
    isNative: isNativePackagedApp(),
  })
  writeQuickSetupState(nextState)
  quickSetupStore.refreshQuickSetupState(nextState)
  dispatchQuickSetupUpdated(nextState)
  return nextState
}

async function loadSettingsProfile(uid) {
  const user = auth.currentUser || authStore.user || null
  if (!uid) {
    applyProfileFields(user, {})
    return
  }
  try {
    const udata = await withTimeout(getSettingsProfile(uid), 8000, 'settings profile')
    applyProfileFields(user, udata)
  } catch (error) {
    console.warn('[Settings] profile load fallback', error?.message || error)
    applyProfileFields(user, {})
  }
}

const loadedSettingsUid = ref('')
const settingsLoadInFlight = ref(false)

async function hydrateSettingsForUser(uid) {
  if (!uid || settingsLoadInFlight.value) return
  settingsLoadInFlight.value = true
  try {
    try { workspaceStore.init?.() } catch {}

    const prefRes = await apiGetPrefs(uid).catch((error) => {
      console.warn('[Settings] preferences load failed', error?.message || error)
      return {}
    })
    applySettingsPreferences(prefRes || {})

    const resInts = await getIntegrations(uid).catch((error) => {
      console.warn('[Settings] integrations load failed', error?.message || error)
      return {}
    })
    applyIntegrationEndpoints(resInts || {})

    await loadSettingsProfile(uid)
    await loadGoogle({ suppressLoader: false })
    syncQuickSetupFromSettings()
    loadedSettingsUid.value = uid
  } finally {
    settingsLoadInFlight.value = false
  }
}

const isPremium = computed(() => {
  try {
    if (accessStore.access?.effectivePlan) {
      return ['premium', 'team'].includes(String(accessStore.access.effectivePlan).toLowerCase())
    }
    const planCandidates = [
      subStore?.subscription?.value?.plan ?? subStore?.subscription?.plan,
      authStore?.user?.plan,
      authStore?.user,
    ]
    const role = String(authStore?.user?.role || '').toLowerCase()
    const isAdminRole = role === 'admin' || role === 'superadmin'
    const hasPremiumPlan = planCandidates.some((plan) => resolvePlanKey(plan) !== 'FREE')
    return hasPremiumPlan || isAdminRole
  } catch { return false }
})

onMounted(async () => {
  try {
    // Ensure latest subscription state on entry
    try { await refreshPremium() } catch {}
    quickSetupStore.refreshQuickSetupState()
    try {
      if (activeTab.value === 'account-notifications') {
        setTimeout(() => focusNotifications(), 150)
      }
      if (route?.query?.gpt !== undefined) {
        setTimeout(() => focusGptCard(true), 400)
      }
    } catch {}
  } catch (e) {
    console.warn('Failed to load preferences', e)
  }
  if (!authStore.user?.uid) {
    googleLoading.value = false
    applyProfileFields(auth.currentUser || authStore.user || null, {})
  }
})

// Optional: auto-save debounce can be added later. For now, use Save button.

// Integrations toggle list (selected state persisted)
const integrationOptions = reactive([
  { key: 'googleCalendar', name: 'Google Calendar', icon: '📆', selected: false },
  { key: 'slack', name: 'Slack', icon: '💬', selected: false },
  { key: 'discord', name: 'Discord', icon: '🎮', selected: false },
  { key: 'whatsapp', name: 'WhatsApp', icon: '📱', selected: false },
  { key: 'outlook', name: 'Outlook', icon: '📧', selected: false },
])

const gptLink = reactive({
  loading: false,
  code: '',
  expiresAt: null,
  ttlMinutes: null,
  copied: false,
  error: '',
})
const gptHelpUrl = import.meta.env.VITE_GPT_HELP_URL || 'https://plancraftai.com/integrations/gpt'
const gptLaunchUrl = import.meta.env.VITE_GPT_LAUNCH_URL || ''
const gptCardRef = ref(null)
const highlightGpt = ref(false)
const gptDeepLinkActive = computed(() => !!route?.query?.gpt)
const gptLinkExpiryLabel = computed(() => {
  if (!gptLink.expiresAt) return ''
  try {
    return dayjs(gptLink.expiresAt).local().format('MMM D • h:mm A')
  } catch {
    return gptLink.expiresAt
  }
})
const gptLinkExpired = computed(() => {
  if (!gptLink.expiresAt) return false
  return dayjs(gptLink.expiresAt).valueOf() <= Date.now()
})
let gptCopyTimer = null


async function generateGptCode() {
  if (!authStore.user?.uid) {
    ElMessage.error('Please sign in to generate a link code')
    return
  }
  gptLink.loading = true
  gptLink.error = ''
  try {
    const result = await createGptLinkCode(authStore.user.uid)
    gptLink.code = result?.code || ''
    gptLink.expiresAt = result?.expiresAt || null
    gptLink.ttlMinutes = result?.ttlMinutes || null
    gptLink.copied = false
    if (gptLink.code) {
      ElMessage.success('GPT link code ready')
    } else {
      ElMessage.warning('No link code returned. Try again.')
    }
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || 'Failed to create link code'
    gptLink.error = message
    ElMessage.error(message)
  } finally {
    gptLink.loading = false
  }
}

async function copyGptCode() {
  if (!gptLink.code) return
  try {
    const copied = await copyText(gptLink.code)
    if (!copied) {
      throw new Error('Clipboard unavailable')
    }
    if (gptCopyTimer) clearTimeout(gptCopyTimer)
    gptLink.copied = true
    gptCopyTimer = setTimeout(() => {
      gptLink.copied = false
    }, 2000)
    ElMessage.success('Code copied to clipboard')
  } catch (e) {
    console.warn('Copy GPT code failed', e)
    ElMessage.error('Unable to copy automatically. Please copy manually.')
  }
}

function focusGptCard(autoGenerate = false) {
  highlightGpt.value = true
  nextTick(() => {
    try {
      gptCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {}
  })
  setTimeout(() => {
    highlightGpt.value = false
  }, 2000)
  if (autoGenerate && !gptLink.code && !gptLink.loading) {
    generateGptCode()
  }
  if (route?.query?.gpt !== undefined) {
    const nextQuery = { ...route.query }
    delete nextQuery.gpt
    router.replace({ query: nextQuery }).catch(() => {})
  }
}

function openChatGpt() {
  if (!gptLaunchUrl) return
  const opened = openExternalUrl(gptLaunchUrl)
  if (!opened) {
    ElMessage.error('Unable to open ChatGPT right now')
  }
}

// Delivery endpoints (per-channel identifiers)
const integrationEndpoints = ref({
  whatsapp: { phone: '' },
  sms: { phone: '' },
  discord: { webhook: '' },
  slack: { userId: '', token: '' },
  email: ''
})

// Derived phone used by Twilio (mirrors backend resolution order)
const notifPhones = ref({ sms: '', voice: '' })
const effectiveTwilioPhone = computed(() => {
  try {
    const smsPref = (notifPhones.value?.sms || '').trim()
    const voicePref = (notifPhones.value?.voice || '').trim()
    const smsInt = (integrationEndpoints.value?.sms?.phone || '').trim()
    const waInt = (integrationEndpoints.value?.whatsapp?.phone || '').trim()
    const userPhone = (authStore?.user?.phone || '').trim()
    return smsPref || voicePref || smsInt || waInt || userPhone || ''
  } catch { return '' }
})

// Google Calendar integration state and handlers
const google = reactive({ enabled: true, connected: false, status: '', accounts: [] })
const googleLoading = ref(true)
const meetingPrefs = reactive({ autoCreate: true, defaultReminderMinutes: DEFAULT_MEETING_REMINDER })
const activeGoogleAccountId = ref('')
const activeGoogleAccount = computed(() => {
  return google.accounts.find((a) => a.accountId === activeGoogleAccountId.value) || google.accounts[0] || null
})
const activeCalendars = computed(() => activeGoogleAccount.value?.calendars || [])
function buildGoogleAccountModel(acc = {}, primaryId = '') {
  const calendars = Array.isArray(acc?.calendars) ? acc.calendars.map((c) => ({ ...c })) : []
  const primaryCal = calendars.find((c) => c.primary)
  return {
    accountId: acc.accountId || acc.id || 'primary',
    accountEmail: acc.accountEmail || acc.token?.email || primaryCal?.summary || primaryCal?.id || 'Google account',
    connected: acc.connected !== false,
    calendars,
    windowDays: Number(acc?.sync?.windowDays || 30),
    status: acc?.sync?.status || acc?.status || '',
    lastRun: acc?.sync?.lastRun || acc?.lastRun || null,
    primary: !!(acc.primary || (acc.accountId && acc.accountId === primaryId)),
    loading: false,
    syncing: false,
    saving: false,
  }
}
function formatGoogleLastSync(ts) {
  if (!ts) return null
  try { return dayjs(ts).format('MMM D • hh:mm A') } catch { return ts }
}
async function connectGoogle() {
  try {
    if (!authStore.user?.uid) return
    const url = await requestGoogleConnectUrl(authStore.user.uid)
    if (!url) {
      ElMessage.error('Failed to get Google consent URL')
      return
    }
    const opened = openExternalUrl(url)
    if (!opened) {
      ElMessage.error('Unable to open Google consent right now')
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to start Google connect')
  }
}

function upsertGoogleAccount(acc) {
  if (!acc?.accountId) return
  const idx = google.accounts.findIndex((a) => a.accountId === acc.accountId)
  if (idx >= 0) google.accounts.splice(idx, 1, { ...google.accounts[idx], ...acc })
  else google.accounts.push(acc)
  google.connected = google.accounts.some((a) => a.connected)
}

function setActiveGoogleAccount(id) {
  activeGoogleAccountId.value = id
  loadGoogleCalendars(id, { suppressLoader: false })
}

async function loadGoogleCalendars(accountId, options = {}) {
  const targetId = accountId || activeGoogleAccountId.value || google.accounts[0]?.accountId
  if (!targetId || !authStore.user?.uid) return
  const suppressLoader = options?.suppressLoader === true
  const acc = google.accounts.find((a) => a.accountId === targetId)
  if (acc && !suppressLoader) acc.loading = true
  try {
    const resp = await getGoogleCalendars(authStore.user.uid, targetId)
    const calendars = Array.isArray(resp) ? resp : resp?.calendars || []
    const mergedAccount = buildGoogleAccountModel(
      {
        ...(acc || {}),
        calendars,
        accountId: resp?.accountId || targetId,
        accountEmail: resp?.accountEmail || acc?.accountEmail,
        sync: {
          ...(acc?.sync || {}),
          windowDays: Number(resp?.windowDays || acc?.windowDays || acc?.sync?.windowDays || 30),
          status: acc?.status,
          lastRun: acc?.lastRun,
        },
      },
      resp?.primaryAccountId || targetId,
    )
    upsertGoogleAccount(mergedAccount)
  } catch (e) {
    console.warn('loadGoogleCalendars failed', e?.message || e)
    if (acc) acc.status = 'error'
  } finally {
    if (acc) acc.loading = false
    if (!suppressLoader) googleLoading.value = false
  }
}

async function loadGoogle(options = {}) {
  const suppressLoader = options?.suppressLoader === true
  if (!suppressLoader) googleLoading.value = true
  try {
    if (!authStore.user?.uid) return
    let status
    try {
      status = await getGoogleStatus(authStore.user.uid)
    } catch (e) {
      google.enabled = false
      google.connected = false
      google.accounts = []
      return
    }
    const enabledFromServer = status?.integration?.enabled ?? status?.enabled
    const integration = status?.integration || status || {}
    google.enabled = enabledFromServer !== false
    const rawAccounts = Array.isArray(integration.accounts) && integration.accounts.length
      ? integration.accounts
      : [{ ...integration, accountId: integration.primaryAccountId || 'primary' }]
    google.accounts = rawAccounts.map((acc) => buildGoogleAccountModel(acc, integration.primaryAccountId))
    google.connected = google.accounts.some((a) => a.connected)
    const desiredId =
      options?.keepActive ||
      activeGoogleAccountId.value ||
      integration.primaryAccountId ||
      google.accounts[0]?.accountId ||
      ''
    if (desiredId) activeGoogleAccountId.value = desiredId
    if (google.accounts.length) {
      await loadGoogleCalendars(activeGoogleAccountId.value, { suppressLoader: true })
    }
  } catch (e) {
    console.warn('loadGoogle failed', e?.message || e)
  } finally {
    if (!suppressLoader) googleLoading.value = false
  }
}

watch(
  () => authStore.user?.uid,
  async (uid) => {
    if (!uid) {
      loadedSettingsUid.value = ''
      googleLoading.value = false
      return
    }
    if (loadedSettingsUid.value === uid && !settingsLoadInFlight.value) return
    await hydrateSettingsForUser(uid)
  },
  { immediate: true },
)

async function saveSelection() {
  try {
    if (!authStore.user?.uid || !activeGoogleAccount.value) return
    const selected = (activeCalendars.value || []).filter(c => c.selected).map(c => c.id)
    await saveGoogleCalendarSelection(authStore.user.uid, selected, activeGoogleAccount.value.windowDays, activeGoogleAccount.value.accountId)
    ElMessage.success('Google calendar selection saved')
    await loadGoogleCalendars(activeGoogleAccount.value.accountId, { suppressLoader: true })
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save selection')
  }
}

async function syncNow() {
  try {
    if (!authStore.user?.uid || !activeGoogleAccount.value) return
    const acc = activeGoogleAccount.value
    acc.syncing = true
    const result = await triggerGoogleSyncNow(authStore.user.uid, acc.accountId)
    if (result?.ok) {
      const stats = result.stats || {}
      const cleared = (stats.cancelled || 0) + (stats.deleted || 0)
      const summaryParts = []
      if (stats.created) summaryParts.push(`${stats.created} new`)
      if (stats.updated) summaryParts.push(`${stats.updated} updated`)
      if (cleared) summaryParts.push(`${cleared} cleared`)
      if (stats.skipped) summaryParts.push(`${stats.skipped} unchanged`)
      const label = summaryParts.length ? `Synced ${summaryParts.join(', ')}` : 'Calendar sync completed'
      ElMessage.success(label)
      await loadGoogle({ suppressLoader: true, keepActive: acc.accountId })
    } else {
      ElMessage.warning('Sync request not accepted')
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Sync failed')
  } finally {
    if (activeGoogleAccount.value) activeGoogleAccount.value.syncing = false
  }
}

async function disconnectGoogle(accountId = null) {
  try {
    if (!authStore.user?.uid) return
    const targetId = accountId || activeGoogleAccount.value?.accountId || null
    await disconnectGoogleIntegration(authStore.user.uid, targetId)
    ElMessage.success('Google Calendar disconnected')
    google.accounts = google.accounts.filter((a) => a.accountId !== targetId)
    google.connected = google.accounts.some((a) => a.connected)
    activeGoogleAccountId.value = google.accounts[0]?.accountId || ''
    if (activeGoogleAccountId.value) {
      await loadGoogleCalendars(activeGoogleAccountId.value, { suppressLoader: true })
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to disconnect Google Calendar')
  }
}

function handleLogout() {
  authStore.logout()
  router.push("/login")
}

function openSubscriptionPage(hash = '') {
  if (isAppleBillingSafeMode.value) {
    router.push({ path: '/billing/upgrade', query: { source: 'settings-billing' } })
    return
  }
  const targetHash = hash ? `#${hash}` : ''
  router.push({ path: '/subscription', hash: targetHash })
}

function goToTeamsPricing() {
  openSubscriptionPage('teams')
}

function handleTeamCta(plan = 'starter') {
  if (isAppleBillingSafeMode.value) {
    const workspace = activeTeamWorkspace.value
    router.push({ path: '/billing/upgrade', query: { source: 'settings-team', plan, workspaceId: workspace?.id || '' } })
    return
  }
  const isGuest = authStore.isGuest === true || authStore.guest === true || authStore.user?.mode === 'guest'
  const target = plan === 'pro' ? '/workspaces/new?plan=pro' : '/workspaces/new'
  const workspace = activeTeamWorkspace.value

  if (!authStore.user?.uid || isGuest) {
    try { localStorage.setItem('postLoginRedirect', target) } catch {}
    router.push({ path: '/signup', query: { mode: 'team', next: target } })
    return
  }

  if (!workspace) {
    router.push({ path: '/workspaces/new', query: { plan } })
    return
  }

  const currentPlan = String(workspace.plan || 'free').toLowerCase()
  const needsUpgrade =
    (plan === 'starter' && currentPlan === 'free') || (plan === 'pro' && !currentPlan.includes('pro'))

  if (needsUpgrade) {
    router.push({ path: '/billing/upgrade', query: { plan, workspaceId: workspace.id } })
    return
  }

  router.push('/workspaces')
}

function upgradePlan() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
  openSubscriptionPage() // redirect to subscription/pricing
}

async function copyBillingWebsite() {
  const copied = await copyText(billingWebHost)
  if (copied) {
    ElMessage.success(`${billingWebHost} copied`)
    return
  }
  ElMessage.info(`Visit ${billingWebHost}`)
}

// Updated saveSettings function with user feedback
async function saveSettings() {
  try {
    // Normalize phone before persisting
    try {
      if (!canUseBrowserPush.value) prefs.pwa = false
      const cc = guessCountryFromLocale()
      const rawSms = integrationEndpoints.value?.sms?.phone
      const normSms = normalizePhone(rawSms, cc)
      if (normSms) integrationEndpoints.value.sms.phone = normSms
      const rawWa = integrationEndpoints.value?.whatsapp?.phone
      const normWa = normalizePhone(rawWa, cc)
      if (normWa) integrationEndpoints.value.whatsapp.phone = normWa
    } catch {}
    const channels = []
    if (prefs.email) channels.push('email')
    if (canUseBrowserPush.value && prefs.pwa) channels.push('pwa')
    if (prefs.whatsapp) channels.push('whatsapp')
    if (prefs.sms) channels.push('sms')
  if (prefs.voice_call) channels.push('voice_call')
  const notifications = {
    email: !!prefs.email,
    push: !!(canUseBrowserPush.value && prefs.pwa),
    whatsapp: !!prefs.whatsapp,
    sms: !!prefs.sms,
    discord: !!prefs.discord,
    voice_call: !!prefs.voice_call,
    // keep legacy aggregated flag for backward-compat
    calls: !!(prefs.calls || prefs.sms || prefs.voice_call),
    channels,
  }
    const reminderDefaults = {
      enabled: channels.length > 0,
      channels,
    }
    const meetingSettingsPayload = {
      autoCreateCalendarTasks: !!meetingPrefs.autoCreate,
      defaultReminderMinutes: sanitizeReminderMinutes(meetingPrefs.defaultReminderMinutes),
    }
    const toggles = integrationOptions.reduce((acc, i) => {
      acc[i.key] = !!i.selected
      return acc
    }, {})

    await apiUpdatePrefs(authStore.user?.uid, {
      notifications,
      integrations: toggles,
      reminders: reminderDefaults,
      meetings: meetingSettingsPayload,
    })
    await updateIntegrations(authStore.user?.uid, integrationEndpoints.value)
    console.log("Settings saved:", {
      notifications,
      reminderDefaults,
      meetings: meetingSettingsPayload,
      integrationToggles: toggles,
      integrationEndpoints: integrationEndpoints.value,
    })
    syncQuickSetupFromSettings()
    ElMessage.success("✅ Settings saved successfully!")
    dirty.value = false // reset dirty flag
  } catch (error) {
    console.error("Failed to save settings:", error)
    ElMessage.error("❌ Failed to save settings. Please try again.")
  }
}

function onAvatarUpdated(url) {
  try {
    if (!url) return
    // reflect locally for instant UI update
    authStore.user = { ...(authStore.user || {}), photoURL: url, avatarUrl: url }
  } catch {}
}

async function saveProfile() {
  const u = auth.currentUser
  if (!u?.uid) return
  profileSaving.value = true
  try {
    // Normalize phone before writing
    let phoneE164 = profileForm.phone || ''
    try { phoneE164 = normalizePhone(phoneE164, guessCountryFromLocale()) } catch {}
    await updateSettingsProfile(u.uid, {
      name: profileForm.name || null,
      email: profileForm.email || null,
      phone: phoneE164 || null,
      profileComplete: !!(profileForm.name && profileForm.name.trim().length),
    })
    try { await updateFirebaseProfile(u, { displayName: profileForm.name || '' }) } catch {}
    if (profileForm.email && profileForm.email !== u.email) {
      try {
        await updateEmail(u, profileForm.email)
        emailNeedsReauth.value = false
      } catch (e) {
        const msg = String(e?.message || '')
        // Firebase error code detection across SDK versions
        if (msg.includes('requires-recent-login') || msg.includes('auth/requires-recent-login')) {
          emailNeedsReauth.value = true
        }
      }
    }
    profileComplete.value = !!(profileForm.name && profileForm.name.trim().length)
    authStore.user = {
      ...(authStore.user || {}),
      displayName: profileForm.name || authStore.user?.displayName || '',
      email: profileForm.email || authStore.user?.email || '',
      phone: phoneE164 || '',
    }
    integrationEndpoints.value.email = profileForm.email || authStore.user?.email || ''
    try { localStorage.setItem('user', JSON.stringify(authStore.user)) } catch {}
    syncQuickSetupFromSettings()
    ElMessage.success('Profile updated successfully!')
  } catch (e) {
    console.error('Failed to update profile', e)
    ElMessage.error('Failed to update profile')
  } finally {
    profileSaving.value = false
  }
}

function reauthenticate() {
  const u = auth.currentUser
  if (!u) return
  const providers = (u.providerData || []).map(p => p.providerId)
  reauthHasGoogle.value = providers.includes('google.com')
  reauthHasPhone.value = providers.includes('phone') && !!u.phoneNumber
  if (isNativePackagedApp() && reauthHasGoogle.value && !reauthHasPhone.value) {
    ElMessage.info(getNativeAuthRestriction('google'))
    return
  }
  reauthMethod.value = isNativePackagedApp()
    ? (reauthHasPhone.value ? 'phone' : '')
    : (reauthHasGoogle.value && !reauthHasPhone.value ? 'google' : (!reauthHasGoogle.value && reauthHasPhone.value ? 'phone' : ''))
  reauthStep.value = 0
  otp.value = ''
  reauthVerificationId.value = ''
  reauthOpen.value = true
}

async function startReauth() {
  const u = auth.currentUser
  if (!u || !reauthMethod.value) return
  if (reauthMethod.value === 'google') {
    return doGoogleReauth()
  }
  if (reauthMethod.value === 'phone') {
    try {
      reauthLoading.value = true
      const verifier = await ensureReauthRecaptcha(true)
      const prov = new PhoneAuthProvider(auth)
      const vid = await prov.verifyPhoneNumber(u.phoneNumber, verifier)
      reauthVerificationId.value = vid
      reauthStep.value = 1
      ElMessage.success('OTP sent')
      lastOtpSentAt = Date.now()
      startResendCooldown(getCooldownSeconds())
    } catch (e) {
      console.warn('Send OTP failed', e)
      const code = String(e?.code || e?.message || '')
      if (code.includes('too-many-requests')) {
        startResendCooldown(Math.max(getCooldownSeconds(), 60))
        ElMessage.error('Too many attempts. Please try again later.')
      } else {
        ElMessage.error('Failed to send OTP')
      }
    } finally {
      reauthLoading.value = false
    }
  }
}

async function verifyOtp() {
  const u = auth.currentUser
  if (!u || !reauthVerificationId.value || !otp.value) return
  try {
    reauthLoading.value = true
    const cred = PhoneAuthProvider.credential(reauthVerificationId.value, otp.value)
    await reauthenticateWithCredential(u, cred)
    await afterReauthEmailUpdate()
  } catch (e) {
    console.warn('Verify OTP failed', e)
    ElMessage.error('Invalid OTP. Try again.')
  } finally {
    reauthLoading.value = false
  }
}

async function resendOtp() {
  const u = auth.currentUser
  if (!u) return
  try {
    // Guard: respect cooldown and basic rate limits
    if (!canResend.value) {
      return ElMessage.warning(`Please wait ${resendCooldown.value}s before requesting a new code`)
    }
    const since = Date.now() - lastOtpSentAt
    if (since < 2000) { // prevent accidental double-clicks
      return ElMessage.warning('Please wait a moment before retrying')
    }
    reauthLoading.value = true
    const verifier = await ensureReauthRecaptcha(true)
    const prov = new PhoneAuthProvider(auth)
    const vid = await prov.verifyPhoneNumber(u.phoneNumber, verifier)
    reauthVerificationId.value = vid
    ElMessage.success('OTP resent')
    lastOtpSentAt = Date.now()
    startResendCooldown(getCooldownSeconds())
  } catch (e) {
    console.warn('Resend OTP failed', e)
    const code = String(e?.code || e?.message || '')
    if (code.includes('too-many-requests')) {
      startResendCooldown(Math.max(getCooldownSeconds(), 60))
      ElMessage.error('Too many attempts. Please try again later.')
    } else {
      ElMessage.error('Failed to resend OTP')
    }
  } finally {
    reauthLoading.value = false
  }
}

// Cooldown logic for resend
const resendCooldown = ref(0)
let resendTimer = null
const canResend = computed(() => resendCooldown.value === 0)
function clearResendCooldown() {
  if (resendTimer) {
    clearInterval(resendTimer)
    resendTimer = null
  }
  resendCooldown.value = 0
}
function startResendCooldown(seconds = 10) {
  clearResendCooldown()
  resendCooldown.value = seconds
  resendTimer = setInterval(() => {
    if (resendCooldown.value <= 1) {
      clearResendCooldown()
    } else {
      resendCooldown.value -= 1
    }
  }, 1000)
}

watch(() => reauthOpen.value, (open) => {
  if (!open) {
    clearResendCooldown()
    reauthStep.value = 0
    otp.value = ''
    reauthVerificationId.value = ''
  }
})

watch(
  () => route.query?.gpt,
  (val) => {
    if (val !== undefined && val !== null) {
      focusGptCard(false)
    }
  },
)

onBeforeUnmount(() => {
  clearResendCooldown()
  if (gptCopyTimer) {
    clearTimeout(gptCopyTimer)
    gptCopyTimer = null
  }
})

async function doGoogleReauth() {
  const u = auth.currentUser
  if (!u) return
  if (isNativePackagedApp()) {
    ElMessage.info(getNativeAuthRestriction('google'))
    return
  }
  try {
    reauthLoading.value = true
    const gp = new GoogleAuthProvider()
    await reauthenticateWithPopup(u, gp)
    await afterReauthEmailUpdate()
  } catch (e) {
    console.warn('Google reauth failed', e)
    ElMessage.error('Google re-authentication failed')
  } finally {
    reauthLoading.value = false
  }
}

async function afterReauthEmailUpdate() {
  const u = auth.currentUser
  if (!u) return
  try {
    if (profileForm.email && profileForm.email !== u.email) {
      await updateEmail(u, profileForm.email)
    }
    emailNeedsReauth.value = false
    ElMessage.success('Re-authenticated successfully!')
    reauthOpen.value = false
  } catch (e) {
    console.warn('Email update post-reauth failed', e)
    ElMessage.error('Re-auth ok, but email update failed. Try again.')
  }
}

function resetReauth() {
  reauthStep.value = 0
  otp.value = ''
  reauthVerificationId.value = ''
}

async function enablePush() {
  try {
    if (!authStore.user?.uid) throw new Error('Not signed in')
    if (!canUseBrowserPush.value) throw new Error('Browser push is only available in the web/PWA app.')
    await subscribeUserToPush(authStore.user.uid)
    ElMessage.success('🔔 Push notifications enabled')
  } catch (e) {
    console.warn('Enable push failed:', e)
    ElMessage.error(`❌ Enable push failed: ${e?.message || e}`)
  }
}

// Plan gates
// Use unified premium flag to control gates for a consistent UX
const usageToday = computed(() => accessStore.access?.today || authStore.user?.usage?.today || { aiGenerations: 0, reminders: 0 })
const aiUsed = computed(() => Number(usageToday.value.aiGenerations || 0))
const remindersUsed = computed(() => Number(usageToday.value.reminders || 0))
const aiLimitLabel = computed(() => (accessStore.access?.limits?.aiGenerations == null ? '∞' : accessStore.access?.limits?.aiGenerations ?? 10))
const remindersLimitLabel = computed(() => (accessStore.access?.limits?.remindersPerDay == null ? '∞' : accessStore.access?.limits?.remindersPerDay ?? 10))
const planOpen = ref(false)
const billingSectionIntro = computed(() =>
  isAppleBillingSafeMode.value
    ? 'Plan upgrades and workspace billing are managed on the web for the iPhone app.'
    : 'Personal plan status plus the new teams pricing for shared workspaces.',
)
const personalPlanCtaLabel = computed(() =>
  isAppleBillingSafeMode.value ? 'Learn about Premium' : '🚀 Upgrade',
)

const normalizedPlanLabel = computed(() => {
  const raw =
    accessStore.access?.effectivePlanLabel ||
    authStore.user?.plan ||
    subStore.subscription?.value?.plan ||
    subStore.subscription?.plan ||
    (isPremium.value ? 'Premium' : 'Free')
  const cleaned = String(raw || '').trim()
  if (!cleaned) return isPremium.value ? 'Premium' : 'Free'
  return cleaned
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})
const starterCtaLabel = computed(() => {
  if (!activeTeamWorkspace.value) return 'Create workspace'
  const plan = String(activeTeamWorkspace.value.plan || 'free').toLowerCase()
  if (plan === 'free') return 'Upgrade workspace'
  return 'Manage workspace'
})
const proCtaLabel = computed(() => {
  if (!activeTeamWorkspace.value) return 'Create workspace'
  const plan = String(activeTeamWorkspace.value.plan || 'free').toLowerCase()
  return plan.includes('pro') ? 'Manage workspace' : 'Upgrade to Pro'
})

// Approximate end date using remainingDays provided by subscription store
const premiumEndsOn = computed(() => {
  const days = Number(subStore.subscription?.remainingDays || 0)
  if (!days || !isPremium.value) return ''
  const dt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return dt.toLocaleDateString()
})
</script>

<style scoped>
.settings-shell {
  width: min(1200px, 100%);
  margin: 0 auto;
}

.settings-panel {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: radial-gradient(120% 120% at 10% 10%, rgba(99, 102, 241, 0.08), rgba(15, 23, 42, 0.8)), rgba(15, 23, 42, 0.6);
  border-radius: 18px;
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
}

.nav-panel {
  position: relative;
}

.nav-scroll {
  overflow-x: auto;
  margin: 0 -0.5rem;
  padding: 0 0.5rem 0.5rem;
}

.nav-scroll::-webkit-scrollbar {
  height: 6px;
}

.nav-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 9999px;
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  min-width: 100%;
}

.integration-card {
  height: 100%;
}

.profile-identity {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.32);
  border-radius: 1rem;
  padding: 1rem;
}

.profile-identity-copy {
  min-width: 0;
}

.profile-identity-copy p {
  overflow-wrap: anywhere;
}

@media (min-width: 640px) {
  .profile-identity {
    flex-direction: row;
    align-items: center;
  }

  .profile-identity-uploader {
    flex-shrink: 0;
  }
}

@media (max-width: 640px) {
  .settings-panel {
    padding: 1rem;
  }
}

section h2 {
  color: #f8fafc;
}
</style>
