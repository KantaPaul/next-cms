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
    status: completed
  - id: content-fields
    content: Add URL, icon picker, image dimensions, gallery block, datetime on testimonials, and searchable select for taxonomy and icons
    status: in_progress
  - id: verify
    content: Typecheck and verify in the builder and on a public page, including legacy size and shadow values
    status: pending
isProject: false
---

# Elementor-style control catalog

## Implementation audit (2026-10-16)

| Todo | Status | Notes |
|------|--------|-------|
| **primitives** | ✅ completed | `Switcher`, `VisualChoose`, `GroupedSelect`, `UnitSlider`, `StateTabs`, `Description`, `PanelHeading`, `Divider`, `Notice`, `ShowWhen` in `primitives.tsx`. |
| **typography** | ✅ completed | `TypographyControl` + resolve + site.css; legacy size/weight still resolve. |
| **border-bg** | ✅ completed | Border styles/radius; radial gradient, attachment, pos; hover StateTabs. |
| **filters-layout** | ✅ completed | `FilterControl`; Layout margin / width / z-index. |
| **animation** | ✅ completed | See `elementor_animation_controls_e45c47ac.plan.md` — catalogs, grouped selects, Animate.css + hover.css playback on main. |
| **content-fields** | 🟡 in progress | **Done:** `UrlField`, `IconPickerField`, `DateTimeField`, `SearchableSelectField`; `resolveLinkProps` / `ButtonLink`; **Image** `imageWidth` / `imageHeight` / `objectFit`; **Gallery** block + config. **Still open:** wire `UrlField` into Hero/CTA/Pricing/Image links (still plain `text`); wire `IconPickerField` into Features (still `select` + `ICON_OPTIONS`); DateTime on Testimonials items + render under quote. |
| **verify** | ⏳ pending | Local `pnpm tsc --noEmit` + builder/public checks. |

Elementor’s [editor controls](https://developers.elementor.com/docs/editor-controls/) are a panel kit. Styles stay on allowlisted classes and CSS variables via `resolveSectionStyle` + `site.css`.

```mermaid
flowchart LR
  panel[Inspector controls] --> json[SectionSettings JSON]
  json --> resolve[resolveSectionStyle allowlist]
  resolve --> vars["classes plus --s-* vars"]
  vars --> css[site.css breakpoints]
```

## Content controls remaining

- **URL** on Hero, CTA, Pricing, Image (plain string still valid as `{ url }`).
- **Icon picker** wherever a block stores an icon name.
- **Date time** optional on Testimonials items.

## Not ported

CSS selectors dictionary, raw HTML/Code/Hidden, dynamic tags, global style kits, absolute/fixed position.

## Verification

- `pnpm tsc --noEmit` and lints on touched files.
- Builder: responsive type, filter, hover, margin; legacy `typography.size: "lg"` / `shadow: "md"`.
- Public page across 768 / 1024.
