---
name: Studio Crafted CMS
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464554'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#692400'
  on-tertiary: '#ffffff'
  tertiary-container: '#8f3400'
  on-tertiary-container: '#ffb393'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb597'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Hanken Grotesk
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
    letterSpacing: -0.011em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.006em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  code-sm:
    fontFamily: monospace
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an elevated, studio-grade editorial environment tailored for modern web engineering, content creation, and technical publishing. The interface projects clarity, intellectual rigor, and intentional precision. Designed for developers, editors, and design directors who spend extended hours inside dense authoring tools, it prioritizes legibility, cognitive calm, and low-friction workflows.

The visual direction combines modern minimalism with subtle studio-grade tactility. It balances crisp neutral surfaces, whisper-thin borders, and focused indigo accents to yield an interface that feels both utility-driven and executive. Content elements sit cleanly on layered slate surfaces, drawing focus directly to user documents, structured schemas, and media pipelines without visual noise.

## Colors

The palette is engineered around pure neutral clarity with focused chromatic energy. 

- **Primary (`#4338ca`)**: A focused, authoritative indigo used exclusively for primary commitments, active navigational markers, and focused interactions.
- **Secondary (`#6366f1`)**: An electric indigo-violet bridge utilized for interactive hover feedback, active indicator badges, and inline status states.
- **Neutrals**:
  - `Canvas / Base Surface`: `#f8fafc` (Slate 50) establishes ambient breathing room.
  - `Raised Panels & Cards`: `#ffffff` (Pure White) provides crisp contrast and content distinction.
  - `Subtle Outlines & Dividers`: `#e2e8f0` (Slate 200) and `#cbd5e1` (Slate 300) provide hairline structure without harsh separation.
  - `Typography`: `#0f172a` (Slate 900) for high-contrast primary text, `#475569` (Slate 600) for descriptive metadata, and `#94a3b8` (Slate 400) for timestamps, shortcuts, and disabled states.

Functional accents remain subtle and desaturated to preserve editorial neutrality.

## Typography

Typography establishes systematic hierarchy through geometric precision and mechanical rhythm. 

- **Headlines (`Hanken Grotesk`)**: Provides contemporary structure with subtle personality. Tighter letter spacing on display elements mimics precision publication design.
- **Body & Controls (`Inter`)**: Carries dense tables, article copy, context menus, and metadata with high legibility at micro scales.
- **Code Highlights**: Reserved for slug paths, variable tags, JSON previews, and API parameters, rendered in tabular monospace font metrics.

Headlines larger than 24px automatically step down on mobile screens to preserve layout integrity.

## Layout & Spacing

The layout model utilizes a fluid 12-column architectural grid with structural multi-pane workspaces. Studio surfaces feature fixed collapsible tool rails (navigation sidebar, inspector drawer) flanking a flexible document canvas.

- **Breakpoints**:
  - `Mobile` (< 768px): Single-column canvas with bottom sheets and drawer-based utility panels. Outer margins compress to `1rem`.
  - `Tablet` (768px – 1024px): 8-column canvas with compact icon-only left navigation rails and dynamic overlay panels.
  - `Desktop` (≥ 1025px): Multi-pane continuous canvas with sticky sidebars, live split previews, and structured column alignments.

Whitespace maintains a dense, compact tool density without feeling congested. Internal component gaps follow an 8-point harmonic base.

## Elevation & Depth

Depth is established primarily through hairline borders (`#e2e8f0`) layered against pure white containers over a `#f8fafc` canvas, reinforced by ultra-diffused, ambient micro-shadows.

- **Level 0 (Base Canvas)**: Flat `#f8fafc` background with no elevation.
- **Level 1 (Cards, Content Panels, Toolbars)**: Solid `#ffffff` fill framed by a 1px border (`#e2e8f0`). Elevated by `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Level 2 (Dropdowns, Popovers, Context Menus)**: Solid `#ffffff` fill, 1px border (`#cbd5e1`), elevated by `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Dialogs, Command Palettes)**: Centered structural focus with `0 16px 32px -8px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)` and a translucent backdrop blur (`rgba(15, 23, 42, 0.2)`).

## Shapes

The design system employs a roundedness index of `2`, utilizing a base radius of `0.5rem` (8px). This creates approachable, refined components that maintain geometric precision without feeling bubble-like or toy-like.

- **Standard Containers, Buttons & Inputs**: `0.5rem` (8px).
- **Cards, Panels & Modal Shells (`rounded-lg`)**: `1rem` (16px).
- **Surface Frames & Sheet Drawers (`rounded-xl`)**: `1.5rem` (24px).
- **Pill Badges & Status Chips**: Pill-rounded (`9999px`) for quick visual scanning and distinct tag categorization.

## Components

### Buttons
- **Primary**: Solid `#4338ca` background, `#ffffff` text, subtle 1px border (`#3730a3`), and a micro box shadow (`0 1px 2px rgba(67, 56, 202, 0.2)`). Hover transitions to `#3730a3`.
- **Secondary / Ghost**: White `#ffffff` surface, 1px `#e2e8f0` border, `#0f172a` text. On hover, background shifts to `#f8fafc` and border shifts to `#cbd5e1`.
- **Command / Ghost Icon**: Zero-border button, `#475569` icon color, transitioning to `#f1f5f9` background and `#0f172a` on hover.

### Inputs & Form Controls
- **Text & Area Fields**: `#ffffff` background with 1px `#e2e8f0` border, `0.5rem` radius, and `0.875rem` text. In active focus, borders transition to `#4338ca` accompanied by a 2px outer ambient ring (`rgba(67, 56, 202, 0.15)`).
- **Monospace Code Inputs**: `#f8fafc` background with syntax-friendly styling and keyboard helper hints right-aligned.

### Chips & Badges
- **Status Pills**: Height of 22px, pill-shaped (`9999px`), uppercase `label-sm` font, with a soft tinted background (e.g., `#e0e7ff` for Published, `#f1f5f9` for Draft) and high-contrast slate text.
- **Filter Tags**: Subtle 1px `#e2e8f0` borders with removable close triggers on hover.

### Cards & Content Lists
- **Cards**: Pure white background, `1rem` radius, subtle hairline border `#e2e8f0`, with hover effects featuring a border transition to `#cbd5e1` and a micro-elevation lift.
- **Lists & Data Tables**: Borderless item dividers using `#f1f5f9` borders, compact row heights (40px default, 48px comfortable), with zebra-free hovered rows tinted `#f8fafc`.

### Checkboxes & Radios
- 16px square (checkbox) or circle (radio), `#cbd5e1` outline on white. Selected state fills with `#4338ca` showing a crisp white glyph checkmark.

### Studio-Specific Extensions
- **Command Palette (`Cmd+K`)**: Floating modal container at `rounded-lg`, frosted surface backdrop blur, high-contrast input with keyboard shortcut indicators styled as crisp, raised micro-keys.
- **Breadcrumb Navigation**: Hairline breadcrumbs separated by forward slashes (`/`), highlighting document hierarchy with the active terminal path rendered in bold slate.