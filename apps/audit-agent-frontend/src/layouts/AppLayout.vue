<template>
  <FeedbackPrompt />
  <FeedbackDrawer />
  <SetupPrompt
    v-if="isReady"
    :open="quickSetupStore.quickSetupOpen"
    :launch-source="quickSetupStore.quickSetupLaunchSource"
    @close="handleQuickSetupClose"
    @done="handleQuickSetupDone"
    @updated="handleQuickSetupUpdated"
  />
  <transition name="fade">
    <div
      v-if="showLogoutOverlay"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-6 backdrop-blur-xl"
    >
      <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/85 p-8 text-center shadow-2xl">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/20 to-indigo-500/20">
          <div class="h-8 w-8 rounded-full border-2 border-white/20 border-t-fuchsia-300 animate-spin"></div>
        </div>
        <h2 class="mt-5 text-2xl font-semibold text-white">Logging you out…</h2>
        <p class="mt-2 text-sm text-indigo-100/75">
          Clearing your session and taking you back to sign in.
        </p>
      </div>
    </div>
  </transition>
  <div
    class="app-shell flex w-full max-w-full overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white"
    :class="{
      'app-shell--document-scroll': usesDocumentScrollShell,
      'app-shell--overlay-sidebar': usesOverlaySidebar,
    }"
  >
    <template v-if="!isShellReady">
      <div class="flex flex-1" aria-hidden="true"></div>
    </template>
    <template v-else>
    <!-- Global upgrade banner -->
    <!-- Global Upgrade Banner -->
    <div v-if="showUpgrade" class="app-upgrade-banner fixed top-0 left-0 right-0 z-50 px-3 sm:px-6">
      <div
        class="bg-gradient-to-r from-fuchsia-600/40 via-purple-600/40 to-indigo-600/40 backdrop-blur-xl border border-fuchsia-400/30 text-white rounded-b-xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-3 px-3 sm:px-5 animate-fade-in"
      >
        <span class="text-sm sm:text-base font-medium text-center sm:text-left">
          {{ upgradeBannerMessage }}
        </span>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="!isGuest"
            :to="billingRoutePath"
            @click="trackUpgradeClick"
            class="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:scale-105 transition-transform shadow-md"
          >
            {{ upgradeBannerLabel }}
          </RouterLink>
          <RouterLink
            v-else
            to="/login"
            class="bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-600 text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:scale-105 transition-transform shadow-md"
          >
            Sign in
          </RouterLink>

          <button
            @click="planOpen = true"
            class="border border-fuchsia-300/60 text-fuchsia-200 text-sm px-3 py-1.5 rounded-lg hover:bg-fuchsia-500/10 hover:text-white transition-colors"
          >
            View Plan
          </button>

          <button
            @click="showUpgrade = false"
            class="text-sm text-gray-300 px-2 py-1 hover:text-white hover:bg-fuchsia-400/20 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
    <!-- Sidebar (desktop only) -->
    <aside
      v-if="showsDesktopSidebar"
      class="app-desktop-sidebar flex h-full w-72 flex-col border-r border-white/10 bg-gray-950/92 p-4 backdrop-blur-2xl"
    >
      <div class="mb-6 flex items-center gap-3">
        <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="h-9 w-9" />
        <div class="min-w-0">
          <div class="truncate text-lg font-semibold text-white">PlanCraftAI</div>
          <div class="text-[11px] uppercase tracking-[0.28em] text-slate-500">Workspace OS</div>
        </div>
      </div>

      <nav class="flex-1 space-y-3 overflow-y-auto scrollbar-plan">
        <div class="space-y-1">
          <RouterLink
            v-for="item in coreNavItems"
            :key="item.to"
            :to="item.to"
            :class="navLinkClasses(item.to, true)"
            :aria-label="item.label"
          >
            <span
              class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-fuchsia-300 via-violet-300 to-sky-300 transition-all duration-200"
              :class="isActive(item.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'"
            ></span>
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <SidebarIcon
                :name="item.iconName"
                class="h-5 w-5"
                :class="iconClasses(isActive(item.to))"
              />
            </span>
            <span class="truncate font-medium">{{ item.label }}</span>
          </RouterLink>
        </div>

        <div class="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div class="space-y-1">
          <div class="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500">
            Organize
          </div>
          <RouterLink
            v-for="item in organizeNavItems"
            :key="item.to"
            :to="item.to"
            :class="navLinkClasses(item.to, true)"
            :aria-label="item.label"
          >
            <span
              class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-fuchsia-300 via-violet-300 to-sky-300 transition-all duration-200"
              :class="isActive(item.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'"
            ></span>
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <SidebarIcon
                :name="item.iconName"
                class="h-5 w-5"
                :class="iconClasses(isActive(item.to))"
              />
            </span>
            <span class="truncate font-medium">{{ item.label }}</span>
          </RouterLink>
        </div>

        <div class="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div class="space-y-2">
          <button
            type="button"
            :class="groupButtonClasses({ key: 'advanced', children: filteredNavGroups }, true)"
            @click="handleAdvancedToggle"
          >
            <span class="flex min-w-0 items-center gap-3">
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                <SidebarIcon
                  name="sparkles"
                  class="h-5 w-5"
                  :class="iconClasses(advancedSectionOpen)"
                />
              </span>
              <span class="truncate font-medium">Advanced</span>
            </span>
            <SidebarIcon
              :name="advancedSectionOpen ? 'chevron-down' : 'chevron-right'"
              class="h-4 w-4 shrink-0 text-slate-500"
            />
          </button>

          <div v-show="advancedSectionOpen" class="space-y-2">
            <div v-for="group in filteredNavGroups" :key="group.key" class="space-y-1">
              <button
                v-if="group.collapsible"
                type="button"
                :class="groupButtonClasses(group, true)"
                @click="handleGroupToggle(group.key)"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                    <SidebarIcon
                      :name="group.iconName"
                      class="h-5 w-5"
                      :class="iconClasses(isGroupActive(group) || openGroups[group.key])"
                    />
                  </span>
                  <span class="min-w-0 flex-1 text-left">
                    <span class="flex items-center gap-2 font-medium">
                      <span class="truncate">{{ group.title }}</span>
                      <span v-if="group.beta" class="beta-pill">Beta</span>
                    </span>
                  </span>
                </span>
                <SidebarIcon
                  :name="openGroups[group.key] ? 'chevron-down' : 'chevron-right'"
                  class="h-4 w-4 shrink-0 text-slate-500"
                />
              </button>
              <div
                v-show="openGroups[group.key]"
                class="ml-5 space-y-1 border-l border-white/8 pl-4"
              >
                <RouterLink
                  v-for="item in group.children"
                  :key="item.to"
                  :to="item.to"
                  :class="childLinkClasses(item.to)"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
                  <span class="truncate">{{ item.label }}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <div class="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div class="space-y-1">
          <RouterLink
            v-for="item in systemLinks"
            :key="item.to"
            :to="item.to"
            :class="navLinkClasses(item.to, true)"
            :aria-label="item.label"
          >
            <span
              class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-fuchsia-300 via-violet-300 to-sky-300 transition-all duration-200"
              :class="isActive(item.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'"
            ></span>
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
              <SidebarIcon
                :name="item.iconName"
                class="h-5 w-5"
                :class="iconClasses(isActive(item.to))"
              />
            </span>
            <span class="truncate font-medium">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="mt-4 border-t border-white/8 pt-4">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur">
          <div class="grid gap-1" :style="{ gridTemplateColumns: footerUtilityColumns }">
            <RouterLink
              v-for="item in footerUtilityLinks"
              :key="item.to"
              :to="item.to"
              :class="utilityLinkClasses(item.to)"
              :title="item.label"
            >
              <SidebarIcon
                :name="item.iconName"
                class="h-5 w-5"
                :class="iconClasses(isActive(item.to))"
              />
            </RouterLink>
            <button
              v-if="!isGuest"
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-transparent px-3 py-2 text-red-400 transition-all duration-200 hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
              title="Logout"
              aria-label="Logout"
              @click="handleLogout"
            >
              <SidebarIcon name="logout" class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile drawer -->
    <transition name="slide">
      <aside
        v-if="mobileMenu"
        class="fixed inset-0 z-40 bg-black/50"
        @click.self="mobileMenu = false"
      >
        <div class="app-mobile-drawer absolute bottom-0 left-0 top-0 flex w-72 flex-col border-r border-white/10 bg-gray-950/92 p-4 backdrop-blur-2xl">
          <div class="mb-6 flex items-center justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="h-9 w-9" />
              <div class="min-w-0">
                <div class="truncate text-lg font-semibold text-white">PlanCraftAI</div>
                <div class="text-[11px] uppercase tracking-[0.28em] text-slate-500">Workspace OS</div>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              @click="mobileMenu = false"
            >
              <SidebarIcon name="x" class="h-5 w-5" />
            </button>
          </div>

          <nav class="flex-1 space-y-3 overflow-y-auto scrollbar-plan">
            <div class="space-y-1">
              <RouterLink
                v-for="item in coreNavItems"
                :key="item.to"
                :to="item.to"
                :class="navLinkClasses(item.to, true)"
                @click="mobileMenu = false"
              >
                <span
                  class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-fuchsia-300 via-violet-300 to-sky-300 transition-all duration-200"
                  :class="isActive(item.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'"
                ></span>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                  <SidebarIcon
                    :name="item.iconName"
                    class="h-5 w-5"
                    :class="iconClasses(isActive(item.to))"
                  />
                </span>
                <span class="truncate font-medium">{{ item.label }}</span>
              </RouterLink>
            </div>

            <div class="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div class="space-y-1">
              <div class="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500">
                Organize
              </div>
              <RouterLink
                v-for="item in organizeNavItems"
                :key="item.to"
                :to="item.to"
                :class="navLinkClasses(item.to, true)"
                @click="mobileMenu = false"
              >
                <span
                  class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-fuchsia-300 via-violet-300 to-sky-300 transition-all duration-200"
                  :class="isActive(item.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'"
                ></span>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                  <SidebarIcon
                    :name="item.iconName"
                    class="h-5 w-5"
                    :class="iconClasses(isActive(item.to))"
                  />
                </span>
                <span class="truncate font-medium">{{ item.label }}</span>
              </RouterLink>
            </div>

            <div class="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div class="space-y-2">
              <button
                type="button"
                :class="groupButtonClasses({ key: 'advanced-mobile', children: filteredNavGroups }, true)"
                @click="advancedSectionOpen = !advancedSectionOpen"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                    <SidebarIcon
                      name="sparkles"
                      class="h-5 w-5"
                      :class="iconClasses(advancedSectionOpen)"
                    />
                  </span>
                  <span class="truncate font-medium">Advanced</span>
                </span>
                <SidebarIcon
                  :name="advancedSectionOpen ? 'chevron-down' : 'chevron-right'"
                  class="h-4 w-4 shrink-0 text-slate-500"
                />
              </button>

              <div v-show="advancedSectionOpen" class="space-y-2">
                <div v-for="group in filteredNavGroups" :key="group.key" class="space-y-1">
                  <button
                    v-if="group.collapsible"
                    type="button"
                    :class="groupButtonClasses(group, true)"
                    @click="toggleGroup(group.key)"
                  >
                    <span class="flex min-w-0 items-center gap-3">
                      <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                        <SidebarIcon
                          :name="group.iconName"
                          class="h-5 w-5"
                          :class="iconClasses(isGroupActive(group) || openGroups[group.key])"
                        />
                      </span>
                      <span class="min-w-0 flex-1 text-left">
                        <span class="flex items-center gap-2 font-medium">
                          <span class="truncate">{{ group.title }}</span>
                          <span v-if="group.beta" class="beta-pill">Beta</span>
                        </span>
                      </span>
                    </span>
                    <SidebarIcon
                      :name="openGroups[group.key] ? 'chevron-down' : 'chevron-right'"
                      class="h-4 w-4 shrink-0 text-slate-500"
                    />
                  </button>
                  <div
                    v-show="openGroups[group.key]"
                    class="ml-5 space-y-1 border-l border-white/8 pl-4"
                  >
                    <RouterLink
                      v-for="item in group.children"
                      :key="item.to"
                      :to="item.to"
                      :class="childLinkClasses(item.to)"
                      @click="mobileMenu = false"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
                      <span class="truncate">{{ item.label }}</span>
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>

            <div class="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div class="space-y-1">
              <RouterLink
                v-for="item in systemLinks"
                :key="item.to"
                :to="item.to"
                :class="navLinkClasses(item.to, true)"
                @click="mobileMenu = false"
              >
                <span
                  class="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-fuchsia-300 via-violet-300 to-sky-300 transition-all duration-200"
                  :class="isActive(item.to) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'"
                ></span>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                  <SidebarIcon
                    :name="item.iconName"
                    class="h-5 w-5"
                    :class="iconClasses(isActive(item.to))"
                  />
                </span>
                <span class="truncate font-medium">{{ item.label }}</span>
              </RouterLink>
            </div>
          </nav>

          <div class="mt-4 border-t border-white/8 pt-4">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur">
              <div class="grid gap-1" :style="{ gridTemplateColumns: footerUtilityColumns }">
                <RouterLink
                  v-for="item in footerUtilityLinks"
                  :key="item.to"
                  :to="item.to"
                  :class="utilityLinkClasses(item.to)"
                  :title="item.label"
                  @click="mobileMenu = false"
                >
                  <SidebarIcon
                    :name="item.iconName"
                    class="h-5 w-5"
                    :class="iconClasses(isActive(item.to))"
                  />
                </RouterLink>
                <button
                  v-if="!isGuest"
                  type="button"
                  class="inline-flex items-center justify-center rounded-xl border border-transparent px-3 py-2 text-red-400 transition-all duration-200 hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
                  title="Logout"
                  aria-label="Logout"
                  @click="mobileMenu = false; handleLogout()"
                >
                  <SidebarIcon name="logout" class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- Main Content -->
    <div
      class="app-main-pane flex-1 flex min-w-0 min-h-0 flex-col w-full max-w-full overflow-hidden"
      :class="{ 'app-main-pane--document-scroll': usesDocumentScrollShell }"
    >
      <!-- Header -->
      <header
        class="app-header sticky top-0 z-10 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 p-4 flex justify-between items-center w-full"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <!-- Hamburger (mobile only) -->
          <button
            v-if="showsOverlaySidebar"
            class="p-2 hover:bg-gray-800 rounded"
            @click="mobileMenu = !mobileMenu"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div class="header-title flex items-center gap-2 min-w-0">
            <h2 class="text-lg sm:text-2xl font-semibold capitalize truncate max-w-[36vw]">
              {{ $route.name }}
            </h2>
            <button
              v-if="activeWorkspace?.name"
              type="button"
              class="workspace-switcher hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-indigo-500/60 bg-indigo-500/10 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20 transition"
              @click="router.push('/workspaces')"
            >
              <span aria-hidden="true">📦</span>
              <span class="truncate max-w-[12rem]">
                {{ activeWorkspace.name }}
              </span>
              <span aria-hidden="true">▼</span>
            </button>
          </div>
        </div>

        <!-- Right Section -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <!-- Talk to Planner shortcut -->
          <button
            @click="goToTalkPlanner"
            :class="[
              'flex items-center justify-center rounded-full border p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400',
              isOnTalkPlanner
                ? 'bg-indigo-500/40 border-indigo-300 text-white'
                : 'bg-indigo-500/15 border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/25'
            ]"
            title="Talk to Planner"
            aria-label="Talk to Planner"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8"
              />
            </svg>
          </button>

          <!-- Feedback shortcut -->
          <!-- <button
            @click="openFeedback"
            class="hidden sm:flex items-center justify-center rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 p-2 text-fuchsia-100 transition hover:bg-fuchsia-500/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            title="Share feedback"
          >
            💬
          </button> -->

          <!-- Upgrade Button / Pro Badge -->
          <div v-if="authReady" class="flex items-center gap-2 whitespace-nowrap">
            <template v-if="isPremium">
              <el-tooltip content="You're on the Premium Plan!" placement="bottom">
                <RouterLink
                  :to="billingRoutePath"
                  class="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-purple-600 hover:to-pink-700 transition"
                >
                  🧠 Pro
                </RouterLink>
                <!-- <span class="bg-gradient-to-r from-purple-700 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm">🧠 Pro</span> -->
              </el-tooltip>
            </template>
            <template v-else>
              <span
                v-if="showFreePlanHeaderBadge"
                :class="freePlanBadgeClasses"
                :title="upgradePillTitle"
              >
                Free Plan
              </span>
              <RouterLink
                v-else-if="!isGuest"
                :to="billingRoutePath"
                :class="upgradePillClasses"
                :title="upgradePillTitle"
              >
                {{ upgradePillLabel }}
              </RouterLink>
              <button
                v-else
                @click="goToLogin"
                class="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-indigo-500 hover:to-blue-500 transition animate-pulse-slow"
              >
                🔑 Sign in
              </button>
            </template>
          </div>
          <div
            v-else
            class="w-[88px] h-8 rounded-full bg-white/10 animate-pulse"
            aria-hidden="true"
          ></div>

          <!-- User Avatar -->
          <button
            v-if="authStore.isLoggedIn"
            type="button"
            class="rounded-full transition focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            aria-label="Open profile settings"
            @click="router.push('/settings')"
          >
            <UserAvatar
              :src="authStore.user?.photoURL || authStore.user?.avatarUrl"
              :name="authStore.user?.displayName || authStore.user?.name"
              :email="authStore.user?.email"
              alt="Profile avatar"
              size-class="h-10 w-10"
              text-class="text-sm"
            />
          </button>

          <!-- Logout removed from header per guidelines -->
        </div>
      </header>

      <!-- Dynamic content -->
      <main
        class="app-content flex-1 min-h-0"
        :class="[
          isOnTalkPlanner
            ? 'overflow-hidden p-0'
            : 'overflow-y-auto overflow-x-hidden scrollbar-plan p-6',
          { 'app-content--document-scroll': usesDocumentScrollShell },
        ]"
      >
        <div
          v-if="showWorkspaceRecovery"
          class="mx-auto flex min-h-[55vh] w-full max-w-2xl items-center justify-center"
        >
          <div class="w-full rounded-3xl border border-white/10 bg-slate-950/30 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div class="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200/70">Workspace</div>
            <h2 class="mt-3 text-3xl font-semibold text-white">Workspace still loading</h2>
            <p class="mt-3 text-sm text-indigo-100/80">
              We restored your session, but this device still needs a workspace before tasks and planning can load.
            </p>
            <p v-if="workspaceStore.error" class="mt-3 text-sm text-amber-200/90">
              {{ workspaceStore.error }}
            </p>
            <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                @click="ensureWorkspaceHydrated"
              >
                Retry workspace load
              </button>
              <button
                type="button"
                class="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
                @click="router.push('/workspaces')"
              >
                Open workspaces
              </button>
            </div>
          </div>
        </div>
        <RouterView v-else />
      </main>
      <!-- Compact sticky footer -->
      <footer
        class="app-footer py-3 text-center text-xs sm:text-sm text-indigo-300 bg-slate-950/95 border-t border-gray-800"
      >
        <div
          class="max-w-7xl mx-auto px-4 flex items-center justify-center sm:justify-between gap-3"
        >
          <div class="hidden sm:flex items-center gap-2">
            <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="w-6 h-6" />
            <span class="opacity-80">PlanCraftAI</span>
          </div>
          <div class="flex items-center gap-4">
            <RouterLink to="/blog" class="hover:underline">Blog</RouterLink>
            <RouterLink to="/privacy" class="hover:underline">Privacy</RouterLink>
            <RouterLink to="/terms" class="hover:underline">Terms</RouterLink>
            <RouterLink to="/contact" class="hover:underline">Contact</RouterLink>
            <a href="mailto:careers@plancraftai.com" class="hover:underline hidden sm:inline"
              >Careers</a
            >
          </div>
        </div>
      </footer>
      <PlanSummaryModal :open="planOpen" @close="planOpen = false" />
      <ProfileSetup :open="profileSetupOpen" @close="profileSetupOpen=false" @saved="onProfileSaved" />
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed, reactive, defineComponent, h } from 'vue'
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import FeedbackPrompt from '@/components/feedback/FeedbackPrompt.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'
import SetupPrompt from '@/components/SetupPrompt.vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { useAppReady } from '@/composables/useAppReady'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import PlanSummaryModal from '@/components/PlanSummaryModal.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { db } from '@/firebase/init'
import { doc, setDoc } from 'firebase/firestore'
import { trackLinkedInConversion } from '@/utils/ads'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ElMessage } from 'element-plus'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { fetchUserProfile } from '@/services/authService'

const SidebarIcon = defineComponent({
  name: 'SidebarIcon',
  inheritAttrs: false,
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs }) {
    const renderSvg = (children) =>
      h(
        'svg',
        {
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor',
          'stroke-width': '1.8',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
          ...attrs,
        },
        children,
      )

    return () => {
      switch (props.name) {
        case 'dashboard':
          return renderSvg([
            h('rect', { x: '4', y: '4', width: '6', height: '6', rx: '1.5' }),
            h('rect', { x: '14', y: '4', width: '6', height: '6', rx: '1.5' }),
            h('rect', { x: '4', y: '14', width: '6', height: '6', rx: '1.5' }),
            h('rect', { x: '14', y: '14', width: '6', height: '6', rx: '1.5' }),
          ])
        case 'compass':
          return renderSvg([
            h('circle', { cx: '12', cy: '12', r: '8.5' }),
            h('path', { d: 'M14.8 9.2l-1.9 5.6-5.7 1.9 1.9-5.6 5.7-1.9z' }),
          ])
        case 'book-open':
          return renderSvg([
            h('path', { d: 'M12 6.5c-1.8-1.3-4-2-6.5-2v14c2.5 0 4.7.7 6.5 2' }),
            h('path', { d: 'M12 6.5c1.8-1.3 4-2 6.5-2v14c-2.5 0-4.7.7-6.5 2' }),
            h('path', { d: 'M12 6.5v14' }),
          ])
        case 'calendar':
          return renderSvg([
            h('rect', { x: '3.75', y: '5.75', width: '16.5', height: '14.5', rx: '2.5' }),
            h('path', { d: 'M7.5 3.75v4M16.5 3.75v4M3.75 9.25h16.5' }),
          ])
        case 'link':
          return renderSvg([
            h('path', { d: 'M10 14l-2 2a3 3 0 01-4.25-4.25l2.75-2.75A3 3 0 0110.5 9' }),
            h('path', { d: 'M14 10l2-2a3 3 0 114.25 4.25l-2.75 2.75A3 3 0 0113.5 15' }),
            h('path', { d: 'M9 15l6-6' }),
          ])
        case 'bell':
          return renderSvg([
            h('path', { d: 'M6.75 15.75h10.5l-1.1-1.2a2.75 2.75 0 01-.73-1.85V10a3.42 3.42 0 10-6.84 0v2.7c0 .7-.26 1.38-.73 1.9l-1.1 1.15z' }),
            h('path', { d: 'M9.75 17.25a2.25 2.25 0 004.5 0' }),
          ])
        case 'file-text':
          return renderSvg([
            h('path', { d: 'M8.25 3.75h6l4.5 4.5v11.5A2.25 2.25 0 0116.5 22h-8A2.25 2.25 0 016.25 19.75v-13.75A2.25 2.25 0 018.5 3.75z' }),
            h('path', { d: 'M14.25 3.75v4.5h4.5M9.5 12h5M9.5 15.5h5M9.5 19h3.5' }),
          ])
        case 'bar-chart':
          return renderSvg([
            h('path', { d: 'M4.5 19.5h15' }),
            h('path', { d: 'M8 19.5v-7' }),
            h('path', { d: 'M12 19.5v-10.5' }),
            h('path', { d: 'M16 19.5v-4.5' }),
          ])
        case 'sparkles':
          return renderSvg([
            h('path', { d: 'M12 3.75l1.2 3.55L16.75 8.5l-3.55 1.2L12 13.25l-1.2-3.55L7.25 8.5l3.55-1.2L12 3.75z' }),
            h('path', { d: 'M18.25 14.25l.7 2.05 2.05.7-2.05.7-.7 2.05-.7-2.05-2.05-.7 2.05-.7.7-2.05z' }),
            h('path', { d: 'M6 14.5l.9 2.55L9.45 18 6.9 18.95 6 21.5l-.9-2.55L2.55 18l2.55-.95L6 14.5z' }),
          ])
        case 'settings':
          return renderSvg([
            h('circle', { cx: '12', cy: '12', r: '3.2' }),
            h('path', { d: 'M12 3.75v2.5M12 17.75v2.5M20.25 12h-2.5M6.25 12h-2.5M17.84 6.16l-1.8 1.8M7.96 16.04l-1.8 1.8M17.84 17.84l-1.8-1.8M7.96 7.96l-1.8-1.8' }),
          ])
        case 'box':
          return renderSvg([
            h('path', { d: 'M4.5 7.5L12 3.75l7.5 3.75M4.5 7.5V16.5L12 20.25m0-16.5v16.5m0 0l7.5-3.75V7.5' }),
            h('path', { d: 'M8.25 5.63l7.5 3.75' }),
          ])
        case 'palette':
          return renderSvg([
            h('path', { d: 'M12 4.25c-4.55 0-8.25 3.36-8.25 7.5S7.45 19.25 12 19.25h.75a2.25 2.25 0 002.25-2.25c0-1.1.9-2 2-2h.5a3.75 3.75 0 003.75-3.75c0-3.87-4.14-7-9.25-7z' }),
            h('circle', { cx: '7.9', cy: '10.2', r: '0.7' }),
            h('circle', { cx: '10.8', cy: '8.1', r: '0.7' }),
            h('circle', { cx: '14.1', cy: '8.25', r: '0.7' }),
            h('circle', { cx: '16.35', cy: '10.7', r: '0.7' }),
          ])
        case 'briefcase':
          return renderSvg([
            h('rect', { x: '4', y: '7', width: '16', height: '12', rx: '2.25' }),
            h('path', { d: 'M9 7V5.75A1.75 1.75 0 0110.75 4h2.5A1.75 1.75 0 0115 5.75V7M4 11.25h16' }),
          ])
        case 'credit-card':
          return renderSvg([
            h('rect', { x: '3.5', y: '5.5', width: '17', height: '13', rx: '2.25' }),
            h('path', { d: 'M3.5 10h17M7.25 14.5h3.5' }),
          ])
        case 'message-circle':
          return renderSvg([
            h('path', { d: 'M12 4.25c-4.42 0-8 3.13-8 7s3.58 7 8 7c.86 0 1.69-.12 2.47-.35L19.5 19l-1.14-3.63A6.45 6.45 0 0020 11.25c0-3.87-3.58-7-8-7z' }),
          ])
        case 'shield':
          return renderSvg([
            h('path', { d: 'M12 3.75l6 2.25v5.38c0 4.02-2.54 7.67-6 8.87-3.46-1.2-6-4.85-6-8.87V6l6-2.25z' }),
            h('path', { d: 'M9.75 12l1.5 1.5 3-3.5' }),
          ])
        case 'logout':
          return renderSvg([
            h('path', { d: 'M4.75 3.75h9.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5h-9.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z' }),
            h('path', { d: 'M10 12h10m0 0-3-3m3 3-3 3' }),
          ])
        case 'chevron-right':
          return renderSvg([h('path', { d: 'M9 6l6 6-6 6' })])
        case 'chevron-down':
          return renderSvg([h('path', { d: 'M6 9l6 6 6-6' })])
        case 'x':
          return renderSvg([h('path', { d: 'M6 6l12 12M18 6L6 18' })])
        default:
          return renderSvg([h('circle', { cx: '12', cy: '12', r: '8' })])
      }
    }
  },
})
const currentUserId = ref(null)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)
const coarseTouchViewport = ref(false)
const likelyIpadViewport = ref(false)
let storageHandler = null
let viewportChangeHandler = null

function detectCoarseTouchViewport() {
  if (typeof window === 'undefined') return false
  try {
    return !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches
  } catch {}
  return false
}

function detectLikelyIpadViewport() {
  if (typeof window === 'undefined') return false
  try {
    const ua = navigator.userAgent || ''
    if (/iPad/i.test(ua)) return true
    return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  } catch {}
  return false
}

function updateViewportLayoutState() {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
  coarseTouchViewport.value = detectCoarseTouchViewport()
  likelyIpadViewport.value = detectLikelyIpadViewport()
}

function deriveUidFromStorage() {
  try {
    const direct = localStorage.getItem('uid')
    if (direct) return direct
    const userRaw = localStorage.getItem('user') || localStorage.getItem('auth') || localStorage.getItem('authUser')
    if (userRaw) {
      const obj = JSON.parse(userRaw)
      if (obj && (obj.uid || obj.id)) return obj.uid || obj.id
    }
  } catch (_) {}
  return null
}

onMounted(() => {
  updateViewportLayoutState()
  currentUserId.value = deriveUidFromStorage()
  quickSetupStore.refreshQuickSetupState()
  storageHandler = () => {
    currentUserId.value = deriveUidFromStorage()
  }
  viewportChangeHandler = () => {
    updateViewportLayoutState()
  }
  window.addEventListener('storage', storageHandler)
  window.addEventListener('resize', viewportChangeHandler)
  window.addEventListener('orientationchange', viewportChangeHandler)
  navGroups.forEach((g) => {
    openGroups[g.key] = g.defaultOpen ?? true
  })
  // Optional auto-registration if permission already granted
  setTimeout(async () => {
    try {
      if (isNativePackagedApp()) return
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const uid = currentUserId.value
        if (uid && !(await hasSubscription())) {
          await registerPushSubscription(String(uid))
        }
      }
    } catch (_) {}
  }, 0)
  // Initial check for profile completion
  try { maybePromptProfile() } catch {}
})

const mobileMenu = ref(false) // mobile drawer toggle
const showUpgrade = ref(false)
const planOpen = ref(false)
const profileSetupOpen = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const quickSetupStore = useQuickSetupStore()
const featureFlagsStore = useFeatureFlagsStore()
// Subscription state via store
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()
const feedbackStore = useFeedbackStore()
const { isPremium, isGuest } = useAuthFlags()
const { isReady, isShellReady, isAuthReady, isWorkspaceHydrated, hasResolvedWorkspace } = useAppReady()
const authReady = computed(() => !authStore.bootstrapping)
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || {})
const activeWorkspaceSettings = computed(() => activeWorkspace.value?.settings || {})
const playbooksEnabled = computed(() => featureFlagsStore.isEnabled('PLAYBOOKS'))
const autoDeployEnabled = computed(() => featureFlagsStore.isEnabled('AUTO_DEPLOY'))
const showLogoutOverlay = computed(() => authStore.logoutPending === true)
let lastWorkspaceInitKickAt = 0
const workspaceRetryCount = ref(0)
let workspaceRetryTimer = null
const showWorkspaceRecovery = computed(
  () =>
    !!isShellReady.value &&
    !isGuest.value &&
    !hasResolvedWorkspace.value,
)

const isOnTalkPlanner = computed(() => route.path === '/talk-to-planner')
const usesOverlaySidebar = computed(
  () =>
    viewportWidth.value < 768 ||
    likelyIpadViewport.value ||
    (coarseTouchViewport.value && viewportWidth.value <= 1200),
)
const showsDesktopSidebar = computed(
  () => viewportWidth.value >= 768 && !usesOverlaySidebar.value,
)
const showsOverlaySidebar = computed(() => usesOverlaySidebar.value)
const usesDocumentScrollShell = computed(
  () =>
    !isOnTalkPlanner.value &&
    (
      (likelyIpadViewport.value && viewportWidth.value <= 1400) ||
      (coarseTouchViewport.value && viewportWidth.value <= 1024)
    ),
)
let upgradeHandler = null
const SUBSCRIPTION_REFRESH_INTERVAL_MS = 5 * 60 * 1000

function handleQuickSetupUpdated(nextState = null) {
  quickSetupStore.refreshQuickSetupState(nextState)
}

function handleQuickSetupClose() {
  quickSetupStore.refreshQuickSetupState()
  quickSetupStore.closeQuickSetup()
}

function handleQuickSetupDone() {
  quickSetupStore.refreshQuickSetupState()
  quickSetupStore.closeQuickSetup()
}

async function ensureWorkspaceHydrated() {
  if (authStore.logoutPending) {
    clearWorkspaceRetryTimer()
    workspaceRetryCount.value = 0
    return
  }
  const uid = authStore.user?.uid
  if (!uid) {
    workspaceRetryCount.value = 0
    workspaceStore.reset()
    return
  }
  if (!authStore.token && !isGuest.value) return
  if (workspaceStore.loading) return
  if (workspaceStore.hydrated && workspaceStore.activeWorkspaceId) {
    workspaceRetryCount.value = 0
    return
  }
  const now = Date.now()
  if (now - lastWorkspaceInitKickAt < 1500) return
  lastWorkspaceInitKickAt = now
  try {
    await workspaceStore.init(uid)
    if (workspaceStore.activeWorkspaceId) {
      workspaceRetryCount.value = 0
    }
  } catch {
    /* noop */
  }
}

function clearWorkspaceRetryTimer() {
  if (!workspaceRetryTimer) return
  try {
    clearTimeout(workspaceRetryTimer)
  } catch {}
  workspaceRetryTimer = null
}

function scheduleWorkspaceHydrationRetry() {
  clearWorkspaceRetryTimer()
  if (authStore.logoutPending || !isAuthReady.value || hasResolvedWorkspace.value) {
    workspaceRetryCount.value = 0
    return
  }
  if (workspaceStore.loading) return
  if (workspaceRetryCount.value >= 6) return

  const delay = Math.min(1500 * (workspaceRetryCount.value + 1), 6000)
  workspaceRetryTimer = setTimeout(async () => {
    workspaceRetryTimer = null
    workspaceRetryCount.value += 1
    await ensureWorkspaceHydrated()
    if (!hasResolvedWorkspace.value) {
      scheduleWorkspaceHydrationRetry()
    }
  }, delay)
}

// Prompt for profile setup if incomplete + hydrate workspace store
watch(
  () => [authStore.user?.uid, authStore.token, authStore.logoutPending],
  ([uid, token, logoutPending], previous = []) => {
    const [prevUid, prevToken, prevLogoutPending] = previous
    if (logoutPending) {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      return
    }
    if (uid && token) {
      maybePromptProfile()
      ensureWorkspaceHydrated()
      const gainedSession = uid !== prevUid || (!!token && !prevToken) || prevLogoutPending
      if (gainedSession) {
        accessStore.fetchAccess(uid, { minIntervalMs: SUBSCRIPTION_REFRESH_INTERVAL_MS }).catch(() => {})
        subStore.fetchStatus(uid, { minIntervalMs: SUBSCRIPTION_REFRESH_INTERVAL_MS }).catch(() => {})
      }
      scheduleWorkspaceHydrationRetry()
    } else {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      accessStore.reset()
      workspaceStore.reset()
    }
  },
  { immediate: true },
)

watch(
  () => [isAuthReady.value, isWorkspaceHydrated.value, hasResolvedWorkspace.value, workspaceStore.loading, workspaceStore.error, authStore.logoutPending],
  ([authReadyNow, workspaceHydratedNow, workspaceResolvedNow, workspaceLoading, _workspaceError, logoutPending]) => {
    if (logoutPending || !authReadyNow) {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      return
    }
    if (workspaceResolvedNow) {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      return
    }
    if (!workspaceHydratedNow && workspaceLoading) return
    if (workspaceLoading) return
    scheduleWorkspaceHydrationRetry()
  },
  { immediate: true },
)

// Toast when workspace context changes (desktop + mobile)
watch(
  () => workspaceStore.activeWorkspaceId,
  (next, prev) => {
    if (!prev || !next || next === prev) return
    const name = workspaceStore.activeWorkspace?.name
    if (!name) return
    try {
      ElMessage.success(`Switched to workspace: ${name}`)
    } catch {
      /* noop */
    }
  },
)

async function maybePromptProfile() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    // Do not show for guests
    if (authStore?.isGuest || authStore?.guest === true) return
    const localKey = `profile_setup_done:${uid}`
    if (localStorage.getItem(localKey) === '1') return
    const data = await fetchUserProfile(uid)
    if (!data || typeof data !== 'object' || !Object.keys(data).length) {
      const ref = doc(db, 'users', uid)
      // Only prompt for phone-based accounts
      await setDoc(ref, { createdAt: new Date(), updatedAt: new Date(), profileComplete: false }, { merge: true })
      // Without a doc we don't yet know the mode; don't show until next fetch
      return
    }
    const signInMethod = String(data.mode || authStore?.user?.mode || authStore?.user?.signInMethod || '').toLowerCase()
    const isPhone = signInMethod === 'phone'
    const complete = !!data.profileComplete || !!data.name
    if (isPhone && !complete) {
      profileSetupOpen.value = true
    }
  } catch {}
}

function onProfileSaved() {
  try {
    const uid = authStore?.user?.uid
    if (uid) localStorage.setItem(`profile_setup_done:${uid}`, '1')
  } catch {}
}

function toggleGroup(key) {
  openGroups[key] = !openGroups[key]
}

function isActive(path) {
  const target = String(path || '').trim()
  if (!target) return false
  const [pathname, search = ''] = target.split('?')
  if (!pathname || !route.path.startsWith(pathname)) return false
  if (!search) return true

  try {
    const expectedParams = new URLSearchParams(search)
    return Array.from(expectedParams.entries()).every(([key, value]) => String(route.query?.[key] ?? '') === value)
  } catch {
    return route.path.startsWith(pathname)
  }
}

function isGroupActive(group) {
  return Array.isArray(group?.children) && group.children.some((child) => isActive(child.to))
}

function iconClasses(active = false) {
  return active
    ? 'text-indigo-100'
    : 'text-slate-400 transition-colors duration-200 group-hover:text-indigo-200'
}

function navLinkClasses(path, expanded = true) {
  const active = isActive(path)
  return [
    'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border text-sm transition-all duration-200',
    expanded ? 'justify-start px-3.5 py-2.5' : 'justify-center px-2 py-2.5',
    active
      ? 'border-indigo-400/30 bg-gradient-to-r from-fuchsia-500/16 via-indigo-500/18 to-transparent text-white shadow-[0_12px_34px_rgba(79,70,229,0.18)]'
      : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
  ]
}

function childLinkClasses(path) {
  const active = isActive(path)
  return [
    'group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200',
    active
      ? 'bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
  ]
}

function groupButtonClasses(group, expanded = true) {
  const active = isGroupActive(group)
  const open = !!openGroups[group.key]
  return [
    'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border text-sm transition-all duration-200',
    expanded ? 'justify-between px-3 py-2.5' : 'justify-center px-2 py-2.5',
    active || open
      ? 'border-white/10 bg-white/5 text-white'
      : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
  ]
}

function utilityLinkClasses(path) {
  const active = isActive(path)
  return [
    'group inline-flex items-center justify-center rounded-xl border px-3 py-2 transition-all duration-200',
    active
      ? 'border-indigo-400/30 bg-indigo-500/16 text-white'
      : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white',
  ]
}

const coreNavItems = computed(() => {
  const items = [
    { label: 'Dashboard', iconName: 'dashboard', to: '/dashboard' },
    { label: 'Planner', iconName: 'compass', to: '/planner' },
    { label: 'Playbooks', iconName: 'book-open', to: '/playbooks', enabled: playbooksEnabled.value },
  ]
  return items.filter((item) => item.enabled !== false)
})

const organizeNavItems = computed(() => [
  { label: 'Meetings', iconName: 'calendar', to: '/meetings' },
  { label: 'Links', iconName: 'link', to: '/links' },
  { label: 'Reminders', iconName: 'bell', to: '/reminders' },
  { label: 'Notes', iconName: 'file-text', to: '/napkin' },
])

const navGroups = [
  {
    key: 'planning',
    title: 'Planning',
    iconName: 'calendar',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Daily', to: '/daily' },
      { label: 'Weekly', to: '/weekly' },
      { label: 'Monthly', to: '/monthly' },
    ],
  },
  {
    key: 'review',
    title: 'Review',
    iconName: 'bar-chart',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Journal', to: '/journal' },
      { label: 'Reports', to: '/reports' },
      { label: 'Habits', to: '/habits' },
    ],
  },
  {
    key: 'creator',
    title: 'Creator Mode',
    iconName: 'palette',
    beta: true,
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Content Board', to: '/creator' },
      { label: 'Calendar', to: '/creator/calendar' },
      { label: 'Repurpose', to: '/creator/repurpose' },
      { label: 'Editor', to: '/creator/editor' },
      { label: 'Publish', to: '/creator/publish' },
    ],
  },
  {
    key: 'leader',
    title: 'Leader Mode',
    iconName: 'briefcase',
    beta: true,
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Events', to: '/leader/events' },
      { label: 'Occasions', to: '/leader/occasions' },
      { label: 'Messages', to: '/leader/messages' },
      { label: 'Issues', to: '/leader/issues' },
      { label: 'Contacts', to: '/leader/contacts' },
      { label: 'Maps', to: '/leader/maps' },
    ],
  },
  {
    key: 'ai',
    title: 'AI Actions',
    iconName: 'sparkles',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Talk to Planner', to: '/talk-to-planner' },
    ],
  },
]

const filteredNavGroups = computed(() => {
  const creatorOn = !!activeWorkspaceSettings.value.creatorModeEnabled
  const leaderOn = !!activeWorkspaceSettings.value.leaderModeEnabled
  return navGroups
    .filter((group) => {
      if (group.key === 'creator') return creatorOn
      if (group.key === 'leader') return leaderOn
      return true
    })
    .map((group) => {
      if (group.key !== 'creator') return group
      return {
        ...group,
        children: group.children.filter((child) => autoDeployEnabled.value || child.to !== '/creator/publish'),
      }
    })
})

const systemLinks = computed(() => [
  { label: 'Workspaces', iconName: 'box', to: '/workspaces' },
  { label: 'Settings', iconName: 'settings', to: '/settings' },
])
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingRoutePath = computed(() => (isAppleBillingSafeMode.value ? '/billing/upgrade' : '/subscription'))
const upgradeBannerLabel = computed(() => (isAppleBillingSafeMode.value ? 'Learn about Premium' : 'Upgrade'))
const upgradeBannerMessage = computed(() => (
  isAppleBillingSafeMode.value
    ? 'You have reached a Free plan limit. Premium access is available on our website, and your data will sync after you upgrade.'
    : '🚀 You\'re on the Free Plan. Upgrade to unlock unlimited AI and reminders.'
))
const upgradePillLabel = computed(() => '🚀 Upgrade')
const upgradePillTitle = computed(() => (
  isAppleBillingSafeMode.value
    ? 'You are on the Free plan. Premium access can be enabled on the web.'
    : 'Upgrade'
))
const showFreePlanHeaderBadge = computed(() => (
  isAppleBillingSafeMode.value && !isPremium.value && !isGuest.value
))
const freePlanBadgeClasses = 'rounded-full border border-white/12 bg-white/8 px-3 py-1 text-sm font-semibold text-slate-100 shadow-sm'
const upgradePillClasses = computed(() => (
  isAppleBillingSafeMode.value
    ? 'rounded-full border border-white/12 bg-white/8 px-3 py-1 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/12'
    : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-purple-600 hover:to-pink-700 transition'
))

const footerUtilityLinks = computed(() => {
  const links = [
    { label: 'Billing', iconName: 'credit-card', to: billingRoutePath.value },
    { label: 'Help', iconName: 'message-circle', to: '/help' },
  ]

  if (authStore.user?.role === 'admin') {
    links.unshift({ label: 'Admin Panel', iconName: 'shield', to: '/admin' })
  }

  return links
})

const footerUtilityColumns = computed(() =>
  `repeat(${footerUtilityLinks.value.length + (isGuest.value ? 0 : 1)}, minmax(0, 1fr))`,
)

const openGroups = reactive({})
const advancedSectionOpen = ref(false)

function handleAdvancedToggle() {
  advancedSectionOpen.value = !advancedSectionOpen.value
}

function handleGroupToggle(key) {
  toggleGroup(key)
}

function syncSidebarDisclosure() {
  const activeGroup = filteredNavGroups.value.find((group) => isGroupActive(group))
  if (!activeGroup) return
  advancedSectionOpen.value = true
  openGroups[activeGroup.key] = true
}

async function handleLogout() {
  await authStore.logout()
}

function goToLogin() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_SIGNIN_CLICK) } catch {}
  try { router.push({ path: '/login' }) } catch {}
}

function trackUpgradeClick() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
}

function goToTalkPlanner() {
  try {
    if (route.path !== '/talk-to-planner') {
      router.push('/talk-to-planner')
    }
    mobileMenu.value = false
  } catch (err) {
    console.warn('Failed to open Talk to Planner', err?.message || err)
  }
}

function openFeedback() {
  try {
    feedbackStore.openDrawer({ route: route.name || route.path, source: 'header' })
  } catch (err) {
    console.warn('Failed to open feedback drawer', err?.message || err)
  }
}

onMounted(() => {
  featureFlagsStore.ensureLoaded().catch(() => {})
  feedbackStore.init()
  // Upgrade banner events
  try {
    upgradeHandler = () => {
      showUpgrade.value = true
    }
    window.addEventListener('upgrade-required', upgradeHandler)
  } catch {}
})

watch(
  () => authStore.token,
  () => {
    if (!authStore.user?.uid) return
    ensureWorkspaceHydrated()
  },
)

watch(
  () => [
    route.fullPath,
    filteredNavGroups.value
      .map((group) => `${group.key}:${group.children.map((child) => child.to).join(',')}`)
      .join('|'),
  ],
  () => {
    syncSidebarDisclosure()
  },
  { immediate: true },
)

watch(
  () => showsDesktopSidebar.value,
  (isDesktopSidebarVisible) => {
    if (isDesktopSidebarVisible) {
      mobileMenu.value = false
    }
  },
)

onUnmounted(() => {
  clearWorkspaceRetryTimer()
  if (storageHandler) {
    try {
      window.removeEventListener('storage', storageHandler)
    } catch {}
    storageHandler = null
  }
  if (viewportChangeHandler) {
    try {
      window.removeEventListener('resize', viewportChangeHandler)
      window.removeEventListener('orientationchange', viewportChangeHandler)
    } catch {}
    viewportChangeHandler = null
  }
  if (upgradeHandler) {
    try {
      window.removeEventListener('upgrade-required', upgradeHandler)
    } catch {}
    upgradeHandler = null
  }
})
</script>

<style>
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
}

html {
  height: 100%;
  height: -webkit-fill-available;
  background: #050816;
}

body,
#app {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  background: #050816;
}

body {
  margin: 0;
  overflow-x: hidden;
}

#app {
  display: flex;
  flex-direction: column;
}

.app-shell {
  --desktop-sidebar-width: 18rem;
  height: 100vh;
  height: 100dvh;
  height: -webkit-fill-available;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}

.app-main-pane {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.app-shell--document-scroll {
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  overflow: visible;
}

.app-main-pane--document-scroll {
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  overflow: visible;
}

.app-content--document-scroll {
  overflow: visible !important;
}

@media (min-width: 768px) {
  .app-shell {
    position: relative;
  }

  .app-desktop-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: var(--safe-area-left);
    z-index: 15;
    width: var(--desktop-sidebar-width);
    height: 100vh;
    height: 100dvh;
    height: -webkit-fill-available;
  }

  .app-main-pane {
    width: calc(100% - var(--desktop-sidebar-width));
    margin-left: var(--desktop-sidebar-width);
  }

  .app-shell--overlay-sidebar .app-main-pane {
    width: 100%;
    margin-left: 0;
  }
}

.app-upgrade-banner {
  left: var(--safe-area-left);
  right: var(--safe-area-right);
  padding-top: var(--safe-area-top);
}

.app-mobile-drawer {
  padding-top: calc(var(--safe-area-top) + 1rem);
  padding-bottom: calc(var(--safe-area-bottom) + 1rem);
}

.app-desktop-sidebar {
  padding-top: 1rem;
  padding-bottom: calc(var(--safe-area-bottom) + 1rem);
}

.app-header {
  padding-top: calc(var(--safe-area-top) + 1rem);
}

.app-content {
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(1.5rem + var(--safe-area-bottom));
}

.app-footer {
  margin-top: auto;
  padding-bottom: calc(0.75rem + var(--safe-area-bottom));
}

@media (max-width: 1024px) {
  .app-content {
    padding-bottom: calc(1rem + var(--safe-area-bottom));
  }

  .app-footer {
    display: none;
  }
}

@media (max-width: 767px) {
  .app-shell {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    min-height: -webkit-fill-available;
    overflow: visible;
  }

  .app-main-pane {
    height: auto;
    overflow: visible;
  }

  .app-content {
    overflow: visible;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
/* Subtle pulse for guest sign-in CTA */
@keyframes pulseSlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.02); }
}
.animate-pulse-slow {
  animation: pulseSlow 2s ease-in-out infinite;
}

.beta-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #c7d2fe;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
</style>
