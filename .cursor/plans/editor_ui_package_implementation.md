# Implementation Plan: From AI Studio Prototype to Your Project

Tracked as batch B15 (Shared editor UI package) in [custom_builder_engine_refs.plan.md](custom_builder_engine_refs.plan.md). The E-phases below map onto existing refs (section 6); keep statuses in sync with that plan and [combined_cms_refs_f96163bc.plan.md](combined_cms_refs_f96163bc.plan.md).

Use this after the prototype from `builder-editor-prototype-design-guideline.md` is finished. It turns the prototype into small, safe pull requests in your `next-cms` repo (pnpm workspace, `packages/*`, Next.js app).

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

- [ ] Export the AI Studio prototype and commit it to a throwaway branch or a `prototype/` folder. It is a reference, not production code.
- [ ] Run `pnpm test` and `pnpm builder:check-documents` and note that they pass.
- [ ] Add a `CLAUDE.md` at the repo root (template below).
- [ ] Add the two guideline files to `.cursor/plans/` or `docs/` so Claude Code can read them.
- [ ] Decide the open questions from the guideline: package name, headless primitives (for example Radix) or custom, and where the dashboard builder lives.

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
1. Ask Claude Code to list every prototype component and sort it into: tokens, primitives, shell, library, tree, inspector, overlays, feedback, page-canvas-only, dashboard-canvas-only, mock-only.
2. Extract the final token values (colors, type, spacing, radius, motion) into one table.
3. List behaviors that must be rebuilt on real commands (undo, move, insert).

Prompt:
```
Read CLAUDE.md and docs/builder-editor-prototype-design-guideline.md.
Do NOT edit files. Inspect /prototype and produce docs/editor-ui-audit.md:
1) every component sorted into: tokens, primitives, shell, library, tree,
   inspector, overlays, feedback, page-only, dashboard-only, mock-only;
2) the final token values as a table;
3) behaviors that depend on prototype state and must be rebuilt on
   packages/builder-core commands.
```

Done when: `docs/editor-ui-audit.md` exists and you agree with the sorting.

---

### E1: Create the `editor-ui` package skeleton

**Goal:** an empty but correctly wired package. Plan refs: PKG-01, PKG-03, PKG-12 (R755, R757, R766).

Steps:
1. Create `packages/editor-ui` with `package.json` (`@nextcms/editor-ui`), `tsconfig`, and entry points: `tokens.css`, `primitives`, `shell`, `inspector`, `overlays`, `feedback`.
2. Add the Biome rule that blocks `@/` imports (copy the one used for `builder-core`).
3. Add a build step that outputs compiled, prefixed (`ne-`) CSS.
4. Add a dev-only gallery route in the app (for example `/dashboard/dev/editor-ui`) that will show every component.
5. Add a size-budget check script (can start with a placeholder limit).

Prompt:
```
Plan first, then implement after I approve. Create packages/editor-ui
following the layout in the guideline (section 2). Match how
packages/builder-core is configured (tsconfig, exports, lint). Add the
Biome rule that blocks "@/" imports, a build that outputs prefixed
compiled CSS, and a dev-only gallery route. No components yet except a
placeholder. Run pnpm install, typecheck, lint, and test.
```

Done when: the package builds, the app imports from it, and a deliberate `@/` import inside it fails lint.

---

### E2: Tokens and primitives

**Goal:** the visual foundation. Plan refs: PKG-09, R723 (R763, R733).

Steps:
1. Write `tokens.css` with `--ne-*` variables for light and dark (values from the guideline, section 4) and a typed `tokens.ts`.
2. Build primitives one by one: Button, IconButton, Input, NumberInput (drag to scrub), Select, Switch, Tabs, Tooltip, Popover, Dialog, Menu, Toast, Skeleton, Kbd.
3. Show each primitive in the gallery with all states (default, hover, focus, disabled, error) in light and dark.
4. Add a theme provider and a direction provider (LTR and RTL).

Prompt:
```
Using /prototype as visual reference only, implement tokens.css and the
primitives listed in the guideline in packages/editor-ui. Use --ne-*
variables and the "ne-" class prefix. No imports from the app. Do not copy
prototype state code. Add every primitive and state to the gallery route.
Do primitives in groups of 3-4 and commit after each group.
```

Done when: the gallery shows all primitives in both themes, focus rings are visible, and a keyboard-only pass works.

---

### E3: Shell, panels, and feedback

**Goal:** the frame that both builders sit in. Plan refs: R711, R797, R798.

Steps:
1. `EditorShell` with slots: `topBar`, `library`, `canvas`, `inspector`, `statusBar`.
2. Resizable, collapsible `Panel` with sizes remembered per user (localStorage in the editor shell is fine; it is not the public site) and a focus mode.
3. `TopBar`, `Breadcrumb`, and `SaveStatus` (Saved, Saving, Unsaved, Offline, Conflict, Failed).
4. `EmptyState`, `ErrorState`, `StaleNotice`, and `ConflictDialog` (Keep mine or Use saved).
5. Gallery demo with a dummy canvas.

Prompt:
```
Implement EditorShell, Panel, ResizeHandle, TopBar, Breadcrumb, SaveStatus,
EmptyState, ErrorState, StaleNotice and ConflictDialog in editor-ui.
EditorShell receives topBar, library, canvas, inspector and statusBar as
props. It must not know about pages, blocks, dashboards or widgets. Panel
sizes persist per user. Add a gallery demo with a dummy canvas. Panels
opening must not shift layout.
```

Done when: you can resize and collapse panels, focus mode works, and every save state renders.

---

### E4: Library, layers tree, and inspector parts

**Goal:** the reusable editing panels. Plan refs: R692, R693, R714, R722, R723 (done or in progress in your plan, so adopt rather than rebuild logic).

Steps:
1. `LibraryPanel` (search, categories, recent, favorites, hover preview) taking generic items.
2. `LayersTree` taking a generic tree and callbacks (select, rename, hide, lock, move). Reuse the logic that already exists in `builder-react`; move only the markup and styles.
3. Inspector parts: `InspectorTabs`, `FieldRow`, `FieldGroup`, `ChangedDot`, `ResetButton`, `DeviceValueBadge`, `BoxModelWidget`, `TokenPicker`.
4. Do not move the field registry or `defineField`; those stay in `builder-react` and use these parts for their markup.

Prompt:
```
Move the presentational parts of the layers panel and inspector from
packages/builder-react into packages/editor-ui as generic components with
props and callbacks (no document or store imports). Keep behavior and
tests working in builder-react by importing from editor-ui. Add
LibraryPanel, BoxModelWidget, TokenPicker, ChangedDot, ResetButton and
DeviceValueBadge. Do this in small commits and run tests after each.
```

Done when: `builder-react` renders through `editor-ui` parts and existing tests still pass.

---

### E5: Overlays and accessibility helpers

**Goal:** selection, hover, drop lines, handles, toolbar. Plan refs: R689, R695, R717, R720, R706, R807.

Steps:
1. `SelectionBox`, `HoverBox`, `DropLine`, `ResizeHandles`, `FloatingToolbar`, `ContextMenu`. They take rectangles and callbacks; they never read the document.
2. `LiveAnnouncer` and a `useKeyboardMove` hook for move mode.
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
4. Add features in order of value: command palette (R712), quick insert (R713), breadcrumb (R718), Content/Style/Advanced tabs (R722).

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

**Goal:** prove the package is really shared. Skip or defer if the dashboard lives in another project.

Steps:
1. Build the grid canvas (12/6/1 columns) as its own component; it is not part of `editor-ui`.
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
