<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 text-white px-4 sm:px-8 py-10">
    <!-- Header -->
    <header class="mb-10 text-center">
      <h1 class="text-3xl sm:text-4xl font-bold mb-2">⚙️ Settings</h1>
      <p class="text-indigo-300">Manage your notifications, integrations, and account preferences.</p>
    </header>

    <main class="max-w-6xl mx-auto space-y-8 px-1">
      <!-- Settings navigation -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div v-for="group in tabGroups" :key="group.id" class="space-y-2">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-300">{{ group.label }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tab in group.tabs"
                :key="tab.id"
                type="button"
                :class="[
                  'px-3 py-1.5 rounded-lg text-sm border transition',
                  activeTab === tab.id
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                    : 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-slate-500'
                ]"
                @click="setActiveTab(tab.id)"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'workspace-knowledge'">
        <KnowledgePanel />
      </div>

      <div v-show="activeTab === 'workspace-proposals'">
        <ProposalInbox />
      </div>

      <section
        v-show="activeTab === 'workspace-policies'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10"
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
        v-show="activeTab === 'billing-subscription'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🌟 Subscription</h2>
        <p class="text-sm text-indigo-200">Current plan: <strong>{{ currentPlanLabel.toUpperCase() }}</strong></p>
        <p class="text-sm text-gray-300 mt-2">
          Daily AI limit: <span :class="isPremium ? 'text-green-300' : 'text-yellow-300'">{{ aiRemaining }}</span> left today
        </p>
        <p v-if="isPremium && subStore.subscription?.remainingDays > 0" class="text-sm text-indigo-300 mt-1">
          ⏳ Ends on: {{ premiumEndsOn }}
        </p>
        <div class="mt-3">
          <button v-if="!isPremium" @click="upgradePlan" class="bg-gradient-to-r from-purple-500 to-pink-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-white shadow-lg hover:from-purple-600 hover:to-pink-700 transition text-sm sm:text-base">🚀 Upgrade</button>
          <el-button size="small" plain @click="planOpen=true" class="ml-2">View Plan Details</el-button>
        </div>
      </section>

      <section
        v-show="activeTab === 'help-onboarding'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none"
      >
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 class="text-lg sm:text-xl font-semibold mb-2">🎬 Onboarding Walkthrough</h2>
            <p class="text-sm text-indigo-200">
              Replay the guided PlanCraftAI tour with the new voice-friendly highlights anytime.
            </p>
            <p v-if="onboardingLastCompleted" class="text-xs text-slate-300 mt-1">
              Last completed {{ onboardingLastCompleted }}
            </p>
          </div>
          <button
            class="bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 rounded-lg font-semibold shadow-lg hover:opacity-90 transition text-sm disabled:opacity-50"
            :disabled="onboardingReplayBusy"
            @click="replayOnboardingTour"
          >
            {{ onboardingReplayBusy ? 'Scheduling…' : 'Replay onboarding tour' }}
          </button>
        </div>
      </section>

      <section
        v-show="activeTab === 'account-profile'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🙋 Profile</h2>
        <p class="text-sm text-indigo-200">Profile editing lives in your account menu. A dedicated editor will arrive here soon.</p>
        <p class="text-sm text-slate-300 mt-2">Signed in as: <strong>{{ authStore.user?.email || 'Unknown user' }}</strong></p>
      </section>

      <section
        v-show="activeTab === 'account-preferences'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">⚙️ Preferences</h2>
        <p class="text-sm text-indigo-200">Workspace-specific preferences (theme, locale, AI persona) will be managed here soon.</p>
      </section>

      <!-- Notification Preferences -->
      <section
        v-show="activeTab === 'account-notifications'"
        ref="notificationsSection"
        :class="['bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none',
                 highlightNotifications ? 'ring-2 ring-indigo-400' : '']"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔔 Notification Preferences</h2>
        <p class="text-sm text-indigo-200 mb-4">Choose how you’d like to be reminded about tasks, reflections, and insights.</p>

        <div class="space-y-3">
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.email" class="accent-indigo-500" @change="dirty = true" />
            <span>Email Notifications</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="prefs.pwa" class="accent-indigo-500" @change="dirty = true" />
            <span>Push Notifications (PWA)</span>
          </label>
          <div v-if="prefs.pwa" class="pl-7 mt-2">
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
        v-show="activeTab === 'account-social'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-2">🌐 Social Accounts</h2>
        <p class="text-sm text-indigo-200">Connect LinkedIn, GitHub, and other accounts to sync ownership context. Social linking UI will land here.</p>
      </section>

      <!-- Integrations -->
      <section
        v-show="activeTab === 'workspace-integrations'"
        class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none"
      >
        <h2 class="text-lg sm:text-xl font-semibold mb-4">🔗 Integrations</h2>
        <p class="text-sm text-indigo-200 mb-4">Connect your favorite platforms to sync tasks and reminders.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

        <!-- GPT integration card -->
        <div
          ref="gptCardRef"
          :class="[
            'mt-6 rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-4 transition',
            highlightGpt ? 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/20' : ''
          ]"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
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
        <div class="mt-6 rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-3">
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
                    {{ google.connected ? 'Connected' : 'Not Connected' }}
                  </span>
                  <span v-else class="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">Disabled by server</span>
                </div>
                <p class="text-xs text-slate-300 mt-1">
                  Import meetings and show Join links in your tasks.
                  <span v-if="googleLastSync">Last sync: {{ googleLastSync }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="google.enabled && !google.connected && authStore.user"
                  @click="connectGoogle"
                  :disabled="googleLoading"
                  class="px-3 py-1.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm disabled:opacity-50"
                >
                  Connect
                </button>
                <button
                  v-if="google.connected"
                  @click="syncNow"
                  :disabled="googleSyncing"
                  class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-2 disabled:opacity-60"
                >
                  <span
                    v-if="googleSyncing"
                    class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  ></span>
                  <span>{{ googleSyncing ? 'Syncing…' : 'Sync Now' }}</span>
                </button>
                <button
                  v-if="google.connected"
                  @click="disconnectGoogle"
                  class="px-3 py-1.5 rounded bg-red-700/80 hover:bg-red-700 text-sm"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <!-- Calendars selection -->
            <div v-if="google.connected" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label v-for="cal in google.calendars" :key="cal.id" class="flex items-center gap-2 bg-slate-800/40 border border-slate-700/40 rounded p-2">
                <input type="checkbox" v-model="cal.selected" @change="onSelectionChange" class="accent-indigo-500">
                <div class="flex-1">
                  <div class="text-sm">{{ cal.summary || cal.id }}</div>
                  <div class="text-xs text-slate-400">{{ cal.timeZone || '—' }}</div>
                </div>
                <span v-if="cal.primary" class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700/50">primary</span>
              </label>
            </div>

            <!-- Window + save -->
            <div v-if="google.connected" class="mt-3 flex items-center gap-3 flex-wrap">
              <label class="text-sm text-slate-300">Look-ahead window:</label>
              <select v-model.number="google.windowDays" @change="markDirty" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm">
                <option :value="7">7 days</option>
                <option :value="14">14 days</option>
                <option :value="30">30 days</option>
                <option :value="60">60 days</option>
              </select>
              <button @click="saveSelection" class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save Selection</button>
              <span v-if="google.status" class="text-xs text-slate-400">Status: {{ google.status }}</span>
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
      </section>

      <!-- Social Accounts -->
      <div class="mt-8">
        <SocialIntegrationPanel />
      </div>

      <!-- Account -->
      <section class="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg border border-white/10 max-w-md mx-auto sm:max-w-none">
        <h2 class="text-lg sm:text-xl font-semibold mb-4">👤 Account</h2>
        <div class="flex items-center gap-4 mb-4">
          <AvatarUploader :url="authStore.user?.photoURL || authStore.user?.avatarUrl" @updated="onAvatarUpdated" />
          <div>
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
    </main>
  </div>
  <PlanSummaryModal :open="planOpen" @close="planOpen=false" />
  <!-- Re-auth dialog -->
  <el-dialog v-model="reauthOpen" title="Re-authenticate" width="420px" :append-to-body="true">
    <div v-if="reauthStep === 0" class="space-y-3">
      <p class="text-sm text-slate-300">Choose a method to verify your identity.</p>
      <el-radio-group v-model="reauthMethod" class="flex flex-col gap-2">
        <el-radio v-if="reauthHasGoogle" label="google">Google Popup</el-radio>
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
import { getPreferences as apiGetPrefs, updatePreferences as apiUpdatePrefs, getIntegrations, updateIntegrations, updateOnboardingStatus } from "@/services/settingsService"
import { createGptLinkCode } from '@/services/gptService'
import SocialIntegrationPanel from '@/components/settings/SocialIntegrationPanel.vue'
import { subscribeUserToPush } from "@/services/pwaService"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { isFeatureAllowed, getRemainingAI } from "@/services/planService"
import PlanSummaryModal from "@/components/PlanSummaryModal.vue"
import KnowledgePanel from "@/components/KnowledgePanel.vue"
import ProposalInbox from "@/components/ProposalInbox.vue"
import { useIsPremium } from "@/composables/useIsPremium"
import { trackLinkedInConversion } from '@/utils/ads'
import { getAuth, updateProfile, updateEmail, GoogleAuthProvider, reauthenticateWithPopup, RecaptchaVerifier, PhoneAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { db } from '@/firebase/init'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import AvatarUploader from '@/components/AvatarUploader.vue'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const subStore = useSubscriptionStore()
const { refresh: refreshPremium } = useIsPremium()

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
      { id: 'account-notifications', label: 'Notifications' },
      { id: 'account-social', label: 'Social' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    tabs: [{ id: 'billing-subscription', label: 'Subscription & Usage' }],
  },
  {
    id: 'help',
    label: 'Help',
    tabs: [{ id: 'help-onboarding', label: 'Onboarding & Walkthrough' }],
  },
]

const activeTab = ref(route.query?.tab || 'workspace-knowledge')

function setActiveTab(id) {
  activeTab.value = id
}
const dirty = ref(false) // tracks unsaved changes
const notificationsSection = ref(null)
const highlightNotifications = ref(false)
const onboardingPref = ref({})
const onboardingReplayBusy = ref(false)
const onboardingLastCompleted = computed(() => {
  const raw = onboardingPref.value?.completedAt
  if (!raw) return ''
  try {
    if (typeof raw?.seconds === 'number') {
      return dayjs.unix(raw.seconds).format('MMM D, YYYY • h:mm A')
    }
    return dayjs(raw).format('MMM D, YYYY • h:mm A')
  } catch {
    return typeof raw === 'string' ? raw : ''
  }
})

function markDirty() {
  dirty.value = true
}

async function replayOnboardingTour() {
  try {
    if (!authStore.user?.uid) {
      router.push('/login?redirect=/dashboard')
      return
    }
    onboardingReplayBusy.value = true
    const timestamp = new Date().toISOString()
    await updateOnboardingStatus(authStore.user.uid, {
      completed: false,
      showLaterUntil: null,
      replayRequestedAt: timestamp,
    })
    onboardingPref.value = {
      ...onboardingPref.value,
      completed: false,
      completedAt: null,
      showLaterUntil: null,
      replayRequestedAt: timestamp,
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pcai:onboarding:request', { detail: { source: 'settings-panel' } })
      )
    }
    ElMessage.success('✨ Tour scheduled — head to the dashboard to see it in action.')
  } catch (error) {
    console.warn('Replay onboarding failed', error)
    ElMessage.error(error?.response?.data?.error || 'Failed to replay onboarding tour.')
  } finally {
    onboardingReplayBusy.value = false
  }
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
  pwa: true,
  whatsapp: true,
  sms: false,
  voice_call: false,
  discord: false,
  calls: false, // legacy toggle, derived below
})

const isPremium = computed(() => {
  try {
    const planFromStore = subStore?.plan ?? subStore?.value?.plan
    const planFromUser = authStore?.user?.plan
    const roleFromUser = authStore?.user?.role
    return [planFromStore, planFromUser, roleFromUser]
      .map(v => String(v || '').toLowerCase())
      .includes('premium')
  } catch { return false }
})

onMounted(async () => {
  try {
    // Ensure latest subscription state on entry
    try { await refreshPremium() } catch {}
    // Deep link: /settings?tab=notifications → scroll and highlight
    try {
      const tab = String(route?.query?.tab || '').toLowerCase()
      if (tab === 'notifications') {
        setTimeout(() => {
          try { notificationsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
          highlightNotifications.value = true
          setTimeout(() => { highlightNotifications.value = false }, 1600)
        }, 150)
      }
      if (route?.query?.gpt !== undefined) {
        setTimeout(() => focusGptCard(true), 400)
      }
    } catch {}
    if (authStore.user) {
      const res = await apiGetPrefs(authStore.user.uid)
      onboardingPref.value = res?.onboarding || {}
      const n = res?.notifications || {}
      const ints = res?.integrations || {}
      // Prefer channels[] if present; fallback to boolean keys
      const chans = Array.isArray(n?.channels) ? n.channels : null
      if (chans) {
        const set = new Set(chans)
        prefs.email = set.has('email') || !!n.email || true
        prefs.pwa = set.has('pwa') || !!n.push || true
        prefs.whatsapp = set.has('whatsapp') || !!n.whatsapp || true
        prefs.sms = set.has('sms') || !!n.sms || false
        prefs.voice_call = set.has('voice_call') || !!n.voice_call || false
      } else {
        // default to all if not specified
        prefs.email = n.email !== undefined ? !!n.email : true
        prefs.pwa = n.push !== undefined ? !!n.push : true
        prefs.whatsapp = n.whatsapp !== undefined ? !!n.whatsapp : true
        prefs.sms = !!n.sms
        prefs.voice_call = !!n.voice_call
      }
      prefs.discord = !!n.discord
      // derive legacy calls flag for UI blocks that reference it
      prefs.calls = !!(n.calls || prefs.sms || prefs.voice_call)

      notifPhones.value = { sms: n.phone_sms || '', voice: n.phone_voice || '' }

      integrationOptions.forEach(i => { i.selected = !!ints[i.key] })

      const resInts = await getIntegrations(authStore.user.uid)
      integrationEndpoints.value = {
        whatsapp: { phone: resInts?.whatsapp?.phone || '' },
        sms: { phone: resInts?.sms?.phone || '' },
        discord: { webhook: resInts?.discord?.webhook || '' },
        slack: { userId: resInts?.slack?.userId || '', token: resInts?.slack?.token || '' },
        email: resInts?.email || authStore.user.email || ''
      }

      const meetingsPref = res?.meetings || {}
      meetingPrefs.autoCreate = meetingsPref.autoCreateCalendarTasks !== false
      meetingPrefs.defaultReminderMinutes = sanitizeReminderMinutes(
        meetingsPref.defaultReminderMinutes ?? meetingsPref.defaultMeetingReminderMinutes ?? DEFAULT_MEETING_REMINDER,
      )

      // Load profile fields and compute profile completion
      try {
        const u = auth.currentUser
        if (u?.uid) {
          const uref = doc(db, 'users', u.uid)
          const usnap = await getDoc(uref)
          const udata = usnap.exists() ? (usnap.data() || {}) : {}
          profileForm.name = udata.name || u.displayName || ''
          profileForm.email = udata.email || u.email || ''
          profileForm.phone = udata.phone || u.phoneNumber || ''
          profileComplete.value = !!(udata.name || u.displayName)
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to load preferences', e)
  }
  try { await loadGoogle() } catch {}
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
    if (typeof navigator === 'undefined' || !navigator?.clipboard?.writeText) {
      throw new Error('Clipboard unavailable')
    }
    await navigator.clipboard.writeText(gptLink.code)
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
  window.open(gptLaunchUrl, '_blank', 'noopener,noreferrer')
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
const google = reactive({ enabled: true, connected: false, calendars: [], windowDays: 30, status: '', lastRun: null, accountEmail: '' })
const googleLoading = ref(true)
const googleSyncing = ref(false)
const meetingPrefs = reactive({ autoCreate: true, defaultReminderMinutes: DEFAULT_MEETING_REMINDER })
const googleLastSync = computed(() => {
  if (!google.lastRun) return null
  try { return dayjs(google.lastRun).format('MMM D • hh:mm A') } catch { return google.lastRun }
})
async function connectGoogle() {
  try {
    if (!authStore.user?.uid) return
    const url = await requestGoogleConnectUrl(authStore.user.uid)
    if (url) window.location.href = url
    else ElMessage.error('Failed to get Google consent URL')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to start Google connect')
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
      google.calendars = []
      return
    }
    google.enabled = true
    google.connected = !!status?.connected
    google.windowDays = Number(status?.sync?.windowDays || 30)
    google.status = status?.sync?.status || ''
    google.lastRun = status?.sync?.lastRun || null
    google.accountEmail = status?.accountEmail || status?.token?.email || ''
    if (!google.connected) {
      google.calendars = []
      return
    }
    const cals = await getGoogleCalendars(authStore.user.uid)
    google.calendars = Array.isArray(cals) ? cals : []
  } catch (e) {
    console.warn('loadGoogle failed', e?.message || e)
  } finally {
    if (!suppressLoader) googleLoading.value = false
  }
}

async function saveSelection() {
  try {
    if (!authStore.user?.uid) return
    const selected = (google.calendars || []).filter(c => c.selected).map(c => c.id)
    await saveGoogleCalendarSelection(authStore.user.uid, selected, google.windowDays)
    ElMessage.success('Google calendar selection saved')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save selection')
  }
}

async function syncNow() {
  try {
    if (!authStore.user?.uid || googleSyncing.value) return
    googleSyncing.value = true
    const result = await triggerGoogleSyncNow(authStore.user.uid)
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
      await loadGoogle({ suppressLoader: true })
    } else {
      ElMessage.warning('Sync request not accepted')
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Sync failed')
  } finally {
    googleSyncing.value = false
  }
}

function onSelectionChange() {
  markDirty()
}

async function disconnectGoogle() {
  try {
    if (!authStore.user?.uid) return
    await disconnectGoogleIntegration(authStore.user.uid)
    ElMessage.success('Google Calendar disconnected')
    google.connected = false
    google.calendars = []
    google.status = 'disconnected'
    google.lastRun = null
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to disconnect Google Calendar')
  }
}

function handleLogout() {
  authStore.logout()
  router.push("/login")
}

function upgradePlan() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
  router.push("/subscription") // redirect to subscription/pricing
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
    } catch {}
    const channels = []
    if (prefs.email) channels.push('email')
    if (prefs.pwa) channels.push('pwa')
    if (prefs.whatsapp) channels.push('whatsapp')
    if (prefs.sms) channels.push('sms')
  if (prefs.voice_call) channels.push('voice_call')
  const notifications = {
    email: !!prefs.email,
    push: !!prefs.pwa,
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
    const ref = doc(db, 'users', u.uid)
    // Normalize phone before writing
    let phoneE164 = profileForm.phone || ''
    try { phoneE164 = normalizePhone(phoneE164, guessCountryFromLocale()) } catch {}
    await setDoc(ref, {
      name: profileForm.name || undefined,
      email: profileForm.email || undefined,
      phone: phoneE164 || undefined,
      profileComplete: !!(profileForm.name && profileForm.name.trim().length),
      updatedAt: new Date(),
    }, { merge: true })
    try { await updateProfile(u, { displayName: profileForm.name || '' }) } catch {}
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
  reauthMethod.value = reauthHasGoogle.value && !reauthHasPhone.value ? 'google' : (!reauthHasGoogle.value && reauthHasPhone.value ? 'phone' : '')
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
    await subscribeUserToPush(authStore.user.uid)
    ElMessage.success('🔔 Push notifications enabled')
  } catch (e) {
    console.warn('Enable push failed:', e)
    ElMessage.error(`❌ Enable push failed: ${e?.message || e}`)
  }
}

// Plan gates
// Use unified premium flag to control gates for a consistent UX
const canWhatsapp = computed(() => !!isPremium.value)
const canPwa = computed(() => !!isPremium.value)
const aiRemaining = computed(() => getRemainingAI(authStore.user || {}))
const planOpen = ref(false)

const currentPlanLabel = computed(() => (isPremium.value ? 'premium' : 'free'))

// Approximate end date using remainingDays provided by subscription store
const premiumEndsOn = computed(() => {
  const days = Number(subStore.subscription?.remainingDays || 0)
  if (!days || !isPremium.value) return ''
  const dt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return dt.toLocaleDateString()
})
</script>

<style scoped>
section h2 {
  color: #f8fafc;
}
</style>
