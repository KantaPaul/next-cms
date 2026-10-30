# Implementation Plan: From AI Studio Prototype to Your Project

Tracked as batch B15 (Shared editor UI package) in [custom_builder_engine_refs.plan.md](custom_builder_engine_refs.plan.md). The E-phases below map onto existing refs (section 6); keep statuses in sync with that plan and [combined_cms_refs_f96163bc.plan.md](combined_cms_refs_f96163bc.plan.md).

Use this after the prototype from `builder-editor-prototype-design-guideline.md` is finished. It turns the prototype into small, safe pull requests in your `next-cms` repo (pnpm workspace, `packages/*`, Next.js app).

**Prototype (finished):** [KantaPaul/NextCMS-Shared-Editor-UI-Builder-Prototypes](https://github.com/KantaPaul/NextCMS-Shared-Editor-UI-Builder-Prototypes), commit `921e6be`. Section 0 records what it contains, checked on 2026-10-30.

---

## Status (updated 2026-10-30, after the E1–E3 completion pass on top of `d876236`)

**Overall: about 58%** (was about 50%). The E1–E3 gaps are closed, so this is the plan's first review point. Estimate from the code, weighted by phase size (small 1, medium 2, large 3). Verified: `pnpm test` (398 pass), `tsc` for `editor-ui` and `builder-react` (0 errors; `builder-react` had 37 after `df392e9` swapped in the prototype shell API), and the gallery in the browser in light, dark, LTR and RTL.

| Phase | Size | Estimate | What's there / what's missing |
| --- | --- | --- | --- |
| E0 Audit | small | 0% | `docs/editor-ui-audit.md` does not exist. |
| E1 Skeleton | small | ~85% | **Done:** Tailwind v4 CSS build (`pnpm --filter @nextcms/editor-ui build:css` → `dist/editor-ui.css`, no preflight). It runs before `pnpm dev` and `pnpm build`. Utilities are scoped to `.ne-editor-root` / `.ne-ui` and adjusted where Tailwind 3 and 4 differ (transforms, `space-y`), so the app's Tailwind 3 output is unchanged. Also done: dev gallery at `/dashboard/dev/editor-ui`, size budget (`check:size`, 16 kB gzip; now 8.5 kB), `transpilePackages`, Biome `@/` rule. **Missing (needs `pnpm install`, blocked while `node_modules` is owned by root):** `lucide-react` as a peer dependency, `tailwind-merge` listed as a dependency, the app depending on `@nextcms/editor-ui`. Until then the CSS import uses a relative path and `tsconfig.json` maps the package. `components.json` aliases point at folders that don't exist. The package still depends on `@nextcms/builder-core`. |
| E2 Tokens and primitives | medium | ~75% | **Done:** full prototype token set plus motion, typography and spacing variables (G4); dark mode from `.dark` or `[data-ne-theme="dark"]`, with reduced motion respected; `EditorUIProvider` and `useEditorUI` (theme and direction, G2); gallery in light, dark, LTR and RTL. **Missing:** Radix `DirectionProvider` (not installed); 68 physical classes left in 21 ported files (G3); primitives are the prototype's own markup, not shadcn/ui bases (section 2a). |
| E3 Shell and feedback | medium | ~90% | **Done:** `EditorShell` with `topBar` / `library` / `canvas` / `inspector` / `statusBar` / `commandPalette` slots, `focusMode`, `theme`, `dir`, and no palette state of its own (G6). `Panel`: pointer resize, arrow / Shift / Home / End keys, sizes saved under `storageKey`, logical sides (G5). `CommandPalette`: cmdk inside the package's Radix dialog (focus trap, title, follows the editor's theme and direction). `TopBar` controls are optional; `StatusBar` has left / center / right slots; `Breadcrumb` uses `aria-current`; gallery shell demo. **Missing:** `builder-react/resizable-panel.tsx` does not render through `Panel` yet. |
| E4 Library, tree, inspector | medium | ~65% | **Done:** `LayersTree` is a WAI-ARIA tree: one tab stop; arrows, Home/End, Enter/Space, F2, Alt+Up/Down; levels and set sizes (G8). One copy only (`src/tree/`). **Missing:** `builder-react` `layers.tsx`, `inspector.tsx`, `fields.tsx` and `block-list.tsx` do not render through these parts. |
| E5 Overlays and a11y | medium | ~60% | **Done:** SelectionBox, HoverBox, DropLine, FloatingToolbar, ContextMenu, ResizeHandles, useKeyboardMove, LiveAnnouncer (the duplicate in `feedback/` is removed). **Not checked:** whether the canvas renders through them. |
| E6 Page builder adoption | large | ~50% | **Done:** `builder-react/src/shared-shell.tsx` typechecks again on the slot API, with the palette in its slot and Cmd+K. **Missing:** no app route renders `BuilderEditorWithSharedShell` (the editor route still uses `NewEditor`); top bar not wired to save / publish; e2e checks. |
| E8 Dynamic wiring | large | ~40% | **Done:** adapter contracts. **Missing:** they still use mock defaults; no real server actions or structured query endpoint. |
| E7 Dashboard builder | large | ~60% | **Done:** `builder-react/src/dashboard-shell.tsx` typechecks on the package API; the library adds widgets. **Missing:** not used by any app route; widget state is local. |
| E9 Quality and release | medium | ~35% | **Done:** README; tests for shell slots, focus mode, Panel, Breadcrumb, palette, tree semantics (15 in the package); size-budget script. **Missing:** CI wiring for the budget, gallery screenshot tests, axe check, a check that the public renderer does not import editor-ui, changesets. |

**Next:** review the package shape at this point (plan rule: stop after E3), then run `pnpm install` once `node_modules` is owned by your user again (`sudo chown -R pobon:staff node_modules`), to finish the E1 dependency items.

---

## 0. What the prototype contains (checked 2026-10-30)

Vite + React 19 + Tailwind v4 app, about 7,600 lines. Its layout is very close to the target package, so most phases **port and adapt** code instead of building it from scratch.

| Prototype path | Contents | Fate |
| --- | --- | --- |
| `src/editor-ui/` (53 files, barrel `index.ts`) | tokens, 14 primitives, 5 feedback, `LiveAnnouncer`, 8 inspector parts, `LibraryPanel` + `LibraryItem`, `LayersTree`, 5 overlays, shell (`EditorShell`, `TopBar`, `Panel`, `Breadcrumb`, `StatusBar`, `CommandPalette`) | Port into `packages/editor-ui` (E1–E5) |
| `src/index.css` | `--ne-*` variables, light on `:root`, dark on `.dark`; `.ne-editor-root`, `.ne-scrollbar` | Becomes `tokens.css` (E2) |
| `src/gallery/DesignSystemGallery.tsx` | Every component in one page | Starting point for the dev gallery route (E1) |
| `src/page-builder/*` (`documentStore.ts`, `registry.ts`, `PageCanvas`, `PageInspector`) | Mock document, mock block registry | Visual reference only. Never copy; behavior already lives in `builder-core` / `builder-react` |
| `src/dashboard-builder/*` (`widgetRegistry.ts`, `DashboardCanvas`, `DashboardInspector`) | Mock widgets and data, 12-column grid | Visual reference for E7; data is mock-only (E8) |
| `src/App.tsx` | Mode switch, `useState` history and undo, selection | Mock-only, throw away |
| `@google/genai`, `express`, `dotenv`, `.env.example` (`GEMINI_API_KEY`), `metadata.json` | AI Studio scaffolding | Throw away; never add to the app |

Good news:

- `src/editor-ui` imports only `react`, `lucide-react`, and its own files. No page, block, dashboard, or widget imports leak into it.
- No `any` inside `src/editor-ui` (the 8 in the prototype are all in page-builder, dashboard-builder, and `App.tsx`).
- Token values match the guideline and are already in both CSS (`--ne-*`) and a typed `tokens.ts`.

Gaps and conflicts each phase has to handle:

| # | Finding | Handled in |
| --- | --- | --- |
| G1 | **Styling engine.** Components use Tailwind v4 classes with arbitrary values (`text-[var(--ne-text)]`, `bg-[var(--ne-surface)]`, …). The app runs Tailwind **3.4** and only scans `./src/**`; `builder-react` uses inline styles. The package must ship its own compiled CSS, not depend on the app's Tailwind. | E1 |
| G2 | Dark mode is a `.dark` class on an ancestor; `builder-react/preferences.ts` already stores theme and direction. One theme switch must drive both. | E2 |
| G3 | No RTL anywhere (no `dir`, no logical properties such as `ps-`/`ms-`/`start-`). | E2, E3 |
| G4 | Motion and typography tokens exist only in `tokens.ts`, not as CSS variables. | E2 |
| G5 | `Panel` resizes with mouse events only, does not persist sizes, and has no keyboard resize. `builder-react/resizable-panel.tsx` already does part of this. | E3 |
| G6 | `EditorShell` takes `leftPanelContent` / `rightPanelContent` / `topBarProps`, not the `topBar` / `library` / `canvas` / `inspector` / `statusBar` slots in this plan, and it owns command-palette state and the Cmd+K listener. `builder-react` already has `command-palette.tsx` (R712 done). | E3, E6 |
| G7 | Already built in `builder-react` with real behavior: `breadcrumb`, `command-palette`, `context-menu`, `layers`, `quick-insert`, `resizable-panel`, `preferences`, `inspector`, `fields`. The prototype versions replace their **markup only**. | E3–E6 |
| G8 | `LayersTree` has no `role="tree"` / `treeitem` semantics; `Menu` and `Dialog` have roles but focus trapping and return focus need checking. | E4, E9 |
| G9 | No `ResizeHandles` overlay and no `useKeyboardMove` hook in the prototype. | E5 |
| G10 | Dashboard canvas and widgets use mock data. The app already has analytics boards using dnd-kit (see [analytics_dashboard_builder_86671e4d.plan.md](analytics_dashboard_builder_86671e4d.plan.md)). | E7, E8 |
| G11 | Prototype is pinned to newer tool versions than the app (Vite 8, TypeScript 7, lucide-react 0.546 vs app 0.552). Only `react` and `lucide-react` become package dependencies, both as peer dependencies. | E1 |

---

## 1. How to work (Claude Pro setup)

| Tool | Use it for |
| --- | --- |
| Claude chat (claude.ai) | Review the prototype, decide structure, write prompts, review diffs and plans |
| Claude Code (terminal, desktop, or VS Code) | Edit the repo, run tests, make commits |

If your plan has usage limits, keep each task small. One phase per branch and per session works best, and it matches how your plan already splits work into batches.

Working rules:

1. **One phase = one branch = one pull request.** Do not mix phases.
2. **Ask for a plan first.** Start each session with "propose a plan, do not edit files yet". Approve it, then let Claude Code implement.
3. **Tests and checks before and after.** Run `pnpm test` and `pnpm builder:check-documents` before you start and again at the end.
4. **Commit per step** so you can roll back one step.
5. **Start a fresh session for each phase** and point it at this file plus the files it needs. A long session loses detail.
6. **Never copy prototype state logic.** Copy the look (tokens, markup, CSS). Rebuild behavior on `builder-core` commands.

---

## 2. Before you start (one-time setup)

- [x] Export the AI Studio prototype. Done: it is its own repo (link at the top). It is a reference, not production code.
- [x] Clone it, pinned, into a git-ignored `prototype/` folder so Claude Code can read it without committing it:
  `git clone https://github.com/KantaPaul/NextCMS-Shared-Editor-UI-Builder-Prototypes prototype && git -C prototype checkout 921e6be`, and add `prototype/` to `.gitignore`.
- [ ] Run `pnpm test` and `pnpm builder:check-documents` and note that they pass.
- [ ] Add a `CLAUDE.md` at the repo root (template below).
- [ ] Add `builder-editor-prototype-design-guideline.md` to `docs/` so Claude Code can read it (not in either repo yet).
- [ ] Decide the open questions:
  - Package name: `@nextcms/editor-ui` (matches `@nextcms/builder-core`).
  - Primitives: decided: shadcn/ui (section 2a).
  - Dashboard builder: the app's analytics boards already exist, so E7 builds on them (in this repo).

### 2a. shadcn/ui in `editor-ui` (decided 2026-10-30)

The app already uses shadcn/ui (`components.json`, style `new-york`, 28 components in `src/components/ui`, plus `cmdk`, `sonner`, `class-variance-authority`, and Radix). shadcn/ui is copy-in source, not a runtime library, so the package can use it too, with these rules:

- **Its own copy.** `packages/editor-ui` gets its own `components.json` with aliases inside the package (for example `components/ui`, `lib/cn`). It never imports `@/components/ui` (the Biome rule blocks it), so it stays usable outside this app.
- **Tailwind v4 flavor.** Add components with the current shadcn CLI for Tailwind v4, which matches the package's own CSS build (E1). The app's admin keeps its Tailwind 3 copies; the two sets never import each other.
- **`--ne-*` tokens only.** After adding a component, replace shadcn's token classes (`bg-background`, `text-primary`, `border-input`, …) with `--ne-*` classes in the prototype's style. Do not define shadcn's `--background` / `--primary` variables in the package, because the app's admin already uses those names for site and admin colors.
- **Look from the prototype, behavior from shadcn.** Radix supplies focus trapping, keyboard support, and ARIA (gap G8); the prototype supplies sizes, spacing, and colors (28px controls, 13px text, small radii).
- **Mapping:**

| `editor-ui` part | shadcn/ui base |
| --- | --- |
| Button | `button` |
| Input, Select, Switch, Tabs, Tooltip, Popover, Dialog, Skeleton | same-name component |
| Menu, ContextMenu | `dropdown-menu`, `context-menu` |
| Toast | `sonner` |
| CommandPalette | `command` (cmdk) |
| ConflictDialog | `alert-dialog` |
| Panel resize | `resizable` (react-resizable-panels) only if it supports per-user persistence and keyboard resize; otherwise keep `builder-react/resizable-panel.tsx` logic |
| NumberInput, IconButton, Kbd, overlays, LayersTree, BoxModelWidget, TokenPicker | none; port from the prototype |

- **Peer dependencies:** `react`, `lucide-react`. Dependencies: the Radix packages used, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, `sonner`. All are already in the app, so the app installs no new libraries.

### `CLAUDE.md` template

```md
# Project rules (builder and editor work)

- Monorepo: pnpm workspace. Packages live in packages/*.
- packages/* must never import from "@/" (app code). Biome rule enforces this.
- packages/editor-ui: generic editor look only. No blocks, widgets, documents, or app imports.
- packages/builder-core: no UI. Document format, commands, store, converter, renderer.
- Public renderer must never import editor-ui or editor code.
- Editor chrome uses --ne-* CSS variables. Site content uses site theme tokens.
- No new state or drag library. React context + useSyncExternalStore. Page canvas uses the existing pointer drag engine.
- TypeScript strict, no `any`. Zod for block props.
- Store layout intent, not pixels. No arbitrary CSS strings.
- Every drag has a keyboard alternative. Visible focus. Labelled controls.
- Before finishing a task: pnpm test, pnpm builder:check-documents, pnpm lint, pnpm typecheck.
- Keep diffs small. One concern per commit.
```

---

## 3. Phases

Each phase has a goal, steps, a prompt for Claude Code, and a "done when" check.

### E0: Audit the prototype (no code changes)

**Goal:** know what to keep, what to rebuild, and what to throw away.

Steps:
1. Ask Claude Code to list every prototype component and sort it into: tokens, primitives, shell, library, tree, inspector, overlays, feedback, page-canvas-only, dashboard-canvas-only, mock-only. Section 0 already has the first cut; E0 confirms it file by file.
2. Extract the final token values (colors, type, spacing, radius, motion) into one table.
3. List behaviors that must be rebuilt on real commands (undo, move, insert).
4. For each `src/editor-ui` component, name the `builder-react` file it replaces or feeds (gap G7), and whether it is "port as is", "port and adapt", or "new".

Prompt:
```
Read CLAUDE.md and docs/builder-editor-prototype-design-guideline.md.
Read section 0 of .cursor/plans/editor_ui_package_implementation.md.
Do NOT edit files. Inspect /prototype and produce docs/editor-ui-audit.md:
1) every component sorted into: tokens, primitives, shell, library, tree,
   inspector, overlays, feedback, page-only, dashboard-only, mock-only;
2) the final token values as a table;
3) behaviors that depend on prototype state and must be rebuilt on
   packages/builder-core commands;
4) for each prototype/src/editor-ui component, the packages/builder-react
   file it replaces or feeds, and "port as is", "port and adapt", or "new".
```

Done when: `docs/editor-ui-audit.md` exists and you agree with the sorting.

---

### E1: Create the `editor-ui` package skeleton

**Goal:** an empty but correctly wired package. Plan refs: PKG-01, PKG-03, PKG-12 (R755, R757, R766).

Steps:
1. Create `packages/editor-ui` with `package.json` (`@nextcms/editor-ui`), `tsconfig`, and entry points: `tokens.css`, `primitives`, `shell`, `inspector`, `overlays`, `feedback`.
2. Add the Biome rule that blocks `@/` imports (copy the one used for `builder-core`).
3. Add a build step that outputs compiled CSS (gap G1). Recommended: the package runs its own Tailwind v4 CLI over `packages/editor-ui/src` only, with utilities and no preflight, and writes `dist/editor-ui.css`. The app imports that file once in the editor layout. The app's Tailwind 3 config never scans the package, so the two versions never meet. Keep the `ne-` prefix on hand-written classes (`ne-editor-root`, `ne-scrollbar`).
4. `react` and `lucide-react` as peer dependencies (gap G11); nothing else from the prototype's `package.json`. Add `packages/editor-ui/components.json` for shadcn/ui (section 2a).
5. Add a dev-only gallery route in the app (for example `/dashboard/dev/editor-ui`) that will show every component, starting from `prototype/src/gallery/DesignSystemGallery.tsx`.
6. Add a size-budget check script (can start with a placeholder limit).

Prompt:
```
Plan first, then implement after I approve. Read section 0 of
.cursor/plans/editor_ui_package_implementation.md. Create packages/editor-ui
mirroring the folders in prototype/src/editor-ui. Match how
packages/builder-core is configured (tsconfig, exports, lint). Add the
Biome rule that blocks "@/" imports. Add a build that compiles the
package's Tailwind v4 classes into dist/editor-ui.css without preflight,
independent of the app's Tailwind 3. react and lucide-react are peer
dependencies only. Add a dev-only gallery route. No components yet except
a placeholder. Run pnpm install, typecheck, lint, and test.
```

Done when: the package builds, the app imports from it, the app's own Tailwind output is unchanged, and a deliberate `@/` import inside it fails lint.

---

### E2: Tokens and primitives

**Goal:** the visual foundation. Plan refs: PKG-09, R723 (R763, R733).

Steps:
1. Port `tokens.css` from `prototype/src/index.css` (the `--ne-*` blocks, `.ne-editor-root`, `.ne-scrollbar`) and `tokens.ts` from `prototype/src/editor-ui/tokens/tokens.ts`. Add the motion and typography tokens as CSS variables too (gap G4). Make dark mode work from both `.dark` and `[data-ne-theme="dark"]` on the editor root.
2. Build the 14 primitives on shadcn/ui (section 2a) with the prototype's look: Button, IconButton, Input, NumberInput (drag to scrub), Select, Switch, Tabs, Tooltip, Popover, Dialog, Menu, Toast, Skeleton, Kbd. Add each shadcn component with the package's own `components.json`, then restyle it to match `prototype/src/editor-ui/primitives` using `--ne-*` classes. NumberInput, IconButton, and Kbd have no shadcn version, so port those from the prototype.
3. Switch physical classes to logical ones (`pl-`→`ps-`, `ml-`→`ms-`, `left-`→`start-`, …) so RTL works (gap G3).
4. Show each primitive in the gallery with all states (default, hover, focus, disabled, error) in light and dark, LTR and RTL.
5. Add a theme provider and a direction provider (LTR and RTL). The page editor feeds them from `builder-react/preferences.ts` (gap G2), so one setting controls both. Wrap Radix's `DirectionProvider` so Radix menus and popovers flip in RTL too.

Prompt:
```
Read sections 0 and 2a of .cursor/plans/editor_ui_package_implementation.md.
Port tokens (prototype/src/index.css, prototype/src/editor-ui/tokens) into
packages/editor-ui and add motion and typography CSS variables. Build the
primitives on shadcn/ui using packages/editor-ui/components.json (aliases
inside the package, never "@/"), restyled to match
prototype/src/editor-ui/primitives with --ne-* classes only (no shadcn
--background/--primary variables). Port NumberInput, IconButton and Kbd
from the prototype. Use logical (RTL-safe) classes. Add ThemeProvider and
DirectionProvider. Add every primitive and state to the gallery in light,
dark, LTR and RTL. Do primitives in groups of 3-4 and commit after each.
```

Done when: the gallery shows all primitives in both themes, focus rings are visible, and a keyboard-only pass works.

---

### E3: Shell, panels, and feedback

**Goal:** the frame that both builders sit in. Plan refs: R711, R797, R798.

Steps:
1. `EditorShell` with slots: `topBar`, `library`, `canvas`, `inspector`, `statusBar`. Port from `prototype/src/editor-ui/shell/EditorShell.tsx` but change its API (gap G6): slots instead of `leftPanelContent` / `rightPanelContent` / `topBarProps`, and the command palette becomes an optional `commandPalette` slot with open state passed in, so `builder-react`'s existing palette and shortcut keep working.
2. Resizable, collapsible `Panel` with sizes remembered per user (localStorage in the editor shell is fine; it is not the public site), a focus mode, pointer events, and arrow-key resizing on the handle (gap G5). Reuse what `builder-react/resizable-panel.tsx` already does; then that file renders through `Panel`.
3. `TopBar`, `Breadcrumb`, `StatusBar`, and `SaveStatus` (Saved, Saving, Unsaved, Offline, Conflict, Failed — already the prototype's `SaveState`).
4. `EmptyState`, `ErrorState`, `StaleNotice`, and `ConflictDialog` (Keep mine or Use saved), ported from `prototype/src/editor-ui/feedback`.
5. Gallery demo with a dummy canvas.

Prompt:
```
Read section 0 of .cursor/plans/editor_ui_package_implementation.md.
Port EditorShell, Panel, TopBar, Breadcrumb, StatusBar, CommandPalette
(markup only), SaveStatus, EmptyState, ErrorState, StaleNotice and
ConflictDialog from prototype/src/editor-ui into editor-ui. Change
EditorShell to take topBar, library, canvas, inspector, statusBar and an
optional commandPalette as slots, with no internal command-palette state.
It must not know about pages, blocks, dashboards or widgets. Panel uses
pointer events, resizes with arrow keys, and persists sizes per user;
reuse builder-react/resizable-panel.tsx logic. Add a gallery demo with a
dummy canvas. Panels opening must not shift layout.
```

Done when: you can resize and collapse panels, focus mode works, and every save state renders.

---

### E4: Library, layers tree, and inspector parts

**Goal:** the reusable editing panels. Plan refs: R692, R693, R714, R722, R723 (done or in progress in your plan, so adopt rather than rebuild logic).

Steps:
1. `LibraryPanel` + `LibraryItem` (search, categories, recent, favorites, hover preview) taking generic items, ported from `prototype/src/editor-ui/library`. `builder-react/block-list.tsx` and `quick-insert.tsx` feed it.
2. `LayersTree` taking a generic tree and callbacks (select, rename, hide, lock, move), with the prototype's look. Keep the logic in `builder-react/layers.tsx` (pointer drag, F2 rename, meta); move only markup and styles. Add `role="tree"` / `treeitem`, `aria-expanded`, and arrow-key navigation (gap G8).
3. Inspector parts from `prototype/src/editor-ui/inspector`: `InspectorTabs`, `FieldRow`, `FieldGroup`, `ChangedDot`, `ResetButton`, `DeviceValueBadge`, `BoxModelWidget`, `TokenPicker`.
4. Do not move the field registry or `defineField`; those stay in `builder-react` and use these parts for their markup.

Prompt:
```
Read section 0 of .cursor/plans/editor_ui_package_implementation.md.
Port LibraryPanel, LibraryItem, LayersTree and the 8 inspector parts from
prototype/src/editor-ui into packages/editor-ui as generic components with
props and callbacks (no document or store imports). Then make
packages/builder-react (layers.tsx, inspector.tsx, fields.tsx,
block-list.tsx) render through them, keeping its behavior and tests.
Add tree roles and arrow-key navigation to LayersTree. Do this in small
commits and run tests after each.
```

Done when: `builder-react` renders through `editor-ui` parts and existing tests still pass.

---

### E5: Overlays and accessibility helpers

**Goal:** selection, hover, drop lines, handles, toolbar. Plan refs: R689, R695, R717, R720, R706, R807.

Steps:
1. Port `SelectionBox`, `HoverBox`, `DropLine`, `FloatingToolbar`, `ContextMenu` from `prototype/src/editor-ui/overlays`; add `ResizeHandles`, which the prototype lacks (gap G9). They take rectangles and callbacks; they never read the document. `builder-react/context-menu.tsx` and `resize.tsx` keep their behavior and render through them.
2. Port `LiveAnnouncer` from `prototype/src/editor-ui/a11y`; add a `useKeyboardMove` hook for move mode (gap G9).
3. Keep the pointer drag engine in `builder-react` (it follows the pointer into the iframe). Only the visuals move.

Prompt:
```
Implement the overlay components in editor-ui as pure presentation: they
receive rects, labels and callbacks. Replace the overlay markup in
builder-react's canvas with them without changing drag behavior. Add
LiveAnnouncer and use it for move announcements. Verify in the browser:
select, insert, drag, nested drop, blocked drop message, undo, keyboard
moves.
```

Done when: canvas behavior is identical and screen-reader announcements fire on moves.

---

### E6: Adopt the shell in the page builder

**Goal:** the page editor route uses `EditorShell` end to end. Plan refs: R711–R722, R698 (chrome), R709.

Steps:
1. Put the new shell behind a flag (for example per user or an env flag), like your render-engine flag.
2. Wire the top bar to existing save, publish, and undo/redo actions.
3. Wire save status to the existing save queue and version conflict states (R738, R740).
4. These features already exist in `builder-react` (B8/B9). Re-skin them with `editor-ui` parts in order of value: command palette (R712, into the shell's `commandPalette` slot), quick insert (R713), breadcrumb (R718), Content/Style/Advanced tabs (R722).
5. Use `prototype/src/App.tsx` and `prototype/src/page-builder/*` only to compare the look. Their state, history, and document store are mock-only.

Prompt:
```
Plan first. Switch the page editor route at /dashboard/pages/{id}/editor to
EditorShell behind a flag. Connect the top bar to the existing save queue,
publish, and undo/redo; connect SaveStatus to the existing conflict and
offline states. No behavior changes to commands or the document. Add the
command palette in a separate commit.
```

Done when: both the old and new chrome work with the flag, and e2e checks (add, nest, drag, undo, save, publish) pass.

---

### E7: Dashboard builder on the same package

**Goal:** prove the package is really shared. The app's analytics boards already exist in this repo (gap G10), so this phase builds on them.

Steps:
1. Build the grid canvas (12/6/1 columns) as its own component; it is not part of `editor-ui`. Use `prototype/src/dashboard-builder/DashboardCanvas.tsx` for the look only; reuse the app's analytics board drag (dnd-kit) and data, not the prototype's `widgetRegistry.ts` mocks.
2. Use `EditorShell`, `LibraryPanel`, inspector parts, overlays, and states unchanged.
3. Note any change you had to make to `editor-ui` to make it work, and fix the package rather than forking.

Prompt:
```
Build the dashboard editor canvas (12/6/1 column grid with drag, resize,
keyboard move mode and numeric X/Y/W/H inputs) in packages/dashboard-builder
using only the public exports of editor-ui. If something is missing from
editor-ui, list it and propose a generic addition instead of copying code.
```

Done when: no deep imports into `editor-ui`, and the package needed only generic changes.

---

### E8: Make it dynamic (replace mocks with real data)

**Goal:** real saving, loading, and data. Plan refs: R685, R738–R744, R788.

Steps:
1. Page builder: already uses real storage through the save queue. Check nothing in the shell still uses mock data.
2. Dashboard builder: define adapters for storage (load, save with version), data sources (list of sources, measures, dimensions), and a query endpoint that takes a structured request, never free-text SQL.
3. Server loaders and caching per widget, scoped to the site, with batched queries per request.
4. Error, empty, and stale states come from real responses, not toggles.

Prompt:
```
Plan first. Define adapter interfaces for dashboard storage and data
sources (typed, with Zod). Implement them in the app with real server
actions and a structured query endpoint. Replace every mock in
dashboard-builder with the adapters. Widget states (loading, empty, error,
stale) must come from real responses. Add contract tests for each adapter.
```

Done when: no mock data is imported by production code and adapter contract tests pass.

---

### E9: Quality, docs, and release

**Goal:** make the package safe to depend on. Plan refs: R704, R705, R706, R766, R769, R770, R802.

Steps:
1. Unit tests for primitives and shell; visual regression on the gallery in light, dark, and RTL.
2. Accessibility checks: keyboard-only pass, contrast, focus ring, announcements.
3. Bundle size budgets in CI; confirm the public renderer bundle has no `editor-ui`.
4. Docs: how to install, theme with `--ne-*`, add a primitive, and add a new builder on top.
5. Changesets for versions and changelog (R771).

Prompt:
```
Add tests and checks for editor-ui: component tests, a gallery screenshot
test in light, dark and RTL, an axe accessibility check, and a CI size
budget. Add a CI check that fails if the public renderer entry imports
editor-ui. Write packages/editor-ui/README.md with install, theming,
adding a primitive, and building a new editor on top.
```

Done when: CI is green and a developer can follow the README to render a shell in a new Vite app.

---

## 4. Per-pull-request checklist

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm builder:check-documents` pass.
- [ ] No `@/` import inside `packages/*`.
- [ ] No `any`. No raw CSS strings stored in documents.
- [ ] Light and dark checked. RTL checked for shell changes.
- [ ] Keyboard path works for every new interaction; focus ring visible.
- [ ] Gallery updated for every new component and state.
- [ ] Public site bundle unchanged (no editor code added).
- [ ] Short note in the PR: what changed, what did not, how to roll back.

---

## 5. Common mistakes and how to avoid them

| Mistake | Avoid it by |
| --- | --- |
| Copying prototype state logic into the app | Use the prototype for look only; rebuild behavior on `builder-core` commands |
| Two token systems (prototype and app) | Make `--ne-*` the only source for editor chrome from E2 on |
| Two Tailwind versions fighting | The package compiles its own Tailwind v4 CSS without preflight; the app's Tailwind 3 never scans `packages/editor-ui` |
| Importing the app's `@/components/ui` shadcn copies into the package | The package has its own shadcn copies and `components.json`; Biome blocks `@/` |
| Two command palettes or two Cmd+K listeners | `EditorShell` has no palette state; `builder-react` owns it and passes it into the slot |
| Pulling AI Studio scaffolding into the app | Never add `@google/genai`, `express`, `dotenv`, or `GEMINI_API_KEY` from the prototype |
| `editor-ui` slowly learning about blocks or widgets | Review every new prop; if it names a page or dashboard concept, it belongs in the builder package |
| One huge pull request | Follow the phases; commit per component group |
| Breaking the working editor | Use a flag in E6 and keep the old chrome until parity is checked |
| Editor tokens leaking into site content | Blocks and widgets read site theme tokens only |
| Skipping states | Gallery must show loading, empty, error, stale, saving, and conflict before a component is done |

---

## 6. Mapping to your existing plan

| Phase | Plan refs |
| --- | --- |
| E1 | R755, R757, R766 |
| E2 | R723, R733, R763 |
| E3 | R711, R797, R798 |
| E4 | R692, R693, R714, R722 |
| E5 | R689, R695, R706, R717, R720, R807 |
| E6 | R698, R709, R711–R722 |
| E7 | R761, R767 (dogfooding the packages) |
| E8 | R685, R738–R744, R788 |
| E9 | R704, R705, R769–R771, R802 |

If you want these tracked in your plan file, add them as a new batch (for example "B15: Shared editor UI package") with the E-phases as steps, and keep statuses in sync in both plan files as your note at the top of the plan requires.

---

## 7. Suggested order and effort

| Order | Phase | Size |
| --- | --- | --- |
| 1 | E0 audit | small |
| 2 | E1 skeleton | small |
| 3 | E2 tokens and primitives | medium |
| 4 | E3 shell and feedback | medium |
| 5 | E4 library, tree, inspector parts | medium |
| 6 | E5 overlays and a11y | medium |
| 7 | E6 adopt in page builder | large |
| 8 | E8 dynamic wiring | large |
| 9 | E7 dashboard builder (if in this repo) | large |
| 10 | E9 quality and release | medium |

Stop and review after E3 and after E6. Those two points decide whether the package shape is right before you invest in the rest.
