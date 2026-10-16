---
name: Elementor control catalog
overview: Add the Elementor editor-control catalog the builder does not have yet, as inspector controls and a few content fields, while keeping styles on allowlisted classes and CSS variables.
todos:
  - id: primitives
    content: Add switcher, popover toggle, visual choice, grouped select, unit slider, normal/hover tabs, description, heading, divider, notice, and showWhen
    status: completed
  - id: typography
    content: Extend Typography with family, unit size, transform, style, decoration, line-height, letter-spacing, word-spacing, text shadow, and text stroke; emit allowlisted CSS
    status: completed
  - id: border-bg
    content: Add border styles and radius, radial gradient, attachment, custom background position, and hover state for color, background, border, shadow, and filters
    status: completed
  - id: filters-layout
    content: Add CSS filter group plus margin, width, and z-index on the layout tab
    status: completed
  - id: animation
    content: Replace entrance and hover lists with Elementor entrance, exit, and hover catalogs and allowlisted playback
    status: pending
  - id: content-fields
    content: Add URL, icon picker, image dimensions, gallery block, datetime on testimonials, and searchable select for taxonomy and icons
    status: in_progress
  - id: verify
    content: Typecheck and verify in the builder and on a public page, including legacy size and shadow values
    status: pending
isProject: false
---

# Elementor-style control catalog

Elementor’s [editor controls](https://developers.elementor.com/docs/editor-controls/) are a panel kit: single-value fields, multi-value fields, unit fields, panel-only chrome, and group controls, plus wrappers (section, popover, tabs, responsive). This builder already has the wrappers and a slice of the kit in [`src/builder/controls/`](src/builder/controls/). The gap is the rest of the kit, wired through the shared section inspector so every block gets it.

Styles stay on the current path. [`resolveSectionStyle`](src/builder/style.ts) allowlists values and emits fixed classes plus `--s-*` variables. [`site.css`](src/builder/site.css) is the only place those variables become CSS. Saved pages keep working: a missing field means “unchanged,” and old string values (`shadow: "md"`, `typography.size: "lg"`) still resolve.

```mermaid
flowchart LR
  panel[Inspector controls] --> json[SectionSettings JSON]
  json --> resolve[resolveSectionStyle allowlist]
  resolve --> vars["classes plus --s-* vars"]
  vars --> css[site.css breakpoints]
```

## Implementation audit (2026-10-16)

| Todo | Status | Notes |
|------|--------|-------|
| **primitives** | ✅ completed | `Switcher`, `VisualChoose`, `GroupedSelect`, `UnitSlider`, `StateTabs`, `Description`, `PanelHeading`, `Divider`, `Notice`, `ShowWhen` in `primitives.tsx`. Popover-toggle pattern lives in `shadow.tsx`. |
| **typography** | ✅ completed | `TypographyControl` + `resolveSectionStyle` + `site.css` for family, unit size, transform, style, decoration, lh/ls/ws, text shadow, text stroke. Wired in section inspector. Legacy size/weight presets still resolve. |
| **border-bg** | ✅ completed | Border: double/dotted/groove + radius unit slider. Background: radial, attachment, posX/posY. Hover StateTabs for color/bg/border/shadow/filters. |
| **filters-layout** | ✅ completed | `FilterControl` in Style → Filters. Layout: margin Dimensions, width UnitSlider, z-index Slider. |
| **animation** | ⏳ pending | Still short lists in `animation.tsx`. Full Elementor catalogs + Animate.css playback tracked in `elementor_animation_controls_e45c47ac.plan.md`. |
| **content-fields** | 🟡 partial | **Done:** `UrlField`, `IconPickerField`, `DateTimeField`, `SearchableSelectField` (taxonomy locks), `ButtonLink`/`resolveLinkProps`. **Missing:** wire Url/Icon into Hero/CTA/Pricing/Features config; image dimensions on Image; Gallery block; DateTime on Testimonials items + render. |
| **verify** | ⏳ pending | Needs local `pnpm tsc --noEmit`, builder + public page checks for responsive/hover/legacy values. |

## Already in the app

Leave these as they are, and reuse them:

- Choose, select, slider, dimensions, responsive device row, color popover, box shadow, background (color / linear gradient / image), border (none / solid / dashed), spacing unit, visibility, anchor.
- Content fields from Puck and [`src/builder/fields/client-fields.tsx`](src/builder/fields/client-fields.tsx): text, number, textarea, rich text, media URL, repeater (`array`), single select.

## Add these controls

### Shared primitives — [`src/builder/controls/primitives.tsx`](src/builder/controls/primitives.tsx)

- **Switcher**, **popover toggle** (label row + pencil, same pattern as [`shadow.tsx`](src/builder/controls/shadow.tsx)), **visual choice** (Choose cells that show a thumbnail), **select with groups** (needed for animations).
- **Unit slider**: size plus `px | rem | em | % | vw`, each with its own clamp. Dimensions already do this for spacing; sliders for type and width should too.
- **Normal / Hover tabs** inside a group. Hover values are optional overrides, same inheritance idea as tablet/mobile.
- **Description** under `ControlLabel`, plus small **heading**, **divider**, and **notice** rows for panel chrome.
- A `showWhen` helper for conditional rows (image fields only when background type is image). Conditions stay in code, not in page JSON.

### Style groups on every block — [`section-inspector.tsx`](src/builder/controls/section-inspector.tsx)

Extend [`SectionSettings`](src/builder/style.ts) and emit one class per property.

- **Typography** ([group control](https://developers.elementor.com/docs/editor-controls/group-control-typography/)): family, size, weight, transform, style, decoration, line-height, letter-spacing, word-spacing. Family is only the four stacks in [`theme.ts`](src/builder/theme.ts) (`Inter`, `Plus Jakarta Sans`, `JetBrains Mono`, `System`). Size and the three spacing fields are responsive unit sliders. Keep the current `sm | md | lg | xl` size and `regular | medium | bold` weight as legacy values that map onto the new fields.
- **Text shadow**: x, y, blur, color. No spread or inset (`text-shadow` has neither).
- **Text stroke**: width (0–10px) and color, emitted as `-webkit-text-stroke`.
- **Border**: add `double | dotted | groove`, and a linked **radius** dimensions control (px / rem / %).
- **Background**: add radial gradient, `scroll | fixed` attachment, and custom X/Y position (0–100%). Keep the current color, linear gradient, and image fields.
- **CSS filters** ([group control](https://developers.elementor.com/docs/editor-controls/group-control-css-filter/)): blur 0–10px, brightness / contrast / saturate 0–200%, hue 0–360. One `filter` string built in `resolveSectionStyle` from clamped numbers.
- **Normal / Hover** for text color, background, border, box shadow, and filters. Hover CSS is `.s-hover:hover` under `.site-root`, with the hover variables on the section.
- **Layout**, from the same slider and dimensions controls: margin (responsive, same units as padding), width (`% | px | vw`), z-index (0–50).

### Animation — fold in the existing animation plan

Replace the short entrance and hover lists in [`animation.tsx`](src/builder/controls/animation.tsx) with Elementor’s grouped selects: [entrance](https://developers.elementor.com/docs/editor-controls/control-animation/), [exit](https://developers.elementor.com/docs/editor-controls/control-exit-animation/), and [hover](https://developers.elementor.com/docs/editor-controls/control-hover-animation/). Keys stay allowlisted. Old values alias forward (`fade-up` → `fadeInUp`, `lift` → `float`). Playback follows that plan: Animate.css for in/out, a local allowlisted stylesheet for hover.

### Content controls, each with one consumer

- **URL** (`url`, open in new tab, nofollow) on Hero, CTA, Pricing, and Image links. A plain string still counts as `{ url }`. [`ButtonLink`](src/builder/blocks/section.tsx) gains `target` and `rel` only when those flags are set. `safeUrl` still rejects `javascript:` and other non-http(s) values.
- **Icon picker**: popover grid over the existing Lucide allowlist in [`icons.tsx`](src/builder/icons.tsx). Use it wherever a block already stores an icon name. No uploaded SVG.
- **Image dimensions** on the Image block: width, height, object-fit (`cover | contain | fill`). CSS only. Media storage has original pixel size, not generated thumbnails, so this is not a WordPress image-size crop.
- **Gallery** field (ordered media URLs) plus a Gallery block that renders that list in a simple grid, with the shared section inspector.
- **Date time**: optional date on Testimonials items, rendered under the quote if set.
- **Select2**: searchable select for category/tag locks and icon filter.

## Not ported

These Elementor pieces fight the allowlist model or have no job here:

- **CSS selectors / selectors dictionary.** Elementor writes user values into arbitrary selectors. Here the selector map is `resolveSectionStyle` plus `site.css`.
- **Raw HTML, Code, and Hidden.** They would store markup or CSS in page JSON.
- **Deprecated notice.**
- **Dynamic tags** (post title, site logo, ACF). Post-template blocks already bind post data; a tag system is a separate feature.
- **Global style kits and a per-control AI button.** Theme swatches already appear in the color picker. SEO AI stays on the page editor.
- **Absolute / fixed position.** Width, margin, and z-index cover layout without pulling blocks out of the document flow.

## Verification

- `pnpm tsc --noEmit` (ignore the known `sql-helpers.ts` errors) and lints on the touched files.
- In the builder, on one section: set a responsive font size, a text shadow, a filter, a hover background, and a margin; switch desktop / tablet / mobile and Normal / Hover.
- Open a page saved with `typography.size: "lg"` and `shadow: "md"` and confirm it still renders.
- On the public page, resize across 768 and 1024 and confirm hover and responsive values.
