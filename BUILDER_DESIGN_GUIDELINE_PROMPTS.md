# Builder Design Guideline Prompts

Prompts you can paste into an AI or hand to a designer, for the Next CMS builder editor UI.
They are based on the Kirki analysis in [KIRKI_BUILDER_COMPARISON_PLAN.md](KIRKI_BUILDER_COMPARISON_PLAN.md) and on the editor parts that already exist in `packages/editor-ui`.

- **Prompt 1:** the full editor redesign (every phase).
- **Prompt 2:** a short, focused prompt for the Phase 1 class system UI (KRK-01 to KRK-04).

---

## Prompt 1 — Full editor design guideline

```text
You are a senior product designer for visual web builders (Webflow, Framer, Figma-level quality).
Design the editor UI for "Next CMS Builder", a visual page builder in a Next.js CMS.

## Context
- The editor already exists. Its parts: EditorShell, TopBar, ToolRail (left icon rail),
  PanelStack (left panels), Inspector (right panel), an iframe Canvas with hover/selection
  overlays, FloatingToolbar, FloatingDeviceBar, StatusBar, CommandPalette and ContextMenu.
- Pages are built from typed blocks (Section, Container, Heading, Hero, LoopGrid…) plus a
  new generic "Element" block (any HTML tag).
- We are adding a site-wide CSS class system (classes and combo classes, states, pseudo-elements),
  variable modes (light/dark/brand), components with exposed props and slots,
  keyframe interactions, guides, snap, and visual grid/flex editing.
- Users: designers (want precision and freedom) and content editors (want safety and
  simplicity). The UI must serve both without feeling like two products.

## Design principles
1. The canvas comes first. Chrome is quiet, dense, and neutral; the page being built is the
   loudest thing on screen.
2. Show the source of every value. A style value can come from a class, a combo class,
   a token, or a block-level override. Use color-coded dots or badges, and give every value
   a one-click reset.
3. Edit by context. Breakpoint, state (hover/focus/::before…) and variable mode are global
   "editing contexts". They are always visible, and changing one never surprises the user.
4. Progressive disclosure. Common controls are visible. Advanced ones (pseudo-elements,
   nth-child, custom attributes, CSS escape hatch) sit one click away.
5. Direct manipulation over forms. Spacing, size, grid tracks, gaps and guides can be
   dragged on the canvas. Every drag has a matching keyboard and numeric input.
6. Keyboard-first and accessible. Everything is reachable from the CommandPalette and
   shortcuts. Meet WCAG 2.2 AA in the editor chrome, with visible focus rings and support
   for reduced motion.

## Layout (1440×900 baseline, must also work at 1280×800)
- TopBar (44px): page switcher, breadcrumb of the selection, breakpoint switcher with width
  readout, mode switcher (light/dark/brand), zoom %, undo/redo, preview, save status,
  publish button, collaborator avatars.
- ToolRail (48px, left): Add/Elements, Layers, Pages, Classes, Variables, Components,
  Media, Content (collections), Interactions, Templates, Settings.
- Left PanelStack (260–320px, resizable): opens from the rail. Panels can be pinned or
  floated (e.g. Layers as a floating window).
- Inspector (280–320px, right), with tabs: Style | Settings | Interactions.
  Style tab, top to bottom:
    a. Class selector bar: class chips (combo classes stacked), add/create class,
       "N other elements use this class" warning, detach.
    b. State picker: none, hover, focus, focus-visible, active, ::before, ::after,
       ::placeholder, nth-child.
    c. Sections (collapsible, remember open state): Layout (display, flex/grid, a 9-dot
       alignment picker, gap), Spacing (box-model widget), Size, Position, Typography
       (text-style token picker first), Background, Border, Effects (shadow, filter,
       transform), Custom CSS properties.
- Canvas: centered artboard at the active breakpoint width, a drag handle to resize it,
  optional rulers, guides and element-edge outlines.
- StatusBar (24px): selected element tag/class, dimensions, active context
  (e.g. "Tablet · Hover · Dark").

## Canvas behavior to design
- Hover: thin outline + name label. Selection: stronger outline, label with block type and
  class, resize handles.
- Element island: a compact floating toolbar next to the selection (tag, class, link,
  duplicate, wrap, visibility, more).
- Spacing drag: padding and margin zones shown as hatched areas on hover. Dragging shows a
  value label. Shift = both opposite sides, Alt = all sides.
- Snap and measure: magenta snap lines to sibling edges and centers. Alt-hover shows
  distances to neighbors.
- Grid edit mode: track lines with inline fr/px/auto inputs, add/remove rows and columns,
  draw named areas, drop children into cells.
- Flex edit mode: draggable gap areas, direction toggle, wrap toggle.
- Inline text editing: double-click opens a floating format toolbar (bold, italic, link,
  text-style token).
- Component editing: double-click a component to enter an isolated edit frame with a
  breadcrumb trail. Exposed fields are marked with a purple binding indicator.
- Drop feedback: a 2px insertion line plus a label saying where the item will land
  ("Inside Container · after Heading").

## Panels to design
1. Classes manager: search, usage count, select all elements using a class, rename,
   duplicate, delete unused, and a global/tag-style section (h1, p, a…).
2. Variables: groups (Colors, Sizes, Fonts, Text styles) as a table with one column per
   mode. Add a mode, and preview the canvas in any mode.
3. Components: a library grid with thumbnails. Component detail shows exposed props, slots,
   and where it is used.
4. Interactions: a trigger list → target picker (self, children, siblings, class,
   element) → a keyframe timeline with tracks per property and easing curve editor.
   A presets library sits on the side.
5. Visibility conditions (in Settings): a rule builder
   ("Show when [field] [operator] [value]", AND/OR groups).
6. Layers: a tree with type icons, class names, hidden/locked toggles, drag to reorder,
   and component instances marked.

## Visual language
- Use the existing tokens in packages/editor-ui/src/tokens.css. Don't invent new ones unless
  needed, and list any new tokens you add.
- Dark and light editor themes. Neutral gray chrome. One accent color for selection and
  primary actions.
- Semantic colors for value sources: class = blue, combo/inherited = yellow,
  token/variable = green, component binding = purple, block-level override = orange.
- Type: 11–12px UI labels, 13px inputs, tabular numbers for values. Inputs are 24–28px tall.
- 4px spacing grid. 6px radius on controls, 8px on panels. Icons on a 16px grid, 1.5px
  stroke.
- Motion: 120–180ms ease-out for panels and popovers. None when reduced motion is on.

## States every screen must show
Empty page, loading, saving/saved/conflict, an element with no class, a class used in
many places (edit warning), a locked element, another user editing a block, errors,
read-only reviewer mode (comments only).

## Deliverables
1. Annotated layout of the full editor (desktop, light and dark).
2. Detailed specs for the Inspector Style tab, the class selector bar, and the state picker.
3. Canvas overlay specs: hover, selection, element island, spacing drag, snap lines,
   grid edit mode.
4. The Variables, Classes, Components and Interactions panels.
5. A component inventory mapped to existing editor-ui parts (reuse, extend, or new).
6. A list of keyboard shortcuts.
7. Open questions and trade-offs, especially how to explain class vs block-level styling
   to content editors.

## Constraints
- Don't copy Webflow, Kirki or Framer branding or visuals. Use them as references for
  quality and interaction patterns only.
- Every control must map to a real CSS property or a real document field. No decorative
  controls.
- Keep content-editor mode in mind: a toggle that hides classes, states, interactions and
  advanced layout, leaving content, media, links and basic spacing.
```

---

## Prompt 2 — Phase 1: Class system UI (KRK-01 to KRK-04)

```text
You are a senior product designer for visual web builders.
Design the CSS class system UI for "Next CMS Builder". Scope this to classes only;
don't redesign the rest of the editor.

## Context
- The editor has an Inspector (right panel), a ToolRail (left icon rail), a PanelStack,
  and an iframe Canvas. Reuse these parts and the tokens in packages/editor-ui/src/tokens.css.
- Today, blocks are styled through per-block props. We are adding site-wide, persisted
  CSS classes:
  - A block can have an ordered list of classes. Later classes combine with earlier ones
    as a "combo class" (e.g. `button` + `is-large`).
  - Each class stores values per breakpoint, per state, and per pseudo-element.
    The key format is device[_state][_pseudo], e.g. desktop, tablet_hover, mobile_hover_before.
  - Global tag styles (h1–h6, p, a, button, img…) are classes of kind "tag".
  - CSS order: tag styles → classes → combo classes → block-level props.
    Block-level props always win.
- Supported states: hover, focus, focus-visible, active, visited, disabled, ::before,
  ::after, ::placeholder, :first-child, :last-child, :nth-child(n).

## Design these
1. Class selector bar (top of the Inspector Style tab)
   - Class chips in order. Combo chips are visually attached to the class they combine with.
   - Type to search existing classes or create a new one. Enter creates it, and arrow keys
     choose from suggestions.
   - Chip menu: rename, duplicate, detach from this block, select all blocks using it,
     open in the Classes manager.
   - Usage warning: "Editing this class changes 12 other elements". Offer to duplicate it
     as a new class instead.
   - A "No class: styles apply to this block only" empty state, with "Create class from
     current styles".
2. State picker
   - A compact dropdown or segmented control next to the class bar, showing the active
     state. A dot marks states that already have values.
   - ::before and ::after need a `content` field and a hint when it is empty.
   - :nth-child(n) needs an input for the formula (e.g. 2n+1).
   - The canvas previews the chosen state (force hover/focus on the selected element).
3. Value source indicators in every Inspector field
   - Blue = this class, yellow = inherited from an earlier class or a wider breakpoint,
     orange = block-level override, none = default.
   - Hovering the indicator shows where the value comes from
     ("from .button · Desktop"), with Reset and "Move to class" actions.
4. Classes manager panel (new ToolRail item "Classes")
   - Search, then a list showing name, usage count and last-edited time.
     Sort by name, usage or unused.
   - Bulk "Clean up unused classes", with a confirmation listing exactly what is deleted.
   - Tag styles section (h1, p, a…) at the top.
   - Detail view: the class's values grouped by breakpoint and state, plus a list of the
     pages and blocks that use it.
5. Canvas integration
   - The selection label shows the primary class ("Container · .card.is-featured").
   - Optional "highlight all elements with this class" overlay.

## States to show
No classes yet on the site, a class used once vs. many times, renaming into a name that
already exists (error), deleting a class in use (warning with count), a read-only reviewer,
and saving / saved / save failed.

## Deliverables
1. Specs for the class selector bar, the state picker, the value source indicators, and the
   Classes manager (light and dark).
2. Interaction notes for keyboard use (create, reorder chips, switch state) and focus order.
3. Copy for every warning, empty state and confirmation.
4. A list of the editor-ui parts reused, extended, or added.
5. Open questions, especially how to keep content editors from accidentally editing
   shared classes.

## Constraints
- Don't copy Webflow or Kirki visuals. Use their patterns only as references.
- 11–12px labels, 13px inputs, a 4px spacing grid, WCAG 2.2 AA.
- Every control must map to a real stored value. No decorative controls.
```
