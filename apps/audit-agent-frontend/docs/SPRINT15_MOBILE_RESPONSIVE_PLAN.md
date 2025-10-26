# Sprint 15 — Mobile Sidebar & Responsive UX Polish

> **Objective:** Deliver a mobile-friendly Teams workspace with a slide-in navigation, corrected scrolling, and aligned floating UI across light/dark themes.

---

## 1. Mobile Sidebar Navigation

### Problem
- Current pill-based top bar overflows on small screens; routes are hard to discover.

### Solution
- Introduce a hamburger-triggered slide-in sidebar that mirrors the desktop nav and closes on backdrop click or route change.

### Tasks
1. **TeamMobileSidebar.vue**
   - Slide-in animation (`translate-x-[-100%] → translate-x-0`, 220 ms ease-out).
   - Gradient header, nav list, optional “Leave workspace” / “Account” links.
   - Reuse menu items from `TeamSidebar.vue`.
2. **Navbar updates**
   - Replace top pills with compact layout `< 768 px`:
     - Left: ☰ hamburger (toggles sidebar).
     - Center: PlanCraftAI logo.
     - Right: Theme toggle + profile/avatar.
3. **State management**
   - Extend `uiStore` with `mobileSidebarOpen`.
   - Persist toggle (optional) or default closed.
   - Close sidebar on route change (`watch(router.currentRoute)`).

### Files & Components
- `apps/audit-agent-frontend/src/components/TeamMobileSidebar.vue` (new)
- `apps/audit-agent-frontend/src/components/NavBarWithOrgSwitcher.vue`
- `apps/audit-agent-frontend/src/layouts/TeamLayout.vue`
- `apps/audit-agent-frontend/src/stores/uiStore.ts`
- Optional: `apps/audit-agent-frontend/src/components/OverlayMask.vue` (reusable backdrop)

### Deliverables
- ✅ Slide-in sidebar with accessible focus trap and ESC close.
- ✅ Hamburger icon visible only on tablets/mobile.
- ✅ Sidebar respects light/dark tokens.

---

## 2. Layout & Scroll Fixes

### Issues
- Content overflow causes hidden scrollbars.
- Mic button overlaps content on mobile.
- Some views exhibit shadow clipping when scrolled.

### Tasks
1. **TeamLayout adjustments**
   - Wrap `router-view` container with `overflow-y-auto` and `h-full`.
   - Apply `pb-20` (or CSS equivalent) to reserve space for mic button.
   - Introduce smooth scrolling (`scroll-behavior: smooth`).
2. **Mic button placement**
   - For `< 768 px`: `bottom: 1rem; right: 1rem;` with safe-area support.
   - Ensure z-index is above modals but below toasts.
3. **Shadow & overflow clean-up**
   - Remove extraneous backgrounds causing double shadows.
   - Add gradient fade / scroll indicators for long lists (Vault, Tasks).

### Files
- `TeamLayout.vue`
- `TeamTasks.vue`, `TeamVault.vue`, `TeamAnalytics.vue` (overflow tweaks)
- `theme.css` (safe-area inset variables if needed)

### Deliverables
- ✅ Mic button fully visible on 360 px width.
- ✅ Main content scrolls independently of sidebar.
- ✅ No clipped shadows or double scrollbars.

---

## 3. Responsive UI & Toast Adjustments

### Tasks
1. **Toasts/Modals**
   - Set `max-width: min(90vw, 360px)` for toasts on mobile.
   - Ensure Element Plus dialog classes inherit token colors.
2. **Floating actions**
   - Reconcile Ask Teams bar and modals to avoid overlap with mic button.
   - Add `pointer-events: none` overlay only when necessary.
3. **Safe area**
   - Use `env(safe-area-inset-bottom)` for padding on iOS notch devices.

### Files
- `theme.scss`, `theme.css`
- `AskTeamsBar.vue`
- `ToastStack.vue`

### Deliverables
- ✅ Toasts and dialogs render within viewport on small screens.
- ✅ Floating UI respects safe-area insets.

---

## 4. QA Matrix & Regression

| Screen / Flow | Expected Behaviour | Status | Notes / Screenshot |
|---------------|-------------------|--------|--------------------|
| Dashboard | Sidebar collapses, hamburger opens menu | ☐ | |
| Tasks | Scroll smooth, mic visible | ☐ | |
| Chat | Input accessible during RTC | ☐ | |
| Pulse | Cards responsive, no overflow | ☐ | |
| Vault | Long lists scroll with gradient indicator | ☐ | |
| Analytics | Charts adapt 360–1024 px | ☐ | |
| Meetings (RTC) | No pointer-event blocks, mic works | ☐ | |
| Notifications | Toasts/FCM fit mobile layout | ☐ | |

Document results in `/qa/MOBILE_RESPONSIVENESS_LOG.md` with timestamped screenshots (`/qa/assets/mobile/*.png`).

---

## 5. CSS Token Additions

Add to `theme.css`:
```css
:root,
[data-theme='dark'] {
  --sidebar-bg: var(--bg-surface);
  --sidebar-border: var(--border-subtle);
  --sidebar-shadow: 0 18px 38px rgba(15, 23, 42, 0.25);
}
```
Use tokens in both desktop and mobile sidebars for consistent theming.

---

## 6. Timeline & Deliverables

| Deliverable | Description | ETA |
|-------------|-------------|-----|
| ✅ Mobile sidebar | Hamburger-driven nav with animation | ~1 day |
| ✅ Scroll/mic fixes | Overflow adjustments across views | ~0.5 day |
| ✅ Responsive audit | QA across 360–1440 px | ~0.5 day |
| ✅ Documentation | `MOBILE_RESPONSIVENESS_LOG.md` w/ screenshots | ~0.5 day |

---

## 7. Implementation Checklist

- [ ] Create `TeamMobileSidebar.vue`.
- [ ] Add hamburger icon + toggle state in navbar + `uiStore`.
- [ ] Update layout padding/overflow; reposition mic button.
- [ ] Adjust toast/modal breakpoints, safe-area padding.
- [ ] Run regression QA (table above) in light/dark.
- [ ] Record screenshots & notes in `/qa/MOBILE_RESPONSIVENESS_LOG.md`.
- [ ] Commit with message: `feat: mobile sidebar and responsive polish (#Sprint15)`.

---

### Resources / References
- Customer sidebar implementation (`apps/audit-agent-frontend/src/components/CustomerSidebar.vue`).
- Element Plus drawer/dialog docs.
- CSS safe-area insets: <https://webkit.org/blog/7929/designing-websites-for-iphone-x/>

---

_Prepared for Sprint 15 execution — update this document as tasks are completed._ 
