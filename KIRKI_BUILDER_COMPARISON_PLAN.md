# Kirki vs Next CMS Builder — Design Comparison & Plan

**Source analysed:** `wp-plugins/kirki` (Kirki 6.4.2, by Themeum). The editor itself ships only as a minified 6 MB bundle (`assets/js/kirki-editor.min.js`), so the editor findings come from its store shape, action names and UI strings. The data model and rendering come from readable PHP (`includes/Frontend/Preview/Preview.php`, `includes/Ajax/*`, `app/Services/*`).
**Compared with:** `packages/builder-core`, `packages/builder-react`, `packages/editor-ui`, `src/builder`.
**Date:** 2026-11-12

---

## 1. The core difference in one paragraph

Kirki is a **Webflow-style element + class builder**: the document is a flat map of generic HTML elements (`div`, `heading`, `link-block`, `section`, …). Each element has a `tag`, attributes, and a list of **style-block ids**. Styling lives in a separate, site-wide **style-block (class) registry**. Every style value is keyed by `breakpoint_state_pseudo` (for example `md`, `tablet_hover`, `mobile_hover_before`). The PHP renderer compiles this into real CSS rules, one `<style>` per breakpoint.

Next CMS is an **Elementor-style typed-block builder**: 58 block files and 75+ typed blocks. Each block has Zod-validated props. Responsive values are `Responsive<T>` inside props, and they are emitted as per-node CSS variables (`--s-pt-t`, …) that a fixed list of utility selectors reads (`src/builder/responsive-css.ts`).

Both models work. Kirki's is better for **design freedom and reuse** (classes, combo classes, any tag, pseudo-elements). Ours is better for **safety, content editors and dynamic blocks**. The plan below adopts Kirki's strongest ideas **as layers on top of our model**, without replacing it.

---

## 2. Side-by-side

| Area | Kirki | Next CMS today | Verdict |
|---|---|---|---|
| **Document** | Flat `{id → element}` map with `children`, `name`, `properties.tag`, `attributes`, `styleIds` | Flat `nodes` map with named `slots`, typed `props`, `meta` (`builder-core/src/document.ts`) | ≈ Equivalent. Our slots are richer. |
| **Element granularity** | Low-level primitives (div, heading, text, link-block, image, svg, form inputs) plus compound ones (slider, tabs, navigation, collection, popup) | High-level blocks (Hero, PricingToggle, LoopGrid…) plus `Container` and `Section` | Gap: no truly generic "div with any tag/attributes" element |
| **Styling model** | Site-wide **style blocks** (`type: class \| tag`), **combo classes**, global tag styles, compiled to real CSS selectors | Per-node props → CSS variables. "Style classes" exist but are **stored only in `localStorage`** (`builder-react/src/style-classes.ts:27`) | **Major gap** |
| **States / pseudo** | Variant key `device_state_pseudo`: hover, focus, active, `::before`, `::after`, `::placeholder`, `:nth-child(…)`, plus preserved classes (`Preview.php:1280`) | `hover`, `focus`, `active` only (`state-styles.ts:8`) | Gap: no pseudo-elements and no structural selectors |
| **Breakpoints** | User-defined list with min/max type, per-breakpoint canvas guides, optional **container-query mode** (`@container kirki-device-canvas`) | 7 fixed devices, can be enabled or disabled, custom widths (recent commit `6672100`) | ≈ Close. Container-query mode is a nice extra. |
| **Variables / tokens** | Variable groups (color, size, font-family, **text-style**) with **modes** (light/dark/brand…) and **per-element mode override** (`properties.variableMode`) | Theme tokens + typography presets (`src/builder/theme.ts`). No modes and no element-scoped override | Gap: modes, text-style tokens, scoped override |
| **Components** | **Symbols** with **slots**, **component field bindings** (exposed props), nested overrides, an edit-in-place frame with breadcrumbs (`Ajax/Symbol.php:342-500`) | `GlobalRef`: synced instance, no props and no slots | Gap (already ticketed as BLD-201) |
| **Interactions** | Triggers (click, hover, scroll-into, scroll-out, page load…) → targets (self, children, siblings, trigger-siblings, by class) → **keyframe timeline** of move/rotate/scale/skew/fade/color/filter/bg. "Set as initial" CSS. Separate **Interaction Library** presets | Motion presets + entrance animations (`motion.tsx`, `animation-catalog.ts`). `AnimationTimelineView` exists in editor-ui | Gap: multi-target, multi-step timelines |
| **Canvas tooling** | Rulers, custom guides, **snap-to-object**, element edges, empty-element outlines, **element island** (floating quick toolbar), **flex/grid edit modes** (visual grid tracks, area drawing), padding/margin drag cursors, page resizer, **SVG pen tool** | iframe canvas with portal (`frame.tsx`), hover/selection overlays, resize handles, inline text editing, drop line, context menu, command palette | Gap: guides, snap, grid editing, spacing drag |
| **Layers / navigator** | Layers panel, class manager, "dev mode" panel, global search | Layers tree, floating layers window, breadcrumb, command palette | ≈ Parity, except the class manager |
| **Content** | Collections, items, terms, users, menus, pagination, **visibility conditions** on fields, **access rules** per element (`Preview.php:1904-1914`) | Collections, QueryLoop, LoopGrid, dynamic bindings (`builder-core/src/dynamic.ts`), basic device visibility | Gap: data-driven visibility conditions and per-element access |
| **Versions** | **Page stages**: draft stage tables, publish a stage, restore an older one (`Staging.php`, `PageStage*` models) | Revisions + review service + `version-compare.tsx` | ≈ Parity |
| **Collaboration** | Real-time over **Pusher** (`app/Broadcasting`, `Collaboration*` tables), comments with seen-state | Presence and comments as UI adapters only. Real-time is "out of scope" (`presence.tsx`) | Gap: transport layer |
| **Import** | **HTML → Kirki conversion** (`initHTMLtoKirkiConversion`), template export/import | WXR + Elementor JSON importers, JSON I/O | Gap: paste raw HTML or Figma-like markup |
| **Extensibility** | `kirki_element_generator_{source}` filter: external plugins render their own elements and get recursive child-render callbacks | `plugin-sdk` blocks, filters and hooks | ≈ Parity |
| **Output** | Only used style blocks are emitted, plus `stretch` → `-webkit-fill-available` | Utility selectors + per-node vars | Ours is leaner per page. Theirs is more readable. |
| **Editor UX extras** | Audit panel, walkthrough, quick help, liquid-glass effect, ticker, Lottie | Live checks (`live-checks.tsx`), onboarding, Lottie | ≈ Parity |

---

## 3. What to borrow (and what not to)

**Adopt:**
1. A persisted, site-wide class system with combo classes and pseudo-states. This is Kirki's biggest structural advantage, and today our classes would be lost when the browser cache is cleared.
2. Variable modes and text-style tokens (dark mode and brand themes without duplicating pages).
3. Symbols with exposed props and slots (merge with BLD-201).
4. A multi-target keyframe interaction timeline.
5. Canvas guides, snap-to-object, and visual grid/flex editing.
6. Visibility conditions driven by data and the current user.
7. An HTML paste/import converter.

**Don't copy:**
- **Kirki's generic-element-only model.** Keep typed blocks. Add one `Element` block (tag + attributes + children) for power users instead of rewriting the block library.
- **PHP-side session-stored form config.** Our server actions and Zod schemas are already better.
- **Pusher dependency.** If we do real-time editing, use our own websocket or Postgres `LISTEN`, or a CRDT (Yjs) on the existing document.
- **The `stretch` string replace hack.** Fix values properly at compile time.

---

## 4. Plan

Phases are ordered by dependency. Ticket IDs continue the scheme in `FEATURE_GAP_TICKETS.md`.

### Phase 1 — Style foundation (P0, ~3–4 weeks)

**`KRK-01` Persist style classes**
- Add a `style_classes` table: `id`, `site_id`, `name`, `kind: class | tag`, `combo_of[]`, `variants jsonb`, `is_global`, timestamps.
- Replace the `localStorage` store in `builder-react/src/style-classes.ts` with an adapter. The host loads and saves it, following the same pattern as comments and presence.
- Nodes get `props.classIds: string[]` (ordered, so combo classes work). Add a migration for existing localStorage classes: export once on editor load.
- **Done when:** classes survive a reload or another browser, show "used by N blocks", and rename/delete is safe.

**`KRK-02` Class → CSS compiler**
- Add `compileStyleClasses(classes, breakpoints, { mode: 'media' | 'container' })` in `builder-core`.
- Variant key format `device[_state][_pseudo]`, mirroring Kirki: `md`, `t_hover`, `m_hover_before`.
- Emit only the classes the rendered page uses (Kirki's `only_used_style_blocks` idea). This hooks into `render-content.tsx`.
- Reuse `filterAllowedCss` and `sanitizeCssValue` from `style-schemas.ts` for safety.
- **Done when:** the published page has real `.class:hover{}` and `@media` rules, and Vitest snapshots cover combos, states and pseudo-elements.

**`KRK-03` Extended states**
- Extend `StateStyle` beyond hover/focus/active with `focus-visible`, `visited`, `disabled`, `::before`, `::after`, `::placeholder`, `:first-child`, `:last-child` and `:nth-child(n)`.
- Add a state picker in `state-styles-ui.tsx`. `::before` and `::after` need a `content` field.

**`KRK-04` Class manager panel**
- Add a "Classes" rail item in `ToolRail`: search, usage count, select all using a class, clean up unused, and duplicate.

### Phase 2 — Tokens & components (P1, ~3 weeks)

**`KRK-05` Variable modes**
- Extend theme tokens to `groups → variables → value[mode]`, with types color, size, font-family and text-style.
- Compile to `:root{}` plus `[data-mode="dark"]{}`. Add a `variableMode` prop on Section and Container that scopes a mode to a subtree, like Kirki's `data-kirki` scoping.
- The token picker (`editor-ui/inspector/TokenPicker.tsx`) shows a mode switcher, and the canvas gets a mode preview toggle.

**`KRK-06` Text-style tokens**
- One token bundles font family + responsive size, weight, line-height, letter-spacing and font-feature-settings, with `clamp()` support. It is applied by `data-text-style`. This replaces typography presets.

**`KRK-07` Symbols v2 = BLD-201**
- `GlobalRef` gains `fields` (exposed props bound to inner node props) and `slots` (inner insertion points).
- Instances store `overrides: { [fieldId]: value }` plus slot content. Use Kirki's nested override merge (`Symbol.php:401-500`) as the reference algorithm.
- Add an edit-in-place frame with a breadcrumb trail, so nested symbols can be edited one level at a time.

### Phase 3 — Canvas & layout tooling (P1, ~3–4 weeks)

**`KRK-08` Guides, rulers & snap**
- Add a canvas overlay layer in `editor-ui/overlays`: rulers, draggable guides saved per breakpoint, and snap-to-object (edges and centers of siblings) while resizing or dragging. Show distance labels (alt-hover measurement).
- Add toggles in the view menu: show element edges, show empty elements, show guides.

**`KRK-09` Spacing drag handles**
- Add padding and margin hit areas on the selected node, building on `resize.tsx`. Shift drags both opposite sides, and Alt drags all four sides. Covers half of BLD-303.

**`KRK-10` Visual grid & flex edit mode**
- When a grid Container is selected, show track lines with inline `fr/px/auto` inputs. Users can add or remove rows and columns, draw named areas, and drop children into cells.
- Flex mode shows gap areas you can drag, plus a 9-dot alignment picker. Kirki has this as `gridEditModeType` / `flexEditModeType`.

**`KRK-11` Element island**
- Add a compact floating toolbar next to the selection with the most-used actions: tag, class, link, duplicate, wrap, and visibility. It extends `FloatingToolbar.tsx`.

**`KRK-12` Generic `Element` block**
- One block with a free `tag` (an allow-list of HTML tags), attributes (sanitized), `classIds`, and a `children` slot. It brings Webflow and Kirki-level freedom without touching the typed blocks.

### Phase 4 — Interactions (P1, ~3 weeks)

**`KRK-13` Interaction engine**
- Model: `interactions: [{ trigger, target: self|children|siblings|class|node, steps: [{ at, duration, easing, props }] , setAsInitial, devices[] }]`.
- Triggers: load, click, hover in/out, scroll-into, scroll-out, scroll-progress.
- Add a small runtime (Web Animations API, no GSAP dependency) loaded only when the page uses it. Emit initial-state CSS on the server so content doesn't flash (Kirki's `get_interaction_set_as_initial_css`).
- Wire into the existing `AnimationTimelineView`.

**`KRK-14` Interaction library**
- Save interactions as named presets. Apply a preset to many nodes or to every node with a class.

### Phase 5 — Data, access & import (P2, ~2–3 weeks)

**`KRK-15` Visibility conditions**
- Add rules on any node: show or hide when a dynamic field / user role / logged-in state / URL param / date matches. Evaluate on the server in `renderer.tsx`, and never send hidden markup.
- Reuse the operator set from Kirki's `ElementVisibilityConditions.php`: equals, not, contains, in, not-in, empty, gt, lt.

**`KRK-16` HTML paste → document**
- Pasting HTML onto the canvas parses it (DOMParser) into `Element` and `Text` nodes. Inline styles become a new class, and `<img>` uploads to media. This depends on `KRK-12`.

**`KRK-17` Real-time co-editing (optional, large)**
- Add a transport behind the existing `presence` and `comments` adapters: Postgres `LISTEN/NOTIFY` + SSE for presence and locks first, then Yjs on `BuilderDocument` if full co-editing is wanted.

---

## 5. Suggested order & milestones

| Milestone | Tickets | Outcome |
|---|---|---|
| M1 | KRK-01, 02, 03 | Real CSS classes, persisted, with states and pseudo-elements |
| M2 | KRK-04, 05, 06 | Class manager, dark/brand modes, text styles |
| M3 | KRK-07, 12 | Component props and slots, generic element |
| M4 | KRK-08, 09, 10, 11 | Webflow-grade canvas tooling |
| M5 | KRK-13, 14 | Timeline interactions |
| M6 | KRK-15, 16 (17 optional) | Conditional content, HTML import, real-time |

**Biggest risk:** a split brain between per-node props styling and class styling. **Rule:** classes compile first, then per-node props override them (the same as Kirki's global-then-local order in `getRawCssDeviceWise`). The inspector shows where a value comes from, using the existing `ChangedDot` / `DeviceValueBadge`.
