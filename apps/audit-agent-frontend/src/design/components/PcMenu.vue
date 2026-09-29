<template>
  <button
    ref="triggerRef"
    type="button"
    class="pc-menu-trigger"
    :aria-label="label"
    :title="label"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :aria-controls="isOpen ? menuId : undefined"
    @click="toggle"
    @keydown.down.prevent="openAndFocus(0)"
    @keydown.up.prevent="openAndFocus(-1)"
  >
    <MoreHorizontal :size="20" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <div v-if="isOpen" class="pc-theme">
      <div class="pc-menu-catcher" @pointerdown="close(false)" />
      <ul
        :id="menuId"
        ref="menuRef"
        class="pc-menu"
        role="menu"
        :aria-label="label"
        :style="position"
        @keydown="onMenuKeydown"
      >
        <template v-for="item in items" :key="item.key">
          <li v-if="item.dividerBefore" class="pc-menu__divider" role="separator"></li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              tabindex="-1"
              class="pc-menu__item"
              :class="{ 'pc-menu__item--danger': item.danger }"
              @click="choose(item)"
            >
              <component :is="item.icon" v-if="item.icon" :size="16" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </button>
          </li>
        </template>
      </ul>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'
import '../tokens.css'

// The "···" menu: every secondary action lives here so the visible surface
// stays about doing. items: [{ key, label, icon?, danger?, dividerBefore? }]
const props = defineProps({
  items: { type: Array, required: true },
  label: { type: String, default: 'More actions' },
})
const emit = defineEmits(['select'])

const menuId = `pc-menu-${useId()}`
const triggerRef = ref(null)
const menuRef = ref(null)
const isOpen = ref(false)
const position = ref({})

const MENU_WIDTH = 224
const GAP = 6
const EDGE = 8

function place() {
  const rect = triggerRef.value.getBoundingClientRect()
  const estimatedHeight = props.items.length * 40 + 16
  const spaceBelow = window.innerHeight - rect.bottom
  const openUp = spaceBelow < estimatedHeight + GAP && rect.top > spaceBelow
  const left = Math.min(Math.max(EDGE, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - EDGE)
  position.value = openUp
    ? { left: `${left}px`, bottom: `${window.innerHeight - rect.top + GAP}px`, width: `${MENU_WIDTH}px` }
    : { left: `${left}px`, top: `${rect.bottom + GAP}px`, width: `${MENU_WIDTH}px` }
}

function menuItems() {
  return [...(menuRef.value?.querySelectorAll('[role="menuitem"]') || [])]
}

async function openAndFocus(index) {
  if (!isOpen.value) {
    place()
    isOpen.value = true
    await nextTick()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
  }
  const nodes = menuItems()
  nodes[(index + nodes.length) % nodes.length]?.focus()
}

function toggle() {
  if (isOpen.value) close()
  else openAndFocus(0)
}

function close(returnFocus = true) {
  if (!isOpen.value) return
  isOpen.value = false
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  if (returnFocus) triggerRef.value?.focus()
}

function onViewportChange() {
  close(false)
}

function choose(item) {
  close()
  emit('select', item.key)
}

function onMenuKeydown(event) {
  const nodes = menuItems()
  const current = nodes.indexOf(document.activeElement)
  const moves = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: nodes.length - 1 }
  if (event.key in moves) {
    event.preventDefault()
    nodes[(moves[event.key] + nodes.length) % nodes.length]?.focus()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
  } else if (event.key === 'Tab') {
    close(false)
  }
}

onBeforeUnmount(() => close(false))
</script>

<style scoped>
.pc-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: var(--pc-radius-sm);
  background: transparent;
  color: var(--pc-text-muted);
  cursor: pointer;
}

.pc-menu-trigger:hover,
.pc-menu-trigger[aria-expanded='true'] {
  background: var(--pc-surface-hover);
  color: var(--pc-text);
}

.pc-menu-catcher {
  position: fixed;
  inset: 0;
  z-index: var(--pc-z-menu);
}

.pc-menu {
  position: fixed;
  z-index: var(--pc-z-menu);
  margin: 0;
  padding: var(--pc-space-1);
  list-style: none;
  background: var(--pc-surface);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  box-shadow: var(--pc-shadow-overlay);
  animation: pc-menu-in var(--pc-duration-fast) var(--pc-ease);
}

.pc-menu__item {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  width: 100%;
  min-height: 2.5rem;
  padding: 0 var(--pc-space-3);
  border: none;
  border-radius: var(--pc-radius-sm);
  background: none;
  color: var(--pc-text);
  font-family: var(--pc-font);
  font-size: var(--pc-text-body);
  text-align: left;
  cursor: pointer;
}

.pc-menu__item svg {
  color: var(--pc-text-muted);
}

.pc-menu__item:hover,
.pc-menu__item:focus-visible {
  background: var(--pc-surface-hover);
  outline: none;
}

.pc-menu__item--danger,
.pc-menu__item--danger svg {
  color: var(--pc-danger);
}

.pc-menu__divider {
  height: 1px;
  margin: var(--pc-space-1) var(--pc-space-2);
  background: var(--pc-border);
}

@keyframes pc-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>
