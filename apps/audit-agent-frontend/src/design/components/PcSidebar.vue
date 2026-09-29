<template>
  <aside class="pc-sidebar" aria-label="Primary">
    <div class="pc-sidebar__brand">
      <img src="/plancraft-mark.svg" alt="" class="pc-sidebar__logo" />
      <span>PlanCraftAI</span>
    </div>

    <nav class="pc-sidebar__nav">
      <button
        v-for="item in PRIMARY_NAV"
        :key="item.key"
        type="button"
        class="pc-sidebar__item"
        :aria-current="active === item.key ? 'page' : undefined"
        @click="$emit('navigate', item)"
      >
        <component :is="item.icon" :size="18" aria-hidden="true" />
        <span class="pc-sidebar__label">{{ item.label }}</span>
        <span v-if="item.key === 'inbox' && inboxCount" class="pc-sidebar__count">
          {{ inboxCount }}<span class="pc-sr-only"> items need attention</span>
        </span>
      </button>
      <button type="button" class="pc-sidebar__item" aria-haspopup="dialog" @click="$emit('more')">
        <Ellipsis :size="18" aria-hidden="true" />
        <span class="pc-sidebar__label">More</span>
      </button>
    </nav>

    <div class="pc-sidebar__footer">
      <button v-if="!isPro" type="button" class="pc-sidebar__item pc-sidebar__item--pro" @click="$emit('upgrade')">
        <Gem :size="18" aria-hidden="true" />
        <span class="pc-sidebar__label">Try Pro</span>
      </button>
      <button
        v-for="item in ACCOUNT_NAV"
        :key="item.key"
        type="button"
        class="pc-sidebar__item"
        :aria-current="active === item.key ? 'page' : undefined"
        @click="$emit('navigate', item)"
      >
        <component :is="item.icon" :size="18" aria-hidden="true" />
        <span class="pc-sidebar__label">{{ item.label }}</span>
      </button>
      <div class="pc-sidebar__user">
        <span class="pc-sidebar__avatar" aria-hidden="true">
          <img v-if="user.photoURL" :src="user.photoURL" alt="" />
          <template v-else>{{ initial }}</template>
        </span>
        <span class="pc-sidebar__user-name">{{ user.name || user.email }}</span>
        <span v-if="isPro" class="pc-pro-badge">Pro</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { Ellipsis, Gem } from 'lucide-vue-next'
import { ACCOUNT_NAV, PRIMARY_NAV } from '../navigation.js'
import '../tokens.css'

// Compact desktop navigation (from 768px). Five destinations plus More; the
// Pro state is a small badge, never a banner.
const props = defineProps({
  active: { type: String, default: 'today' },
  inboxCount: { type: Number, default: 0 },
  user: { type: Object, default: () => ({}) },
  isPro: { type: Boolean, default: false },
})
defineEmits(['navigate', 'more', 'upgrade'])

const initial = computed(() => String(props.user.name || props.user.email || '?').trim().charAt(0).toUpperCase())
</script>

<style scoped>
.pc-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--pc-space-4);
  width: 15rem;
  height: 100dvh;
  padding: var(--pc-space-5) var(--pc-space-3);
  border-right: 1px solid var(--pc-border);
  background: var(--pc-surface);
}

.pc-sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--pc-space-2);
  padding: 0 var(--pc-space-2);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.pc-sidebar__logo {
  width: 1.75rem;
  height: 1.75rem;
}

.pc-sidebar__nav,
.pc-sidebar__footer {
  display: grid;
  gap: 2px;
}

.pc-sidebar__footer {
  margin-top: auto;
}

.pc-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  min-height: 2.25rem;
  padding: 0 var(--pc-space-3);
  border: none;
  border-radius: var(--pc-radius-sm);
  background: none;
  color: var(--pc-text-muted);
  font-family: var(--pc-font);
  font-size: var(--pc-text-body);
  text-align: left;
  cursor: pointer;
}

.pc-sidebar__item:hover {
  background: var(--pc-surface-hover);
  color: var(--pc-text);
}

.pc-sidebar__item[aria-current='page'] {
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-weight: 600;
}

.pc-sidebar__item--pro {
  color: var(--pc-accent-text);
}

.pc-sidebar__label {
  flex: 1;
}

.pc-sidebar__count {
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-small);
  font-variant-numeric: tabular-nums;
}

.pc-sidebar__user {
  display: flex;
  align-items: center;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-2);
  padding: var(--pc-space-3) var(--pc-space-3) 0;
  border-top: 1px solid var(--pc-border);
  font-size: var(--pc-text-small);
}

.pc-sidebar__avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  overflow: hidden;
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-weight: 700;
}

.pc-sidebar__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-sidebar__user-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-pro-badge {
  padding: 1px var(--pc-space-2);
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-fill);
  color: var(--pc-on-accent);
  font-size: var(--pc-text-caption);
  font-weight: 700;
}
</style>
