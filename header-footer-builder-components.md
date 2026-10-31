# Header & Footer Builder: Component Plan

Extends the existing header/footer templates (MKT-08–10, see `docs/editor-basics-and-header-footer-templates.md`) with a dedicated Header & Footer builder: its own admin route, a block palette that offers only header/footer components, header behaviour, draft/publish, and broader display rules.

Nothing here introduces a second document format, renderer, registry, or editor. Every header/footer is still a `global_blocks` row (`category: 'Header' | 'Footer'`) holding a `BuilderDocument`, edited in the existing editor and rendered by `renderBuilderContent`. Only the route, the list page, and the palette are separate. Contact forms already work this way (`/dashboard/contact-forms`), so the builder follows that pattern.

---

## 0. What already exists (do not rebuild)

| Area                     | Where                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage                  | `global_blocks` table (`src/db/schemas/pages.schema.ts`), `category: 'Header' \| 'Footer' \| 'General'`                                                                                        |
| Document format          | `BuilderDocument` (`packages/builder-core/src/document.ts`): flat `nodes` map, named `slots`, `root.props`, `version`                                                                          |
| Block definitions        | `defineBlock` + Zod schema in `src/builder/definitions/native.tsx`; render components in `src/builder/blocks/*`                                                                                |
| Palette groups           | `CATEGORIES` in `native.tsx`; per-editor setup in `editorSetup(kind)` (`src/builder/definitions/index.ts`)                                                                                     |
| Editor                   | `packages/builder-react` + `packages/editor-ui`: drag/drop, undo/redo, duplicate/delete/reorder, responsive preview, keyboard shortcuts, layers                                                |
| Editor wrapper           | `BuilderOrNewEditor` (`(fullscreen)/_editor/builder-or-new-editor`), per-kind label/back link/save in `builder-adapters.ts`                                                                    |
| Separate-route precedent | Contact forms: list `(shell)/contact-forms/page.tsx`, editor `(fullscreen)/contact-forms/[id]/page.tsx`, kind `'contact-form'`, globals route redirects there, Templates page filters them out |
| Admin menu               | `src/menus/index.tsx`; routes in `src/config/pages.ts` (`PAGES.DASHBOARD.*`)                                                                                                                   |
| Assignment               | page → locale → site default via `headerTemplateId` / `footerTemplateId` on `pages`, `posts`, `site_settings`, and `SiteCopy` translations                                                     |
| Public render            | `src/app/(site)/layout.tsx` → `getGlobalBlockContent` → `renderBuilderContent`, falls back to built-in `<header>`/`<footer>` with `MenuLinks`                                                  |
| Menus                    | `publicSiteService.menuFor('header' \| 'footer', language, site)`                                                                                                                              |
| Theme                    | `themeTokens` / `themeStyle` (CSS variables), `data-site-theme` light/dark                                                                                                                     |
| Sanitizing               | `src/builder/sanitize.ts` (used by `Embed`/`Code`)                                                                                                                                             |
| Cache purge              | `revalidatePublicSite(siteId)` in `src/lib/utils/revalidate-site.ts`                                                                                                                           |

### Existing blocks reused in the Header & Footer palette

These are listed inside the Header/Footer palette groups (§3) rather than offered through their usual page groups:

| Plan concept        | Existing block | Group  |
| ------------------- | -------------- | ------ |
| CTA button          | `Button`       | Header |
| Footer text / about | `RichText`     | Footer |
| Newsletter signup   | `Newsletter`   | Footer |
| Spacer              | `Spacer`       | both   |

Responsive visibility: `section.hideOnMobile / hideOnTablet / hideOnDesktop` already exists on every block.

---

## 1. Route & admin navigation

### Routes

| Route                           | File                                                                 | Purpose                                                                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/header-footer`      | `src/app/(admin)/dashboard/(shell)/header-footer/page.tsx`           | List page with `Header` / `Footer` tabs: create, rename, duplicate, delete, open in builder. Shows where each one is used (site default, locales, page count)   |
| `/dashboard/header-footer/[id]` | `src/app/(admin)/dashboard/(fullscreen)/header-footer/[id]/page.tsx` | Fullscreen builder. Loads the row, `notFound()` unless `category` is `Header` or `Footer`, renders `BuilderOrNewEditor` with `kind="header"` or `kind="footer"` |
- `src/config/pages.ts`: add `PAGES.DASHBOARD.HEADER_FOOTER` and `PAGES.DASHBOARD.HEADER_FOOTER_EDIT(id)`.
- `src/menus/index.tsx`: add a **Header & Footer** item (icon e.g. `PanelTop`) next to Templates.
- Create flow: "New header" / "New footer" sets the category, so the user never picks it. Optionally starts from a starter template (§7).
- Move `normalizeGlobalContent` (copied today in the globals and contact-form pages) into a shared helper, and keep `root.props` instead of resetting it to `{}`, so header behaviour settings (§5) survive a load.

### Separating from Templates & Globals

- `(fullscreen)/templates/globals/[id]/page.tsx`: if `category` is `Header` or `Footer`, `redirect(PAGES.DASHBOARD.HEADER_FOOTER_EDIT(id))`, the same as the existing contact-form redirect.
- `(shell)/templates/page.tsx`: filter `Header` / `Footer` rows out of the Global blocks tab (next to the existing `contact-form` filter), and drop `Header` / `Footer` from that tab's category `Select`.
- `builder-adapters.ts`: for `header` / `footer` kinds, label `Header` / `Footer`, back link to `PAGES.DASHBOARD.HEADER_FOOTER`, save through the existing `saveGlobalBlock` with the fixed category.
- The header/footer template `Select`s in the page sidebar editor and site settings keep reading `global_blocks` by category, so they need no change. Add an "Edit" link beside them that opens the new route.
- Server: add `listHeaderFooters()` / `createHeaderFooter(category)` to `templates.service.ts` (or a small `header-footer.service.ts` under the new route's `_modules`), gated by `PERMISSIONS.PAGES_EDIT` like the existing pages.

---

## 2. Editor setup: palette shows only Header & Footer components

1. **New editor kinds** in `editorSetup(kind)`: `'header'` and `'footer'`.
   - `definitions` / `schemas` / `inspectorBlocks`: same as `'global'` (all page blocks minus `GlobalRef` and post blocks). Keeping the full set means existing headers built with `Container` etc. still load, render, and can be edited in the inspector; they just can't be added from the palette.
   - `groups`: **only** the `Header` and `Footer` groups from §3. No Heroes, Marketing, Content, Layout, Blog, Collections, Custom, etc.
   - Group order: `Header` first in the header editor, `Footer` first in the footer editor. Both groups are offered in both editors (e.g. `SocialIcons` in a header top bar, `Logo` in a footer).
   - `rootFields`: `HEADER_ROOT_FIELDS` for headers (§5), `FOOTER_ROOT_FIELDS` (background, padding, text colour) for footers.
2. **Palette groups**: add `header` and `footer` entries to `CATEGORIES` in `native.tsx`. `pageBlockGroups` and `groupsOf()` skip them, so page/global/post editors don't show header/footer blocks.
3. **Layers / inspector**: no changes. The layers panel shows whatever is in the document.
4. Not needed any more (the old plan had these): per-block `areas` metadata and a guard for switching category between Header and Footer. Category is fixed at creation in the new route.

---

## 3. Blocks (the whole Header & Footer palette)

Each new block is a `defineBlock` entry in `native.tsx` (Zod schema + defaults + fields) with a render component in a new `src/builder/blocks/site-chrome.tsx` (split into `header.tsx` / `footer.tsx` if it grows). Server components by default; interactive parts go in `*-client.tsx` files, matching `contact-form-client.tsx` / `blog-filters-client.tsx`.

### Layout blocks (new, chrome-specific)

Since the generic `Container` / `Columns` aren't in this palette, the structure comes from two purpose-built layout blocks:

| Block           | Group  | Props                                                                                                                                     | Notes                                                                                                                                     |
| --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `HeaderBar`     | Header | `width: 'boxed' \| 'full'`, `background`, `padding` (Responsive), `minHeight`, `borderBottom`, `align`, slots `left` / `center` / `right` | One band of the header (top bar, main bar, bottom bar). Stack several for multi-row headers. Renders as a flex row with `justify-between` |
| `FooterColumns` | Footer | `width`, `background`, `padding`, `columns: 1–6`, `gap`, `stackOn: 'mobile' \| 'tablet'`, slots `col1`…`col6`                             | Column grid for widgets. A one-column `FooterColumns` is the bottom bar                                                                   |

Both reuse the existing style helpers from `style.ts` (Responsive values, breakpoints) and render through the same `Container` CSS, so there is no new layout engine.

### Header group

| Block              | Props                                                                                                                                        | Notes                                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HeaderBar`        | see above                                                                                                                                    |                                                                                                                                                                                     |
| `Logo`             | `source: 'site' \| 'media'`, `mediaUrl`, `darkMediaUrl`, `stickyMediaUrl`, `width` (Responsive), `link` (default home), `showSiteName`       | `'site'` reads logo/name from site settings at render time                                                                                                                          |
| `NavMenu`          | `location: 'header' \| 'footer'` (later: `menuId`), `orientation`, `depth: 1–3`, `dropdownTrigger: 'hover' \| 'click'`, `gap`, `activeStyle` | Uses `publicSiteService.menuFor`; move `MenuLinks` + `menuHref` out of `layout.tsx` into a shared `src/components/site/menu-links.tsx` and reuse it here and in the fallback header |
| `MobileMenu`       | `breakpoint: 'mobile' \| 'tablet'`, `drawerSide: 'left' \| 'right' \| 'full'`, `menuLocation`, `icon`, `showSearch`                          | One block = toggle + drawer (client). Accordion sub-menus, overlay, focus trap, Escape to close                                                                                     |
| `SearchBox`        | `mode: 'inline' \| 'icon-modal'`, `placeholder`                                                                                              | Submits to the site search route; live results is Phase 6                                                                                                                           |
| `AnnouncementBar`  | `text`, `link`, `dismissible`, `dismissDays`, `startsAt`, `endsAt`                                                                           | Schedule checked at render; dismissal in a cookie (client)                                                                                                                          |
| `Button`           | existing                                                                                                                                     | Listed here for the header CTA                                                                                                                                                      |
| `ThemeToggle`      | `icon`                                                                                                                                       | Phase 6. Toggles `data-site-theme`, persists in cookie                                                                                                                              |
| `LanguageSwitcher` |                                                                                                                                              | Phase 6 (Phase 2 if multi-locale sites need it early). Thin wrapper around `src/components/site/language-switcher.tsx`                                                              |
| `Spacer`           | existing                                                                                                                                     |                                                                                                                                                                                     |

### Footer group

| Block           | Props                                                                                     | Notes                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `FooterColumns` | see above                                                                                 |                                                                                                                                    |
| `FooterLinks`   | `heading`, `source: 'menu' \| 'manual'`, `menuLocation`, `links[]`, `collapseOnMobile`    | Manual links use an array field                                                                                                    |
| `SocialIcons`   | `items[] { network, url }`, `shape: 'round' \| 'square' \| 'plain'`, `size`, `hoverColor` | Icons from `src/builder/icons.tsx` (add brand icons if missing)                                                                    |
| `ContactInfo`   | `items[] { kind: 'address' \| 'phone' \| 'email', value, label }`, `showIcons`            | `tel:` / `mailto:` links                                                                                                           |
| `Copyright`     | `text` (default `© {year} {site_name}. All rights reserved.`), `align`                    | Tokens replaced at render; check whether the dynamic-binding system (BLD-21–31) can supply `{site_name}` instead of a custom token |
| `LegalLinks`    | `menuLocation` or `links[]`, `separator`                                                  |                                                                                                                                    |
| `BackToTop`     | `position`, `showAfter` (px), `icon`                                                      | Client; smooth scroll, respects `prefers-reduced-motion`                                                                           |
| `RichText`      | existing                                                                                  | About text / short description                                                                                                     |
| `Newsletter`    | existing                                                                                  |                                                                                                                                    |
| `Spacer`        | existing                                                                                  |                                                                                                                                    |

Later (Phase 6): `MegaMenu`, `AccountMenu`, `CartIcon`, `WishlistIcon`, `PaymentIcons`, `AppBadges`, `TrustBadges`, `Breadcrumb`. Only build these once there are features behind them (accounts, commerce).

---

## 4. Structure

A header is an ordinary `BuilderDocument` built from the blocks above:

```
rootSlot
 ├── AnnouncementBar
 ├── HeaderBar (top bar)    left: ContactInfo   right: SocialIcons
 └── HeaderBar (main)       left: Logo   center: NavMenu   right: SearchBox, Button, MobileMenu
```

A footer:

```
rootSlot
 ├── FooterColumns (4)   Logo + RichText | FooterLinks | FooterLinks | Newsletter
 └── FooterColumns (1)   Copyright, LegalLinks, SocialIcons
```

Header behaviour settings live on the document's `root.props` (§5), so they travel with the template.

---

## 5. Header behaviour (root props)

`HEADER_ROOT_FIELDS`, stored on `root.props` of header documents and shown in the builder's page/root settings panel:

| Prop               | Options                                                       |
| ------------------ | ------------------------------------------------------------- |
| `sticky`           | `'off' \| 'always' \| 'scroll-up'`                            |
| `transparent`      | boolean, becomes solid after scrolling `transparentOffset` px |
| `shrinkOnScroll`   | boolean, swaps `Logo` to `stickyMediaUrl`                     |
| `hideOnScrollDown` | boolean                                                       |
| `shadow`           | `'none' \| 'on-scroll' \| 'always'`                           |
| `zIndex`           | number (default 50)                                           |

Breakpoints: reuse the builder's existing Responsive breakpoints from `style.ts`. Don't define new ones.

Implementation:
- `src/components/site/header-shell.tsx` (client): wraps the rendered header, listens to scroll, sets `data-scrolled` / `data-hidden` attributes. Styling is in CSS (`site.css`), so the client part stays tiny.
- `layout.tsx` reads `root.props` from the header document and passes them to `HeaderShell`.
- Builder canvas: preview sticky/transparent over a placeholder page body so the effect is visible while editing.
- Per-page transparent override: optional `headerTransparent` on pages (Phase 5, with conditions).

---

## 6. Draft / publish

`global_blocks` has no status column today, so every save goes live.

- Migration: add `published_content jsonb` and `published_at timestamp`. `content` stays the working draft.
- `getGlobalBlockContent(id, { draft })`: public render reads `published_content`; preview sessions read `content`.
- Publish button in the Header & Footer builder toolbar copies `content` → `published_content` and calls `revalidatePublicSite(siteId)`. The list page shows a "Draft changes" badge.
- Backfill: `published_content = content` for existing rows so nothing disappears.
- Applies to all global blocks, not just headers/footers. Check every other caller of `global_blocks.content` (e.g. `GlobalRef`, contact forms).

Also: `getGlobalBlockContent` currently selects by `id` only. Add a `siteId` filter so one site can't render another site's template.

---

## 7. Display conditions

Current resolution (keep): page → locale → site default. The assignment UI stays where it is (page sidebar, site settings); the list page in §1 only shows where each template is used.

Additions:
- **Posts**: `posts.header_template_id` / `footer_template_id` already exist in the migration but `layout.tsx` only resolves pages. Wire posts in (resolve via `postRoute`).
- **Hide header/footer per page**: allow a sentinel (`'none'`) or a boolean `hideHeader` / `hideFooter` on pages, for landing pages.
- **Rule-based assignment** (Phase 5): new `template_rules` table `{ id, siteId, templateId, area, kind: 'post-type' | 'category' | 'tag' | 'user-state' | 'role', value, priority }`, edited from a "Display conditions" panel in the Header & Footer builder.
  Order: page/post override → rules (most specific first) → locale → site default.
  Put the resolver in `src/server/services/template-resolver.service.ts` and extend `header-footer-templates.test.ts`.
- User-state rules make the header per-user, which hurts caching. Prefer rendering the same template and toggling user-dependent elements on the client.

---

## 8. Starter templates

Prebuilt `BuilderDocument`s in `src/db/seed`, offered in the "New header" / "New footer" dialog on the list page:

- Header: Classic (logo left, menu center, CTA right), Centered logo, Minimal, With top bar
- Footer: Four columns, Simple centered, Dark with newsletter

Starters use only the blocks from §3, so everything in them is editable from the palette.

Import/export JSON: check whether the templates module already supports it before adding anything.

---

## 9. Phases

| Phase                    | Scope                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Foundation**        | `/dashboard/header-footer` list + `[id]` builder routes, menu item, redirect from globals route, filter out of Templates page; `header` / `footer` editor kinds with Header/Footer-only palette; `HeaderBar`, `FooterColumns`; extract `MenuLinks`; `Logo`, `NavMenu`, `Copyright`, `FooterLinks`; `siteId` filter on `getGlobalBlockContent` |
| **2. Header essentials** | `MobileMenu`, `SearchBox`, `AnnouncementBar`, `HEADER_ROOT_FIELDS` + `HeaderShell` (sticky/transparent/shrink)                                                                                                                                                                                                                                |
| **3. Footer essentials** | `SocialIcons`, `ContactInfo`, `LegalLinks`, `BackToTop`; starter templates in the create dialog                                                                                                                                                                                                                                               |
| **4. Draft/publish**     | `published_content` migration + backfill, Publish button, preview reads draft, revalidation                                                                                                                                                                                                                                                   |
| **5. Conditions**        | Post resolution, hide per page, `template_rules` + resolver + Display conditions panel                                                                                                                                                                                                                                                        |
| **6. Advanced**          | `ThemeToggle`, `LanguageSwitcher` block, `MegaMenu`, search live results, commerce/account blocks when those features exist                                                                                                                                                                                                                   |

---

## 10. Testing

- Block schemas/defaults: add to `src/builder/__tests__/` alongside existing block tests.
- `editorSetup('header' | 'footer')`: palette contains only Header/Footer groups; `editorSetup('page' | 'global')` palettes don't contain them; existing `Container`-based headers still load (definitions present).
- Routes: globals route redirects Header/Footer rows; header-footer route 404s for other categories; Templates page no longer lists them.
- Template resolution: extend `src/server/services/__tests__/header-footer-templates.test.ts` (posts, hide, rules, siteId isolation).
- Draft vs published reads.
- Browser check: list page, builder sidebar contents, sticky/transparent behaviour and mobile drawer at mobile/tablet/desktop widths.

---

## 11. Notes

- Server components by default; only `MobileMenu`, `SearchBox` (modal), `AnnouncementBar` (dismiss), `ThemeToggle`, `BackToTop`, `HeaderShell` ship client JS.
- All colors come from theme tokens (`var(--site-*)`) so headers follow the site theme and dark mode.
- Accessibility: `<header>` / `<nav aria-label>` / `<footer>` landmarks, skip-to-content link, keyboard-operable dropdowns, focus trap in the drawer.
