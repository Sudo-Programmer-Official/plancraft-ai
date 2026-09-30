<template>
  <Teleport to="body">
    <div class="pc-theme pc-sheet-root">
      <transition name="pc-sheet-scrim">
        <div v-if="open" class="pc-sheet-scrim" aria-hidden="true" @click="close" />
      </transition>
      <transition name="pc-sheet-panel" @after-enter="focusPanel">
        <section
          v-if="open"
          ref="panelRef"
          class="pc-sheet"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          :style="{
            ...(dragOffset ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : {}),
            '--pc-sheet-keyboard-inset': `${keyboardInset}px`,
            ...(visibleViewportHeight ? { '--pc-sheet-visible-height': `${visibleViewportHeight}px` } : {}),
          }"
        >
          <div
            class="pc-sheet__handle"
            aria-hidden="true"
            @pointerdown="startDrag"
            @pointermove="moveDrag"
            @pointerup="endDrag"
            @pointercancel="endDrag"
          >
            <span></span>
          </div>
          <header class="pc-sheet__header">
            <div class="pc-sheet__heading">
              <h2 :id="titleId" class="pc-sheet__title">{{ title }}</h2>
              <p v-if="subtitle" class="pc-sheet__subtitle">{{ subtitle }}</p>
            </div>
            <div class="pc-sheet__header-actions">
              <slot name="actions" />
              <PcIconButton :icon="X" label="Close" @click="close" />
            </div>
          </header>
          <div class="pc-sheet__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="pc-sheet__footer">
            <slot name="footer" />
          </footer>
        </section>
      </transition>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'
import PcIconButton from './PcIconButton.vue'
import '../tokens.css'

// Bottom sheet on phones, side panel from 768px. Use for task details and
// quick capture instead of navigating to a full page.
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'close'])

const titleId = `pc-sheet-${useId()}`
const panelRef = ref(null)
const dragOffset = ref(0)
const keyboardInset = ref(0)
const visibleViewportHeight = ref(null)
let returnFocusTo = null
let previousOverflow = ''
let dragStartY = null
let viewportResizeHandler = null
let viewportScrollHandler = null
let viewportUpdateTimer = null

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const DISMISS_DRAG_PX = 90

function close() {
  emit('update:open', false)
  emit('close')
}

function focusPanel() {
  const first = panelRef.value?.querySelector('[autofocus]')
  ;(first || panelRef.value)?.focus({ preventScroll: true })
}

function updateVisualViewport() {
  if (typeof window === 'undefined') return
  const viewport = window.visualViewport
  if (!viewport) return

  const layoutHeight = window.innerHeight || document.documentElement.clientHeight || viewport.height
  const inset = Math.max(0, layoutHeight - viewport.height - Math.max(0, viewport.offsetTop || 0))
  const keyboardVisible = inset > 80
  keyboardInset.value = keyboardVisible ? inset : 0
  visibleViewportHeight.value = keyboardVisible ? Math.max(240, viewport.height * 0.9) : null
}

function stopVisualViewportTracking() {
  if (typeof window === 'undefined') return
  if (viewportResizeHandler) {
    window.visualViewport?.removeEventListener('resize', viewportResizeHandler)
    window.removeEventListener('resize', viewportResizeHandler)
    viewportResizeHandler = null
  }
  if (viewportScrollHandler) {
    window.visualViewport?.removeEventListener('scroll', viewportScrollHandler)
    viewportScrollHandler = null
  }
  if (viewportUpdateTimer) {
    window.clearTimeout(viewportUpdateTimer)
    viewportUpdateTimer = null
  }
  keyboardInset.value = 0
  visibleViewportHeight.value = null
}

function startVisualViewportTracking() {
  if (typeof window === 'undefined' || !window.visualViewport) return
  stopVisualViewportTracking()
  viewportResizeHandler = updateVisualViewport
  viewportScrollHandler = updateVisualViewport
  window.visualViewport.addEventListener('resize', viewportResizeHandler, { passive: true })
  window.visualViewport.addEventListener('scroll', viewportScrollHandler, { passive: true })
  window.addEventListener('resize', viewportResizeHandler, { passive: true })
  updateVisualViewport()
  viewportUpdateTimer = window.setTimeout(() => {
    viewportUpdateTimer = null
    updateVisualViewport()
  }, 350)
}

// Listens on the document while open: focus can leave the panel (e.g. when a
// focused button becomes disabled during a save) and Esc must still close it.
function onKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) return
  const nodes = [...panelRef.value.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null)
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (!panelRef.value.contains(document.activeElement)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function startDrag(event) {
  dragStartY = event.clientY
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveDrag(event) {
  if (dragStartY === null) return
  dragOffset.value = Math.max(0, event.clientY - dragStartY)
}

function endDrag() {
  if (dragStartY === null) return
  const shouldClose = dragOffset.value > DISMISS_DRAG_PX
  dragStartY = null
  dragOffset.value = 0
  if (shouldClose) close()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (typeof document === 'undefined') return
    if (isOpen) {
      returnFocusTo = document.activeElement
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)
      startVisualViewportTracking()
      await nextTick()
      focusPanel()
    } else {
      stopVisualViewportTracking()
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = previousOverflow
      returnFocusTo?.focus?.({ preventScroll: true })
      returnFocusTo = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopVisualViewportTracking()
  document.removeEventListener('keydown', onKeydown)
  if (props.open) document.body.style.overflow = previousOverflow
})
</script>

<style scoped>
.pc-sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--pc-z-overlay);
  background: var(--pc-scrim);
}

.pc-sheet {
  position: fixed;
  z-index: var(--pc-z-overlay);
  display: flex;
  flex-direction: column;
  background: var(--pc-surface);
  color: var(--pc-text);
  box-shadow: var(--pc-shadow-overlay);
  outline: none;
  transition: transform var(--pc-duration-slow) var(--pc-ease);

  /* Phones: bottom sheet */
  left: 0;
  right: 0;
  bottom: var(--pc-sheet-keyboard-inset, 0px);
  max-height: min(var(--pc-sheet-visible-height, 90dvh), 44rem);
  border-radius: var(--pc-radius-xl) var(--pc-radius-xl) 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.pc-sheet__handle {
  display: flex;
  justify-content: center;
  padding: var(--pc-space-2) 0 var(--pc-space-1);
  touch-action: none;
  cursor: grab;
}

.pc-sheet__handle span {
  width: 2.25rem;
  height: 0.3rem;
  border-radius: var(--pc-radius-full);
  background: var(--pc-border-strong);
}

.pc-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pc-space-3);
  padding: var(--pc-space-2) var(--pc-space-5) var(--pc-space-3);
}

.pc-sheet__heading {
  flex: 1;
  min-width: 0;
}

.pc-sheet__title {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: var(--pc-text-title);
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pc-sheet__subtitle {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.pc-sheet__header-actions {
  display: flex;
  align-items: center;
  gap: var(--pc-space-1);
  margin-right: calc(-1 * var(--pc-space-2));
}

.pc-sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--pc-space-5) var(--pc-space-5);
}

.pc-sheet__footer {
  padding: var(--pc-space-3) var(--pc-space-5) var(--pc-space-4);
  border-top: 1px solid var(--pc-border);
}

@media (min-width: 768px) {
  /* Desktop: side panel */
  .pc-sheet {
    left: auto;
    top: 0;
    bottom: 0;
    width: min(26rem, 100vw);
    max-height: none;
    border-radius: var(--pc-radius-xl) 0 0 var(--pc-radius-xl);
    padding-bottom: 0;
  }

  .pc-sheet__handle {
    display: none;
  }

  .pc-sheet__header {
    padding-top: var(--pc-space-5);
  }
}

.pc-sheet-scrim-enter-active,
.pc-sheet-scrim-leave-active {
  transition: opacity var(--pc-duration) var(--pc-ease);
}

.pc-sheet-scrim-enter-from,
.pc-sheet-scrim-leave-to {
  opacity: 0;
}

.pc-sheet-panel-enter-from,
.pc-sheet-panel-leave-to {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .pc-sheet-panel-enter-from,
  .pc-sheet-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
