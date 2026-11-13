# Builder Implementation Plan (KRK-01 → KRK-17)

Turns [KIRKI_BUILDER_COMPARISON_PLAN.md](KIRKI_BUILDER_COMPARISON_PLAN.md) into build steps.
The UI follows [BUILDER_DESIGN_GUIDELINE_PROMPTS.md](BUILDER_DESIGN_GUIDELINE_PROMPTS.md).
**Branch:** `kirki-builder-plan` · **Date:** 2026-11-13

Phase 1 is planned down to files, types and tests. Later phases are planned at task level and get the same detail when they start.

---

## 0. What the code does today (starting point)

| Fact | Where |
|---|---|
| Style classes are kept **only in `localStorage`** (`nextcms-style-classes`). `applyClass` updates that map, and nothing reaches the document or the published page. | `packages/builder-react/src/style-classes.ts:27`, `style-classes-ui.tsx:201`, `new-editor.tsx:2243-2265` |
| Block styles are props. Responsive values become per-node CSS variables, which a fixed list of utility selectors reads. | `src/builder/responsive-css.ts:34` (`RESPONSIVE_VAR_FAMILIES`), `getResponsiveCss()` |
| The site injects one global responsive stylesheet. | `src/app/(site)/layout.tsx:149-153` |
| The renderer has hooks for prop transforms and node wrapping, which is where classes get attached. | `packages/builder-core/src/renderer.tsx:59` (`wrapNode`), `src/builder/renderer.tsx:172-192` (`renderOptions`, `cmsTransformProps`) |
| Each block renders its own root element. Only 3 of 58 block files use the shared `el()` helper. | `src/builder/blocks/element.ts:59` |
| States are hover, focus and active only. | `packages/builder-react/src/state-styles.ts:8` |
| Breakpoints are stored in the `site_settings.breakpoints` column. | `src/server/services/site-settings.service.ts:148,580` |
| Allowed CSS properties and value sanitizing already exist. | `packages/builder-core/src/style-schemas.ts:157-246` |
| Migrations: `src/db/migrations/<timestamp>_<name>.sql`. Local `db:migrate` is broken, so apply the SQL with `psql` (or `db:push`). | `src/db/migrations/` |
| Tests: `pnpm test` (node:test over `src/builder/__tests__`, `packages/*/src/__tests__`, services) and `pnpm test:unit` (Vitest). | `package.json:16-18` |

**Main design decision:** classes are a **new layer**, not a replacement for props. CSS order is tag styles → classes → combo classes → block props. Block props stay inline/var-based, so they always win, and existing pages render exactly as before.

---

## Phase 1 — Persisted classes compiled to real CSS (KRK-01…04)

Target: about 3–4 weeks. Ship it behind the site setting `builder.classes` (default **off**) until step 1.9 passes.

### 1.1 Data model (`builder-core`, no UI)

**New file:** `packages/builder-core/src/style-classes.ts`

```ts
export type StyleState =
  | 'hover' | 'focus' | 'focus-visible' | 'active' | 'visited' | 'disabled'
  | 'before' | 'after' | 'placeholder'
  | 'first-child' | 'last-child' | `nth-child(${string})`;

/** Device id from BreakpointConfig, plus an optional state: "desktop", "tablet:hover", "mobile:hover:before". */
export type VariantKey = string;

/** Allowed CSS property → value; checked with filterAllowedCss on save AND on compile. */
export type CssDeclarations = Record<string, string>;

export type StyleClass = {
  id: string;            // stable id; nodes reference ids, not names, so renames are free
  siteId: string;
  name: string;          // CSS-safe slug, unique per site
  kind: 'class' | 'tag'; // tag = global element style (h1, p, a…)
  tag?: string;          // when kind === 'tag'
  variants: Record<VariantKey, CssDeclarations>;
  createdAt: string; updatedAt: string;
};
```

- Use `:` as the variant separator, not Kirki's `_`, because device ids already contain `_` (`tablet_extra`). Add `parseVariantKey` and `formatVariantKey`.
- Nodes store an **ordered** list: `node.props.classIds?: string[]`. The first id is the base class and later ids are combo classes.
- Export it from `packages/builder-core/src/index.ts` and `public-api.ts`.

**Tests:** `packages/builder-core/src/__tests__/style-classes.test.ts` covers variant key round-trips, rejecting unknown states, and `nth-child` formula validation (`/^(odd|even|-?\d*n?([+-]\d+)?)$/`).

### 1.2 CSS compiler (`builder-core`)

**New file:** `packages/builder-core/src/compile-classes.ts`

```ts
compileStyleClasses(input: {
  classes: StyleClass[];
  usedClassIds?: Set<string>;   // undefined = emit all (editor), set = emit only used (site)
  breakpoints: BreakpointConfig;
  scope?: string;               // default '.site-root'
  query?: 'media' | 'container';
}): string
```

Rules:
1. **Selector.** A class is `${scope} .c-${name}`, so it never clashes with Tailwind or editor classes. A combo is `${scope} .c-a.c-b`. A tag style is `${scope} h1`. States add `:hover`, pseudo-elements add `::before`, and so on.
2. **Order.** Tag styles, then base classes, then combos (more specific selectors later). Within each, the base device first, then the other breakpoints in the cascade order of `normalizeBreakpointConfig`. Reuse `fallbackFor` and `enabledDevices` from `breakpoints`.
3. **Breakpoints.** Use the same min/max widths as `buildResponsiveCss`, and pull a shared `mediaQueryFor(device, config)` helper out of `src/builder/responsive-css.ts` into core so both files agree. `query: 'container'` gives `@container canvas (…)`, which is for later use in the editor.
4. **Safety.** Run every declaration through `filterAllowedCss` and `sanitizeCssValue`. Add `content` to the allow-list only for `before` and `after`, and allow only quoted strings, `attr()` or `none`. Reject `}`, `<`, `@import`, `url(javascript:`.
5. **Deterministic output.** Sort keys so snapshot tests are stable and caching is possible.

**Tests:** `compile-classes.test.ts` covers base, responsive, combo, hover, `::before` with `content`, disabled devices skipped, injection strings dropped, used-only filtering, and a snapshot of a 3-class fixture.

### 1.3 Database + service

**Schema:** add `styleClasses` to `src/db/schemas/pages.schema.ts`, next to `siteSettings`:

```ts
export const styleClasses = pgTable('style_classes', {
  ...baseColumns,                       // id, createdAt, updatedAt
  siteId: text('site_id').notNull().default(DEFAULT_SITE_ID),
  name: varchar('name', { length: 80 }).notNull(),
  kind: varchar('kind', { length: 8 }).notNull().default('class'),
  tag: varchar('tag', { length: 16 }),
  variants: jsonb('variants').$type<Record<string, Record<string,string>>>().notNull().default({}),
}, t => [uniqueIndex('style_classes_site_name_uq').on(t.siteId, t.name)]);
```

**Migration:** `src/db/migrations/<ts>_style_classes.sql`. Generate it with `pnpm db:generate`, then apply it locally with `psql "$DATABASE_URL" -f …`, because `db:migrate` is broken locally.

**Zod:** `src/schemas/style-classes.schema.ts` validates `name` (`/^[a-z][a-z0-9-]{0,79}$/`), `kind`, `tag` (an allow-list), and `variants` (keys checked with `parseVariantKey`, values with `filterAllowedCss`).

**Service:** `src/server/services/style-classes.service.ts`
- `list(siteId)`, `get(siteId, id)`, `create`, `update(id, patch)`, `rename(id, name)`, `duplicate(id, name)`, `remove(id)`
- `usage(siteId, id)` scans `pages`, global blocks and templates for `classIds` containing the id, and returns `{ entryId, kind, title, nodeIds[] }[]`. It is used by delete warnings and by "used by N".
- `cssForSite(siteId, usedIds?)` returns `compileStyleClasses(...)`. Cache it with Next `unstable_cache`, tagged `style-classes:${siteId}`, and revalidate the tag on every write.
- Permission check: `require-permission.ts` with `design.manage` (add it to `src/config/permissions`).

**Server actions:** `src/app/(admin)/dashboard/(fullscreen)/pages/[id]/builder/_components/style-classes.actions.ts`, thin wrappers around the service.

**Tests:** `src/server/services/__tests__/style-classes.service.test.ts` covers create, unique-name conflict, rename keeping the id, usage scan, delete blocked while in use unless `force`, and cache tag invalidation.

### 1.4 Editor store: localStorage → adapter

**Change:** `packages/builder-react/src/style-classes.ts`
- Replace the localStorage implementation with a `StyleClassAdapter` from the host, following the same pattern as comments and presence:

```ts
export type StyleClassAdapter = {
  list(): Promise<StyleClass[]>;
  save(cls: StyleClass): Promise<StyleClass>;
  remove(id: string, opts?: { force?: boolean }): Promise<void>;
  usage(id: string): Promise<{ entryId: string; title: string; nodeIds: string[] }[]>;
};
```

- The store holds `classes: Record<id, StyleClass>`, makes **optimistic updates** and rolls back on error, and debounces saves (400 ms) per class.
- **Drop `blockClasses` from the store.** Which classes a block uses now lives in the document (`node.props.classIds`), changed through editor commands, so undo/redo and saving work for free.
- **New commands** in `packages/builder-core/src/commands.ts`: `setNodeClasses(id, classIds)`, `addNodeClass`, `removeNodeClass`, `reorderNodeClasses`. Each is one history step.
- **One-time import:** if `localStorage['nextcms-style-classes']` exists, offer "Import N local classes", then clear the key. This lives in `style-classes-ui.tsx`.

**Host wiring:** add the adapter in `builder-adapters.ts`, and replace `initStyleClassStore()` in `new-editor.tsx:1577` with `initStyleClassStore(adapter)`.

**Tests:** update `packages/builder-react/src/__tests__/` (store with a mock adapter, optimistic rollback, command undo).

### 1.5 Rendering classes on blocks

Blocks render their own roots, so attach classes **through props**, not a wrapper element. A wrapper would break flex and grid layouts.

1. **`cmsTransformProps`** (`src/builder/renderer.tsx`) turns `props.classIds` into `props.__classNames = 'c-a c-b'` using a `classId → name` map passed in `RenderMetadata.styleClasses`.
2. **A shared root helper**, `rootClassProps(props)` in `src/builder/blocks/element.ts`, returns `{ className }` merged with the block's own classes.
3. **Roll out in tiers.** Add `rootClassProps` to the root element of:
   - **Tier A (this phase):** Section, Container, Columns/Column, Heading, Text/RichText, Button, Image, Link, Icon, Divider, Spacer, and the new Element block (KRK-12, pulled forward as a stub).
   - **Tier B (Phase 2):** all remaining blocks.
   - A block type opts in with a `supportsClasses: true` flag in its definition (`src/builder/definitions`). The inspector only shows the class bar for blocks that opt in.
4. **Contract test:** `src/builder/__tests__/classes-render.test.tsx` renders every block with `supportsClasses` and asserts that the root element has `c-test`. This catches blocks that forget the helper.

**Emitting CSS:**
- Site: in `src/app/(site)/layout.tsx`, next to `data-responsive-css`, add `<style data-style-classes>{await styleClassesService.cssForSite(siteId, usedIds)}</style>`. `usedIds` are collected by walking the document in `renderBuilderContent` (`src/builder/render-content.tsx`), the same way as `collectDocumentFontFamilies`. Header, footer and overlay templates count too.
- Editor canvas: the frame gets `compileStyleClasses({ classes: all })` from the store and updates it live when a class is edited. Inject it through the stylesheet sync in `packages/builder-react/src/frame.tsx`.
- Static export: include the same CSS in `export-site.service.ts`.

### 1.6 Inspector: class bar, state picker, value sources (KRK-03)

**Files:**
- `packages/editor-ui/src/inspector/ClassSelectorBar.tsx` (new): chips, combo chips attached to their base, type-ahead create/search, chip menu (rename, duplicate, detach, select all using it, open in manager), and an "Editing affects N other elements" warning with "Duplicate as new class".
- `packages/editor-ui/src/inspector/StatePicker.tsx` (new): replaces the hover/focus/active toggle in `builder-react/src/state-styles-ui.tsx`. It has a dot for states that have values, a `content` input for before/after, and a formula input for nth-child.
- `packages/editor-ui/src/inspector/ValueSource.tsx` (new): extends `ChangedDot` with four sources (`class`, `inherited`, `override`, `default`), a popover with "from .button · Desktop", Reset, and "Move to class".

**Editing target.** Add `styleTarget: { kind: 'node' } | { kind: 'class', classId }` and `styleState: StyleState | null` to the editor state (`builder-react/src/store.ts`).
- When a class chip is active, Style fields read and write `class.variants[formatVariantKey(device, state)]`.
- When no class is active, they write block props, as today.

**Class field mapping.** Class fields use plain CSS declarations. Add a `styleFieldToCss` map in `src/builder/controls` that reuses `typographyToCSS`, `borderToCSS`, `backgroundToCSS`, `shadowToCSS` and `flexContainerToCSS` from `style-schemas.ts`. The same controls then work for both targets.

**Canvas state preview.** While a state is chosen, add `data-force-state="hover"` to the selected node in the frame. The compiler also emits a mirrored `[data-force-state=hover]` selector, **editor build only**, so the state can be previewed.

### 1.7 Classes manager panel (KRK-04)

- `packages/builder-react/src/classes-view.tsx` (new): a ToolRail item "Classes" registered in `shared-shell.tsx` / `ToolRail`.
- It has search, sort (name, usage, recent, unused), and a tag-styles section first.
- The detail view shows variants grouped by breakpoint × state, plus usage links to pages and blocks.
- "Clean up unused" opens a confirmation dialog that lists the classes and then deletes them.
- Usage comes from `adapter.usage()`, fetched when a class is opened, never per row on load.

### 1.8 Copy/paste, import, export

- `style-clipboard.ts`: copying styles includes `classIds`, and pasting asks whether to "Paste classes" or "Paste as overrides".
- `json-io.tsx`, templates and global blocks: on export, bundle the referenced classes. On import, match classes by name. If the same name has different variants, create `name-2` and remap the ids.

### 1.9 Done-check for Phase 1

- [ ] `pnpm test`, `pnpm test:unit`, `pnpm lint` and `tsc --noEmit` all pass.
- [ ] E2E `tests/e2e/style-classes.spec.ts` covers: create `.card` → apply to 2 containers → set a tablet hover background → publish → the public page has the rule in `<style data-style-classes>` and both elements change colour on hover at 800 px.
- [ ] Renaming a class changes no node ids. Undo/redo of class assignment works. Reloading keeps everything.
- [ ] A page with no classes renders byte-identical HTML compared with `main` (snapshot test).
- [ ] Lighthouse CSS size: the class stylesheet stays under 15 KB on the seed site.
- [ ] Then turn `builder.classes` on by default.

**Order of work (each step is one PR):**
`1.1 + 1.2` → `1.3` → `1.4` → `1.5` → `1.6` → `1.7` → `1.8` → `1.9`

---

## Phase 2 — Tokens & components (KRK-05…07)

**KRK-05 Variable modes**
- Extend the theme tokens type (`packages/builder-core/src/theme.ts`) to `{ groups: [{ id, type, variables: [{ id, name, value: Record<modeId, V> }] }], modes: [{ id, name }] }`. Migrate the current tokens into mode `default`.
- The compiler emits `.site-root{--x:…}` plus `.site-root [data-mode="dark"]{--x:…}`.
- Add a `variableMode` prop to Section and Container, rendered as `data-mode`.
- Add a mode switcher to `TokenPicker.tsx` and a mode preview to the TopBar.
- Tests cover token migration and the compiled CSS for 2 modes.

**KRK-06 Text-style tokens**
- New variable type `text-style`: font family plus responsive size, weight, line-height, letter-spacing and features, with `clamp()` support. It is applied with `data-text-style` and compiled with the breakpoint helper from 1.2.
- Typography presets migrate into text styles.

**KRK-07 Components v2 (= BLD-201)**
- Change `GlobalRef` to `{ globalId, overrides: Record<fieldId, unknown>, slotContent: Record<slotId, NodeId[]> }`.
- The global block definition gains `fields: [{ id, label, nodeId, propPath, type }]` and `slots: [{ id, nodeId, slotName }]`.
- Resolve on the server in `src/builder/loaders.ts`: clone the subtree, apply overrides by `nodeId + propPath`, and graft slot content in.
- Nested components merge overrides by path. Port the algorithm from Kirki `Symbol.php:401-500`, but write it from scratch.
- Editor: an isolated edit frame with a breadcrumb trail (`builder-react/src/component-frame.tsx`), and purple binding markers via `ValueSource`.
- Tests cover override precedence, nested overrides, a slot left empty, and a deleted field that has orphan overrides.

## Phase 3 — Canvas tooling (KRK-08…12)

| Ticket | Main files | Notes |
|---|---|---|
| KRK-08 Guides, rulers, snap | `editor-ui/src/overlays/Rulers.tsx`, `Guides.tsx`, `SnapEngine.ts` | Guides are stored per breakpoint in `site_settings.editor_guides` (jsonb). Snap targets come from sibling bounding rects, cached per drag. Threshold 4px ÷ zoom. Alt-hover shows measurements. |
| KRK-09 Spacing drag | extend `builder-react/src/resize.tsx` + `editor-ui/overlays/ResizeHandles.tsx` | Padding and margin zones. Shift = both opposite sides, Alt = all four sides. Writes to the current `styleTarget` (class or node). One undo step. |
| KRK-10 Grid/flex edit mode | `builder-react/src/grid-edit.tsx`, `flex-edit.tsx` | Shown when a Container with `display:grid/flex` is selected and the user presses `G`. Track inputs, named areas stored as `grid-template-areas`, and dropping into cells sets `grid-area` on the child. |
| KRK-11 Element island | extend `editor-ui/overlays/FloatingToolbar.tsx` | Actions: tag, class (opens ClassSelectorBar in a popover), link, duplicate, wrap, visibility. |
| KRK-12 Element block | `src/builder/blocks/element-block.tsx` + definition | `tag` from an allow-list (div, section, article, aside, header, footer, nav, main, span, ul, ol, li, figure, figcaption, a, button). Attributes are checked through the `sanitize.ts` allow-list. Has a `children` slot and `supportsClasses`. |

## Phase 4 — Interactions (KRK-13…14)

- Model in `packages/builder-core/src/interactions.ts`:
  `{ id, trigger: 'load'|'click'|'hover'|'scroll-in'|'scroll-out'|'scroll-progress', target: { kind: 'self'|'children'|'siblings'|'class'|'node', value? }, steps: [{ at, duration, easing, props: CssDeclarations }], setAsInitial, devices }`. It is stored at `node.props.interactions`.
- Runtime: `src/builder/interactions-client.tsx`, using the Web Animations API with IntersectionObserver for scroll triggers. It loads only when the page has interactions (detected in `renderBuilderContent`) and respects `prefers-reduced-motion`.
- Server initial-state CSS: emit `setAsInitial` from-values in a `<style data-interactions-initial>` so content doesn't flash.
- Editor: wire into the existing `editor-ui/src/controls/AnimationTimelineView.tsx`, and add a target picker and trigger list in `animation-view.tsx`.
- KRK-14 presets: a `interaction_presets` table and an "Apply to all with class" action.
- Tests cover runtime timing with fake timers, the initial CSS output, and reduced-motion.

## Phase 5 — Data, access, import (KRK-15…17)

- **KRK-15 Visibility conditions.** Add `node.props.conditions = { mode: 'all'|'any', rules: [{ source, field, op, value }] }`. Sources: dynamic field, user role, logged-in, URL param, date range, device. Evaluate in `packages/builder-core/src/renderer.tsx` before rendering, using the context from `LoaderContext`. Hidden nodes are never rendered. Add a rule builder UI in Settings, and extend `traits.ts` `withVisibility`.
- **KRK-16 HTML paste.** `builder-react/src/html-import.ts` uses DOMParser to build a tree of Element, Text, Image and Link nodes. Inline styles are grouped into new classes (by hashing the declaration set). Images upload through the media adapter. Unknown tags become `div`. Runs in the paste handler in `keyboard.ts`.
- **KRK-17 Real-time (optional).** Step 1: Postgres `LISTEN/NOTIFY` and an SSE route `src/app/api/editor/presence/route.ts` feeding the existing `presence.tsx` and `editor-lock.service.ts`. Step 2: a Yjs binding on `BuilderDocument` nodes. Needs its own design doc first.

---

## Cross-cutting rules

- **Security.** All CSS from classes, tokens and interactions goes through `filterAllowedCss` and `sanitizeCssValue` on write and again on compile. Attribute values go through `src/builder/sanitize.ts`.
- **Performance.** The site emits only the classes it uses. CSS is cached per site with tag revalidation. No new client JS unless a page uses the feature.
- **Backward compatibility.** Every new prop is optional. Pages without the new props render byte-identically (a snapshot test in each phase).
- **Feature flags.** `builder.classes`, `builder.modes`, `builder.interactions` and `builder.conditions` in site settings, each turned on when its phase's done-check passes.
- **Docs.** Update `src/content/user-guide/` for each user-facing feature.

## Timeline (one developer; roughly halve it with two)

| Weeks | Work |
|---|---|
| 1–4 | Phase 1 (KRK-01…04 + the Element stub) |
| 5–7 | Phase 2 (modes, text styles, components v2) |
| 8–11 | Phase 3 (canvas tooling, Element block finished) |
| 12–14 | Phase 4 (interactions) |
| 15–17 | Phase 5 (conditions, HTML paste; real-time as its own project) |
