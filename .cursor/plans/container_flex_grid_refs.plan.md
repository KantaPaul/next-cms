---
name: Container, Flexbox, and Grid refs R393–R412 and R668–R679
overview: "Add an Elementor-style nested Container with Flexbox and CSS Grid modes, sizing, responsive values, canvas resize handles, and legacy Columns support to the Puck builder. Split from the combined CMS plan as R393–R412 (BLD-01 to BLD-20, Gates 13–15), plus market-gap layout steps R668–R679 (CFG-01 to CFG-12, Gate 33). Name one numbered ref to implement only that piece."
todos:
  - id: R393
    content: "BLD-01 Audit the existing Puck builder, Columns/Section components, stored page data, public renderer, and responsive controls before designing layout changes"
    status: pending
  - id: R394
    content: "BLD-02 Define a strict typed, backward-compatible layout schema for container, flex, grid, sizing, and breakpoint settings"
    status: pending
  - id: R395
    content: "BLD-03 Implement a nested Container component with a Puck slot/drop zone and safe default props"
    status: pending
  - id: R396
    content: "BLD-04 Add Flexbox controls for direction, justify-content, align-items, align-content, gap, wrap, and child alignment"
    status: pending
  - id: R397
    content: "BLD-05 Add container sizing controls for width, max/min width, height, min/max height, grow, shrink, basis, and box sizing"
    status: in_progress
  - id: R398
    content: "BLD-06 Add CSS Grid controls for column/row tracks, repeat patterns, gaps, auto-flow, and responsive track definitions"
    status: pending
  - id: R399
    content: "BLD-07 Add per-child grid placement controls for column/row start, span, and order with validated values"
    status: pending
  - id: R400
    content: "BLD-08 Implement canvas resize handles for container width and flex/grid column proportions without breaking Puck drag-and-drop selection"
    status: pending
  - id: R401
    content: "BLD-09 Add responsive breakpoint values and desktop/tablet/mobile preview, including inheritance and reset-to-inherited behavior"
    status: in_progress
  - id: R402
    content: "BLD-10 Reuse existing section style controls for spacing, padding, margin, background, border, radius, and overflow where compatible"
    status: pending
  - id: R403
    content: "BLD-11 Preserve existing Columns and Section content with a non-destructive compatibility path and normalization for legacy saved pages"
    status: pending
  - id: R404
    content: "BLD-12 Render layout styles consistently in editor, preview, and published pages without unsafe arbitrary CSS or style injection"
    status: pending
  - id: R405
    content: "BLD-13 Add unit tests for layout schema validation, defaults, legacy normalization, breakpoint inheritance, and CSS style generation"
    status: pending
  - id: R406
    content: "BLD-14 Add integration/e2e tests for nesting, drag/drop, resize, save/reload, publish, and public-page rendering"
    status: pending
  - id: R407
    content: "BLD-15 Make resize and layout controls accessible with keyboard operation, labels, focus states, and numeric alternatives to dragging"
    status: pending
  - id: R408
    content: "BLD-16 Add starter layouts/templates demonstrating flex rows, responsive card grids, split hero sections, and nested containers"
    status: pending
  - id: R409
    content: "BLD-17 Document container, flex, grid, responsive behavior, supported CSS constraints, and migration/rollback behavior"
    status: pending
  - id: R410
    content: "BLD-18 Gate 13 approval: architecture audit, schema compatibility, and container/flex/grid foundations verified"
    status: pending
  - id: R411
    content: "BLD-19 Gate 14 approval: visual resizing, responsive preview, accessibility, and legacy content compatibility verified"
    status: pending
  - id: R412
    content: "BLD-20 Gate 15 approval: tests, save/publish/public rendering, performance, and release regression checks pass"
    status: pending
  - id: R668
    content: "CFG-01 Container HTML tag choice (div, section, article, header, footer, aside, nav, main) with a warning for duplicate main or nav landmarks"
    status: pending
  - id: R669
    content: "CFG-02 Content width: full width or boxed, with the boxed width taken from a site setting and overridable per container"
    status: pending
  - id: R670
    content: "CFG-03 Structure picker when a Container is added: one, two, three, and four columns, 1:2, 2:1, 1:1:2, and a bento grid"
    status: pending
  - id: R671
    content: "CFG-04 Per-child flex settings on any block inside a flex container: grow, shrink, basis, align-self, and order, per device"
    status: pending
  - id: R672
    content: "CFG-05 Auto-fit card grid: a minimum item width that fills the row without per-device column counts"
    status: pending
  - id: R673
    content: "CFG-06 Responsive direction and wrap, so a row can stack or reverse on tablet and mobile"
    status: pending
  - id: R674
    content: "CFG-07 Horizontal scroll row on mobile with scroll snap, as a container option instead of a carousel block"
    status: pending
  - id: R675
    content: "CFG-08 Whole-container link that renders one anchor and blocks nested links and buttons inside it"
    status: pending
  - id: R676
    content: "CFG-09 Wrap selected blocks in a Container and unwrap a Container while keeping its children, both undoable"
    status: pending
  - id: R677
    content: "CFG-10 One-click convert of a Columns block into a Container that renders the same, keeping the original until saved"
    status: pending
  - id: R678
    content: "CFG-11 Opt-in absolute position inside a container with offsets and z-index, off by default and hidden on mobile unless set"
    status: pending
  - id: R679
    content: "CFG-12 Gate 33 approval: CFG-01 to CFG-11 verified in the editor, preview, published page, and two devices"
    status: pending
isProject: false
---

# Container, Flexbox, and Grid refs R393–R412 and R668–R679

Source: the "Elementor-style Container, Flexbox, and Grid Builder Extension" section of [combined_cms_refs_f96163bc.plan.md](combined_cms_refs_f96163bc.plan.md). Keep step statuses in both files in sync.

Feeds: listing layouts (QRY-06, R576), docs layout (DOC-05, R515), the portfolio grid (PRT-03, R554), and the Product Query Loop (ECM-17, R619).
Related but planned elsewhere: copy and paste style (MKT-03, R478), sticky elements (MKT-27, R502), global design tokens (BLD-27 to BLD-31, R419–R423).

## Steps

Checked against the code on 2026-10-28. No step is complete. The builder has a fixed `Columns` block, not a Container, so most steps have not started; two have reusable groundwork.

- **R393** (pending): BLD-01 Audit the existing Puck builder, Columns/Section components, stored page data, public renderer, and responsive controls before designing layout changes. No written audit yet. Known today: Puck ^0.20.2, a fixed `Columns` block (`src/builder/blocks/content.tsx`) with 2–4 `slot` fields and five preset layouts, no Container block.
- **R394** (pending): BLD-02 Define a strict typed, backward-compatible layout schema for container, flex, grid, sizing, and breakpoint settings. No container/flex/grid schema. `SectionSettings` in `src/builder/style.ts` is the base to extend.
- **R395** (pending): BLD-03 Implement a nested Container component with a Puck slot/drop zone and safe default props. No Container block. `Columns` uses Puck slots but disallows nesting `Columns` inside itself.
- **R396** (pending): BLD-04 Add Flexbox controls for direction, justify-content, align-items, align-content, gap, wrap, and child alignment. No flex controls. Only `Columns.verticalAlign` (start/center/end) and the section `contentAlign` exist.
- **R397** (in_progress): BLD-05 Add container sizing controls for width, max/min width, height, min/max height, grow, shrink, basis, and box sizing. Partly there: responsive `width` with %/px/vw and `minHeight` presets (auto/half/screen) in `SectionSettings`. Missing: max/min width, height, max height, grow, shrink, basis, box sizing.
- **R398** (pending): BLD-06 Add CSS Grid controls for column/row tracks, repeat patterns, gaps, auto-flow, and responsive track definitions. No grid controls. `Columns` only offers fixed Tailwind presets (`md:grid-cols-2`, `2fr_1fr`, …) and sm/md/lg gap.
- **R399** (pending): BLD-07 Add per-child grid placement controls for column/row start, span, and order with validated values. Not started.
- **R400** (pending): BLD-08 Implement canvas resize handles for container width and flex/grid column proportions without breaking Puck drag-and-drop selection. No resize handles on the canvas.
- **R401** (in_progress): BLD-09 Add responsive breakpoint values and desktop/tablet/mobile preview, including inheritance and reset-to-inherited behavior. Partly there: `Device` desktop/tablet/mobile, `Responsive<T>` values with fallback order, and `device-row.tsx` resizes the Puck viewport. Not yet applied to layout values, and no explicit reset-to-inherited for them.
- **R402** (pending): BLD-10 Reuse existing section style controls for spacing, padding, margin, background, border, radius, and overflow where compatible. Controls exist and are ready to reuse (spacing, margin, fill, border, radius, shadow, overflow in `src/builder/controls/`); waiting on the Container block.
- **R403** (pending): BLD-11 Preserve existing Columns and Section content with a non-destructive compatibility path and normalization for legacy saved pages. Not started; `Columns` keeps working as is today.
- **R404** (pending): BLD-12 Render layout styles consistently in editor, preview, and published pages without unsafe arbitrary CSS or style injection. Style generation in `style.ts` already clamps values and emits classes; layout styles do not exist yet.
- **R405** (pending): BLD-13 Add unit tests for layout schema validation, defaults, legacy normalization, breakpoint inheritance, and CSS style generation. No builder tests. `npm test` only runs video and permissions tests.
- **R406** (pending): BLD-14 Add integration/e2e tests for nesting, drag/drop, resize, save/reload, publish, and public-page rendering.
- **R407** (pending): BLD-15 Make resize and layout controls accessible with keyboard operation, labels, focus states, and numeric alternatives to dragging.
- **R408** (pending): BLD-16 Add starter layouts/templates demonstrating flex rows, responsive card grids, split hero sections, and nested containers.
- **R409** (pending): BLD-17 Document container, flex, grid, responsive behavior, supported CSS constraints, and migration/rollback behavior.
- **R410** (pending): BLD-18 Gate 13 approval: architecture audit, schema compatibility, and container/flex/grid foundations verified.
- **R411** (pending): BLD-19 Gate 14 approval: visual resizing, responsive preview, accessibility, and legacy content compatibility verified.
- **R412** (pending): BLD-20 Gate 15 approval: tests, save/publish/public rendering, performance, and release regression checks pass.
- **R668–R679** (pending): market-gap layout steps; see the section at the end of this file.

<!-- BEGIN: container_flex_grid_builder_plan -->

## Goal

Extend the existing Puck-based builder in place. Do not replace Puck or rebuild the CMS. Add a nested Container component with Flexbox and CSS Grid modes, visual resize handles, responsive controls, and reliable public rendering while preserving existing saved pages and blocks.

## Repository-first implementation rules

1. Begin with R393. Inspect the current Puck version and APIs, component registry, Columns implementation, Section inspector/style model, editor canvas, viewport preview controls, data persistence, and public renderer before changing code.
2. Confirm which capabilities already exist. Reuse current components and controls where they satisfy requirements; do not duplicate responsive controls or introduce a second layout engine.
3. Keep TypeScript strict. Do not introduce `any`; use explicit types, safe parsing/normalization, and type guards for stored JSON.
4. Prefer a JSON-prop/data migration or normalization only when necessary. If persisted page JSON can be extended compatibly, avoid an unnecessary database migration.
5. Keep existing Columns/Section blocks renderable. Do not silently rewrite or discard saved page content. Define rollback behavior for any data conversion.
6. Use Puck's supported slot/drop-zone model for nested content. Keep component identifiers stable and ensure nested items appear correctly in the Layers panel.
7. Store layout intent (Flexbox/Grid properties and responsive overrides), not absolute pixel positions for every element. Pixel measurements may be used transiently while dragging, then converted to validated layout settings.
8. Resize handles must not hijack normal component selection, text editing, Puck drag-and-drop, or touch scrolling. Provide keyboard and numeric alternatives.
9. Sanitize and validate all persisted layout values. Do not accept arbitrary CSS strings, unsafe URLs, style injection, or unbounded track definitions.
10. Run focused tests plus the repository's relevant lint, typecheck, build, and end-to-end checks before marking tasks complete.

## Proposed user experience

- Add a **Container** item in the Layout category. A container has a content slot and a layout mode: Flex or Grid.
- Flex controls: direction, wrapping, justify-content, align-items, gap, and per-child grow/shrink/basis/alignment.
- Grid controls: columns and rows, track sizing presets, row/column gaps, auto-flow, and child spans/placement.
- Sizing controls: width, min/max width, height, min/max height, and content/box sizing. Support sensible presets (full, boxed, auto) plus numeric values with validated units.
- Canvas resizing: show handles on the selected container or column boundary. Convert drag deltas to the relevant width, flex-basis, or grid track setting; display the value while dragging and commit one undoable change on release.
- Responsive editing: desktop/tablet/mobile preview with breakpoint-specific overrides and explicit reset/inherit controls. Use the project's existing breakpoint conventions if present.
- Layers: show nested containers and their children; support selection and expansion without breaking current layer navigation.
- Published pages: render the same layout intent as the editor, with mobile-first CSS and no editor-only handles.

## Suggested implementation order

1. **Audit and schema (R393–R394):** document current architecture and choose the smallest compatible data shape.
2. **Container and layout controls (R395–R399):** implement nested slots and typed Flexbox/Grid configuration.
3. **Canvas resizing and responsive editing (R400–R402):** integrate with existing selection, history, preview, and style controls.
4. **Compatibility, rendering, and quality (R403–R409):** preserve old pages, add tests/accessibility/templates/docs, and verify published output.
5. **Approval gates (R410–R412):** stop for review after foundation, UX/responsive behavior, and release-readiness checks. Do not mark a gate complete solely because the UI renders.

## Acceptance criteria

- A user can add a container, nest containers, and drag existing blocks into and between its slots.
- A user can switch a container between Flex and Grid without losing its children or unrelated style settings.
- Drag resizing changes durable layout properties, is undoable, and remains stable after save/reload.
- Desktop, tablet, and mobile values behave predictably; absent overrides inherit from the configured base value.
- Existing pages using Columns and Section continue to render and remain editable.
- Editor preview, published page, and exported output (if this builder supports export) agree on layout behavior.
- Invalid or extreme values are rejected or normalized; layout data cannot inject arbitrary CSS.
- Keyboard-accessible alternatives exist for every essential drag-resize action.
- Tests cover nested drop zones, flex/grid rendering, responsive inheritance, legacy data, save/reload, publish, and regression behavior.
- Relevant typecheck, lint, build, and end-to-end checks pass; any unrelated existing failures are recorded rather than concealed.

## Approval gates

- **Gate 13 (R410):** approve the architecture and schema only after the repository audit is complete, existing data compatibility is demonstrated, and nested Container/Flex/Grid foundations pass tests.
- **Gate 14 (R411):** approve the editing experience only after drag resizing, responsive preview, layer navigation, keyboard alternatives, and legacy block behavior are demonstrated.
- **Gate 15 (R412):** approve release only after save/reload/publish/public-rendering tests, accessibility checks, and full regression checks pass.

## Explicit non-goals for the first release

- Do not recreate Elementor's entire widget catalog.
- Do not add freeform absolute positioning as the default layout system.
- Do not replace Puck, add a parallel editor state engine, or introduce a new drag library unless the audit proves existing APIs cannot meet a requirement.
- Do not promise pixel-perfect parity with Elementor; prioritize reliable responsive output and compatibility with the existing CMS.

<!-- END: container_flex_grid_builder_plan -->

---

# Market-gap layout steps R668–R679

<!-- BEGIN: container-layout-market-gaps -->

## Goal

Cover the container features that Elementor, Webflow, Framer, and Wix Studio users expect and that BLD-01 to BLD-20 do not name. Build these on the Container from R395 and the schema from R394; do not start them before Gate 13 (R410).

## Steps

- **R668 (CFG-01):** Container HTML tag choice (div, section, article, header, footer, aside, nav, main) with a warning for duplicate main or nav landmarks.
- **R669 (CFG-02):** Content width: full width or boxed, with the boxed width taken from a site setting and overridable per container.
- **R670 (CFG-03):** Structure picker when a Container is added: one, two, three, and four columns, 1:2, 2:1, 1:1:2, and a bento grid.
- **R671 (CFG-04):** Per-child flex settings on any block inside a flex container: grow, shrink, basis, align-self, and order, per device.
- **R672 (CFG-05):** Auto-fit card grid: a minimum item width that fills the row without per-device column counts.
- **R673 (CFG-06):** Responsive direction and wrap, so a row can stack or reverse on tablet and mobile.
- **R674 (CFG-07):** Horizontal scroll row on mobile with scroll snap, as a container option instead of a carousel block.
- **R675 (CFG-08):** Whole-container link that renders one anchor and blocks nested links and buttons inside it.
- **R676 (CFG-09):** Wrap selected blocks in a Container and unwrap a Container while keeping its children, both undoable.
- **R677 (CFG-10):** One-click convert of a Columns block into a Container that renders the same, keeping the original until saved.
- **R678 (CFG-11):** Opt-in absolute position inside a container with offsets and z-index, off by default and hidden on mobile unless set.
- **R679 (CFG-12):** Gate 33 approval: CFG-01 to CFG-11 verified in the editor, preview, published page, and two devices.

## Rules

- Store each setting in the R394 layout schema; no free CSS strings.
- Every new setting has a per-device value where it changes layout, and inherits when unset.
- Semantic tags and links must keep the page valid HTML and keyboard accessible.
- Pages without these settings render exactly as before.

## Approval gates

- **Gate 33 (R679):** approve only after each CFG step works in the editor, preview, and published page on desktop and mobile, and the R405 and R406 tests cover it.

<!-- END: container-layout-market-gaps -->
