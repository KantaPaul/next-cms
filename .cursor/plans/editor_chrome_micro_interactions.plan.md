---
name: Editor chrome micro-interactions
overview: Add bencho.dev-style micro-interactions to the page-builder editor itself. In scope are the top bar, the floating device and zoom bar, the right-hand inspector (tabs, inputs, layout order, reset and changed markers), and other chrome such as the canvas block toolbar, panels and toasts. The approach is CSS-first, timed by tokens, respects reduced motion, and adds no new runtime dependency to @nextcms/editor-ui.
todos:
- id: foundation
  content: Add motion tokens, a motion-level preference and shared hooks (sliding indicator, rolling number, FLIP list)
  status: completed
- id: topbar
  content: Animate the TopBar (save status morph, undo/redo nudge, publish progress/success, dropdown chevrons, theme toggle)
  status: completed
- id: devicebar
  content: Animate the FloatingDeviceBar (sliding pill, icon pop, rolling zoom %, canvas width transition)
  status: completed
- id: inspector
  content: Animate the inspector (sliding tab indicator, panel crossfade, field stagger, input focus, FLIP layout order, reset spin, rolling modified count)
  status: completed
- id: other-chrome
  content: Animate other chrome (block toolbar pop, selection outline, panel tabs, tree, toasts, command palette, status bar)
  status: completed
- id: verify
  content: Unit tests for hooks, CSS size budget, reduced-motion check and a visual pass in the builder
  status: completed
isProject: false
---

# Editor chrome micro-interactions

## Implementation audit (2026-11-05)

| Todo | Status | Notes |
| --- | --- | --- |
| **foundation** | ✅ completed | Tokens `--ne-duration-slow` / `--ne-ease-out` / `--ne-spring` (zeroed under reduced motion). `src/lib/motion/`: `useSlidingIndicator` + `<SlidingIndicator />` (offset-based, `data-ne-ind-ready` gate, no slide-in on first paint), `RollingNumber` (right-aligned slots, up/down by value, sr-only text), `useFlip` (re-measures every commit, animates only on reorder, skips when motion is off), `resolveMotionLevel`. `EditorShell` `motion` prop → `data-ne-motion`; pref `motion: full/subtle/off` in `packages/builder-react/src/preferences.ts` (old `reducedMotion: true` still means off), picker in `PreferencesPanel`. Already wired: `Tabs` (segmented), `FloatingDeviceBar`, `PartOrderField`. Tests: `src/__tests__/motion.test.tsx`. CSS 13.1 kB gzip. |
| **topbar** | ✅ completed | `playMotion` / `MOTION` / `parseCssTime` in `src/lib/motion/play.ts` (WAAPI, token-timed, skipped when motion is off or reduced). `SaveStatus`: pulse dot while saving, check draws in, label slides up, time crossfades, shake on failure. `TopBar`: `publishState` (`idle/publishing/success/error`) + `publishSuccessLabel`, `usePublishFlash` (1.6s), progress bar, hover sweep, green/red flash; undo/redo rotate nudge on click and ⌘Z / ⌘⇧Z (not inside text fields); ⌘K key bounce; theme icons cross-rotate (`.ne-swap`); focus icon grows; Preview eye blinks; `.ne-chevron` rotates when open (Export menu). Host: `new-editor.tsx` tracks `liveOutcome` for publish, save-goes-live and submit-for-review; passed through `PrimaryAction.state`. |
| **devicebar** | ✅ completed | `FloatingDeviceBar`: active icon pops, zoom value is a `RollingNumber` (button label "Zoom N%. Reset zoom to 100%"), ± use `useHoldRepeat` (350ms delay, 90ms repeat, stops at 50/150 and disables there), reset flashes via `flashValue`; `stepZoom` exported. `TopBar`'s own device group/zoom got the same pill, pop and rolling value. Canvas (`packages/builder-react/src/canvas.tsx`): frame width transition uses `--ne-duration-slow` / `--ne-ease-out`, turned off while dragging; device badge slides in on change. |
| **inspector** | ✅ completed | The live inspector is `packages/builder-react/src/settings-view.tsx` (uses `PanelTabs`, not `Tabs`). `PanelTabs`: sliding pill (segmented) / sliding underline (`.ne-indicator-line`, default). Inspector `DeviceSwitch`: sliding primary-soft pill. Tab body (`.ne-tab-panel`) remounts per block / tab / "Show only changed" and slides from the tab's side (RTL-aware) with `.ne-stagger` sections. `ChangedDot` stays mounted and scales in/out. `FieldRow` flashes on reset (the reset button unmounts, so no spin) and shakes new errors. Rolling counts: section badge, "Show only changed" chip, footer "N modified" / "N changes". `ChooseField`: sliding pill. Range thumbs grow on hover/drag. FLIP rows lift (`[data-ne-flipping]`). Input focus easing is at `:where()` specificity, so components' own `transition-colors` wins; the focus ring itself is not eased. Not done: flash on external value changes (undo/preset), search-match highlight. `RollingNumber` now imports React (builder-react's test runner compiles JSX classically). |
| **other-chrome** | ✅ completed | Canvas (`builder-react/src/canvas.tsx`): `SelectionBox` keyed by slot so one box glides between selected blocks; newly inserted/pasted/duplicated blocks get `.ne-insert-glow` once. `FloatingToolbar`: rises in (dropped `ne-motion-pop`, which needs Radix `data-state`), duplicate pops, delete wiggles on hover. Selection label slides in on change. `ToolRail`: sliding highlight per item group, rolling badges. `LayersTree`: top-level FLIP reorder, new rows flash (`.ne-flash-new`), expanded branches rise in. Command palette (`builder-react/src/command-palette.tsx`): panel pops in, rows cascade, one highlight slides between rows (`useSlidingIndicator(..., { deep: true })`). Status bar block/selected counts roll. Toasts: removed the extra entry class, since sonner animates entry and stacking itself. `useSlidingIndicator` now measures nested items and re-attaches when its container mounts later. Not done: resize-handle pulse on select. |
| **verify** | ✅ completed | `src/__tests__/motion.test.tsx` (22 tests). editor-ui 154/155 and builder-react 132/133; the two failures predate this work (TopBar Panel/Split switch and footer Undo button, both commented out in committed code). Typechecks clean; CSS 13.9 kB gzip (≤ 16). Checked in the running editor (port 3001): device/tab/inspector/palette indicators, frame width, zoom hold-repeat, tab slide direction, changed filter, publish state colours, ⌘K bounce, motion level Off. Not exercised in the browser: a real publish, field reset, block insert glow, layers reorder (each would edit the page). |


## Context

The user wants the builder UI itself (the areas marked in red in the screenshot) to feel as polished as [bencho.dev](https://bencho.dev/): small, quick interactions on presses, hovers, state changes and value changes. **This plan covers editor chrome only.** Effects that site visitors see (animations inside page blocks) are a separate plan.

What already exists in `packages/editor-ui`:

- `src/motion.css` holds shared keyframes and classes (`ne-motion-pop`, `-collapse`, `-enter`, `-enter-up`, `-pop-in`, `-dialog`, `-overlay`) keyed to Radix `data-state`.
- `src/tokens.css` defines `--ne-duration-fast` (150ms), `--ne-duration-normal` (200ms) and `--ne-easing`, all set to 0ms under `prefers-reduced-motion`.
- `ChangedDot` already uses `ne-motion-pop-in`, and `FloatingDeviceBar` uses `ne-motion-enter`.
- `scripts/check-size.mjs` caps the compiled CSS at **16 kB gzip**, so the new CSS has to stay small.

**Approach:**

- Extend `motion.css`, and add three tiny hooks instead of adding `motion/react` to the package.
- Animate only `transform`, `opacity`, `clip-path` and `background-position`.
- Keep durations between 120 and 320ms.

## 1. Foundation (`foundation`)

- **Tokens** in `tokens.css`:
  - Add `--ne-duration-slow` (320ms), `--ne-spring` (`cubic-bezier(.34,1.56,.64,1)`) and `--ne-ease-out` (`cubic-bezier(.22,1,.36,1)`).
  - Set all of them to 0ms or none in the existing reduced-motion block.
- **Motion-level preference:** Full, Subtle or Off.
  - It sets `data-ne-motion="full|subtle|off"` on the editor root in `shell/EditorShell.tsx`.
  - `off` zeroes the durations. `subtle` turns off decorative effects (sweep, shimmer, bounce) and keeps functional transitions.
  - It is stored with the existing editor prefs in `src/app/(admin)/dashboard/(fullscreen)/_editor/store.ts` and exposed in the Shortcuts/settings menu.
- **Hooks** in a new `src/lib/motion/` folder:
  - `useSlidingIndicator(containerRef, activeKey)` measures the active item and writes `--ne-ind-x`, `--ne-ind-w` and `--ne-ind-h` onto the container. A `ResizeObserver` keeps them current. One absolutely positioned `<span class="ne-indicator">` then slides with a CSS transition.
  - `RollingNumber` is a component that renders digits in a vertically translated column, so numbers like 100%, 14 and "10 modified" roll when they change.
  - `useFlip(listRef, keys)` records each child's rect before a change and plays a transform from the old position on the next layout effect. It is used to reorder lists.
- **New `motion.css` classes:**
  - `ne-press` (scale .96 on `:active`)
  - `ne-hover-lift`
  - `ne-icon-nudge-l` and `ne-icon-nudge-r` (for undo and redo)
  - `ne-spin-once` (reset)
  - `ne-sweep` (gradient sweep on hover)
  - `ne-shimmer` (progress)
  - `ne-check-draw` (stroke-dashoffset)
  - `ne-stagger` (children get `animation-delay: calc(var(--i) * 20ms)`, capped at 10 items)
  - `ne-shake` (validation error)
  - `ne-flash` (value changed highlight)

## 2. Top bar (`topbar`): `src/shell/TopBar.tsx`, `src/feedback/SaveStatus.tsx`

- **Save status:**
  - Saving shows a dot pulse, then a check stroke drawing in (`ne-check-draw`), then the "Saved" text sliding up as the label changes.
  - An error triggers `ne-shake` and turns the text red.
  - The relative timestamp crossfades.
- **Undo and redo:** the icon nudges ±20° once (`ne-icon-nudge-*`) when clicked or triggered with ⌘Z. When it becomes disabled it fades instead of switching instantly.
- **Publish ("Update live page"):**
  - Hover runs a sweep highlight (`ne-sweep`).
  - While publishing, an indeterminate shimmer bar runs along the bottom edge.
  - On success, the label morphs to "✓ Live" for 1.2s with a soft `ne-pop` on the icon, then reverts.
  - All of this is driven by a new optional `publishState: 'idle' | 'publishing' | 'success' | 'error'` prop.
- **Save draft and Preview:** `ne-press`, and Preview's eye icon blinks once on hover.
- **Export and other dropdowns:** the chevron rotates 180° while `data-state=open`, and menus already use `ne-motion-pop`.
- **Theme toggle:** the sun and moon icons cross-rotate and scale.
- **Focus-mode and fullscreen icons:** a corner-arrow expand micro-motion on hover.
- **Search ⌘K chip:** a key-press bounce on the `Kbd` when the shortcut fires.
- **The whole bar:** icon buttons get a consistent hover background fade plus `ne-press`, applied through `primitives/IconButton.tsx` and `primitives/Button.tsx` so it reaches everywhere.

## 3. Device and zoom bar (`devicebar`): `src/shell/FloatingDeviceBar.tsx`

- **Sliding pill:**
  - Replace the per-button active background with one `ne-indicator` pill driven by `useSlidingIndicator`. The pill springs between Desktop, Tablet and Mobile.
  - The active icon gets `ne-pop` and the label color crossfades.
- **Zoom:**
  - The `{zoom}%` value uses `RollingNumber`.
  - The ± buttons get `ne-press`, and holding a button repeats the step.
  - Clicking the value to reset to 100% triggers `ne-flash`.
- **Canvas:**
  - When the device changes, the preview frame width transitions (`width` on the frame wrapper, `--ne-duration-slow`, `--ne-ease-out`), so the page visibly narrows to tablet or phone width instead of jumping.
  - The `DESKTOP` badge in the frame chrome crossfades.
  - The wrapper is in `packages/builder-react/src/canvas.tsx` and `frame.tsx`. The width transition is turned off while the user is dragging.

## 4. Inspector (`inspector`): `src/inspector/*`, `src/primitives/Tabs.tsx`, `src/controls/*`

- **Content, Style and Advanced tabs:**
  - The `segmented` variant in `Tabs.tsx` gets the sliding indicator.
  - The tab's changed dot keeps `ne-motion-pop-in`.
  - The panel body crossfades and slides 6px in the direction of the tab change: left when moving to a later tab, right when moving back.
- **Block selection change:** the field rows enter with `ne-stagger` (opacity plus 4px rise, up to 10 rows), and the breadcrumb "Page › Hero" slides.
- **Device switch in the panel header** (the icons next to "Hero"): uses the same sliding indicator.
- **Inputs** (`primitives/Input.tsx`, `Textarea.tsx`, `NumberInput.tsx`, `controls/*Field.tsx`):
  - On focus, the border color and the focus ring scale in.
  - A validation error triggers `ne-shake`.
  - An external value change (undo, reset, preset) triggers `ne-flash`.
  - Number scrub (`controls/useScrub.ts`) shows a cursor hint and a small value pop.
- **Changed dots and reset** (`ChangedDot`, `ResetButton`):
  - The dot pops in, and also shrinks out when it is reset.
  - The reset icon plays `ne-spin-once` (−360°) and the field gets `ne-flash`.
- **"Show only changed" filter and search** (`SettingsSearch.tsx`):
  - Rows that are filtered out collapse (height and opacity) instead of disappearing.
  - The count chip ("14") uses `RollingNumber`.
  - Search matches get a brief highlight sweep.
- **Layout order list** (Badge, Headline, Subheadline, Buttons):
  - Moving an item with ↑/↓ animates through `useFlip`, so the moved row swaps position visibly and briefly lifts with a shadow.
  - Drag uses the existing dnd-kit transition.
- **Field groups** (`FieldGroup.tsx`): the chevron rotates and the collapse animation is already present. The group-count badge gets `RollingNumber`.
- **Footer** ("10 modified" and the icon bar): the count rolls, and the icons get `ne-press` plus an active indicator slide.
- **Color, slider and choose controls:**
  - The slider thumb grows on hover and drag.
  - The `ChooseField` segmented control uses the sliding indicator.
  - The color swatch pops after a change.

## 5. Other chrome (`other-chrome`)

- **Canvas block toolbar** (the Hero toolbar with move, duplicate and delete):
  - It pops in from the selection edge (`ne-motion-pop`).
  - Delete hovers to a red shake-ready state.
  - Duplicate plays a small ghost-clone pop.
- **Selection and hover outline:** the outline transitions between blocks and does not jump. The resize handle pulses once when a block is selected.
- **Right panel tabs** (`shell/PanelTabs.tsx`, `ToolRail.tsx`): a sliding indicator and a panel crossfade.
- **Layers tree** (`src/tree/*`): branch expand and collapse use `ne-motion-collapse`, a reorder uses `useFlip`, and new nodes flash.
- **Toasts** (`primitives/Toast.tsx`): the toast enters from the bottom, and the stack reflows with FLIP.
- **Command palette:** the results list uses `ne-stagger`, and the active row uses the sliding indicator.
- **Status bar** ("5 blocks · 1 selected"): the numbers roll.
- **Block insert:** a newly inserted block in the canvas gets a one-time outline glow.

## Critical files

- `packages/editor-ui/src/motion.css`, `tokens.css`, plus a new `src/lib/motion/{useSlidingIndicator,useFlip}.ts` and `RollingNumber.tsx`
- `src/shell/TopBar.tsx`, `src/feedback/SaveStatus.tsx`, `src/shell/FloatingDeviceBar.tsx`, `src/shell/PanelTabs.tsx`, `src/shell/EditorShell.tsx`
- `src/primitives/{Tabs,Button,IconButton,Input,Textarea,NumberInput,Toast}.tsx`
- `src/inspector/{InspectorTabs,FieldGroup,FieldRow,ChangedDot,ResetButton,SettingsSearch}.tsx`, `src/controls/{ChooseField,SliderField,useScrub}.ts(x)`
- `packages/builder-react/src/canvas.tsx`, `frame.tsx` and `inspector.tsx`, for the frame width, layout order and selection outline
- `src/app/(admin)/dashboard/(fullscreen)/_editor/{shared-chrome,new-editor,store}.tsx` to pass `publishState` and the motion preference

## Verification

- `pnpm --filter @nextcms/editor-ui test`, adding hook tests:
  - The indicator measurement updates CSS variables when the active item changes.
  - `RollingNumber` renders the correct digits.
  - `useFlip` inverts a moved child.
- `pnpm --filter @nextcms/editor-ui typecheck` and `build` (the size check must stay ≤ 16 kB gzip).
- Run the `next-cms` dev server (port 3100), open the Home page editor and step through:
  - Save and publish.
  - Undo and redo.
  - Desktop → Tablet → Mobile, including the frame width animation.
  - Zoom ±.
  - Content → Style → Advanced.
  - Edit, reset, and the "Show only changed" toggle.
  - Moving a layout-order item with the arrows.
  - Select a different block.
- Emulate `prefers-reduced-motion` and set the motion level to Off: nothing should animate, and every state should still be correct.
- Check dark mode, and check that the rows of a 60-field block still render and scroll without jank.
- After approval, also save this plan to `.cursor/plans/editor_chrome_micro_interactions.plan.md`.
