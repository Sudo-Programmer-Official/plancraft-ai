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
    class="app-shell flex min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white"
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
          🚀 You're on the <span class="text-fuchsia-300 font-semibold">Free Plan</span>. Upgrade to
          unlock unlimited AI and reminders.
        </span>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="!isGuest"
            to="/subscription"
            @click="trackUpgradeClick"
            class="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white font-semibold text-sm px-3 py-1.5 rounded-lg hover:scale-105 transition-transform shadow-md"
          >
            Upgrade
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
      class="hidden md:flex flex-col h-screen transition-all duration-200 bg-gray-950/70 backdrop-blur-xl"
      :class="sidebarOpen ? 'w-64' : 'w-16'"
    >
      <div
        class="flex-shrink-0 border-b border-gray-700"
        :class="sidebarOpen ? 'flex items-center justify-between p-4' : 'flex items-center justify-center p-2 h-14'"
      >
        <div v-if="sidebarOpen" class="flex items-center gap-2 min-w-0">
          <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="w-8 h-8" />
          <span class="text-lg font-semibold truncate">PlanCraftAI</span>
        </div>
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="p-2 rounded-lg hover:bg-indigo-600/40 transition-colors flex items-center justify-center"
          :class="sidebarOpen ? 'bg-indigo-600/20' : 'bg-transparent'"
          aria-label="Toggle sidebar"
          :title="sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
        >
          <svg v-if="sidebarOpen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Nav links -->
      <nav class="flex-1 mt-4 space-y-3 overflow-y-auto scrollbar-plan px-2">
        <div class="space-y-1">
          <RouterLink
            v-for="item in coreNavItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 w-full rounded transition hover:bg-gray-800 text-sm text-slate-200"
            :class="[
              sidebarOpen ? 'justify-start px-4 py-2' : 'justify-center px-0 py-2',
              { 'bg-indigo-600': isActive(item.to) },
            ]"
            :title="sidebarOpen ? '' : item.label"
            :aria-label="item.label"
          >
            <span class="inline-flex h-5 w-5 items-center justify-center">
              <svg
                v-if="item.iconType === 'grid-4-outline'"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <rect x="14" y="14" width="6" height="6" rx="1" />
              </svg>
              <span v-else>{{ item.icon }}</span>
            </span>
            <span v-if="sidebarOpen">{{ item.label }}</span>
          </RouterLink>
        </div>

        <div
          v-for="group in filteredNavGroups"
          :key="group.key"
          class="rounded-lg"
        >
          <button
            v-if="group.collapsible"
            class="w-full flex items-center rounded text-slate-200 hover:bg-gray-800 transition"
            :class="sidebarOpen ? 'justify-between px-3 py-2 text-sm font-semibold' : 'justify-center px-0 py-2 text-base'"
            @click="toggleGroup(group.key)"
            >
            <span class="flex items-center gap-2">
              <span>{{ group.icon }}</span>
              <span v-if="sidebarOpen" class="flex items-center gap-2">
                <span>{{ group.title }}</span>
                <span v-if="group.beta" class="beta-pill">Beta</span>
              </span>
            </span>
            <span v-if="sidebarOpen" class="text-xs text-slate-400">
              {{ openGroups[group.key] ? '▾' : '▸' }}
            </span>
          </button>
          <div v-else class="px-3 py-2 text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>{{ group.icon }}</span>
            <span v-if="sidebarOpen" class="flex items-center gap-2">
              <span>{{ group.title }}</span>
              <span v-if="group.beta" class="beta-pill">Beta</span>
            </span>
          </div>

          <div v-show="!group.collapsible || openGroups[group.key]" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in group.children"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 w-full rounded transition hover:bg-gray-800 text-sm text-slate-200"
              :class="[
                sidebarOpen ? 'justify-start px-4 py-2' : 'justify-center px-0 py-2',
                { 'bg-indigo-600': isActive(item.to) },
              ]"
              :title="sidebarOpen ? '' : item.label"
              :aria-label="sidebarOpen ? item.label : item.label"
            >
              <span>{{ item.icon }}</span>
              <span v-if="sidebarOpen">{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-800/60 mt-4">
          <RouterLink
            v-for="item in systemLinks"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 w-full rounded transition hover:bg-gray-800 text-sm text-slate-200"
            :class="[
              sidebarOpen ? 'justify-start px-3 py-2' : 'justify-center px-0 py-2',
              { 'bg-indigo-600': isActive(item.to) },
            ]"
            :title="sidebarOpen ? '' : item.label"
            :aria-label="item.label"
          >
            <span>{{ item.icon }}</span>
            <span v-if="sidebarOpen">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- Sidebar Footer: segmented actions -->
      <div class="flex-shrink-0 mt-auto pb-4 px-3">
        <template v-if="sidebarOpen">
          <div
            class="grid gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1"
            :class="[authStore.user?.role === 'admin' ? 'grid-cols-6' : 'grid-cols-5']"
          >
            <RouterLink
              to="/settings"
              class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
              title="Settings"
              >⚙️</RouterLink
            >
            <RouterLink
              to="/subscription"
              class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
              title="Billing"
              >💳</RouterLink
            >
            <RouterLink
              v-if="authStore.user?.role === 'admin'"
              to="/admin"
              class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
              title="Admin Panel"
              >🛠</RouterLink
            >
            <RouterLink
              to="/help"
              class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
              title="Help"
              >💬</RouterLink
            >
            <button
              v-if="!isGuest"
              @click="handleLogout"
              class="inline-flex items-center justify-center py-2 rounded-md text-red-400 hover:bg-red-500/15 hover:text-red-300 transition"
              title="Logout"
              aria-label="Logout"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 3.75h9.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5h-9.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 12h10m0 0-3-3m3 3-3 3" />
              </svg>
            </button>
            
          </div>
        </template>
        <template v-else>
          <div class="flex items-center justify-center">
            <button
              v-if="!isGuest"
              @click="handleLogout"
              class="p-2 rounded-md text-red-400 hover:bg-red-500/15 hover:text-red-300 transition"
              title="Logout"
              aria-label="Logout"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 3.75h9.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5h-9.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 12h10m0 0-3-3m3 3-3 3" />
              </svg>
            </button>
          </div>
        </template>
      </div>
    </aside>

    <!-- Mobile drawer -->
    <transition name="slide">
      <aside
        v-if="mobileMenu"
        class="fixed inset-0 bg-black/50 z-40 md:hidden"
        @click.self="mobileMenu = false"
      >
        <div class="app-mobile-drawer absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-4 flex flex-col">
          <!-- Header -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-2 min-w-0">
              <img src="/logo-bg-remove.png" alt="PlanCraftAI" class="w-8 h-8" />
              <span class="text-lg font-semibold truncate">PlanCraftAI</span>
            </div>
            <button @click="mobileMenu = false" class="p-2 rounded hover:bg-gray-800">✖️</button>
          </div>

          <!-- Navigation -->
          <nav class="space-y-3 flex-1 overflow-y-auto scrollbar-plan">
            <div class="space-y-1">
              <RouterLink
                v-for="item in coreNavItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 px-4 py-2 rounded hover:bg-indigo-600"
                @click="mobileMenu = false"
              >
                <span class="inline-flex h-5 w-5 items-center justify-center">
                  <svg
                    v-if="item.iconType === 'grid-4-outline'"
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    aria-hidden="true"
                  >
                    <rect x="4" y="4" width="6" height="6" rx="1" />
                    <rect x="14" y="4" width="6" height="6" rx="1" />
                    <rect x="4" y="14" width="6" height="6" rx="1" />
                    <rect x="14" y="14" width="6" height="6" rx="1" />
                  </svg>
                  <span v-else>{{ item.icon }}</span>
                </span>
                <span>{{ item.label }}</span>
              </RouterLink>
            </div>

            <div v-for="group in filteredNavGroups" :key="group.key" class="rounded-lg">
              <div
                class="flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-200"
                @click="toggleGroup(group.key)"
              >
                <span class="flex items-center gap-2">
                  <span>{{ group.icon }}</span>
                  <span>{{ group.title }}</span>
                </span>
                <span class="text-xs text-slate-400">
                  {{ openGroups[group.key] ? '▾' : '▸' }}
                </span>
              </div>
              <div v-show="openGroups[group.key]" class="mt-1 space-y-1">
                <RouterLink
                  v-for="item in group.children"
                  :key="item.to"
                  :to="item.to"
                  class="block px-4 py-2 rounded hover:bg-indigo-600"
                  @click="mobileMenu = false"
                >
                  {{ item.icon }} {{ item.label }}
                </RouterLink>
              </div>
            </div>
            <div class="pt-2 border-t border-gray-800/60 mt-4">
              <RouterLink
                v-for="item in systemLinks"
                :key="item.to"
                :to="item.to"
                class="block px-3 py-2 rounded hover:bg-indigo-600"
                @click="mobileMenu = false"
              >
                {{ item.icon }} {{ item.label }}
              </RouterLink>
            </div>
          </nav>

          <!-- Logout -->
          <!-- <button
            v-if="authStore.isLoggedIn"
            @click="handleLogout"
            class="mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg w-full"
          >
            Logout
          </button> -->
          <div class="p-4 border-t border-gray-800">
            <!-- Grouped card: Settings | Profile | Billing | Help | Logout -->
            <div
              class="grid grid-cols-5 gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1"
            >
              <RouterLink
                to="/settings"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Settings"
                >⚙️</RouterLink
              >
              <RouterLink
                to="/profile"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Profile"
                >👤</RouterLink
              >
              <RouterLink
                to="/subscription"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Billing"
                >💳</RouterLink
              >
              <RouterLink
                to="/help"
                @click="mobileMenu = false"
                class="text-xs py-2 rounded-md hover:bg-gray-800 text-center transition"
                title="Help"
                >💬</RouterLink
              >
              <button
                v-if="!isGuest"
                @click="handleLogout"
                class="inline-flex items-center justify-center py-2 rounded-md text-red-400 hover:bg-red-500/15 hover:text-red-300 transition"
                title="Logout"
                aria-label="Logout"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 3.75h9.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5h-9.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 12h10m0 0-3-3m3 3-3 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- Main Content -->
    <div class="app-main-pane flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
      <!-- Header -->
      <header
        class="app-header sticky top-0 z-10 bg-gray-950/60 backdrop-blur-xl border-b border-gray-800 p-4 flex justify-between items-center w-full"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <!-- Hamburger (mobile only) -->
          <button class="md:hidden p-2 hover:bg-gray-800 rounded" @click="mobileMenu = !mobileMenu">
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
                  to="/subscription"
                  class="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-purple-600 hover:to-pink-700 transition"
                >
                  🧠 Pro
                </RouterLink>
                <!-- <span class="bg-gradient-to-r from-purple-700 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm">🧠 Pro</span> -->
              </el-tooltip>
            </template>
            <template v-else>
              <RouterLink
                v-if="!isGuest"
                to="/subscription"
                class="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-purple-600 hover:to-pink-700 transition"
              >
                🚀 Upgrade
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
          <img
            v-if="authStore.isLoggedIn"
            :src="authStore.user?.photoURL || authStore.user?.avatarUrl || 'https://i.pravatar.cc/40'"
            class="rounded-full w-10 h-10 cursor-pointer"
            alt="avatar"
            @click="router.push('/settings')"
          />

          <!-- Logout removed from header per guidelines -->
        </div>
      </header>

      <!-- Dynamic content -->
      <main class="app-content p-6 flex-1 overflow-y-auto overflow-x-hidden scrollbar-plan">
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
import { ref, onMounted, watch, onUnmounted, computed, reactive } from 'vue'
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import FeedbackPrompt from '@/components/feedback/FeedbackPrompt.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'
import SetupPrompt from '@/components/SetupPrompt.vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useFeedbackStore } from '@/stores/feedbackStore'
import { useQuickSetupStore } from '@/stores/quickSetupStore'
import { useAppReady } from '@/composables/useAppReady'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'
import PlanSummaryModal from '@/components/PlanSummaryModal.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import { db } from '@/firebase/init'
import { doc, setDoc } from 'firebase/firestore'
import { trackLinkedInConversion } from '@/utils/ads'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { ElMessage } from 'element-plus'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'
import { fetchUserProfile } from '@/services/authService'
const currentUserId = ref(null)
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
  currentUserId.value = deriveUidFromStorage()
  quickSetupStore.refreshQuickSetupState()
  window.addEventListener('storage', () => {
    currentUserId.value = deriveUidFromStorage()
  })
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

const isSidebarCollapsed = ref(false)
const sidebarOpen = computed({
  get: () => !isSidebarCollapsed.value,
  set: (val) => {
    isSidebarCollapsed.value = !val
  },
}) // desktop toggle (open = !collapsed)
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
let upgradeHandler = null

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
  if (!isAuthReady.value || hasResolvedWorkspace.value) {
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
  () => [authStore.user?.uid, authStore.token],
  ([uid, token]) => {
    if (uid && token) {
      maybePromptProfile()
      ensureWorkspaceHydrated()
      subStore.fetchStatus(uid, { force: true, minIntervalMs: 0 }).catch(() => {})
      scheduleWorkspaceHydrationRetry()
    } else {
      clearWorkspaceRetryTimer()
      workspaceRetryCount.value = 0
      workspaceStore.reset()
    }
  },
  { immediate: true },
)

watch(
  () => [isAuthReady.value, isWorkspaceHydrated.value, hasResolvedWorkspace.value, workspaceStore.loading, workspaceStore.error],
  ([authReadyNow, workspaceHydratedNow, workspaceResolvedNow, workspaceLoading]) => {
    if (!authReadyNow) {
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

const coreNavItems = computed(() => {
  const items = [
    { label: 'Dashboard', iconType: 'grid-4-outline', to: '/dashboard' },
    { label: 'Planner', icon: '🧭', to: '/planner' },
    { label: 'Playbooks', icon: '📚', to: '/playbooks', enabled: playbooksEnabled.value },
    { label: 'Meetings', icon: '📅', to: '/meetings' },
    { label: 'Quick Links', icon: '🔗', to: '/links' },
    { label: 'Reminders', icon: '🔔', to: '/reminders' },
    { label: 'Napkin', icon: '🧾', to: '/napkin' },
  ]
  return items.filter((item) => item.enabled !== false)
})

const navGroups = [
  {
    key: 'planning',
    title: 'Planning',
    icon: '🗓',
    collapsible: true,
    defaultOpen: true,
    children: [
      { label: 'Daily', icon: '📆', to: '/daily' },
      { label: 'Weekly', icon: '🗒', to: '/weekly' },
      { label: 'Monthly', icon: '🗂', to: '/monthly' },
    ],
  },
  {
    key: 'review',
    title: 'Review',
    icon: '📊',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Journal', icon: '📔', to: '/journal' },
      { label: 'Reports', icon: '📈', to: '/reports' },
      { label: 'Habits', icon: '🏆', to: '/habits' },
    ],
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: '⚙️',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Quick Setup', icon: '✨', to: '/settings?tab=account-quick-setup' },
      { label: 'Notifications', icon: '🔔', to: '/settings?tab=account-notifications' },
      { label: 'Integrations', icon: '🔗', to: '/settings?tab=integrations' },
    ],
  },
  {
    key: 'creator',
    title: 'Creator Mode',
    icon: '🎨',
    beta: true,
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Content Board', icon: '🏠', to: '/creator' },
      { label: 'Calendar', icon: '📅', to: '/creator/calendar' },
      { label: 'Repurpose', icon: '🔁', to: '/creator/repurpose' },
      { label: 'Editor', icon: '✏️', to: '/creator/editor' },
      { label: 'Publish', icon: '📤', to: '/creator/publish' },
    ],
  },
  {
    key: 'leader',
    title: 'Leader Mode',
    icon: '🧑‍💼',
    beta: true,
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Events', icon: '🎉', to: '/leader/events' },
      { label: 'Occasions', icon: '🎂', to: '/leader/occasions' },
      { label: 'Messages', icon: '✉️', to: '/leader/messages' },
      { label: 'Issues', icon: '🚨', to: '/leader/issues' },
      { label: 'Contacts', icon: '👥', to: '/leader/contacts' },
      { label: 'Maps', icon: '🗺', to: '/leader/maps' },
    ],
  },
  {
    key: 'ai',
    title: 'AI Quick Actions',
    icon: '🤖',
    collapsible: true,
    defaultOpen: false,
    children: [
      { label: 'Talk to Planner', icon: '🎤', to: '/talk-to-planner' },
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

const systemLinks = [
  { label: 'Workspaces', icon: '📦', to: '/workspaces' },
]

const openGroups = reactive({})

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
  if (authStore.user?.uid && authStore.token) {
    subStore.fetchStatus(authStore.user.uid, { force: true, minIntervalMs: 0 })
  }
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
    subStore.fetchStatus(authStore.user.uid, { force: true, minIntervalMs: 0 }).catch(() => {})
  },
)

onUnmounted(() => {
  clearWorkspaceRetryTimer()
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
  height: -webkit-fill-available;
  background: #050816;
}

body,
#app {
  width: 100%;
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
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  width: 100%;
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}

.app-main-pane {
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  height: 100vh;
  height: 100dvh;
  height: -webkit-fill-available;
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

.app-header {
  padding-top: calc(var(--safe-area-top) + 1rem);
}

.app-content {
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
