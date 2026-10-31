# Header & Footer Builder: Component Plan

Extends the existing header/footer templates (MKT-08–10, see `docs/editor-basics-and-header-footer-templates.md`) with header/footer-specific blocks, header behaviour, draft/publish, and broader display rules.

Nothing here introduces a second document format, renderer, registry, or editor. Every header/footer is still a `global_blocks` row holding a `BuilderDocument`, edited in the existing editor and rendered by `renderBuilderContent`.

---

## 0. What already exists (do not rebuild)

| Area | Where |
|------|-------|
| Storage | `global_blocks` table (`src/db/schemas/pages.schema.ts`), `category: 'Header' \| 'Footer' \| 'General'` |
| Document format | `BuilderDocument` (`packages/builder-core/src/document.ts`): flat `nodes` map, named `slots`, `root.props`, `version` |
| Block definitions | `defineBlock` + Zod schema in `src/builder/definitions/native.tsx`; render components in `src/builder/blocks/*` |
| Palette groups | `CATEGORIES` in `native.tsx`; per-editor setup in `editorSetup(kind)` (`src/builder/definitions/index.ts`) |
| Editor | `packages/builder-react` + `packages/editor-ui`: drag/drop, undo/redo, duplicate/delete/reorder, responsive preview, keyboard shortcuts, layers |
| Editor route | `src/app/(admin)/dashboard/(fullscreen)/templates/globals/[id]` |
| Assignment | page → locale → site default via `headerTemplateId` / `footerTemplateId` on `pages`, `posts`, `site_settings`, and `SiteCopy` translations |
| Public render | `src/app/(site)/layout.tsx` → `getGlobalBlockContent` → `renderBuilderContent`, falls back to built-in `<header>`/`<footer>` with `MenuLinks` |
| Menus | `publicSiteService.menuFor('header' \| 'footer', language, site)` |
| Theme | `themeTokens` / `themeStyle` (CSS variables), `data-site-theme` light/dark |
| Sanitizing | `src/builder/sanitize.ts` (used by `Embed`/`Code`) |
| Cache purge | `revalidatePublicSite(siteId)` in `src/lib/utils/revalidate-site.ts` |

### Existing blocks reused as-is

| Plan concept | Existing block |
|--------------|----------------|
| Section / Row / Column | `Container` (flex/grid, nested via `content` slot), `Columns` |
| Spacer | `Spacer` |
| Button / CTAButton | `Button` |
| Text / Heading | `RichText` |
| Image | `Image` |
| HTMLBlock | `Embed` / `Code` |
| Newsletter | `Newsletter` |
| MapEmbed | `Map` |
| Responsive visibility | `section.hideOnMobile / hideOnTablet / hideOnDesktop` on existing blocks |

---

## 1. Structure

No fixed Section → Row → Column → Element hierarchy. A header is an ordinary `BuilderDocument`:

```
rootSlot
 └── Container  (top bar band: bg, padding, boxed/full)
      └── Container (flex row, justify between)
           ├── Logo
           ├── NavMenu
           └── Container (flex, gap) → SearchBox, Button
```

Starter templates (§7) ship these as prebuilt documents, so users get the familiar band/row/column layout without a new schema.

Header behaviour settings live on the document's `root.props` (see §4), so they travel with the template.

---

## 2. Editor setup changes

1. **New editor kinds** in `editorSetup(kind)`: `'header'` and `'footer'`.
   - Same definitions as `'global'` (no `GlobalRef`, no post blocks).
   - Adds the new `Header` / `Footer` palette groups from §3 to the top of the list; hides the other's group (Header blocks not offered in footer and vice versa).
   - `rootFields`: `HEADER_ROOT_FIELDS` for headers (§4), `{}` for footers (or a small `FOOTER_ROOT_FIELDS` for background/padding).
2. **Kind selection**: the globals editor route reads the row's `category` and passes `'header'`, `'footer'`, or `'global'`.
3. **Allowed areas**: add an optional `areas?: ('header' | 'footer' | 'page')[]` to block metadata (or keep it in `CATEGORIES`) so `editorSetup` filters the palette. Blocks without `areas` are allowed everywhere.
4. **Category change guard**: switching a template's category between Header and Footer warns if it contains blocks not allowed in the new area.

---

## 3. New blocks

Each is a `defineBlock` entry in `native.tsx` (Zod schema + defaults + fields) with a render component in a new `src/builder/blocks/site-chrome.tsx` (split into `header.tsx` / `footer.tsx` if it grows). Server components by default; interactive parts go in `*-client.tsx` files, matching `contact-form-client.tsx` / `blog-filters-client.tsx`.

### Header group

| Block | Props | Notes |
|-------|-------|-------|
| `Logo` | `source: 'site' \| 'media'`, `mediaUrl`, `darkMediaUrl`, `stickyMediaUrl`, `width` (Responsive), `link` (default home), `showSiteName` | `'site'` reads logo/name from site settings at render time |
| `NavMenu` | `location: 'header' \| 'footer'` (later: `menuId`), `orientation`, `depth: 1–3`, `dropdownTrigger: 'hover' \| 'click'`, `gap`, `activeStyle` | Uses `publicSiteService.menuFor`; move `MenuLinks` + `menuHref` out of `layout.tsx` into a shared `src/components/site/menu-links.tsx` and reuse it here and in the fallback header |
| `MobileMenu` | `breakpoint: 'mobile' \| 'tablet'`, `drawerSide: 'left' \| 'right' \| 'full'`, `menuLocation`, `icon`, `showSearch` | One block = toggle + drawer (client). Accordion sub-menus, overlay, focus trap, Escape to close |
| `SearchBox` | `mode: 'inline' \| 'icon-modal'`, `placeholder` | Submits to the site search route; live results is Phase 6 |
| `AnnouncementBar` | `text`, `link`, `dismissible`, `dismissDays`, `startsAt`, `endsAt` | Schedule checked at render; dismissal in a cookie (client) |
| `ThemeToggle` | `icon` | Toggles `data-site-theme`, persists in cookie |

`LanguageSwitcher` block: thin wrapper around the existing `src/components/site/language-switcher.tsx` (Phase 6, or Phase 2 if multi-locale sites need it early).

### Footer group

| Block | Props | Notes |
|-------|-------|-------|
| `FooterLinks` | `heading`, `source: 'menu' \| 'manual'`, `menuLocation`, `links[]`, `collapseOnMobile` | Manual links use an array field |
| `SocialIcons` | `items[] { network, url }`, `shape: 'round' \| 'square' \| 'plain'`, `size`, `hoverColor` | Icons from `src/builder/icons.tsx` (add brand icons if missing) |
| `ContactInfo` | `items[] { kind: 'address' \| 'phone' \| 'email', value, label }`, `showIcons` | `tel:` / `mailto:` links |
| `Copyright` | `text` (default `© {year} {site_name}. All rights reserved.`), `align` | Tokens replaced at render; check whether the dynamic-binding system (BLD-21–31) can supply `{site_name}` instead of a custom token |
| `LegalLinks` | `menuLocation` or `links[]`, `separator` | |
| `BackToTop` | `position`, `showAfter` (px), `icon` | Client; smooth scroll, respects `prefers-reduced-motion` |

Later (Phase 6): `MegaMenu`, `AccountMenu`, `CartIcon`, `WishlistIcon`, `PaymentIcons`, `AppBadges`, `TrustBadges`, `Breadcrumb`. Only build these once there are features behind them (accounts, commerce).

---

## 4. Header behaviour (root props)

`HEADER_ROOT_FIELDS`, stored on `root.props` of header documents:

| Prop | Options |
|------|---------|
| `sticky` | `'off' \| 'always' \| 'scroll-up'` |
| `transparent` | boolean, becomes solid after scrolling `transparentOffset` px |
| `shrinkOnScroll` | boolean, swaps `Logo` to `stickyMediaUrl` |
| `hideOnScrollDown` | boolean |
| `shadow` | `'none' \| 'on-scroll' \| 'always'` |
| `zIndex` | number (default 50) |

Breakpoints: reuse the builder's existing Responsive breakpoints from `style.ts`. Don't define new ones.

Implementation:
- `src/components/site/header-shell.tsx` (client): wraps the rendered header, listens to scroll, sets `data-scrolled` / `data-hidden` attributes. Styling is in CSS (`site.css`), so the client part stays tiny.
- `layout.tsx` reads `root.props` from the header document and passes them to `HeaderShell`.
- Per-page transparent override: optional `headerTransparent` on pages (Phase 5, with conditions).

---

## 5. Draft / publish

`global_blocks` has no status column today, so every save goes live.

- Migration: add `published_content jsonb` and `published_at timestamp`. `content` stays the working draft.
- `getGlobalBlockContent(id, { draft })`: public render reads `published_content`; preview sessions read `content`.
- Publish action copies `content` → `published_content` and calls `revalidatePublicSite(siteId)`.
- Backfill: `published_content = content` for existing rows so nothing disappears.
- Applies to all global blocks, not just headers/footers. Check every other caller of `global_blocks.content` (e.g. `GlobalRef`).

Also: `getGlobalBlockContent` currently selects by `id` only. Add a `siteId` filter so one site can't render another site's template.

---

## 6. Display conditions

Current resolution (keep): page → locale → site default.

Additions:
- **Posts**: `posts.header_template_id` / `footer_template_id` already exist in the migration but `layout.tsx` only resolves pages. Wire posts in (resolve via `postRoute`).
- **Hide header/footer per page**: allow a sentinel (`'none'`) or a boolean `hideHeader` / `hideFooter` on pages, for landing pages.
- **Rule-based assignment** (Phase 5): new `template_rules` table `{ id, siteId, templateId, area, kind: 'post-type' | 'category' | 'tag' | 'user-state' | 'role', value, priority }`.
  Order: page/post override → rules (most specific first) → locale → site default.
  Put the resolver in `src/server/services/template-resolver.service.ts` and extend `header-footer-templates.test.ts`.
- User-state rules make the header per-user, which hurts caching. Prefer rendering the same template and toggling user-dependent elements on the client.

---

## 7. Starter templates

Prebuilt `BuilderDocument`s in `src/db/seed` (or offered when creating a Header/Footer global):

- Header: Classic (logo left, menu center, CTA right), Centered logo, Minimal, With top bar
- Footer: Four columns, Simple centered, Dark with newsletter

Import/export JSON: check whether the templates module already supports it before adding anything.

---

## 8. Phases

| Phase | Scope |
|-------|-------|
| **1. Foundation** | `header` / `footer` editor kinds + palette filtering; extract `MenuLinks`; `Logo`, `NavMenu`, `Copyright`, `FooterLinks`; `siteId` filter on `getGlobalBlockContent` |
| **2. Header essentials** | `MobileMenu`, `SearchBox`, `AnnouncementBar`, `HEADER_ROOT_FIELDS` + `HeaderShell` (sticky/transparent/shrink) |
| **3. Footer essentials** | `SocialIcons`, `ContactInfo`, `LegalLinks`, `BackToTop`; starter templates |
| **4. Draft/publish** | `published_content` migration + backfill, publish action, preview reads draft, revalidation |
| **5. Conditions** | Post resolution, hide per page, `template_rules` + resolver |
| **6. Advanced** | `ThemeToggle`, `LanguageSwitcher` block, `MegaMenu`, search live results, commerce/account blocks when those features exist |

---

## 9. Testing

- Block schemas/defaults: add to `src/builder/__tests__/` alongside existing block tests.
- `editorSetup('header' | 'footer')` palette contents.
- Template resolution: extend `src/server/services/__tests__/header-footer-templates.test.ts` (posts, hide, rules, siteId isolation).
- Draft vs published reads.
- Browser check: sticky/transparent behaviour and mobile drawer at mobile/tablet/desktop widths.

---

## 10. Notes

- Server components by default; only `MobileMenu`, `SearchBox` (modal), `AnnouncementBar` (dismiss), `ThemeToggle`, `BackToTop`, `HeaderShell` ship client JS.
- All colors come from theme tokens (`var(--site-*)`) so headers follow the site theme and dark mode.
- Accessibility: `<header>` / `<nav aria-label>` / `<footer>` landmarks, skip-to-content link, keyboard-operable dropdowns, focus trap in the drawer.
