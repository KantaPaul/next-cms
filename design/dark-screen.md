---
name: Obsidian Studio
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#bdc2ff'
  on-tertiary: '#131e8c'
  tertiary-container: '#7c87f3'
  on-tertiary-container: '#081486'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#2f3aa3'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.875rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  code-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, developer-grade editorial environment tailored for content engineers, product managers, and modern creators. It projects precision, architectural clarity, and rapid execution, balancing the computational rigor of developer platforms with the tactile fluidity required for content curation.

### Design Movement: Modern Technical Minimalism
The style marries modern dark-mode utility with subtle glass-structural framing:
- **Tonal Substratum:** Deep slate and true-dark planes eliminate visual fatigue during sustained editorial workflows.
- **Precision Boundaries:** Micro-borders with low-opacity alpha values structure content density without adding heavy visual friction.
- **Electric Accentuation:** High-chroma indigo guides focus to active states, state transitions, and primary CTAs, contrasted by functional semantic accents (e.g., emerald for live deployment and synchronization).
- **Density & Legibility:** Compact proportions prioritize high information density, rapid scanning, and low-latency interaction.

## Colors

The palette is engineered specifically for dark-mode editorial workspaces. It limits saturation across surface foundations to prevent chromatic aberration while using electric accents for actionable focal points.

### Palette Architecture
- **Primary (`#6366F1`)**: Electric Indigo. Dictates primary action points, active editor selections, cursor rings, and key interactive signals.
- **Secondary (`#10B981`)**: Emerald. Reserved strictly for operational states: live publication status, synced webhooks, successful build deploys, and active previews.
- **Tertiary (`#818CF8`)**: Soft Violet. Used for hover tiers on primary elements, inline token highlights, badge backgrounds, and secondary focus states.
- **Neutral (`#0B0F17`)**: Base Obsidian. Serves as the deep canvas backdrop, scaling upward into layered slate tiers for structural elevation.

### Surface Tiers
- **Canvas Base (`#0B0F17`)**: Deepest viewport background, editor workspace backdrop.
- **Surface Level 1 (`#111827`)**: Collapsible sidebars, toolbars, metadata headers.
- **Surface Level 2 (`#1E293B`)**: Block cards, floating control decks, dropdown popovers.
- **Surface Level 3 (`#334155`)**: Sub-elements, active drop zones, nested component containers.

### Boundary & Border Tokens
- Standard structural boundaries use `rgba(255, 255, 255, 0.08)`.
- Interactive hover and focus boundaries ramp to `rgba(99, 102, 241, 0.5)` or `rgba(255, 255, 255, 0.16)`.

## Typography

Typography is systematic, utilitarian, and optimized for scannability in technical environments. Inter provides high x-height clarity and legibility across compact nested hierarchies.

### Numeric & Monospace Treatment
- For numeric variables (version tags, payload weights, date stamps, and build counters), enable OpenType tabular figures (`font-feature-settings: "tnum" 1, "cv05" 1`).
- Code snippets, schema keys, and API slugs utilize standard inline formatting with high-contrast foreground values against dark background badges.

### Typographic Hierarchy
- **Display & Headings**: Tightly tracked (`-0.02em` to `-0.03em`) with medium-to-bold weights to ground document panels and block headers.
- **Body Content**: Set at `-0.005em` tracking with open line-height to ensure readability within schema attribute inputs and long-form markdown editors.
- **Labels & Micro-Metrics**: Uppercase or semi-bold micro-copy (`label-sm`) with positive letter-spacing (`0.04em`) ensures instant categorization on status badges and workflow tags.

## Layout & Spacing

The layout uses a multi-pane structural workbench model:
1. **Primary Navigation Bar**: Fixed collapsed/expanded left rail (64px to 260px).
2. **Schema & Block Tree Rail**: Secondary docked pane (280px–340px) with sticky tree navigations.
3. **Core Canvas**: Fluid-width central work plane housing the active layout builder or document editor.
4. **Context / Meta Deck**: Right sidebar (320px) hosting schema definitions, publishing history, and locale toggles.

### Responsive Breakpoints
- **Desktop (>= 1280px)**: Three-pane layout active concurrently. Fluid central workspace with static sidebars.
- **Tablet / Small Laptop (768px – 1279px)**: Context deck and secondary rails become sliding overlays or switchable tabs. Grid shifts to 8 columns with 1rem gutters.
- **Mobile (< 768px)**: Single-pane stack with bottom sheet toolbars and off-canvas drawers. Margin drops to `margin-mobile` (1rem).

### Layout Rules
- All internal padding and component gaps align with the strict 4px sub-grid (`space-xs` through `space-xl`).
- High-density toolbars utilize `space-xs` and `space-sm` for button clusters and segmented pills.

## Elevation & Depth

Visual hierarchy does not rely on heavy, blurred atmospheric shadows. Instead, it relies on tonal tiering, hairline border lighting, and subtle low-profile occlusions.

### Depth Techniques
- **Surface Elevation Layers**: Depth is created by lightening consecutive dark backgrounds (from `#0B0F17` to `#111827` and `#1E293B`), providing clean visual separation without blur overhead.
- **Hairline Border Luminosity**: Modals, popovers, and block cards use `1px` translucent top borders (`rgba(255, 255, 255, 0.12)`) and muted perimeter borders (`rgba(255, 255, 255, 0.06)`), simulating directional overhead light.
- **Low-Profile Occlusion Shadows**:
  - *Floating Trays & Modals*: `0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 2px 6px -1px rgba(0, 0, 0, 0.4)`.
  - *Dragged Block Cards*: `0 12px 32px -4px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.4)`.
- **Glassmorphic Decking**: Sticky top-bars and bottom status docks employ background filtering (`backdrop-filter: blur(12px)`) with 85% opacity surface fills (`rgba(17, 24, 39, 0.85)`).

## Shapes

The design system maintains a structured, architectural shape profile using roundedness level `1` (Soft).

### Metric Tolerances
- **Micro Elements (Pills, Checkboxes, Micro-Badges)**: Base radius of `0.25rem` (4px).
- **Controls & Form Inputs (Buttons, Dropdowns, Inputs)**: `0.25rem` (4px) to `0.375rem` (6px) for a focused, clinical finish.
- **Content Cards & Drag-and-Drop Containers**: `0.5rem` (8px, `rounded-lg`).
- **Workspace Dialogs & Large Preview Windows**: `0.75rem` (12px, `rounded-xl`).
- **Interactive Badges / Status Indicators**: Fully rounded pills (`9999px`) are reserved exclusively for live/draft indicators and version tracking tags.

## Components

### Buttons
- **Primary**: Background `#6366F1`, text `#FFFFFF`, border `1px solid rgba(255, 255, 255, 0.2)`, subtle inner top highlight. Hover: `#4F46E5`. Active: scale 0.98.
- **Secondary / Surface**: Background `#1E293B`, text `#F9FAFB`, border `1px solid rgba(255, 255, 255, 0.08)`. Hover: background `#334155`, border `rgba(255, 255, 255, 0.15)`.
- **Ghost / Subtle**: Background transparent, text `#94A3B8`. Hover: background `rgba(255, 255, 255, 0.05)`, text `#F9FAFB`.
- **Destructive**: Background `rgba(239, 68, 68, 0.12)`, text `#FCA5A5`, border `1px solid rgba(239, 68, 68, 0.3)`. Hover: background `rgba(239, 68, 68, 0.2)`.

### Status Pills & Metric Badges
- **Live / Published**: Background `rgba(16, 185, 129, 0.12)`, text `#34D399`, border `1px solid rgba(16, 185, 129, 0.25)`. Features a 6px pulsating circular dot.
- **Draft / Syncing**: Background `rgba(245, 158, 11, 0.12)`, text `#FBBF24`, border `1px solid rgba(245, 158, 11, 0.25)`.
- **Version Badges**: Monospace styling with tabular numbers, subtle slate background `#1E293B`, micro border, and compact padding (`0.125rem 0.375rem`).

### Drag-and-Drop Block Cards
- Base state: Background `#111827`, border `1px solid rgba(255, 255, 255, 0.07)`, border-radius `0.5rem`.
- Left-edge drag affordance: Dual-column textured dot matrix in `#475569`.
- Active drag state: Background `#1E293B`, border `1px solid #6366F1`, box-shadow `0 12px 32px -4px rgba(0, 0, 0, 0.8)`, tilt of `1deg` during motion.
- Insertion drop indicator: High-intensity 2px line in `#6366F1` with an indigo indicator pip on the origin node.

### Input Fields & Controls
- **Text & Area Inputs**: Background `#0B0F17`, border `1px solid rgba(255, 255, 255, 0.12)`, text `#F9FAFB`, placeholder `#475569`. Focus: border `#6366F1`, ring `2px rgba(99, 102, 241, 0.2)`.
- **Checkboxes & Radios**: 16x16px boxes, `#111827` surface with subtle borders. Checked: background `#6366F1` displaying crisp white vector iconography.

### Breadcrumb Navigation
- Separator: Subtle forward-slash or right-chevron in `#475569`.
- Non-active nodes: Text `#94A3B8`, interactive hover transition to `#F9FAFB`.
- Active document node: Text `#F9FAFB`, font weight `500`.

### Collapsible Sidebar & Toolbars
- Docked sidebar: Width 240px, transitioning to 64px icon-rail via a cubic-bezier ease (`cubic-bezier(0.16, 1, 0.3, 1)`).
- Visual division: 1px continuous vertical line in `rgba(255, 255, 255, 0.06)`.
- Navigation item: Border-radius `0.25rem`, padding `0.5rem 0.75rem`, left icon aligned with tabular hotkey indicator (`⌘K`) on the trailing edge.