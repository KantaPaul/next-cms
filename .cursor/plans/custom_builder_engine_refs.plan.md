---
name: Custom builder engine refs R680–R710, modern editor experience R711–R736, and data saving and fetching R737–R754
overview: "Replace the Puck editor and renderer with an in-house builder engine while keeping the existing block components, style system, and controls. Covers the document format, Puck converter, server renderer, editor store and commands, iframe canvas, dnd-kit drag and drop, inspector, responsive editing, resize handles, parity for every builder kind, migration, tests, and Gates 34–36, then a modern editor experience (command palette, quick insert, patterns, zoom, multi-device view, smart guides, multi-select, style classes, history, version compare, comments, presence, AI assist, live checks, onboarding) with Gate 37, then best-practice data saving and fetching (version checks, patch saves, offline-safe save queue, compact revisions, one-trip editor load, publish-time compile, tag-based public caching, indexes) with Gate 38. Name one numbered ref to implement only that piece."
todos:
  - id: R680
    content: "ENG-01 Record every Puck problem the team hits, each with repro steps, the page or block it breaks, and whether a Puck upgrade or setting already fixes it"
    status: pending
  - id: R681
    content: "ENG-02 Inventory every Puck API, override, field type, and route in use (20 files, including Puck, Render, resolveAllData, createUsePuck, useGetPuck, slots, overrides, viewports) and map each to its replacement"
    status: pending
  - id: R682
    content: "ENG-03 Define the versioned page document format: a node map keyed by id, named child slots per node, root props, and per-device prop values that match Responsive<T> in src/builder/style.ts"
    status: pending
  - id: R683
    content: "ENG-04 Two-way converter between Puck Data (content, zones, slot props) and the new format, with round-trip tests on every seeded and stored page, post, template, and global block"
    status: pending
  - id: R684
    content: "ENG-05 Server renderer that renders a document with the existing block components and no Puck, as React Server Components where a block allows it"
    status: pending
  - id: R685
    content: "ENG-06 Server data loaders per block (blog posts, global refs, contact forms, query loops) replacing resolveAllData, scoped to the site and cache-safe"
    status: pending
  - id: R686
    content: "ENG-07 Switch the public site, preview, /api/v1 pages and posts, and export to the new renderer behind a flag, with a screenshot diff against Puck Render on every seeded page"
    status: pending
  - id: R687
    content: "ENG-08 Editor store: node map, selection, hover, clipboard, and dirty state on React context and useSyncExternalStore, so only changed nodes re-render; no new state library"
    status: pending
  - id: R688
    content: "ENG-09 Command layer: insert, move, delete, duplicate, update props, wrap, and unwrap as commands with undo and redo, merging a drag or a typing burst into one undo step"
    status: pending
  - id: R689
    content: "ENG-10 Canvas in an iframe with site styles and theme tokens injected, rendering the same block components; selection, hover, and labels drawn as an overlay outside block DOM"
    status: pending
  - id: R690
    content: "ENG-11 Drag and drop with dnd-kit (already used by analytics boards): from the block library, within and between nested slots, with drop lines, auto-scroll, and allowed-children rules"
    status: pending
  - id: R691
    content: "ENG-12 Keyboard control: select parent, child, and sibling; move up and down; delete, duplicate, copy, paste, undo, redo; Escape to deselect"
    status: pending
  - id: R692
    content: "ENG-13 Layers panel on the new tree with drag reorder, expand and collapse, rename, hide, and lock"
    status: pending
  - id: R693
    content: "ENG-14 Inspector with a field registry (text, textarea, select, number, url, color, image, icon, rich text, list, object, custom) reusing the controls in src/builder/controls and src/builder/fields, plus conditional fields"
    status: pending
  - id: R694
    content: "ENG-15 Responsive editing: the device switch resizes the iframe; each field can hold per-device values with inheritance and reset to inherited"
    status: pending
  - id: R695
    content: "ENG-16 Canvas resize handles for container width, spacing, and flex or grid tracks, each drag committing one undoable command, with numeric input as the keyboard alternative"
    status: pending
  - id: R696
    content: "ENG-17 Inline text editing on the canvas for headings, buttons, and rich text using the project's Tiptap setup"
    status: pending
  - id: R697
    content: "ENG-18 Block definition API: one definition per block with type, label, category, icon, fields, defaults, slots, allowed children, loader, and render; port every block now in src/builder/config.tsx"
    status: pending
  - id: R698
    content: "ENG-19 Port the builder chrome: save draft, publish, autosave, editor lock, unsaved-changes guard, revisions and restore"
    status: pending
  - id: R699
    content: "ENG-20 Port every builder kind: pages, posts, post templates, page templates, global blocks with GlobalRef, contact forms, and the save-as-template and save-as-global dialogs"
    status: pending
  - id: R700
    content: "ENG-21 Port AI dialogs, motion and animation preview, theme tokens, and selection card actions"
    status: pending
  - id: R701
    content: "ENG-22 Performance budget: a 500-block page keeps smooth drag and typing, the editor bundle stays under a set size, and the public renderer ships no editor code"
    status: pending
  - id: R702
    content: "ENG-23 Per-site flag to choose the Puck or new editor during rollout, with both reading and writing the same stored format through the converter"
    status: pending
  - id: R703
    content: "ENG-24 One-time migration of page_contents, post_contents, revisions, templates, and global blocks to the new format, with a backup and a tested rollback script"
    status: pending
  - id: R704
    content: "ENG-25 Unit tests for the converter, commands and undo, nesting rules, responsive inheritance, and renderer output"
    status: pending
  - id: R705
    content: "ENG-26 End-to-end tests: add, nest, drag between containers, resize, undo, save, publish, and public render on two sites"
    status: pending
  - id: R706
    content: "ENG-27 Editor accessibility: keyboard alternative to every drag, visible focus, labelled controls, and screen reader announcements for moves"
    status: pending
  - id: R707
    content: "ENG-28 Remove @measured/puck after rollout, and update the docs and plans that assume Puck (container rules, MKT, QRY)"
    status: pending
  - id: R708
    content: "ENG-29 Gate 34 approval: document format, converter round trip, and the server renderer verified; the public site runs without Puck"
    status: pending
  - id: R709
    content: "ENG-30 Gate 35 approval: editor core and every builder kind reach parity with the Puck editor"
    status: pending
  - id: R710
    content: "ENG-31 Gate 36 approval: migration, rollback, tests, performance budget, and Puck removal verified"
    status: pending
  - id: R711
    content: "UXE-01 Editor layout with insert panel, canvas, and inspector as resizable, collapsible panels whose sizes are remembered per user, plus a focus mode that hides every panel"
    status: pending
  - id: R712
    content: "UXE-02 Command palette (Cmd/Ctrl+K) to insert any block, jump to a layer, run any editor action, open another page, and search settings"
    status: pending
  - id: R713
    content: "UXE-03 Quick insert on the canvas: type / in an empty spot or click the + shown between blocks on hover, with search and keyboard selection"
    status: pending
  - id: R714
    content: "UXE-04 Insert panel with search, categories, recent and favorite blocks, a live preview on hover, and click to insert at the selection or drag to place"
    status: pending
  - id: R715
    content: "UXE-05 Patterns library of sections and full pages with live thumbnails and filters, inserted as editable copies; users save their own patterns to a per-site team library"
    status: pending
  - id: R716
    content: "UXE-06 Canvas zoom and pan (fit, 25–200%, space-drag, pinch) and a multi-device view showing desktop, tablet, and mobile side by side with linked selection"
    status: pending
  - id: R717
    content: "UXE-07 Smart guides: show padding, margin, and gap on hover, distances between elements, and alignment guides while dragging or resizing"
    status: pending
  - id: R718
    content: "UXE-08 Breadcrumb of the selected block's parents under the canvas; click a crumb to select that parent"
    status: pending
  - id: R719
    content: "UXE-09 Multi-select with Shift or Cmd click and a marquee inside a container, with group delete, duplicate, wrap, align, and shared style edits"
    status: pending
  - id: R720
    content: "UXE-10 Floating toolbar beside the selection with the main actions for that block type, plus a right-click menu with every action and its shortcut"
    status: pending
  - id: R721
    content: "UXE-11 Empty states and drop hints: an empty container offers layout presets and a + button, and a blocked drop says why it is not allowed"
    status: pending
  - id: R722
    content: "UXE-12 Inspector tabs for Content, Style, and Advanced with search inside settings, a dot on every changed field, and reset per field and per device"
    status: pending
  - id: R723
    content: "UXE-13 Visual style controls: a box-model widget for spacing, alignment pads for flex and grid, number inputs you drag to change, unit switching, and a design token picker in every color and size field"
    status: pending
  - id: R724
    content: "UXE-14 Reusable style classes: save a block's style as a named class, apply it to other blocks, see where it is used, and detach it; builds on the global tokens in BLD-27 to BLD-31"
    status: pending
  - id: R725
    content: "UXE-15 State styles: a switch in the inspector to edit hover, focus, and active styles, previewed on the canvas"
    status: pending
  - id: R726
    content: "UXE-16 History panel listing named steps you can jump back to, a visible autosave status, and recovery of unsaved work after a crash or closed tab"
    status: pending
  - id: R727
    content: "UXE-17 Version compare: two revisions side by side with changed blocks highlighted, and restore of a single block from an older version"
    status: pending
  - id: R728
    content: "UXE-18 Comments pinned to blocks on the canvas with mentions, replies, resolve, and notifications; reviewers can comment without edit rights; shares storage with AGY-08 preview feedback"
    status: pending
  - id: R729
    content: "UXE-19 Live presence: avatars of others on the page, their selection outlines, and a lock on the block someone is editing, extending the P5-14 soft lock; full real-time co-editing stays out of scope for the first release"
    status: pending
  - id: R730
    content: "UXE-20 AI assist on the selection: generate a section from a prompt, rewrite, shorten, or translate text, write alt text, and suggest layout variants; every result is previewed first and undoable, building on the AI dialogs ported in R700"
    status: pending
  - id: R731
    content: "UXE-21 Live checks panel while editing for accessibility (RFB-16), SEO, broken links, missing alt text, heading order, and heavy blocks (RFB-23); click an issue to select the block"
    status: pending
  - id: R732
    content: "UXE-22 First-run experience: a start screen (blank, template, or AI), a short guided tour, contextual tips, and a keyboard shortcut sheet"
    status: pending
  - id: R733
    content: "UXE-23 Editor preferences: light or dark editor theme, density, reduced motion, panel positions, default units, and a right-to-left editor UI"
    status: pending
  - id: R734
    content: "UXE-24 Fast feel: selection under 50 ms, optimistic updates, skeletons instead of spinners, no layout jumps when panels open, and full use on a 13-inch laptop and a touch tablet"
    status: pending
  - id: R735
    content: "UXE-25 Usability test with five real users on five tasks (build a hero, nest a grid, fix the mobile layout, reuse a section, publish), fix the top problems, and record time per task before and after"
    status: pending
  - id: R736
    content: "UXE-26 Gate 37 approval: the modern editor experience passes the usability test, accessibility checks, and performance budget"
    status: pending
  - id: R737
    content: "DAT-01 Baseline before changes: save payload size, save latency, revision table growth per hour of editing, editor load time, public page TTFB cached and uncached, and database queries per public request, recorded in this plan"
    status: pending
  - id: R738
    content: "DAT-02 Version check on every save: each document has a version number, saves send the version they started from, and a stale save gets a conflict response that the editor shows as reload or compare, replacing today's silent last-write-wins"
    status: pending
  - id: R739
    content: "DAT-03 Patch saves: the editor sends only the changed nodes, built from the R688 command log, and the server applies them in one transaction and validates the result; a full save remains the fallback"
    status: pending
  - id: R740
    content: "DAT-04 Save queue: debounce typing (about 1 second), save at once on structural changes and when leaving the page, keep one request in flight and merge the rest, retry with backoff, and keep a local IndexedDB copy so offline or failed saves are never lost"
    status: pending
  - id: R741
    content: "DAT-05 Validate and normalize once on save (schema, sanitize, size limits per document and per field), so render paths trust stored data and skip re-validation on every request"
    status: pending
  - id: R742
    content: "DAT-06 Revision storage: full snapshots on publish and manual save, autosave revisions stored as patches against the last snapshot, a retention policy that keeps every named and published version, and rebuild of any revision on demand"
    status: pending
  - id: R743
    content: "DAT-07 Store media as asset ids, never URLs or base64, in the document; resolve size, srcset, and alt text at render time"
    status: pending
  - id: R744
    content: "DAT-08 Load the editor in one server round trip: page, draft, site settings, theme tokens, referenced global blocks, and block metadata fetched in parallel and streamed, with no client request waterfall"
    status: pending
  - id: R745
    content: "DAT-09 Load secondary panels on open (patterns, media library, revisions, comments) with pagination, cached per session using TanStack Query, which is already installed"
    status: pending
  - id: R746
    content: "DAT-10 Split editor code per block: field editors and heavy client code load on demand, and the canvas loads only the blocks the page uses until the insert panel opens"
    status: pending
  - id: R747
    content: "DAT-11 Publish once, render fast: on publish, store a render-ready published document (normalized, style classes generated, global block versions pinned) so public requests skip that work; live data loaders still run per request"
    status: pending
  - id: R748
    content: "DAT-12 Fine-grained public caching with the Next.js 16 cache APIs (use cache, cacheTag) per site, page, locale, and global block; publish revalidates only the tags it changed instead of the whole site layout, extending SLG-21 and OZ-06"
    status: pending
  - id: R749
    content: "DAT-13 Static shell with streamed dynamic parts: cache the page HTML and stream forms, filtered query loops, and per-visitor parts inside Suspense"
    status: pending
  - id: R750
    content: "DAT-14 Global block usage table updated on save, so editing a global block revalidates only the pages that use it"
    status: pending
  - id: R751
    content: "DAT-15 Indexes for the editor and public reads: page_contents (page_id, kind), page_revisions (page_id, kind, created_at), pages (site_id, language, slug, status), and the post equivalents, checked with EXPLAIN on seeded data"
    status: pending
  - id: R752
    content: "DAT-16 Batch block data loads per request with React cache so N blocks of the same type make one query, select only the needed columns, and cap document size"
    status: pending
  - id: R753
    content: "DAT-17 Performance tests in CI on a seeded 500-block page: save under 300 ms at p95, editor ready under 2 s, cached public TTFB under 100 ms, plus slow-query logging in development"
    status: pending
  - id: R754
    content: "DAT-18 Gate 38 approval: conflict-safe saving, patch saves, offline recovery, editor load, and public caching meet the R753 budgets"
    status: pending
isProject: false
---

# Custom builder engine refs R680–R710, modern editor experience R711–R736, and data saving and fetching R737–R754

Also tracked in [combined_cms_refs_f96163bc.plan.md](combined_cms_refs_f96163bc.plan.md). Keep step statuses in both files in sync. No step is started.

<!-- BEGIN: custom-builder-engine -->

## Is it possible?

Yes. Puck is the editor shell and the `Render` call, not the blocks. The 15 block files in `src/builder/blocks/` are plain React components that take props, and the style system (`style.ts`, `Responsive<T>`, the controls in `src/builder/controls/`) is already ours. So the plan replaces the **engine** (document format, editor state, canvas, drag and drop, inspector wiring, renderer) and keeps the blocks, styles, and controls.

Puck in the code today (checked 2026-10-28):

- 20 files import `@measured/puck`, about 6,000 lines. The largest are `src/builder/config.tsx` (1,499 lines), `builder-editor.tsx`, `builder-shell.tsx`, `layers-panel.tsx`, `selection-card.tsx`, and `section-inspector.tsx`.
- APIs used: `Puck`, `Render`, `resolveAllData`, `createUsePuck`, `useGetPuck`, `usePuck`, `Drawer`, `ActionBar`, `overrides`, `viewports`, `dispatch`, `resolveData`, and `slot` fields.
- The public site, `/api/v1/pages/[slug]`, and `/api/v1/posts/[slug]` depend on Puck at runtime through `Render` and `resolveAllData`.
- `@dnd-kit/core` and `@dnd-kit/sortable` are already installed and power the analytics board builder; Tiptap is already installed.
- Stored content lives in `page_contents` and `post_contents` (draft and published) plus revisions, all in Puck `Data` JSON.

## Approach

1. **Renderer first (R682–R686).** Define the new format, convert Puck data both ways, and render it on the server without Puck. This removes Puck from the public site with no editor risk, and the flag can switch back.
2. **Editor core (R687–R697).** Build the store, commands, iframe canvas, drag and drop, layers, inspector, responsive editing, resize handles, and inline text. Port blocks to the new definition API.
3. **Parity (R698–R701).** Port every builder kind and feature that runs on Puck today.
4. **Rollout (R702–R707).** Per-site flag, data migration with rollback, tests, accessibility, then remove Puck.

Do not start the editor core before Gate 34 (R708). Do not remove Puck before Gate 36 (R710).

## Steps

- **R680 (ENG-01):** Record every Puck problem the team hits, each with repro steps, the page or block it breaks, and whether a Puck upgrade or setting already fixes it.
- **R681 (ENG-02):** Inventory every Puck API, override, field type, and route in use (20 files, including Puck, Render, resolveAllData, createUsePuck, useGetPuck, slots, overrides, viewports) and map each to its replacement.
- **R682 (ENG-03):** Define the versioned page document format: a node map keyed by id, named child slots per node, root props, and per-device prop values that match Responsive<T> in src/builder/style.ts.
- **R683 (ENG-04):** Two-way converter between Puck Data (content, zones, slot props) and the new format, with round-trip tests on every seeded and stored page, post, template, and global block.
- **R684 (ENG-05):** Server renderer that renders a document with the existing block components and no Puck, as React Server Components where a block allows it.
- **R685 (ENG-06):** Server data loaders per block (blog posts, global refs, contact forms, query loops) replacing resolveAllData, scoped to the site and cache-safe.
- **R686 (ENG-07):** Switch the public site, preview, /api/v1 pages and posts, and export to the new renderer behind a flag, with a screenshot diff against Puck Render on every seeded page.
- **R687 (ENG-08):** Editor store: node map, selection, hover, clipboard, and dirty state on React context and useSyncExternalStore, so only changed nodes re-render; no new state library.
- **R688 (ENG-09):** Command layer: insert, move, delete, duplicate, update props, wrap, and unwrap as commands with undo and redo, merging a drag or a typing burst into one undo step.
- **R689 (ENG-10):** Canvas in an iframe with site styles and theme tokens injected, rendering the same block components; selection, hover, and labels drawn as an overlay outside block DOM.
- **R690 (ENG-11):** Drag and drop with dnd-kit (already used by analytics boards): from the block library, within and between nested slots, with drop lines, auto-scroll, and allowed-children rules.
- **R691 (ENG-12):** Keyboard control: select parent, child, and sibling; move up and down; delete, duplicate, copy, paste, undo, redo; Escape to deselect.
- **R692 (ENG-13):** Layers panel on the new tree with drag reorder, expand and collapse, rename, hide, and lock.
- **R693 (ENG-14):** Inspector with a field registry (text, textarea, select, number, url, color, image, icon, rich text, list, object, custom) reusing the controls in src/builder/controls and src/builder/fields, plus conditional fields.
- **R694 (ENG-15):** Responsive editing: the device switch resizes the iframe; each field can hold per-device values with inheritance and reset to inherited.
- **R695 (ENG-16):** Canvas resize handles for container width, spacing, and flex or grid tracks, each drag committing one undoable command, with numeric input as the keyboard alternative.
- **R696 (ENG-17):** Inline text editing on the canvas for headings, buttons, and rich text using the project's Tiptap setup.
- **R697 (ENG-18):** Block definition API: one definition per block with type, label, category, icon, fields, defaults, slots, allowed children, loader, and render; port every block now in src/builder/config.tsx.
- **R698 (ENG-19):** Port the builder chrome: save draft, publish, autosave, editor lock, unsaved-changes guard, revisions and restore.
- **R699 (ENG-20):** Port every builder kind: pages, posts, post templates, page templates, global blocks with GlobalRef, contact forms, and the save-as-template and save-as-global dialogs.
- **R700 (ENG-21):** Port AI dialogs, motion and animation preview, theme tokens, and selection card actions.
- **R701 (ENG-22):** Performance budget: a 500-block page keeps smooth drag and typing, the editor bundle stays under a set size, and the public renderer ships no editor code.
- **R702 (ENG-23):** Per-site flag to choose the Puck or new editor during rollout, with both reading and writing the same stored format through the converter.
- **R703 (ENG-24):** One-time migration of page_contents, post_contents, revisions, templates, and global blocks to the new format, with a backup and a tested rollback script.
- **R704 (ENG-25):** Unit tests for the converter, commands and undo, nesting rules, responsive inheritance, and renderer output.
- **R705 (ENG-26):** End-to-end tests: add, nest, drag between containers, resize, undo, save, publish, and public render on two sites.
- **R706 (ENG-27):** Editor accessibility: keyboard alternative to every drag, visible focus, labelled controls, and screen reader announcements for moves.
- **R707 (ENG-28):** Remove @measured/puck after rollout, and update the docs and plans that assume Puck (container rules, MKT, QRY).
- **R708 (ENG-29):** Gate 34 approval: document format, converter round trip, and the server renderer verified; the public site runs without Puck.
- **R709 (ENG-30):** Gate 35 approval: editor core and every builder kind reach parity with the Puck editor.
- **R710 (ENG-31):** Gate 36 approval: migration, rollback, tests, performance budget, and Puck removal verified.

## Rules

- Keep every block component engine-agnostic: props in, children through a slot render function. New blocks written during the rewrite (for example the in-progress Container in `src/builder/blocks/container.tsx`) must follow this so they move over without changes.
- The converter is the contract. Every stored page must survive Puck → new → Puck and render the same.
- No new state or drag library: React context, `useSyncExternalStore`, and dnd-kit.
- Store layout intent, not pixel positions. Sanitize and validate every stored prop; no arbitrary CSS.
- TypeScript strict, no `any`.
- Site scoping, preview rules, and caching follow the multisite plan (R463–R475) and site slug routing (R644–R667).

## How this changes other plans

- The Container, Flexbox, and Grid plan ([container_flex_grid_refs.plan.md](container_flex_grid_refs.plan.md), R393–R412, R668–R679) says "do not replace Puck" and relies on Puck slots. If this plan is approved, read "Puck slots" there as "the engine's named slots", and build R400 (resize handles) only once, as R695.
- Market-gap steps that touch the editor (undo, redo, shortcuts in R476–R477, copy style in R478) land in R688, R691, and R693 instead of on Puck.
- Query Loop (QRY) and dynamic content (BLD-21 to BLD-26) loaders should use the R685 loader API.

## Risks

- **Parity takes the longest.** Puck gives drag and drop, iframe preview, history, fields, and layers for free; each must be rebuilt and tested.
- **Data migration.** A bad conversion breaks live pages, so the flag, round-trip tests, backup, and rollback come before any write.
- **Two engines during rollout.** Keep the rollout short and freeze new Puck-only features once Gate 34 passes.

## Approval gates

- **Gate 34 (R708):** approve only after the format is documented, every stored document round-trips, and the public site, preview, and API render through the new renderer with no visual diff.
- **Gate 35 (R709):** approve only after every builder kind works in the new editor, including undo, redo, nesting, responsive values, layers, and keyboard control.
- **Gate 36 (R710):** approve only after migration and rollback are rehearsed on a copy of production data, the tests and performance budget pass, and `@measured/puck` is removed.

<!-- END: custom-builder-engine -->

---

# Modern editor experience refs R711–R736

<!-- BEGIN: modern-editor-ux -->

## Goal

Make the new editor feel like a current design tool (Framer, Webflow, Figma, Notion, Elementor 4, Wix Studio), not only match Puck. These steps build on the engine from R680–R710. Start them after Gate 34 (R708), alongside the editor core; finish before Gate 37.

Already planned elsewhere and not repeated: undo and redo buttons and shortcuts (MKT-01, MKT-02, done in R688 and R691), copy and paste style (MKT-03), section JSON import and export (MKT-07), soft lock (P5-14), global tokens (BLD-27 to BLD-31), accessibility and performance diagnostics (RFB-16, RFB-23), conditional controls (BLD-33).

## Steps

### Editor shell and navigation

- **R711 (UXE-01):** Editor layout with insert panel, canvas, and inspector as resizable, collapsible panels whose sizes are remembered per user, plus a focus mode that hides every panel.
- **R712 (UXE-02):** Command palette (Cmd/Ctrl+K) to insert any block, jump to a layer, run any editor action, open another page, and search settings.
- **R713 (UXE-03):** Quick insert on the canvas: type / in an empty spot or click the + shown between blocks on hover, with search and keyboard selection.
- **R714 (UXE-04):** Insert panel with search, categories, recent and favorite blocks, a live preview on hover, and click to insert at the selection or drag to place.
- **R715 (UXE-05):** Patterns library of sections and full pages with live thumbnails and filters, inserted as editable copies; users save their own patterns to a per-site team library.

### Canvas

- **R716 (UXE-06):** Canvas zoom and pan (fit, 25–200%, space-drag, pinch) and a multi-device view showing desktop, tablet, and mobile side by side with linked selection.
- **R717 (UXE-07):** Smart guides: show padding, margin, and gap on hover, distances between elements, and alignment guides while dragging or resizing.
- **R718 (UXE-08):** Breadcrumb of the selected block's parents under the canvas; click a crumb to select that parent.
- **R719 (UXE-09):** Multi-select with Shift or Cmd click and a marquee inside a container, with group delete, duplicate, wrap, align, and shared style edits.
- **R720 (UXE-10):** Floating toolbar beside the selection with the main actions for that block type, plus a right-click menu with every action and its shortcut.
- **R721 (UXE-11):** Empty states and drop hints: an empty container offers layout presets and a + button, and a blocked drop says why it is not allowed.

### Inspector and styling

- **R722 (UXE-12):** Inspector tabs for Content, Style, and Advanced with search inside settings, a dot on every changed field, and reset per field and per device.
- **R723 (UXE-13):** Visual style controls: a box-model widget for spacing, alignment pads for flex and grid, number inputs you drag to change, unit switching, and a design token picker in every color and size field.
- **R724 (UXE-14):** Reusable style classes: save a block's style as a named class, apply it to other blocks, see where it is used, and detach it; builds on the global tokens in BLD-27 to BLD-31.
- **R725 (UXE-15):** State styles: a switch in the inspector to edit hover, focus, and active styles, previewed on the canvas.

### History, versions, and recovery

- **R726 (UXE-16):** History panel listing named steps you can jump back to, a visible autosave status, and recovery of unsaved work after a crash or closed tab.
- **R727 (UXE-17):** Version compare: two revisions side by side with changed blocks highlighted, and restore of a single block from an older version.

### Collaboration

- **R728 (UXE-18):** Comments pinned to blocks on the canvas with mentions, replies, resolve, and notifications; reviewers can comment without edit rights; shares storage with AGY-08 preview feedback.
- **R729 (UXE-19):** Live presence: avatars of others on the page, their selection outlines, and a lock on the block someone is editing, extending the P5-14 soft lock; full real-time co-editing stays out of scope for the first release.

### AI in context

- **R730 (UXE-20):** AI assist on the selection: generate a section from a prompt, rewrite, shorten, or translate text, write alt text, and suggest layout variants; every result is previewed first and undoable, building on the AI dialogs ported in R700.

### Guidance and quality

- **R731 (UXE-21):** Live checks panel while editing for accessibility (RFB-16), SEO, broken links, missing alt text, heading order, and heavy blocks (RFB-23); click an issue to select the block.
- **R732 (UXE-22):** First-run experience: a start screen (blank, template, or AI), a short guided tour, contextual tips, and a keyboard shortcut sheet.
- **R733 (UXE-23):** Editor preferences: light or dark editor theme, density, reduced motion, panel positions, default units, and a right-to-left editor UI.
- **R734 (UXE-24):** Fast feel: selection under 50 ms, optimistic updates, skeletons instead of spinners, no layout jumps when panels open, and full use on a 13-inch laptop and a touch tablet.
- **R735 (UXE-25):** Usability test with five real users on five tasks (build a hero, nest a grid, fix the mobile layout, reuse a section, publish), fix the top problems, and record time per task before and after.

### Gate

- **R736 (UXE-26):** Gate 37 approval: the modern editor experience passes the usability test, accessibility checks, and performance budget.

## Rules

- Every action is reachable three ways: mouse, keyboard shortcut, and the command palette.
- Every change goes through the R688 command layer, so it is undoable and appears in history.
- Panels, toolbars, and overlays never shift the canvas content or block drag and drop.
- Meet WCAG 2.2 AA in the editor UI itself, and respect reduced motion.
- Measure before and after: time per task in the usability test, and selection and drag latency.

## Approval gates

- **Gate 37 (R736):** approve only after the usability test shows faster task times than the Puck editor, the editor UI passes WCAG 2.2 AA checks, and the R701 performance budget still holds.

<!-- END: modern-editor-ux -->

---

# Builder data saving and fetching refs R737–R754

<!-- BEGIN: builder-data-performance -->

## Goal

Use current best practice for how the builder saves and loads page data, and how the public site fetches it, so editing feels instant, no work is lost, and public pages are served from cache.

## Today (checked 2026-10-28)

- Autosave waits 3 seconds, then sends the whole document to `pagesService.saveDraft`.
- No version check: two editors silently overwrite each other (last write wins).
- Autosave revisions are full copies of the document, written at most once per interval.
- Publishing calls `revalidatePublicSite`, which clears the whole site layout.
- TanStack Query and Zustand are installed; nothing uses the Next.js 16 `use cache` and `cacheTag` APIs yet.

## Steps

### Measure first

- **R737 (DAT-01):** Baseline before changes: save payload size, save latency, revision table growth per hour of editing, editor load time, public page TTFB cached and uncached, and database queries per public request, recorded in this plan.

### Saving

- **R738 (DAT-02):** Version check on every save: each document has a version number, saves send the version they started from, and a stale save gets a conflict response that the editor shows as reload or compare, replacing today's silent last-write-wins.
- **R739 (DAT-03):** Patch saves: the editor sends only the changed nodes, built from the R688 command log, and the server applies them in one transaction and validates the result; a full save remains the fallback.
- **R740 (DAT-04):** Save queue: debounce typing (about 1 second), save at once on structural changes and when leaving the page, keep one request in flight and merge the rest, retry with backoff, and keep a local IndexedDB copy so offline or failed saves are never lost.
- **R741 (DAT-05):** Validate and normalize once on save (schema, sanitize, size limits per document and per field), so render paths trust stored data and skip re-validation on every request.
- **R742 (DAT-06):** Revision storage: full snapshots on publish and manual save, autosave revisions stored as patches against the last snapshot, a retention policy that keeps every named and published version, and rebuild of any revision on demand.
- **R743 (DAT-07):** Store media as asset ids, never URLs or base64, in the document; resolve size, srcset, and alt text at render time.

### Loading the editor

- **R744 (DAT-08):** Load the editor in one server round trip: page, draft, site settings, theme tokens, referenced global blocks, and block metadata fetched in parallel and streamed, with no client request waterfall.
- **R745 (DAT-09):** Load secondary panels on open (patterns, media library, revisions, comments) with pagination, cached per session using TanStack Query, which is already installed.
- **R746 (DAT-10):** Split editor code per block: field editors and heavy client code load on demand, and the canvas loads only the blocks the page uses until the insert panel opens.

### Publishing and the public site

- **R747 (DAT-11):** Publish once, render fast: on publish, store a render-ready published document (normalized, style classes generated, global block versions pinned) so public requests skip that work; live data loaders still run per request.
- **R748 (DAT-12):** Fine-grained public caching with the Next.js 16 cache APIs (use cache, cacheTag) per site, page, locale, and global block; publish revalidates only the tags it changed instead of the whole site layout, extending SLG-21 and OZ-06.
- **R749 (DAT-13):** Static shell with streamed dynamic parts: cache the page HTML and stream forms, filtered query loops, and per-visitor parts inside Suspense.
- **R750 (DAT-14):** Global block usage table updated on save, so editing a global block revalidates only the pages that use it.

### Database

- **R751 (DAT-15):** Indexes for the editor and public reads: page_contents (page_id, kind), page_revisions (page_id, kind, created_at), pages (site_id, language, slug, status), and the post equivalents, checked with EXPLAIN on seeded data.
- **R752 (DAT-16):** Batch block data loads per request with React cache so N blocks of the same type make one query, select only the needed columns, and cap document size.

### Proof

- **R753 (DAT-17):** Performance tests in CI on a seeded 500-block page: save under 300 ms at p95, editor ready under 2 s, cached public TTFB under 100 ms, plus slow-query logging in development.

### Gate

- **R754 (DAT-18):** Gate 38 approval: conflict-safe saving, patch saves, offline recovery, editor load, and public caching meet the R753 budgets.

## Rules

- Never lose an edit: a save is acknowledged only after the database commit, and unsent changes survive a reload.
- Never overwrite another person's work without telling them.
- The public site never runs editor code and never reads draft data outside preview.
- Every cache key and tag includes the site; follow the multisite plan (R463–R475) and site slug routing (R644–R667).
- Change one thing at a time and compare against the R737 baseline.

## Related steps not repeated here

OZ-06 and OZ-07 (site-wide caching and query profiling), QRY-28 (listing cache), ECM-37 (shop cache), ENG-06 (block data loaders), ENG-22 (editor performance budget), UXE-16 (autosave status and crash recovery).

<!-- END: builder-data-performance -->
