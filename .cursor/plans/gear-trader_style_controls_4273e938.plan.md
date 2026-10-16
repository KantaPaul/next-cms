---
name: Gear-trader style controls
overview: "Rework the builder inspector controls in src/builder/controls so they match gear-trader's control set in look and behavior: device icons in every label row, per-device values, a popover color picker, a structured shadow generator, and a unit switch. Storage stays as plain objects that are validated and rendered only through allowlists."
todos:
  - id: model
    content: Add MaybeResponsive + resolveResponsive, ShadowSettings, spacingUnit; emit per-device vars in resolveSectionStyle with legacy fallbacks
    status: completed
  - id: css
    content: Add s-fs/s-fw/s-ta/s-mh/s-jc responsive rules and s-shadow to site.css
    status: completed
  - id: primitives
    content: Restyle ControlLabel/Choose/Slider/SelectInput to gear-trader look; add ResponsiveChoose/Select/Slider and unit select
    status: completed
  - id: color-picker
    content: Add popover ColorPicker (radix popover + react-colorful + theme swatches) and replace ColorInput usages
    status: completed
  - id: shadow
    content: Add popover ShadowControl with x/y/blur/spread/opacity/color/inset + presets
    status: completed
  - id: rework
    content: Rework background tabs-in-label, dimensions unit select, section-inspector responsive wiring, animation restyle
    status: completed
  - id: verify
    content: Typecheck, lint, and verify in browser builder + public page across breakpoints and legacy data
    status: pending
isProject: false
---

# Gear-trader style builder controls

## Goal
The floating card's Style and Layout controls should look and behave like gear-trader's `rest/src/components/builder/control`:
- Every control has one header row: the label on the left; device icons, a unit select or tabs on the right.
- Values are stored per device: desktop, tablet and mobile. Editing a field edits the device the canvas is currently showing.
- The color picker opens in a popover from a swatch.
- The shadow generator is a popover with numeric sliders.
- Background type is chosen with icon tabs placed beside the label.

Things that stay as they are:
- Storage stays plain objects in page JSON, not `JSON.stringify` strings.
- Values are validated through `pick`, `clamp`, `safeColor` and `safeUrl`, and rendered as fixed classes plus CSS variables.
- The collapsible groups (Colors, Typography, Border, Display, Animation, Spacing, ...) stay.

## Implementation status

Most control UI was already in place (primitives, ColorPicker, ShadowControl, Dimensions, Background, section-inspector responsive wiring). The remaining gap was a simplified `resolveSectionStyle` that no longer emitted per-device CSS variables.

**Restored in `src/builder/style.ts`:**
- `formatShadow` / `formatFilter` / `hexToRgb`
- `responsiveSides` + `responsiveLength`
- Full `resolveSectionStyle` emitting `--s-fs-*`, `--s-fw-*`, `--s-ta-*`, `--s-mh-*`, `--s-jc-*`, spacing, border, shadow, width, margin
- Legacy shadow string presets (`sm`/`md`/`lg`) still map to Tailwind classes
- Animation catalog re-exports (`ENTRANCES`, `EXITS`, `HOVERS`, `ATTENTION_SEEKERS`, class maps) kept for motion playback

**Already present (unchanged):**
- `site.css` responsive rules for `s-fs` / `s-fw` / `s-ta` / `s-mh` / `s-jc` / `s-shadow`
- Control primitives with device rows and responsive wrappers
- Popover ColorPicker + ShadowControl
- Background icon tabs, Dimensions unit select, section-inspector ResponsiveChoose wiring

## Verification (remaining)
- Run `pnpm tsc --noEmit` (ignore known `sql-helpers.ts` noise)
- In the builder: per-device align, color popover, custom shadow, padding unit switch, legacy page JSON
- On the public page: resize across 768 / 1024 and confirm device values apply
