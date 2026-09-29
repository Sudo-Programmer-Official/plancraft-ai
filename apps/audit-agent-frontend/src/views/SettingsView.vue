<template>
  <div class="settings-page">
    <main class="settings-shell">
      <!-- The app header already says "Settings"; this row is the only chrome. -->
      <nav class="settings-tabs" aria-label="Settings sections">
        <div class="settings-tabs__list" role="tablist">
          <button
            v-for="tab in visibleSettingsTabs"
            :key="tab.id"
            type="button"
            role="tab"
            class="settings-tabs__tab"
            :aria-selected="activeTab === tab.id"
            @click="setActiveTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
        <PcMenu :items="moreSettingsMenu" label="More settings" @select="setActiveTab" />
      </nav>

      <div class="settings-sections">

        <div v-if="activeTab === 'workspace-knowledge'">
          <KnowledgePanel />
        </div>

        <div v-if="activeTab === 'workspace-proposals'">
          <ProposalInbox />
        </div>

        <!-- Plan status and usage -->
        <section v-if="activeTab === 'billing-subscription'" class="settings-panel space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="settings-panel__title">Subscription &amp; usage</h2>
              <p class="text-sm text-indigo-200">
                {{ billingSectionIntro }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-300/40 text-indigo-50 text-sm"
              >
                <span class="text-[11px] uppercase tracking-[0.18em] text-indigo-100/80">Plan</span>
                <strong class="text-white">{{ normalizedPlanLabel }}</strong>
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[1.05fr,1fr] gap-4">
            <div
              class="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 space-y-4 shadow-lg"
            >
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-indigo-200 font-semibold">Personal plan</p>
                  <p class="text-xs text-slate-300">
                    Daily AI limit {{ aiLimitLabel }}, reminders {{ remindersLimitLabel }} / day.
                  </p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    v-if="!isPremium && !isAppleBillingSafeMode"
                    @click="upgradePlan"
                    class="bg-[image:var(--pc-accent-fill)] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-white shadow-sm hover:bg-[image:var(--pc-accent-fill-hover)] transition text-sm sm:text-base"
                  >
                    {{ personalPlanCtaLabel }}
                  </button>
                  <el-button
                    v-if="!isAppleBillingSafeMode"
                    size="small"
                    plain
                    @click="openSubscriptionPage"
                    >Manage in billing</el-button
                  >
                  <el-button v-else size="small" plain @click="refreshBillingAccess"
                    >Refresh access</el-button
                  >
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-lg bg-slate-800/70 border border-white/10 p-3">
                  <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-200 mb-1">
                    AI generations
                  </p>
                  <p class="text-2xl font-semibold text-white">
                    {{ aiUsed }}
                    <span class="text-sm text-slate-300">/ {{ aiLimitLabel }}</span>
                  </p>
                </div>
                <div class="rounded-lg bg-slate-800/70 border border-white/10 p-3">
                  <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-200 mb-1">
                    Reminders
                  </p>
                  <p class="text-2xl font-semibold text-white">
                    {{ remindersUsed }}
                    <span class="text-sm text-slate-300">/ {{ remindersLimitLabel }}</span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <el-button size="small" @click="planOpen = true">Usage breakdown</el-button>
                <p
                  v-if="isPremium && subStore.subscription?.remainingDays > 0"
                  class="text-xs text-indigo-300"
                >
                  ⏳ Ends on {{ premiumEndsOn }}
                </p>
                <p v-if="isAppleBillingSafeMode" class="text-xs text-indigo-200/80">
                  Solo Premium is available in the iPhone app. Existing premium access also syncs
                  here automatically.
                </p>
              </div>
            </div>

            <div
              v-if="isAppleBillingSafeMode"
              class="rounded-2xl border border-indigo-400/30 bg-indigo-900/60 p-4 sm:p-5 space-y-4 shadow-lg"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.25em] text-indigo-200">
                    Workspace upgrades
                  </p>
                  <h3 class="text-xl font-semibold text-white">Team access syncs into the app</h3>
                  <p class="text-sm text-indigo-100/90">
                    Team plans are managed by workspace owners on web. If this account already
                    belongs to a paid workspace, refresh and the access will appear here.
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
                  @click="refreshBillingAccess"
                >
                  Refresh access
                </button>
              </div>
            </div>
            <div
              v-else
              class="rounded-2xl border border-pc-border bg-pc-surface-2 p-4 sm:p-5 space-y-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.25em] text-indigo-200">Teams pricing</p>
                  <h3 class="text-xl font-semibold text-white">Seat-based workspaces</h3>
                  <p class="text-sm text-indigo-100/90">
                    Starter from $6/seat · Pro from $10/seat. Roles, invites, and Voice AI
                    reminders.
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
                    <span class="text-[11px] px-2 py-1 rounded-full bg-white/10 text-indigo-100"
                      >Launch teams</span
                    >
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
                <div
                  class="rounded-xl border border-pc-accent bg-pc-accent-soft p-3 space-y-2 shadow-sm"
                >
                  <div class="flex items-center justify-between">
                    <h4 class="text-lg font-semibold text-white">Team Pro</h4>
                    <span
                      class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-300/50 text-indigo-100"
                    >
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

              <p class="text-xs text-indigo-100/80">
                Seats = teammates you invite. Billing adjusts automatically when seats change.
              </p>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'account-quick-setup'" class="settings-panel space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <p class="text-xs uppercase tracking-[0.25em] text-indigo-200/80">Setup Assistant</p>
              <h2 class="settings-panel__title">Quick Setup</h2>
              <p class="text-sm text-indigo-100/85 max-w-2xl">
                Reopen the onboarding assistant any time to finish reminder channels, timezone, and
                phone setup.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-[image:var(--pc-accent-fill)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[image:var(--pc-accent-fill-hover)]"
              @click="openQuickSetupPanel"
            >
              <span>{{ quickSetupState?.completed ? 'Review setup' : 'Finish setup' }}</span>
            </button>
          </div>

          <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-slate-300">Progress</p>
                <p class="text-sm text-slate-100">
                  {{ quickSetupState?.completedSteps || 0 }}/{{ quickSetupState?.totalSteps || 0 }}
                  setup items complete
                </p>
              </div>
              <span
                class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                :class="
                  quickSetupState?.requiredComplete
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                "
              >
                {{ quickSetupState?.requiredComplete ? 'Core setup complete' : 'Setup incomplete' }}
              </span>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-pc-surface-2">
              <div
                class="h-full rounded-full bg-[image:var(--pc-accent-fill)] transition-all"
                :style="{ width: `${quickSetupState?.completionPercent || 0}%` }"
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="step in quickSetupState?.steps || []"
                :key="step.key"
                class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                :class="
                  step.complete
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-slate-300'
                "
              >
                <span>{{ step.complete ? '✓' : '•' }}</span>
                <span>{{ step.label }}</span>
              </span>
            </div>

            <p
              v-if="quickSetupMissingLabels.length"
              class="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              Finish setup to unlock calmer reminders: {{ quickSetupMissingLabels.join(', ') }}.
            </p>
            <p
              v-else
              class="rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-3 text-sm text-pc-success"
            >
              Quick Setup is complete. You can reopen it any time to review or change your setup.
            </p>
          </div>
        </section>

        <!-- Notification Preferences -->
        <section
          v-if="activeTab === 'account-notifications'"
          ref="notificationsSection"
          :class="[
            'settings-panel settings-panel--notifications',
            isMobileSettingsView ? 'pb-24' : '',
            highlightNotifications
              ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent'
              : '',
          ]"
        >
          <h2 class="settings-panel__title">Notifications</h2>
          <p class="text-sm text-indigo-200 mb-3">Choose how you’d like to be reminded.</p>

          <div class="space-y-2.5">
            <label class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="prefs.email"
                class="accent-indigo-500"
                @change="dirty = true"
              />
              <span>Email Notifications</span>
            </label>
            <label
              class="flex items-center gap-3"
              v-if="canUseBrowserPush || isNativePackagedApp()"
            >
              <input
                type="checkbox"
                v-model="prefs.pwa"
                class="accent-indigo-500"
                @change="dirty = true"
              />
              <span>{{ notificationChannelLabel }}</span>
            </label>
            <div
              v-if="prefs.pwa && (canUseBrowserPush || isNativePackagedApp())"
              class="pl-7 mt-2 space-y-2"
            >
              <el-button size="small" @click="enablePush" class="bg-slate-800 hover:bg-slate-700">
                {{ notificationEnableLabel }}
              </el-button>
              <p class="text-xs text-slate-400">
                {{ notificationEnableHelp }}
              </p>
            </div>
            <div class="space-y-2 rounded-2xl border border-white/10 bg-slate-950/30 p-3.5">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-white">Notification sound</label>
                <p class="text-xs text-slate-400">{{ notificationSoundHelp }}</p>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  v-model="prefs.sound"
                  class="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
                  @change="dirty = true"
                >
                  <option
                    v-for="option in NOTIFICATION_SOUND_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <el-button
                  size="small"
                  :loading="soundPreviewing"
                  class="shrink-0 bg-slate-800 hover:bg-slate-700"
                  @click="previewNotificationSound"
                >
                  Preview
                </el-button>
              </div>
            </div>
            <label class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="prefs.whatsapp"
                class="accent-indigo-500"
                @change="dirty = true"
              />
              <span>WhatsApp Alerts</span>
            </label>
            <label class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="prefs.sms"
                class="accent-indigo-500"
                @change="dirty = true"
              />
              <span>SMS</span>
            </label>
            <label class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="prefs.voice_call"
                class="accent-indigo-500"
                @change="dirty = true"
              />
              <span>Voice Call</span>
            </label>
            <label class="flex items-center gap-3">
              <input type="checkbox" v-model="prefs.discord" class="accent-indigo-500" disabled />
              <span>Discord Channel (coming soon)</span>
            </label>
          </div>

          <div
            class="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-3.5"
          >
            <div class="space-y-1">
              <p class="text-sm font-medium text-white">Notification debug</p>
              <p class="text-xs text-slate-400">
                Inspect permission, token, and delivery tests on this device.
              </p>
            </div>
            <RouterLink
              to="/notification-debug"
              class="inline-flex items-center rounded-lg border border-white/15 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-100 hover:border-indigo-300/40"
            >
              Open debug screen
            </RouterLink>
          </div>

          <div class="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-3.5 sm:p-5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-2">
                <h3 class="text-base font-semibold text-white">Action Inbox Nudges</h3>
                <p class="text-sm text-slate-300">
                  Keep the inbox as the primary surface, then escalate only when resurfaced
                  suggestions become time-sensitive.
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center rounded-lg border border-white/15 bg-slate-900/50 px-3 py-1 text-xs text-slate-200 hover:border-indigo-300/40"
                  @click="showNotificationAdvanced = !showNotificationAdvanced"
                >
                  {{ showNotificationAdvanced ? 'Hide advanced' : 'Show advanced' }}
                </button>
                <label class="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    v-model="actionInboxNudges.enabled"
                    class="accent-indigo-500"
                    @change="dirty = true"
                  />
                  <span>Allow external nudges</span>
                </label>
              </div>
            </div>

            <div
              v-if="actionInboxNudges.enabled && showNotificationAdvanced"
              class="mt-4 grid gap-4 lg:grid-cols-2"
            >
              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-200">Escalation level</label>
                <select
                  v-model="actionInboxNudges.urgency"
                  class="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                  @change="dirty = true"
                >
                  <option value="important">Important only</option>
                  <option value="urgent_only">Urgent only</option>
                </select>
                <p class="text-xs text-slate-400">
                  Important includes two-day heads-ups. Urgent waits until the same day or the final
                  two-hour window.
                </p>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-200"
                  >Max nudges per suggestion</label
                >
                <select
                  v-model="actionInboxNudges.maxPerSuggestion"
                  class="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                  @change="dirty = true"
                >
                  <option :value="1">1 nudge</option>
                  <option :value="2">2 nudges</option>
                  <option :value="3">3 nudges</option>
                </select>
                <p class="text-xs text-slate-400">
                  Caps repeat follow-up for the same suggestion so the engine stays useful instead
                  of noisy.
                </p>
              </div>
            </div>

            <div
              v-if="actionInboxNudges.enabled && showNotificationAdvanced"
              class="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="space-y-1">
                  <p class="text-sm font-medium text-slate-100">Daily inbox digest</p>
                  <p class="text-xs text-slate-400">
                    Send one summary of pending inbox items after the morning window so forgotten
                    actions do not disappear.
                  </p>
                </div>
                <label class="inline-flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    v-model="actionInboxNudges.dailyDigest"
                    class="accent-indigo-500"
                    @change="dirty = true"
                  />
                  <span>Send daily digest</span>
                </label>
              </div>

              <div v-if="actionInboxNudges.dailyDigest" class="mt-4 space-y-3">
                <div>
                  <p class="text-sm font-medium text-slate-200">Digest channels</p>
                  <p class="text-xs text-slate-400">
                    Uses the same channels selected below for escalation, so you only configure this
                    once.
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <el-button
                    size="small"
                    plain
                    :loading="actionInboxDigestSending"
                    :disabled="!workspaceStore.activeWorkspaceId"
                    @click="sendTestActionInboxDigest"
                  >
                    Send test digest
                  </el-button>
                  <p class="text-xs text-slate-400">
                    Sends a real digest through the selected channels for the active workspace.
                  </p>
                </div>
              </div>
            </div>

            <div
              v-if="actionInboxNudges.enabled && showNotificationAdvanced"
              class="mt-4 space-y-3"
            >
              <div>
                <p class="text-sm font-medium text-slate-200">Escalation channels</p>
                <p class="text-xs text-slate-400">
                  These respect the main notification toggles above. If a channel is off there, it
                  stays unavailable here too.
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-3">
                <label
                  v-for="option in availableActionInboxNudgeChannels"
                  :key="option.value"
                  class="rounded-xl border px-3 py-3 transition"
                  :class="
                    option.enabled
                      ? 'border-white/10 bg-white/5 text-slate-100'
                      : 'border-white/5 bg-white/[0.03] text-slate-500'
                  "
                >
                  <span class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      v-model="actionInboxNudges.channels"
                      :value="option.value"
                      class="mt-0.5 accent-indigo-500"
                      :disabled="!option.enabled"
                      @change="dirty = true"
                    />
                    <span class="space-y-1">
                      <span class="block text-sm font-medium">{{ option.label }}</span>
                      <span class="block text-xs">
                        {{
                          option.enabled
                            ? 'Available for inbox escalation.'
                            : 'Enable this channel above first.'
                        }}
                      </span>
                    </span>
                  </span>
                </label>
              </div>
              <p
                v-if="!availableActionInboxNudgeChannels.some((option) => option.enabled)"
                class="text-xs text-amber-300"
              >
                No eligible delivery channel is enabled right now. Suggestions will still resurface
                inside the inbox, but external nudges will stay off until you enable email, push, or
                WhatsApp.
              </p>
            </div>
          </div>

          <!-- Delivery endpoints -->
          <div v-if="prefs.whatsapp" class="mt-4">
            <label class="block text-sm text-slate-300 mb-1">WhatsApp Phone Number</label>
            <el-input
              v-model="integrationEndpoints.whatsapp.phone"
              placeholder="+1 234 567 8901"
              clearable
              class="w-full"
              @input="dirty = true"
            />
            <small class="text-slate-400">Format: +12135551234 (E.164)</small>
          </div>

          <div v-if="prefs.sms || prefs.voice_call" class="mt-4">
            <label class="block text-sm text-slate-300 mb-1">Phone Number (for SMS)</label>
            <el-input
              v-model="integrationEndpoints.sms.phone"
              placeholder="+1 234 567 8901"
              clearable
              class="w-full"
              @input="dirty = true"
            />
            <p v-if="effectiveTwilioPhone" class="text-xs text-slate-400 mt-1">
              💬 SMS and voice calls will be sent to {{ effectiveTwilioPhone }}.
              <span class="text-slate-400"
                >You can update this under <strong>Integrations → Phone</strong>.</span
              >
            </p>
          </div>

          <div
            v-if="prefs.voice_call"
            class="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-3.5 sm:p-5 space-y-3"
          >
            <h3 class="text-base font-semibold text-white">Morning Call Settings</h3>
            <label class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="morningCoach.enabled"
                class="accent-indigo-500"
                @change="dirty = true"
              />
              <span>Enable morning coach call</span>
            </label>
            <div class="space-y-1">
              <label class="block text-sm text-slate-300">First call time</label>
              <input
                v-model="morningCoach.firstCallTime"
                type="time"
                class="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                @input="dirty = true"
              />
            </div>
            <div class="space-y-1">
              <label class="block text-sm text-slate-300">Morning message text</label>
              <textarea
                v-model="morningCoach.customMessage"
                rows="3"
                maxlength="600"
                class="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
                placeholder="Good morning. Start with one meaningful win today."
                @input="dirty = true"
              />
            </div>
            <div class="flex items-center gap-3">
              <el-button
                size="small"
                plain
                :loading="morningCallTesting"
                @click="sendTestMorningCallNow"
              >
                Send test call
              </el-button>
              <p class="text-xs text-slate-400">
                Calls your configured phone with this exact message text.
              </p>
            </div>
          </div>

          <div v-if="prefs.discord" class="mt-4">
            <label class="block text-sm text-slate-300 mb-1">Discord Webhook URL</label>
            <el-input
              v-model="integrationEndpoints.discord.webhook"
              placeholder="https://discord.com/api/webhooks/..."
              clearable
              class="w-full"
              @input="dirty = true"
            />
          </div>

          <div class="mt-5 text-center" v-if="dirty">
            <p class="text-sm text-yellow-300 mb-2">⚠️ You have unsaved changes.</p>
            <el-button
              type="primary"
              @click="saveSettings"
              class="bg-gradient-to-r from-indigo-600 to-purple-600"
              >💾 Save Settings</el-button
            >
          </div>
        </section>

        <!-- The panel has its own title and description; no wrapper needed. -->
        <SocialIntegrationPanel v-if="activeTab === 'account-social'" />

        <!-- Integrations -->
        <section v-if="activeTab === 'workspace-integrations'" class="settings-panel">
          <h2 class="settings-panel__title">Integrations</h2>
          <p class="text-sm text-indigo-200 mb-4">
            Connect your favorite platforms to sync tasks and reminders.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <button
              v-for="i in integrationOptions"
              :key="i.key"
              @click="
                () => {
                  i.selected = !i.selected
                  dirty = true
                }
              "
              :class="[
                'flex flex-col items-center justify-center p-4 rounded-lg transition',
                i.selected
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-900/50 hover:bg-slate-800',
              ]"
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
                highlightGpt ? 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/20' : '',
              ]"
            >
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <div class="font-semibold flex items-center gap-2">
                    🤖 PlanCraft GPT
                    <span
                      class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-100 uppercase tracking-wide"
                      >Beta</span
                    >
                  </div>
                  <p class="text-xs text-slate-300 mt-1">
                    Generate a short-lived link code and paste it inside ChatGPT to connect the
                    PlanCraft GPT Actions.
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
                    {{
                      gptLink.loading
                        ? 'Generating…'
                        : gptLink.code
                          ? 'Refresh Code'
                          : 'Generate Code'
                    }}
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
              <div
                v-if="gptLink.code"
                class="rounded-lg border border-indigo-500/30 bg-slate-950/50 p-4 space-y-3"
              >
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-[0.2em]">Link Code</p>
                  <p class="text-3xl font-mono tracking-[0.25em] text-white break-all">
                    {{ gptLink.code }}
                  </p>
                </div>
                <ul class="list-decimal list-inside text-xs text-slate-300 space-y-1">
                  <li>Open ChatGPT and launch the PlanCraft AI GPT.</li>
                  <li>Say “Link my account” and paste this code when prompted.</li>
                  <li>Approve the connection to sync tasks, reminders, and journal entries.</li>
                </ul>
                <a
                  :href="gptHelpUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="text-indigo-300 text-xs inline-flex items-center gap-1 hover:text-indigo-200"
                >
                  Need help? <span aria-hidden="true">↗</span>
                </a>
              </div>
              <p v-else class="text-xs text-slate-400">
                Codes expire after a few minutes. Generate a fresh one whenever you want to connect
                ChatGPT.
              </p>
              <p v-if="gptLink.error" class="text-xs text-red-300">⚠️ {{ gptLink.error }}</p>
            </div>

            <!-- Google Calendar Card -->
            <div
              class="integration-card rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-3"
            >
              <div v-if="googleLoading" class="space-y-4 animate-pulse">
                <div class="h-5 w-40 bg-slate-800/60 rounded"></div>
                <div class="h-4 w-3/4 bg-slate-800/40 rounded"></div>
                <div class="h-10 bg-slate-800/50 rounded"></div>
              </div>
              <template v-else>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div class="font-semibold flex items-center gap-2">
                      📆 Google Calendar
                      <span
                        v-if="google.enabled"
                        :class="[
                          'text-xs px-2 py-0.5 rounded',
                          google.connected
                            ? 'bg-emerald-700/50 text-emerald-200'
                            : 'bg-yellow-700/40 text-yellow-200',
                        ]"
                      >
                        {{
                          google.connected
                            ? `${google.accounts.length} account${google.accounts.length > 1 ? 's' : ''} connected`
                            : 'Not Connected'
                        }}
                      </span>
                      <span
                        v-else
                        class="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300"
                        >Disabled by server</span
                      >
                    </div>
                    <p class="text-xs text-slate-300 mt-1">
                      Import meetings and show Join links in your tasks.
                      <span v-if="activeGoogleAccount?.lastRun"
                        >Last sync: {{ formatGoogleLastSync(activeGoogleAccount.lastRun) }}</span
                      >
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

                <div
                  v-if="google.connected && google.accounts.length"
                  class="mt-3 flex items-center gap-3 flex-wrap"
                >
                  <label class="text-sm text-slate-300">Active account:</label>
                  <select
                    :value="activeGoogleAccountId"
                    @change="(e) => setActiveGoogleAccount(e.target.value)"
                    class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <option
                      v-for="acc in google.accounts"
                      :key="acc.accountId"
                      :value="acc.accountId"
                    >
                      {{ acc.accountEmail || acc.accountId }} {{ acc.primary ? '(primary)' : '' }}
                    </option>
                  </select>
                  <span v-if="activeGoogleAccount?.status" class="text-xs text-slate-400"
                    >Status: {{ activeGoogleAccount.status }}</span
                  >
                  <span v-if="activeGoogleAccount?.lastRun" class="text-xs text-slate-400"
                    >Last sync: {{ formatGoogleLastSync(activeGoogleAccount.lastRun) }}</span
                  >
                </div>

                <!-- Calendars selection -->
                <div
                  v-if="google.connected && activeGoogleAccount"
                  class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <label
                    v-for="cal in activeCalendars"
                    :key="cal.id"
                    class="flex items-center gap-2 bg-slate-800/40 border border-slate-700/40 rounded p-2"
                  >
                    <input type="checkbox" v-model="cal.selected" class="accent-indigo-500" />
                    <div class="flex-1">
                      <div class="text-sm">{{ cal.summary || cal.id }}</div>
                      <div class="text-xs text-slate-400">{{ cal.timeZone || '—' }}</div>
                    </div>
                    <span
                      v-if="cal.primary"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700/50"
                      >primary</span
                    >
                  </label>
                </div>

                <!-- Window + save -->
                <div
                  v-if="google.connected && activeGoogleAccount"
                  class="mt-3 flex items-center gap-3 flex-wrap"
                >
                  <label class="text-sm text-slate-300">Look-ahead window:</label>
                  <select
                    v-model.number="activeGoogleAccount.windowDays"
                    class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <option :value="7">7 days</option>
                    <option :value="14">14 days</option>
                    <option :value="30">30 days</option>
                    <option :value="60">60 days</option>
                  </select>
                  <button
                    @click="saveSelection"
                    class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                  >
                    Save Selection
                  </button>
                  <span v-if="activeGoogleAccount.status" class="text-xs text-slate-400"
                    >Status: {{ activeGoogleAccount.status }}</span
                  >
                </div>

                <div v-if="google.enabled" class="pt-3 border-t border-white/5 space-y-3">
                  <label class="flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      v-model="meetingPrefs.autoCreate"
                      @change="markDirty"
                      class="accent-indigo-500"
                    />
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
                    <span class="text-xs text-slate-400"
                      >Adjust reminder lead time for meetings.</span
                    >
                  </div>
                </div>
              </template>
            </div>
          </div>
        </section>

        <!-- Profile: the only primary action on this tab is Save changes. -->
        <section v-if="activeTab === 'account-profile'" class="settings-panel" aria-labelledby="settings-profile-title">
          <h2 id="settings-profile-title" class="settings-panel__title">Profile</h2>
          <div class="profile-identity">
            <AvatarUploader
              :url="authStore.user?.photoURL || authStore.user?.avatarUrl"
              :name="profileForm.name || authStore.user?.displayName || authStore.user?.name"
              :email="profileForm.email || authStore.user?.email"
              class="profile-identity-uploader"
              @updated="onAvatarUpdated"
            />
            <div class="profile-identity-copy">
              <p class="profile-identity-copy__name">
                {{ profileForm.name || authStore.user?.displayName || 'PlanCraft user' }}
              </p>
              <p class="profile-identity-copy__email">{{ profileForm.email || authStore.user?.email }}</p>
            </div>
          </div>

          <p v-if="!profileComplete" class="settings-note">Add your name so PlanCraft can personalize your plans.</p>

          <div class="profile-fields">
            <label class="settings-field">
              <span>Name</span>
              <el-input v-model="profileForm.name" placeholder="Your name" autocomplete="name" clearable />
            </label>
            <label class="settings-field">
              <span>Email</span>
              <el-input v-model="profileForm.email" placeholder="you@example.com" type="email" autocomplete="email" clearable />
            </label>
            <label class="settings-field">
              <span>Phone <small>(optional)</small></span>
              <el-input v-model="profileForm.phone" placeholder="+1 650 555 1234" type="tel" autocomplete="tel" clearable />
            </label>
          </div>

          <section class="timezone-settings" aria-labelledby="settings-timezone-title">
            <div class="timezone-settings__header">
              <div>
                <p class="timezone-settings__eyebrow">Time &amp; travel</p>
                <h3 id="settings-timezone-title" class="timezone-settings__title">
                  Keep reminders local while you travel
                </h3>
                <p class="timezone-settings__copy">
                  Automatic follows this device’s current timezone. Existing reminders keep the
                  timezone they were created in.
                </p>
              </div>
              <span class="timezone-settings__status">
                {{ profileTimezoneMode === TIMEZONE_MODES.AUTO ? 'Automatic' : 'Manual' }}
              </span>
            </div>

            <div class="timezone-settings__modes" role="group" aria-label="Timezone behavior">
              <button
                type="button"
                class="timezone-settings__mode"
                :class="{ 'timezone-settings__mode--active': profileTimezoneMode === TIMEZONE_MODES.AUTO }"
                @click="useAutomaticTimezone"
              >
                <span>Use device timezone</span>
                <small>Best for travel</small>
              </button>
              <button
                type="button"
                class="timezone-settings__mode"
                :class="{ 'timezone-settings__mode--active': profileTimezoneMode === TIMEZONE_MODES.MANUAL }"
                @click="useManualTimezone"
              >
                <span>Choose a timezone</span>
                <small>Keep one home zone</small>
              </button>
            </div>

            <div v-if="profileTimezoneMode === TIMEZONE_MODES.AUTO" class="timezone-settings__current">
              <div>
                <span class="timezone-settings__label">Current device timezone</span>
                <strong>{{ detectedTimezoneLabel }}</strong>
              </div>
              <span class="timezone-settings__clock">{{ timezoneClockLabel(detectedTimezone, timezoneNow) }}</span>
            </div>

            <label v-else class="settings-field timezone-settings__select-field">
              <span>Home timezone</span>
              <select v-model="profileTimezone" class="timezone-settings__select" @change="dirty = true">
                <option v-for="timezone in timezoneOptions" :key="timezone" :value="timezone">
                  {{ timezoneOptionLabel(timezone, timezoneNow) }}
                </option>
              </select>
              <small>New reminders and planning requests will use this zone.</small>
            </label>

            <p v-if="deviceTimezoneChanged" class="timezone-settings__travel-note">
              Your device is currently in {{ detectedTimezoneLabel }}, but reminders are still using
              your selected home timezone.
            </p>
            <p class="timezone-settings__preview">
              Planning now in <strong>{{ activeProfileTimezoneLabel }}</strong> · {{ activeProfileTimezoneClock }}
            </p>
          </section>

          <div v-if="emailNeedsReauth" class="settings-note settings-note--warning">
            <span>Changing your email needs a recent sign-in.</span>
            <PcButton size="sm" @click="reauthenticate">Sign in again</PcButton>
          </div>

          <div class="settings-actions">
            <PcButton variant="primary" :loading="profileSaving" @click="saveProfile">Save changes</PcButton>
          </div>
        </section>

        <AppLockSettings v-if="activeTab === 'account-profile'" />

        <!-- Account: links and sign-out as a quiet list. -->
        <section v-if="activeTab === 'account-profile'" class="settings-panel" aria-labelledby="settings-account-title">
          <h2 id="settings-account-title" class="settings-panel__title">Account</h2>
          <div class="settings-list">
            <RouterLink to="/help" class="settings-row">
              <CircleHelp :size="18" aria-hidden="true" />
              <span>Help &amp; feedback</span>
              <ChevronRight :size="16" class="settings-row__chevron" aria-hidden="true" />
            </RouterLink>
            <button type="button" class="settings-row" @click="openLegalDoc('/terms')">
              <FileText :size="18" aria-hidden="true" />
              <span>Terms of use</span>
              <ChevronRight :size="16" class="settings-row__chevron" aria-hidden="true" />
            </button>
            <button type="button" class="settings-row" @click="openLegalDoc('/privacy')">
              <ShieldCheck :size="18" aria-hidden="true" />
              <span>Privacy policy</span>
              <ChevronRight :size="16" class="settings-row__chevron" aria-hidden="true" />
            </button>
            <button type="button" class="settings-row" @click="openLegalDoc('/delete-account')">
              <FileX :size="18" aria-hidden="true" />
              <span>Data deletion policy</span>
              <ChevronRight :size="16" class="settings-row__chevron" aria-hidden="true" />
            </button>
            <button type="button" class="settings-row" @click="handleLogout">
              <LogOut :size="18" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </section>

        <!-- Destructive action last, visually quiet until needed. -->
        <section v-if="activeTab === 'account-profile'" class="settings-panel settings-panel--danger" aria-labelledby="settings-delete-title">
          <h2 id="settings-delete-title" class="settings-panel__title">Delete account</h2>
          <p class="settings-panel__text">
            Permanently deletes your account, tasks, reminders, journal entries and connected integrations,
            and removes you from shared workspaces. This can’t be undone.
          </p>
          <div class="settings-actions settings-actions--start">
            <PcButton variant="danger" :disabled="deleteAccountLoading" @click="deleteAccountConfirmOpen = true">
              Delete account
            </PcButton>
          </div>
        </section>
      </div>
    </main>
  </div>
  <PlanSummaryModal :open="planOpen" @close="planOpen = false" />
  <div
    v-if="activeTab === 'account-notifications' && isMobileSettingsView && dirty"
    class="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur"
  >
    <el-button
      type="primary"
      @click="saveSettings"
      class="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
    >
      💾 Save Settings
    </el-button>
  </div>
  <!-- Re-auth dialog -->
  <el-dialog v-model="reauthOpen" title="Re-authenticate" width="420px" :append-to-body="true">
    <div v-if="reauthStep === 0" class="space-y-3">
      <p class="text-sm text-slate-300">Choose a method to verify your identity.</p>
      <el-radio-group v-model="reauthMethod" class="flex flex-col gap-2">
        <el-radio v-if="reauthHasGoogle && !isNativePackagedApp()" label="google"
          >Google Popup</el-radio
        >
        <el-radio v-if="reauthHasPhone" label="phone">Phone ({{ maskedPhone }})</el-radio>
      </el-radio-group>
      <div class="flex justify-end gap-2 pt-2">
        <el-button @click="reauthOpen = false">Cancel</el-button>
        <el-button type="primary" :disabled="!reauthMethod" @click="startReauth"
          >Continue</el-button
        >
      </div>
    </div>
    <div v-else-if="reauthMethod === 'phone'" class="space-y-3">
      <p class="text-sm text-slate-300">Enter the 6-digit code sent to {{ maskedPhone }}.</p>
      <el-input v-model="otp" placeholder="OTP code" maxlength="6" />
      <div class="text-xs text-slate-400 flex items-center justify-between">
        <span>Didn't receive the code?</span>
        <div class="flex items-center gap-1">
          <el-tooltip
            effect="dark"
            placement="top"
            :content="`You can request a new code every ${cooldownDefault}s. Multiple attempts may trigger a longer wait.`"
          >
            <span
              class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-600/40 text-slate-200 cursor-help"
              >i</span
            >
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
          <el-button @click="reauthOpen = false">Cancel</el-button>
          <el-button type="primary" :loading="reauthLoading" @click="verifyOtp">Verify</el-button>
        </div>
      </div>
    </div>
    <div v-else-if="reauthMethod === 'google'" class="space-y-3">
      <p class="text-sm text-slate-300">We’ll open a Google sign-in popup to verify.</p>
      <div class="flex justify-between items-center">
        <el-button link type="primary" @click="resetReauth">Use different method</el-button>
        <div class="flex gap-2">
          <el-button @click="reauthOpen = false">Cancel</el-button>
          <el-button type="primary" :loading="reauthLoading" @click="doGoogleReauth"
            >Continue</el-button
          >
        </div>
      </div>
    </div>
  </el-dialog>
  <el-dialog
    v-model="deleteAccountConfirmOpen"
    title="Delete account"
    width="460px"
    :append-to-body="true"
    :close-on-click-modal="!deleteAccountLoading"
    :close-on-press-escape="!deleteAccountLoading"
  >
    <div class="space-y-4">
      <p class="text-sm text-slate-700">
        Are you sure? This permanently deletes your account and signs you out of PlanCraft AI.
      </p>
      <div
        class="rounded-xl border border-red-300/40 bg-red-50 px-4 py-3 text-sm text-red-900 space-y-1"
      >
        <p>This will permanently delete:</p>
        <p>- Your account data</p>
        <p>- Your tasks, reminders, and journal entries</p>
        <p>- Your connected integrations and synced access</p>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <el-button :disabled="deleteAccountLoading" @click="deleteAccountConfirmOpen = false"
          >Cancel</el-button
        >
        <el-button type="danger" :loading="deleteAccountLoading" @click="confirmDeleteAccount"
          >Delete</el-button
        >
      </div>
    </div>
  </el-dialog>
  <el-dialog
    v-model="deleteAccountSuccessOpen"
    title="Account deleted"
    width="420px"
    :append-to-body="true"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="space-y-4">
      <p class="text-sm text-slate-700">Your account has been deleted.</p>
      <p class="text-sm text-slate-500">You are being signed out now.</p>
      <div class="flex justify-end">
        <el-button type="primary" @click="finalizeDeletedAccount">Continue</el-button>
      </div>
    </div>
  </el-dialog>
  <!-- Hidden container for re-auth phone reCAPTCHA -->
  <div
    id="reauth-recaptcha"
    style="
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    "
  />
</template>
<script setup>
import { reactive, ref, onMounted, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { normalizePhone, guessCountryFromLocale } from '@/utils/phoneUtils'
import {
  getGoogleStatus,
  getGoogleCalendars,
  saveGoogleCalendarSelection,
  triggerGoogleSyncNow,
  requestGoogleConnectUrl,
  disconnectGoogleIntegration,
} from '@/stores/integrationsStore'
import {
  getPreferences as apiGetPrefs,
  updatePreferences as apiUpdatePrefs,
  getIntegrations,
  updateIntegrations,
  getProfile as getSettingsProfile,
  updateProfile as updateSettingsProfile,
  sendTestMorningCall as apiSendTestMorningCall,
} from '@/services/settingsService'
import { sendActionInboxDigest } from '@/services/actionInboxService'
import { createGptLinkCode } from '@/services/gptService'
import SocialIntegrationPanel from '@/components/settings/SocialIntegrationPanel.vue'
import AppLockSettings from '@/components/settings/AppLockSettings.vue'
import { subscribeUserToPush } from '@/services/pwaService'
import {
  getNativeReminderPermissionStatus,
  requestNativeReminderPermissions,
  syncNativeReminderQueueNow,
} from '@/services/nativeReminderService'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { resolvePlanKey } from '@/services/planService'
import PlanSummaryModal from '@/components/PlanSummaryModal.vue'
import KnowledgePanel from '@/components/KnowledgePanel.vue'
import ProposalInbox from '@/components/ProposalInbox.vue'
import { useIsPremium } from '@/composables/useIsPremium'
import {
  trackCalendarConnected,
  trackCalendarConnectStarted,
  trackFirstReminderChannelSaved,
} from '@/services/analytics'
import { trackLinkedInConversion } from '@/utils/ads'
import {
  getAuth,
  updateProfile as updateFirebaseProfile,
  updateEmail,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  RecaptchaVerifier,
  PhoneAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth'
import AvatarUploader from '@/components/AvatarUploader.vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { getNativeAuthRestriction, isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { copyText, openExternalUrl } from '@/utils/nativeUi'
import {
  NOTIFICATION_SOUND_OPTIONS,
  normalizeNotificationSound,
  playNotificationSoundPreview,
} from '@/utils/notificationSound'
import { deleteAccount as requestAccountDeletion } from '@/services/accountService'
import {
  detectDeviceTimezone,
  isValidTimezone,
  listSupportedTimezones,
  persistTimezonePreference,
  readTimezonePreference,
  timezoneClockLabel,
  timezoneOptionLabel,
  TIMEZONE_MODES,
} from '@/utils/userTimezone'
import {
  buildQuickSetupState,
  dispatchQuickSetupUpdated,
  getIncompleteQuickSetupLabels,
  normalizeQuickSetupChannels,
  writeQuickSetupState,
} from '@/utils/quickSetup'
import dayjs from 'dayjs'
import { ChevronRight, CircleHelp, FileText, FileX, LogOut, ShieldCheck } from 'lucide-vue-next'
import { PcButton, PcMenu } from '@/design'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()
const { refresh: refreshPremium } = useIsPremium()
const workspaceStore = useWorkspaceStore()
const quickSetupStore = useQuickSetupStore()
const canUseBrowserPush = computed(() => !isNativePackagedApp())
const notificationChannelLabel = computed(() =>
  isNativePackagedApp() ? 'Device Notifications' : 'Push Notifications (PWA)',
)
const notificationEnableLabel = computed(() =>
  isNativePackagedApp() ? 'Enable Device Notifications' : 'Enable Browser Push',
)
const notificationEnableHelp = computed(() =>
  isNativePackagedApp()
    ? 'Shows local due-time reminders directly on this iPhone or Android device.'
    : 'Register this browser for instant reminder banners in the web/PWA app.',
)
const notificationSoundHelp = computed(() =>
  isNativePackagedApp()
    ? 'Used by device reminders and native push on this phone.'
    : 'Saved for device reminders and native push when the app runs natively.',
)
const settingsViewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const isMobileSettingsView = computed(() => settingsViewportWidth.value < 768)
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const quickSetupState = computed(() => quickSetupStore.setupState)
const quickSetupMissingLabels = computed(() => getIncompleteQuickSetupLabels(quickSetupState.value))
const ACTION_INBOX_ALLOWED_CHANNELS = ['email', 'pwa', 'whatsapp']
const ACTION_INBOX_NUDGE_CHANNEL_OPTIONS = [
  { value: 'pwa', label: isNativePackagedApp() ? 'Device notifications' : 'Push notifications' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
]
const teamWorkspaces = computed(() =>
  (workspaceStore.workspaces || []).filter((w) => (w.workspaceType || w.type) === 'team'),
)
const activeTeamWorkspace = computed(() => {
  const active = workspaceStore.activeWorkspace
  if (active && (active.workspaceType || active.type) === 'team') return active
  return teamWorkspaces.value[0] || null
})

function normalizeTab(tab) {
  const t = String(tab || '')
    .trim()
    .toLowerCase()
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
    // Placeholder pages were removed; old links land on Profile.
    policies: 'account-profile',
    'workspace-policies': 'account-profile',
    profile: 'account-profile',
    'account-profile': 'account-profile',
    preferences: 'account-profile',
    'account-preferences': 'account-profile',
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

// Four everyday sections; the rest sits behind ··· (design rule: everything
// secondary goes in the overflow menu).
const SETTINGS_TABS = [
  { id: 'account-profile', label: 'Profile' },
  { id: 'account-notifications', label: 'Notifications' },
  { id: 'workspace-integrations', label: 'Integrations' },
  { id: 'billing-subscription', label: 'Subscription' },
]
const MORE_SETTINGS_TABS = [
  { id: 'account-quick-setup', label: 'Quick setup' },
  { id: 'account-social', label: 'Social accounts' },
  { id: 'workspace-knowledge', label: 'Knowledge' },
  { id: 'workspace-proposals', label: 'Impact & proposals' },
]
const moreSettingsMenu = MORE_SETTINGS_TABS.map((tab) => ({ key: tab.id, label: tab.label }))

const DEFAULT_SETTINGS_TAB = 'account-profile'
const KNOWN_TAB_IDS = new Set([...SETTINGS_TABS, ...MORE_SETTINGS_TABS].map((tab) => tab.id))
const initialTab = normalizeTab(route.query?.tab)
const activeTab = ref(KNOWN_TAB_IDS.has(initialTab) ? initialTab : DEFAULT_SETTINGS_TAB)

// When a ··· section is open, show it as a tab so people can see where they are.
const visibleSettingsTabs = computed(() => {
  const extra = MORE_SETTINGS_TABS.find((tab) => tab.id === activeTab.value)
  return extra ? [...SETTINGS_TABS, extra] : SETTINGS_TABS
})

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

function syncSettingsViewport() {
  if (typeof window === 'undefined') return
  settingsViewportWidth.value = window.innerWidth
  if (settingsViewportWidth.value < 768) {
    if (showNotificationAdvanced.value !== false) showNotificationAdvanced.value = false
    return
  }
  if (!showNotificationAdvanced.value) showNotificationAdvanced.value = true
}
const dirty = ref(false) // tracks unsaved changes
const showNotificationAdvanced = ref(false)
const notificationsSection = ref(null)
const highlightNotifications = ref(false)

function focusNotifications() {
  nextTick(() => {
    try {
      notificationsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      /* noop */
    }
    highlightNotifications.value = true
    setTimeout(() => {
      highlightNotifications.value = false
    }, 1600)
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
const profileTimezoneMode = ref(TIMEZONE_MODES.AUTO)
const profileTimezone = ref(detectDeviceTimezone())
const detectedTimezone = ref(detectDeviceTimezone())
const timezoneNow = ref(new Date())
const timezoneOptions = computed(() => listSupportedTimezones())
const activeProfileTimezone = computed(() =>
  profileTimezoneMode.value === TIMEZONE_MODES.MANUAL ? profileTimezone.value : detectedTimezone.value,
)
const activeProfileTimezoneLabel = computed(() =>
  timezoneOptionLabel(activeProfileTimezone.value, timezoneNow.value),
)
const activeProfileTimezoneClock = computed(() =>
  timezoneClockLabel(activeProfileTimezone.value, timezoneNow.value),
)
const detectedTimezoneLabel = computed(() =>
  timezoneOptionLabel(detectedTimezone.value, timezoneNow.value),
)
const deviceTimezoneChanged = computed(
  () =>
    profileTimezoneMode.value === TIMEZONE_MODES.MANUAL &&
    detectedTimezone.value !== profileTimezone.value,
)
let timezoneRefreshTimer = null
const profileSaving = ref(false)
const emailNeedsReauth = ref(false)
const profileComplete = ref(true)
const deleteAccountConfirmOpen = ref(false)
const deleteAccountSuccessOpen = ref(false)
const deleteAccountLoading = ref(false)
const deleteAccountFinalizing = ref(false)
let deleteAccountFinalizeTimer = null
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
  } catch {
    return ''
  }
})

// Reusable invisible reCAPTCHA instance for phone re-auth
let reauthRecaptcha = null
async function ensureReauthRecaptcha(force = false) {
  try {
    if (force && reauthRecaptcha) {
      try {
        reauthRecaptcha.clear()
      } catch {
        /* noop */
      }
      reauthRecaptcha = null
    }
    if (!reauthRecaptcha) {
      reauthRecaptcha = new RecaptchaVerifier(auth, 'reauth-recaptcha', { size: 'invisible' })
      try {
        await reauthRecaptcha.render()
      } catch {
        /* noop */
      }
    }
  } catch {
    /* noop */
  }
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
  sound: 'default',
  whatsapp: true,
  sms: false,
  voice_call: false,
  discord: false,
  calls: false, // legacy toggle, derived below
})
const morningCoach = reactive({
  enabled: true,
  firstCallTime: '09:00',
  customMessage: '',
})
const morningCallTesting = ref(false)
const soundPreviewing = ref(false)

const actionInboxNudges = reactive({
  enabled: true,
  urgency: 'important',
  maxPerSuggestion: 2,
  channels: ['pwa', 'whatsapp', 'email'],
  dailyDigest: true,
  digestChannels: ['email'],
})
const actionInboxDigestSending = ref(false)

const availableActionInboxNudgeChannels = computed(() =>
  ACTION_INBOX_NUDGE_CHANNEL_OPTIONS.map((option) => ({
    ...option,
    enabled:
      option.value === 'email'
        ? !!prefs.email
        : option.value === 'pwa'
          ? !!prefs.pwa
          : !!prefs.whatsapp,
  })),
)

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
    const storedPwaEnabled = set.has('pwa') || !!n.push || !!n.pwa
    prefs.pwa = canUseBrowserPush.value ? storedPwaEnabled || true : storedPwaEnabled
    prefs.whatsapp = set.has('whatsapp') || !!n.whatsapp || true
    prefs.sms = set.has('sms') || !!n.sms || false
    prefs.voice_call = set.has('voice_call') || !!n.voice_call || false
  } else {
    prefs.email = n.email !== undefined ? !!n.email : true
    const hasExplicitPwa = n.push !== undefined || n.pwa !== undefined
    prefs.pwa = hasExplicitPwa ? !!(n.push ?? n.pwa) : canUseBrowserPush.value
    prefs.whatsapp = n.whatsapp !== undefined ? !!n.whatsapp : true
    prefs.sms = !!n.sms
    prefs.voice_call = !!n.voice_call
  }
  prefs.discord = !!n.discord
  prefs.calls = !!(n.calls || prefs.sms || prefs.voice_call)
  prefs.sound = normalizeNotificationSound(
    n.sound || n.notificationSound || res?.reminders?.sound || 'default',
  )

  notifPhones.value = { sms: n.phone_sms || '', voice: n.phone_voice || '' }
  integrationOptions.forEach((i) => {
    i.selected = !!ints[i.key]
  })

  const meetingsPref = res?.meetings || {}
  meetingPrefs.autoCreate = meetingsPref.autoCreateCalendarTasks !== false
  meetingPrefs.defaultReminderMinutes = sanitizeReminderMinutes(
    meetingsPref.defaultReminderMinutes ??
      meetingsPref.defaultMeetingReminderMinutes ??
      DEFAULT_MEETING_REMINDER,
  )

  const actionInboxPref = n?.actionInboxNudges || res?.actionInboxNudges || {}
  actionInboxNudges.enabled = actionInboxPref?.enabled !== false
  actionInboxNudges.urgency =
    actionInboxPref?.urgency === 'urgent_only' ? 'urgent_only' : 'important'
  actionInboxNudges.maxPerSuggestion = sanitizeActionInboxNudgeCount(
    actionInboxPref?.maxPerSuggestion,
  )
  actionInboxNudges.dailyDigest =
    actionInboxPref?.dailyDigest !== false && actionInboxPref?.daily_digest !== false
  const incomingChannels = normalizeQuickSetupChannels(
    Array.isArray(actionInboxPref?.channels)
      ? actionInboxPref.channels.filter((channel) =>
          ACTION_INBOX_ALLOWED_CHANNELS.includes(String(channel || '').toLowerCase()),
        )
      : deriveDefaultActionInboxNudgeChannels(),
  )
  actionInboxNudges.channels = incomingChannels.length
    ? incomingChannels
    : deriveDefaultActionInboxNudgeChannels()
  const rawDigestChannels = Array.isArray(actionInboxPref?.digestChannels)
    ? actionInboxPref.digestChannels
    : Array.isArray(actionInboxPref?.digest_channels)
      ? actionInboxPref.digest_channels
      : null
  const incomingDigestChannels = normalizeQuickSetupChannels(
    Array.isArray(rawDigestChannels)
      ? rawDigestChannels.filter((channel) =>
          ACTION_INBOX_ALLOWED_CHANNELS.includes(String(channel || '').toLowerCase()),
        )
      : deriveDefaultActionInboxDigestChannels(),
  )
  actionInboxNudges.digestChannels = incomingDigestChannels.length
    ? incomingDigestChannels
    : deriveDefaultActionInboxDigestChannels()
  if (actionInboxNudges.channels.length) {
    actionInboxNudges.digestChannels = [...actionInboxNudges.channels]
  }

  const morningPrefs = res?.morningCoach || {}
  morningCoach.enabled = morningPrefs?.enabled !== false
  morningCoach.firstCallTime =
    typeof morningPrefs?.firstCallTime === 'string' &&
    /^\d{2}:\d{2}$/.test(morningPrefs.firstCallTime)
      ? morningPrefs.firstCallTime
      : '09:00'
  morningCoach.customMessage =
    typeof morningPrefs?.customMessage === 'string' ? morningPrefs.customMessage : ''
}

async function previewNotificationSound() {
  try {
    soundPreviewing.value = true
    await playNotificationSoundPreview(prefs.sound)
  } catch (error) {
    console.warn('[Settings] sound preview failed', error?.message || error)
    ElMessage.error(error?.message || 'Audio preview is not available.')
  } finally {
    soundPreviewing.value = false
  }
}

function applyIntegrationEndpoints(resInts = {}) {
  integrationEndpoints.value = {
    whatsapp: { phone: resInts?.whatsapp?.phone || '' },
    sms: { phone: resInts?.sms?.phone || '' },
    discord: { webhook: resInts?.discord?.webhook || '' },
    slack: { userId: resInts?.slack?.userId || '', token: resInts?.slack?.token || '' },
    email: resInts?.email || authStore.user?.email || '',
  }
}

function applyProfileFields(user, data = {}) {
  profileForm.name = data?.name || user?.displayName || ''
  profileForm.email = data?.email || user?.email || ''
  profileForm.phone = data?.phone || user?.phoneNumber || authStore.user?.phone || ''
  profileComplete.value = !!(data?.name || user?.displayName)

  const localPreference = readTimezonePreference()
  const remoteTimezone = data?.timezone || data?.preferences?.timezone || ''
  const remoteMode = String(data?.timezoneMode || data?.timezone_mode || '').toLowerCase()
  const hasLegacyRemoteTimezone = remoteMode === '' && isValidTimezone(remoteTimezone)
  profileTimezoneMode.value =
    remoteMode === TIMEZONE_MODES.MANUAL || hasLegacyRemoteTimezone
      ? TIMEZONE_MODES.MANUAL
      : localPreference.mode
  detectedTimezone.value = detectDeviceTimezone()
  timezoneNow.value = new Date()
  profileTimezone.value =
    profileTimezoneMode.value === TIMEZONE_MODES.MANUAL
      ? (isValidTimezone(remoteTimezone) ? remoteTimezone : localPreference.timezone)
      : detectedTimezone.value
  persistTimezonePreference(profileTimezoneMode.value, profileTimezone.value)
}

function useAutomaticTimezone() {
  detectedTimezone.value = detectDeviceTimezone()
  timezoneNow.value = new Date()
  profileTimezoneMode.value = TIMEZONE_MODES.AUTO
  profileTimezone.value = detectedTimezone.value
  dirty.value = true
}

function useManualTimezone() {
  detectedTimezone.value = detectDeviceTimezone()
  timezoneNow.value = new Date()
  profileTimezoneMode.value = TIMEZONE_MODES.MANUAL
  if (!isValidTimezone(profileTimezone.value)) profileTimezone.value = detectedTimezone.value
  dirty.value = true
}

function refreshDetectedTimezone() {
  detectedTimezone.value = detectDeviceTimezone()
  timezoneNow.value = new Date()
  if (profileTimezoneMode.value === TIMEZONE_MODES.AUTO) {
    profileTimezone.value = detectedTimezone.value
  }
}

function currentQuickSetupTimezone() {
  return profileTimezoneMode.value === TIMEZONE_MODES.MANUAL
    ? profileTimezone.value
    : detectedTimezone.value || detectDeviceTimezone()
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
  return candidates.map((value) => String(value || '').trim()).find(Boolean) || ''
}

function deriveQuickSetupChannels() {
  return normalizeQuickSetupChannels([
    prefs.email && 'email',
    prefs.pwa && 'pwa',
    prefs.whatsapp && 'whatsapp',
    prefs.sms && 'sms',
    prefs.voice_call && 'voice_call',
  ])
}

function deriveDefaultActionInboxNudgeChannels() {
  return normalizeQuickSetupChannels([
    prefs.pwa && 'pwa',
    prefs.whatsapp && 'whatsapp',
    prefs.email && 'email',
  ])
}

function deriveDefaultActionInboxDigestChannels() {
  return normalizeQuickSetupChannels([
    prefs.email && 'email',
    prefs.pwa && 'pwa',
    prefs.whatsapp && 'whatsapp',
  ]).slice(0, 1)
}

function sanitizeActionInboxNudgeCount(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 2
  return Math.min(Math.max(Math.round(numeric), 1), 3)
}

async function sendTestActionInboxDigest() {
  const workspaceId =
    workspaceStore.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
  if (!workspaceId) {
    ElMessage.warning('Select a workspace before sending a digest test.')
    return
  }
  actionInboxDigestSending.value = true
  try {
    const result = await sendActionInboxDigest({ workspaceId, force: true })
    if (!result.sent) {
      ElMessage.warning('No digest was sent. Check inbox items and enabled delivery channels.')
      return
    }
    const channelText = result.channels.length ? ` via ${result.channels.join(', ')}` : ''
    ElMessage.success(`Inbox digest sent${channelText}.`)
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to send inbox digest')
  } finally {
    actionInboxDigestSending.value = false
  }
}

function syncQuickSetupFromSettings() {
  const nextState = buildQuickSetupState({
    timezone: currentQuickSetupTimezone(),
    channels: deriveQuickSetupChannels(),
    phone: deriveQuickSetupPhone(),
    pushGranted: !!prefs.pwa,
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
    try {
      workspaceStore.init?.()
    } catch {
      /* noop */
    }

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
  } catch {
    return false
  }
})

onMounted(async () => {
  try {
    syncSettingsViewport()
    window.addEventListener('resize', syncSettingsViewport, { passive: true })
    refreshDetectedTimezone()
    window.addEventListener('focus', refreshDetectedTimezone, { passive: true })
    timezoneRefreshTimer = setInterval(refreshDetectedTimezone, 60 * 1000)
    // Ensure latest subscription state on entry
    try {
      await refreshPremium()
    } catch {
      /* noop */
    }
    quickSetupStore.refreshQuickSetupState()
    try {
      if (activeTab.value === 'account-notifications') {
        setTimeout(() => focusNotifications(), 150)
      }
      if (route?.query?.gpt !== undefined) {
        setTimeout(() => focusGptCard(true), 400)
      }
    } catch {
      /* noop */
    }
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
    } catch {
      /* noop */
    }
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
  email: '',
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
  } catch {
    return ''
  }
})

// Google Calendar integration state and handlers
const google = reactive({ enabled: true, connected: false, status: '', accounts: [] })
const googleLoading = ref(true)
const meetingPrefs = reactive({
  autoCreate: true,
  defaultReminderMinutes: DEFAULT_MEETING_REMINDER,
})
const activeGoogleAccountId = ref('')
const activeGoogleAccount = computed(() => {
  return (
    google.accounts.find((a) => a.accountId === activeGoogleAccountId.value) ||
    google.accounts[0] ||
    null
  )
})
const activeCalendars = computed(() => activeGoogleAccount.value?.calendars || [])
function buildGoogleAccountModel(acc = {}, primaryId = '') {
  const calendars = Array.isArray(acc?.calendars) ? acc.calendars.map((c) => ({ ...c })) : []
  const primaryCal = calendars.find((c) => c.primary)
  return {
    accountId: acc.accountId || acc.id || 'primary',
    accountEmail:
      acc.accountEmail ||
      acc.token?.email ||
      primaryCal?.summary ||
      primaryCal?.id ||
      'Google account',
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
  try {
    return dayjs(ts).format('MMM D • hh:mm A')
  } catch {
    return ts
  }
}
async function connectGoogle() {
  try {
    if (!authStore.user?.uid) return
    const url = await requestGoogleConnectUrl(authStore.user.uid)
    if (!url) {
      ElMessage.error('Failed to get Google consent URL')
      return
    }
    try {
      trackCalendarConnectStarted({
        provider: 'google',
        surface: 'settings',
      })
    } catch {
      /* analytics optional */
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
    const wasConnected = google.connected
    let status
    try {
      status = await getGoogleStatus(authStore.user.uid)
    } catch {
      google.enabled = false
      google.connected = false
      google.accounts = []
      return
    }
    const enabledFromServer = status?.integration?.enabled ?? status?.enabled
    const integration = status?.integration || status || {}
    google.enabled = enabledFromServer !== false
    const rawAccounts =
      Array.isArray(integration.accounts) && integration.accounts.length
        ? integration.accounts
        : [{ ...integration, accountId: integration.primaryAccountId || 'primary' }]
    google.accounts = rawAccounts.map((acc) =>
      buildGoogleAccountModel(acc, integration.primaryAccountId),
    )
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
    if (!wasConnected && google.connected) {
      try {
        trackCalendarConnected({
          provider: 'google',
          surface: 'settings',
          account_count: google.accounts.length,
        })
      } catch {
        /* analytics optional */
      }
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

watch(
  () => [...(actionInboxNudges.channels || [])],
  (channels) => {
    const normalized = normalizeQuickSetupChannels(
      channels
        .map((channel) => String(channel || '').toLowerCase())
        .filter((channel) => ACTION_INBOX_ALLOWED_CHANNELS.includes(channel)),
    )
    actionInboxNudges.digestChannels = normalized.length
      ? [...normalized]
      : deriveDefaultActionInboxDigestChannels()
  },
)

async function saveSelection() {
  try {
    if (!authStore.user?.uid || !activeGoogleAccount.value) return
    const selected = (activeCalendars.value || []).filter((c) => c.selected).map((c) => c.id)
    await saveGoogleCalendarSelection(
      authStore.user.uid,
      selected,
      activeGoogleAccount.value.windowDays,
      activeGoogleAccount.value.accountId,
    )
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
      const label = summaryParts.length
        ? `Synced ${summaryParts.join(', ')}`
        : 'Calendar sync completed'
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
  router.push('/login')
}

async function openLegalDoc(path) {
  if (!path) return
  if (isNativePackagedApp()) {
    await router.push(path)
    return
  }
  const target = router.resolve({ path }).href
  if (typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer')
  }
}

async function finalizeDeletedAccount() {
  if (deleteAccountFinalizing.value) return
  deleteAccountFinalizing.value = true
  deleteAccountSuccessOpen.value = false
  try {
    await authStore.logout()
  } finally {
    deleteAccountFinalizing.value = false
  }
}

async function confirmDeleteAccount() {
  if (deleteAccountLoading.value) return
  deleteAccountLoading.value = true
  try {
    await requestAccountDeletion()
    deleteAccountConfirmOpen.value = false
    deleteAccountSuccessOpen.value = true
    deleteAccountFinalizeTimer = window.setTimeout(() => {
      finalizeDeletedAccount()
    }, 1500)
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || 'Failed to delete account')
  } finally {
    deleteAccountLoading.value = false
  }
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
    router.push({
      path: '/billing/upgrade',
      query: { source: 'settings-team', plan, workspaceId: workspace?.id || '' },
    })
    return
  }
  const isGuest =
    authStore.isGuest === true || authStore.guest === true || authStore.user?.mode === 'guest'
  const target = plan === 'pro' ? '/workspaces/new?plan=pro' : '/workspaces/new'
  const workspace = activeTeamWorkspace.value

  if (!authStore.user?.uid || isGuest) {
    try {
      localStorage.setItem('postLoginRedirect', target)
    } catch {
      /* noop */
    }
    router.push({ path: '/signup', query: { mode: 'team', next: target } })
    return
  }

  if (!workspace) {
    router.push({ path: '/workspaces/new', query: { plan } })
    return
  }

  const currentPlan = String(workspace.plan || 'free').toLowerCase()
  const needsUpgrade =
    (plan === 'starter' && currentPlan === 'free') ||
    (plan === 'pro' && !currentPlan.includes('pro'))

  if (needsUpgrade) {
    router.push({ path: '/billing/upgrade', query: { plan, workspaceId: workspace.id } })
    return
  }

  router.push('/workspaces')
}

function upgradePlan() {
  try {
    trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK)
  } catch {
    /* noop */
  }
  openSubscriptionPage() // redirect to subscription/pricing
}

async function refreshBillingAccess() {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      await accessStore.fetchAccess(uid, { force: true, minIntervalMs: 0 })
      await subStore.fetchStatus(uid, { force: true, minIntervalMs: 0 })
      await refreshPremium?.()
    }
  } catch {
    /* noop */
  }

  try {
    await workspaceStore.init()
  } catch {
    /* noop */
  }

  ElMessage.success('Account access refreshed')
}

// Updated saveSettings function with user feedback
async function saveSettings() {
  try {
    // Normalize phone before persisting
    try {
      const cc = guessCountryFromLocale()
      const rawSms = integrationEndpoints.value?.sms?.phone
      const normSms = normalizePhone(rawSms, cc)
      if (normSms) integrationEndpoints.value.sms.phone = normSms
      const rawWa = integrationEndpoints.value?.whatsapp?.phone
      const normWa = normalizePhone(rawWa, cc)
      if (normWa) integrationEndpoints.value.whatsapp.phone = normWa
    } catch {
      /* noop */
    }
    const channels = []
    if (prefs.email) channels.push('email')
    if (prefs.pwa) channels.push('pwa')
    if (prefs.whatsapp) channels.push('whatsapp')
    if (prefs.sms) channels.push('sms')
    if (prefs.voice_call) channels.push('voice_call')
    const actionInboxChannels = normalizeQuickSetupChannels(
      (Array.isArray(actionInboxNudges.channels) ? actionInboxNudges.channels : [])
        .map((channel) => String(channel || '').toLowerCase())
        .filter((channel) => ACTION_INBOX_ALLOWED_CHANNELS.includes(channel)),
    )
    const actionInboxDigestChannels = actionInboxChannels.length
      ? [...actionInboxChannels]
      : deriveDefaultActionInboxDigestChannels()
    const notifications = {
      email: !!prefs.email,
      push: !!prefs.pwa,
      sound: normalizeNotificationSound(prefs.sound),
      whatsapp: !!prefs.whatsapp,
      sms: !!prefs.sms,
      discord: !!prefs.discord,
      voice_call: !!prefs.voice_call,
      // keep legacy aggregated flag for backward-compat
      calls: !!(prefs.calls || prefs.sms || prefs.voice_call),
      channels,
      actionInboxNudges: {
        enabled: !!actionInboxNudges.enabled,
        dailyDigest: !!actionInboxNudges.dailyDigest,
        urgency: actionInboxNudges.urgency === 'urgent_only' ? 'urgent_only' : 'important',
        maxPerSuggestion: sanitizeActionInboxNudgeCount(actionInboxNudges.maxPerSuggestion),
        channels: actionInboxChannels.length
          ? actionInboxChannels
          : deriveDefaultActionInboxNudgeChannels(),
        digestChannels: actionInboxDigestChannels,
      },
    }
    const reminderDefaults = {
      enabled: channels.length > 0,
      channels,
      sound: normalizeNotificationSound(prefs.sound),
    }
    const morningCoachPayload = {
      enabled: !!morningCoach.enabled,
      firstCallTime: morningCoach.firstCallTime || '09:00',
      customMessage: String(morningCoach.customMessage || '').trim(),
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
      morningCoach: morningCoachPayload,
      meetings: meetingSettingsPayload,
    })
    await updateIntegrations(authStore.user?.uid, integrationEndpoints.value)
    console.log('Settings saved:', {
      notifications,
      reminderDefaults,
      morningCoach: morningCoachPayload,
      meetings: meetingSettingsPayload,
      integrationToggles: toggles,
      integrationEndpoints: integrationEndpoints.value,
    })
    if (isNativePackagedApp()) {
      const workspaceId =
        workspaceStore.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
      await syncNativeReminderQueueNow({
        userId: authStore.user?.uid || null,
        workspaceId,
        reason: 'settings-save',
      })
      const permission = await getNativeReminderPermissionStatus()
      if (prefs.pwa && !permission.granted) {
        ElMessage.warning(
          'Device notifications are enabled in settings, but system notification permission is still blocked.',
        )
      }
    }
    syncQuickSetupFromSettings()
    try {
      if (channels.length) {
        trackFirstReminderChannelSaved({
          surface: 'settings',
          guest:
            authStore?.guest === true ||
            authStore?.isGuest === true ||
            authStore?.user?.mode === 'guest',
          channels: [...channels],
          channel_count: channels.length,
        })
      }
    } catch (error) {
      console.warn('[Settings] reminder analytics failed', error?.message || error)
    }
    ElMessage.success('✅ Settings saved successfully!')
    dirty.value = false // reset dirty flag
  } catch (error) {
    console.error('Failed to save settings:', error)
    ElMessage.error('❌ Failed to save settings. Please try again.')
  }
}

async function sendTestMorningCallNow() {
  const uid = authStore.user?.uid
  const message = String(morningCoach.customMessage || '').trim()
  if (!uid) return
  if (!message) {
    ElMessage.warning('Add a custom morning message first.')
    return
  }
  morningCallTesting.value = true
  try {
    await apiSendTestMorningCall(uid, message)
    ElMessage.success('Test morning call sent.')
  } catch (error) {
    ElMessage.error(
      error?.response?.data?.error || error?.message || 'Failed to send test morning call',
    )
  } finally {
    morningCallTesting.value = false
  }
}

function onAvatarUpdated(url) {
  try {
    if (!url) return
    // reflect locally for instant UI update
    authStore.user = { ...(authStore.user || {}), photoURL: url, avatarUrl: url }
  } catch {
    /* noop */
  }
}

async function saveProfile() {
  const u = auth.currentUser
  if (!u?.uid) return
  profileSaving.value = true
  try {
    // Normalize phone before writing
    let phoneE164 = profileForm.phone || ''
    try {
      phoneE164 = normalizePhone(phoneE164, guessCountryFromLocale())
    } catch {
      /* noop */
    }
    await updateSettingsProfile(u.uid, {
      name: profileForm.name || null,
      email: profileForm.email || null,
      phone: phoneE164 || null,
      profileComplete: !!(profileForm.name && profileForm.name.trim().length),
      timezoneMode: profileTimezoneMode.value,
      timezone:
        profileTimezoneMode.value === TIMEZONE_MODES.MANUAL
          ? profileTimezone.value
          : null,
    })
    const savedTimezonePreference = persistTimezonePreference(
      profileTimezoneMode.value,
      profileTimezoneMode.value === TIMEZONE_MODES.MANUAL
        ? profileTimezone.value
        : detectedTimezone.value,
    )
    try {
      await updateFirebaseProfile(u, { displayName: profileForm.name || '' })
    } catch {
      /* noop */
    }
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
      timezoneMode: savedTimezonePreference.mode,
      timezone: savedTimezonePreference.mode === TIMEZONE_MODES.MANUAL ? savedTimezonePreference.timezone : null,
    }
    integrationEndpoints.value.email = profileForm.email || authStore.user?.email || ''
    try {
      localStorage.setItem('user', JSON.stringify(authStore.user))
    } catch {
      /* noop */
    }
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
  const providers = (u.providerData || []).map((p) => p.providerId)
  reauthHasGoogle.value = providers.includes('google.com')
  reauthHasPhone.value = providers.includes('phone') && !!u.phoneNumber
  if (isNativePackagedApp() && reauthHasGoogle.value && !reauthHasPhone.value) {
    ElMessage.info(getNativeAuthRestriction('google'))
    return
  }
  reauthMethod.value = isNativePackagedApp()
    ? reauthHasPhone.value
      ? 'phone'
      : ''
    : reauthHasGoogle.value && !reauthHasPhone.value
      ? 'google'
      : !reauthHasGoogle.value && reauthHasPhone.value
        ? 'phone'
        : ''
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
    if (since < 2000) {
      // prevent accidental double-clicks
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

watch(
  () => reauthOpen.value,
  (open) => {
    if (!open) {
      clearResendCooldown()
      reauthStep.value = 0
      otp.value = ''
      reauthVerificationId.value = ''
    }
  },
)

watch(
  () => route.query?.gpt,
  (val) => {
    if (val !== undefined && val !== null) {
      focusGptCard(false)
    }
  },
)

onBeforeUnmount(() => {
  try {
    window.removeEventListener('resize', syncSettingsViewport)
    window.removeEventListener('focus', refreshDetectedTimezone)
  } catch {
    /* noop */
  }
  if (timezoneRefreshTimer) {
    clearInterval(timezoneRefreshTimer)
    timezoneRefreshTimer = null
  }
  clearResendCooldown()
  if (gptCopyTimer) {
    clearTimeout(gptCopyTimer)
    gptCopyTimer = null
  }
  if (deleteAccountFinalizeTimer) {
    clearTimeout(deleteAccountFinalizeTimer)
    deleteAccountFinalizeTimer = null
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
    if (isNativePackagedApp()) {
      const permission = await requestNativeReminderPermissions()
      if (!permission.granted) {
        throw new Error(
          'Device notifications were not granted. Check iOS/Android notification settings and try again.',
        )
      }
      prefs.pwa = true
      dirty.value = true
      ElMessage.success(
        '🔔 Device notifications enabled. Save settings to keep due reminders synced.',
      )
      return
    }
    if (!canUseBrowserPush.value)
      throw new Error('Browser push is only available in the web/PWA app.')
    await subscribeUserToPush(authStore.user.uid)
    ElMessage.success('🔔 Push notifications enabled')
  } catch (e) {
    console.warn('Enable push failed:', e)
    ElMessage.error(`❌ Enable push failed: ${e?.message || e}`)
  }
}

// Plan gates
// Use unified premium flag to control gates for a consistent UX
const usageToday = computed(
  () =>
    accessStore.access?.today || authStore.user?.usage?.today || { aiGenerations: 0, reminders: 0 },
)
const aiUsed = computed(() => Number(usageToday.value.aiGenerations || 0))
const remindersUsed = computed(() => Number(usageToday.value.reminders || 0))
const aiLimitLabel = computed(() =>
  accessStore.access?.limits?.aiGenerations == null
    ? '∞'
    : (accessStore.access?.limits?.aiGenerations ?? 10),
)
const remindersLimitLabel = computed(() =>
  accessStore.access?.limits?.remindersPerDay == null
    ? '∞'
    : (accessStore.access?.limits?.remindersPerDay ?? 10),
)
const planOpen = ref(false)
const billingSectionIntro = computed(() =>
  isAppleBillingSafeMode.value
    ? 'Solo Premium is available in the iPhone app, and existing paid workspace access syncs automatically to your account.'
    : 'Personal plan status plus the new teams pricing for shared workspaces.',
)
const personalPlanCtaLabel = computed(() =>
  isAppleBillingSafeMode.value ? 'Refresh access' : '🚀 Upgrade',
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
.settings-page {
  color: var(--pc-text);
}

.settings-shell {
  width: min(880px, 100%);
  margin: 0 auto;
  padding: var(--pc-space-2) 0 var(--pc-space-10);
}

.settings-sections {
  display: grid;
  gap: var(--pc-space-5);
}

/* Tabs: one quiet row, active state is the only accent. */
.settings-tabs {
  display: flex;
  align-items: center;
  gap: var(--pc-space-2);
  margin-bottom: var(--pc-space-6);
  border-bottom: 1px solid var(--pc-border);
}

.settings-tabs__list {
  display: flex;
  flex: 1;
  gap: var(--pc-space-1);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.settings-tabs__list::-webkit-scrollbar {
  display: none;
}

.settings-tabs__tab {
  flex-shrink: 0;
  padding: var(--pc-space-3) var(--pc-space-3);
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  color: var(--pc-text-muted);
  font-family: var(--pc-font);
  font-size: var(--pc-text-body);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.settings-tabs__tab:hover {
  color: var(--pc-text);
}

.settings-tabs__tab[aria-selected='true'] {
  border-bottom-color: var(--pc-accent);
  color: var(--pc-text);
  font-weight: 600;
}

/* Panels: light surfaces from the design tokens. */
.settings-panel {
  width: 100%;
  padding: var(--pc-space-5);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-surface);
  box-shadow: var(--pc-shadow-sm);
}

.settings-panel__title {
  margin: 0 0 var(--pc-space-4);
  color: var(--pc-text);
  font-size: var(--pc-text-title);
  font-weight: 600;
}

.settings-panel__text {
  margin: 0;
  color: var(--pc-text-muted);
  line-height: 1.5;
}

.settings-panel--danger {
  border-color: color-mix(in srgb, var(--pc-danger) 25%, var(--pc-border));
}

.settings-panel--danger .settings-panel__title {
  color: var(--pc-danger);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--pc-space-5);
}

.settings-actions--start {
  justify-content: flex-start;
}

.settings-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-3);
  margin: var(--pc-space-4) 0 0;
  padding: var(--pc-space-3);
  border-radius: var(--pc-radius-md);
  background: var(--pc-accent-soft);
  color: var(--pc-text);
  font-size: var(--pc-text-small);
}

.settings-note--warning {
  background: color-mix(in srgb, #f59e0b 12%, var(--pc-surface));
}

/* Profile */
.profile-identity {
  display: flex;
  flex-direction: column;
  gap: var(--pc-space-4);
  margin-bottom: var(--pc-space-5);
}

.profile-identity-copy {
  min-width: 0;
}

.profile-identity-copy__name {
  margin: 0;
  font-size: var(--pc-text-body-lg);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.profile-identity-copy__email {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  overflow-wrap: anywhere;
}

.profile-fields {
  display: grid;
  gap: var(--pc-space-4);
}

.settings-field {
  display: grid;
  gap: var(--pc-space-1);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.settings-field small {
  font-weight: 400;
}

/* Account list */
.settings-list {
  display: grid;
  margin: 0 calc(-1 * var(--pc-space-2));
}

.settings-row {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  min-height: 3rem;
  padding: 0 var(--pc-space-2);
  border: none;
  border-radius: var(--pc-radius-sm);
  background: none;
  color: var(--pc-text);
  font-family: var(--pc-font);
  font-size: var(--pc-text-body);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.settings-row + .settings-row {
  border-top: 1px solid var(--pc-border);
  border-radius: 0;
}

.settings-row:hover {
  background: var(--pc-surface-hover);
}

.settings-row svg {
  flex-shrink: 0;
  color: var(--pc-text-muted);
}

.settings-row span {
  flex: 1;
}

.settings-row__chevron {
  color: var(--pc-text-subtle);
}

.integration-card {
  height: 100%;
}

@media (min-width: 640px) {
  .profile-identity {
    flex-direction: row;
    align-items: center;
  }

  .profile-identity-uploader {
    flex-shrink: 0;
  }

  .profile-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .settings-panel {
    padding: var(--pc-space-4);
  }
}

/*
 * Legacy colour compatibility for tabs not yet rebuilt (Notifications,
 * Integrations, Subscription, Quick setup, Social, Knowledge). Their markup
 * still uses dark-theme utilities; map them to the design tokens so they read
 * correctly on light (and dark) surfaces. Remove as each tab is migrated.
 */
.settings-sections :deep([class*='text-white']:not([class*='bg-indigo-5']):not([class*='bg-indigo-6']):not([class*='bg-red-5']):not([class*='bg-red-6']):not([class*='bg-emerald-5']):not([class*='bg-emerald-6']):not([class*='bg-green-5']):not([class*='bg-green-6']):not([class*='bg-gradient']):not(.el-button)),
.settings-sections :deep([class*='text-slate-1']),
.settings-sections :deep([class*='text-slate-2']),
.settings-sections :deep([class*='text-gray-1']),
.settings-sections :deep([class*='text-gray-2']),
.settings-sections :deep([class*='text-indigo-50']) {
  color: var(--pc-text);
}

.settings-sections :deep([class*='text-slate-3']),
.settings-sections :deep([class*='text-slate-4']),
.settings-sections :deep([class*='text-gray-3']),
.settings-sections :deep([class*='text-gray-4']),
.settings-sections :deep([class*='text-indigo-1']),
.settings-sections :deep([class*='text-indigo-2']),
.settings-sections :deep([class*='text-purple-2']) {
  color: var(--pc-text-muted);
}

.settings-sections :deep([class*='text-indigo-3']),
.settings-sections :deep([class*='text-sky-2']),
.settings-sections :deep([class*='text-sky-3']),
.settings-sections :deep([class*='text-cyan-2']),
.settings-sections :deep([class*='text-purple-3']),
.settings-sections :deep([class*='text-fuchsia-2']),
.settings-sections :deep([class*='text-fuchsia-3']) {
  color: var(--pc-accent-text);
}

.settings-sections :deep([class*='text-emerald-2']),
.settings-sections :deep([class*='text-emerald-3']),
.settings-sections :deep([class*='text-green-2']),
.settings-sections :deep([class*='text-green-3']) {
  color: var(--pc-success);
}

.settings-sections :deep([class*='text-red-1']),
.settings-sections :deep([class*='text-red-2']),
.settings-sections :deep([class*='text-red-3']),
.settings-sections :deep([class*='text-rose-2']),
.settings-sections :deep([class*='text-rose-3']) {
  color: var(--pc-danger);
}

.settings-sections :deep([class*='text-yellow-2']),
.settings-sections :deep([class*='text-yellow-3']),
.settings-sections :deep([class*='text-amber-1']),
.settings-sections :deep([class*='text-amber-2']),
.settings-sections :deep([class*='text-amber-3']) {
  color: #b45309;
}

.settings-sections :deep([class*='bg-slate-7']),
.settings-sections :deep([class*='bg-slate-8']),
.settings-sections :deep([class*='bg-slate-9']),
.settings-sections :deep([class*='bg-gray-7']),
.settings-sections :deep([class*='bg-gray-8']),
.settings-sections :deep([class*='bg-gray-9']),
.settings-sections :deep([class*='bg-black']) {
  background-color: var(--pc-surface-2);
  color: var(--pc-text);
}

.settings-sections :deep([class*='border-white']),
.settings-sections :deep([class*='border-slate-6']),
.settings-sections :deep([class*='border-slate-7']),
.settings-sections :deep([class*='border-slate-8']),
.settings-sections :deep([class*='border-gray-6']),
.settings-sections :deep([class*='border-gray-7']) {
  border-color: var(--pc-border);
}

.timezone-settings {
  display: grid;
  gap: var(--pc-space-4);
  margin-top: var(--pc-space-5);
  padding: var(--pc-space-4);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-surface-2);
}

.timezone-settings__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pc-space-3);
}

.timezone-settings__eyebrow {
  margin: 0 0 var(--pc-space-1);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.timezone-settings__title {
  margin: 0;
  color: var(--pc-text);
  font-size: var(--pc-text-body-lg);
  font-weight: 600;
}

.timezone-settings__copy {
  max-width: 42rem;
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  line-height: 1.5;
}

.timezone-settings__status {
  flex-shrink: 0;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-full);
  background: var(--pc-surface);
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 700;
}

.timezone-settings__modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--pc-space-2);
}

.timezone-settings__mode {
  display: grid;
  gap: 0.2rem;
  padding: var(--pc-space-3);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text);
  font-family: var(--pc-font);
  font-size: var(--pc-text-small);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.timezone-settings__mode small {
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
  font-weight: 400;
}

.timezone-settings__mode:hover {
  border-color: var(--pc-border-strong);
  background: var(--pc-surface-hover);
}

.timezone-settings__mode--active {
  border-color: var(--pc-accent);
  background: var(--pc-accent-soft);
  box-shadow: 0 0 0 2px var(--pc-accent-soft);
}

.timezone-settings__current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-3);
  padding: var(--pc-space-3);
  border: 1px dashed var(--pc-border-strong);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
}

.timezone-settings__current strong,
.timezone-settings__preview strong {
  color: var(--pc-text);
  font-weight: 600;
}

.timezone-settings__label {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
}

.timezone-settings__clock {
  flex-shrink: 0;
  color: var(--pc-accent-text);
  font-size: var(--pc-text-small);
  font-weight: 600;
}

.timezone-settings__select-field {
  color: var(--pc-text-muted);
}

.timezone-settings__select {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--pc-border-strong);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text);
  font: inherit;
  font-size: var(--pc-text-body);
  outline: none;
}

.timezone-settings__select:focus {
  border-color: var(--pc-accent);
  box-shadow: 0 0 0 3px var(--pc-focus-ring);
}

.timezone-settings__travel-note,
.timezone-settings__preview {
  margin: 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  line-height: 1.5;
}

.timezone-settings__travel-note {
  padding: var(--pc-space-3);
  border-radius: var(--pc-radius-md);
  background: color-mix(in srgb, #f59e0b 10%, var(--pc-surface));
  color: #a16207;
}

@media (max-width: 520px) {
  .timezone-settings__header {
    display: grid;
  }

  .timezone-settings__status {
    justify-self: start;
  }

  .timezone-settings__modes {
    grid-template-columns: 1fr;
  }

  .timezone-settings__current {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
