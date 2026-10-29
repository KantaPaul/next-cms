---
name: Custom builder engine refs R680–R710, modern editor experience R711–R736, data saving and fetching R737–R754, standalone builder package R755–R772, block extension API R773–R795, and robustness refs R796–R812
overview: "Replace the Puck editor and renderer with an in-house builder engine while keeping the existing block components, style system, and controls. Covers the document format, Puck converter, server renderer, editor store and commands, iframe canvas, dnd-kit drag and drop, inspector, responsive editing, resize handles, parity for every builder kind, migration, tests, and Gates 34–36, then a modern editor experience with Gate 37, data saving/fetching with Gate 38, standalone packages with Gate 39, block extension API with Gate 40, robustness with Gate 41. Name one numbered ref to implement only that piece."
todos:
  - id: R680
    content: "ENG-01 Record every Puck problem the team hits, each with repro steps, the page or block it breaks, and whether a Puck upgrade or setting already fixes it"
    status: pending
  - id: R681
    content: "ENG-02 Inventory every Puck API, override, field type, and route in use (20 files, including Puck, Render, resolveAllData, createUsePuck, useGetPuck, slots, overrides, viewports) and map each to its replacement"
    status: pending
  - id: R682
    content: "ENG-03 Define the versioned page document format: a node map keyed by id, named child slots per node, root props, and per-device prop values that match Responsive<T> in src/builder/style.ts"
    status: completed
  - id: R683
    content: "ENG-04 Two-way converter between Puck Data (content, zones, slot props) and the new format, with round-trip tests on every seeded and stored page, post, template, and global block"
    status: completed
  - id: R684
    content: "ENG-05 Server renderer that renders a document with the existing block components and no Puck, as React Server Components where a block allows it"
    status: completed
  - id: R685
    content: "ENG-06 Server data loaders per block (blog posts, global refs, contact forms, query loops) replacing resolveAllData, scoped to the site and cache-safe"
    status: completed
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
isProject: false
---

# Custom builder engine refs R680–R710

Also tracked in combined_cms_refs_f96163bc.plan.md. Keep step statuses in both files in sync.

**Progress (2026-10-29):** R682–R685 completed (document format, converter, server renderer, data loaders). See `src/builder/document.ts`, `converter.ts`, `renderer.tsx`, `loaders.ts`.

Full plan body remains in git history at commit 98b105cd4c857dcbdfa4ad7f68467880a33eca87. Frontmatter todos above are the source of truth for status.
