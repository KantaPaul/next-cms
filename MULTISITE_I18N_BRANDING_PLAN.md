# Locale Routing, Admin i18n, Demo Sites, Branding & DB Tools — Implementation Plan

Six requests, one plan, built in phases. Each phase can merge by itself and ends with a done-check.

| # | Request | Phase |
|---|---------|-------|
| 1 | Switching language in the admin header puts the locale **in the URL**, and every create / edit / view link keeps it, the way the public site does | P2 |
| 2 | Every static string in the admin portal is translatable | P3 |
| 3 | Seed four multi-language demo sites: **Blog**, **Agency**, **Documentation**, **Portfolio** (+ Stitch design prompts, + any missing blocks) | P5, P6 |
| 4 | Brand the admin panel: a name and a logo prompt | P4 |
| 5 | `db:download` and `db:restore` in `package.json` | P1 |
| 6 | Forms in an exported static site still post to the CMS database; all other content stays static | P7 |

---

## 0. How the code works today (starting point)

**Admin content locale.** `src/components/dashboard/lang-switcher.tsx` writes a `cms_locale` cookie
(`ADMIN_LOCALE_COOKIE` in `src/lib/locale/admin-locale.ts`). The language appears in the URL only on
list pages, as `?language=` (`LANGUAGE_FILTERED_ROUTES`: pages, posts, collection entries). Create,
edit, builder and view pages read only the cookie, so a copied link opens in the wrong language and
two tabs cannot work in two languages.

**Public locale.** `resolveRoute()` in `src/server/services/public-site.service.ts`: the default locale
has no prefix, other locales do: `/{site}/{locale}/{slug}`. Pages and entries are linked across
languages by `translationGroupId`.

**Proxy.** `src/proxy.ts` sets `x-cms-site-slug` from the first path segment and **skips `/dashboard`
completely**.

**Admin UI strings.** There is no i18n library. About 185 `.tsx` files under `src/app/(admin)` plus
`src/menus/index.tsx`, `src/config/pages.ts` and `src/components/**` have English strings written
directly in the JSX.

**Sites & locales.** `sites.defaultLocale` + `sites.locales` (jsonb, defaults to `DEFAULT_SITE_LOCALES`:
en, es, fr, de, ja).

**Seed.** `src/db/seed/index.ts` (1,088 lines) truncates everything and seeds the `main` site:
pages, templates, builder posts, the user guide as posts (`src/content/user-guide`), post types and
translations.

**Export.** `scripts/export-site.ts` → `export-site.service.ts`. Forms in an exported site work only
when they are given an external `actionUrl` (`EXTERNAL_URL_NOTICE`). The CMS endpoint
`POST /api/forms/submit` exists but takes only same-origin posts.

**DB.** Postgres 15 in docker-compose (`nextcms_db`). `db:migrate` does not work locally: the schema
comes from `db:push`, and new migration SQL is applied with `psql`. A new permission also needs a
grant migration, because `PERMISSION_MATRIX` seeds only fresh installs.

---

## Phase 1 — DB download / restore (small, ships first)

Ships first because the later seed phases wipe the database, and this gives you a safety net.

### 1.1 `scripts/db-dump.ts` and `scripts/db-restore.ts`
- Load `.env` with `dotenv` (already a dependency) and read `DATABASE_URL`.
- **Download:** `pg_dump --format=custom --no-owner --no-privileges` →
  `backups/<db>-YYYYMMDD-HHmmss.dump`. Pass `--out=path` to choose the file and `--sql` for a plain
  `.sql` file instead.
- **Restore:** `pg_restore --clean --if-exists --no-owner -d $DATABASE_URL <file>`. With no argument it
  uses the newest file in `backups/`. It asks `Restore into <host>/<db>? This replaces all data (y/N)`,
  and `--yes` skips the question for CI.
- If `pg_dump`/`pg_restore` is not on the PATH, or the server is newer than the local client, fall back
  to `docker exec -i nextcms_db pg_dump …` (the container's client always matches the server).
- Refuse to restore when `NODE_ENV=production`, unless `--force-production` is passed.
- Optional `--with-media`: also archive `uploads/` (local storage provider) next to the dump.

### 1.2 `package.json`
```json
"db:download": "tsx scripts/db-dump.ts",
"db:restore":  "tsx scripts/db-restore.ts",
"db:backups":  "tsx scripts/db-dump.ts --list"
```
Add `backups/` to `.gitignore` and `.dockerignore`.

### 1.3 Done-check
- [ ] `pnpm db:download` → `pnpm db:seed` → `pnpm db:restore` brings back the exact row counts (the
  script prints a before/after count for each table).
- [ ] Works with and without a host `pg_dump` (Docker fallback).

---

## Phase 2 — Locale in the admin URL (request 1)

### 2.1 URL shape: same rule as the public site
```
/dashboard/pages                       → default locale (en)
/dashboard/es/pages                    → Spanish list
/dashboard/es/pages/create             → create a Spanish page
/dashboard/es/pages/{id}/edit          → edit
/dashboard/es/pages/{id}/builder       → builder (fullscreen group)
/dashboard/es/collections/docs/{id}    → entry editor
```
The default locale has no prefix, matching `resolveRoute()`, so existing bookmarks keep working.

**Recommended: a proxy rewrite, not a file move.** Moving 185 route files under a `[locale]` segment
would break every import path and conflict with this branch's work in progress. Instead:

1. `src/proxy.ts`: stop skipping `/dashboard`. Add `dashboardLocale(pathname)`. When the segment after
   `/dashboard` matches `^[a-z]{2,3}(-[A-Za-z]{2,4})?$` and is not a dashboard route name (`api`,
   `dev`, …; add a `RESERVED_DASHBOARD_SEGMENTS` set), **rewrite** to the path without that segment and
   set the `x-cms-admin-locale` header. Delete any client-sent copy of that header first, as is already
   done for `x-cms-site-slug`.
2. `src/server/services/admin-locale.ts` (new, server-only): `adminLocale()` reads the header and checks
   it against the active site's `locales`. Unknown code → `notFound()`. No header → the site default.
   It replaces the cookie reads in `dashboard/layout.tsx`, `posts.service.ts`, `pages.service.ts`,
   `menus.service.ts`, `header-footer.service.ts` and `entry-context.ts`.
3. Keep the `cms_locale` cookie only to remember the last choice: visiting `/dashboard` with no prefix
   and a non-default cookie redirects once to the prefixed URL.
4. Remove `?language=` from list pages. `withAdminLanguage()` turns into `adminHref()` (below), and
   `LANGUAGE_FILTERED_ROUTES` is no longer needed.

### 2.2 One helper for every link
`src/lib/locale/admin-href.ts`:
```ts
adminHref(path: string, locale: string, defaultLocale: string): string
// adminHref('/dashboard/pages/create', 'es', 'en') → '/dashboard/es/pages/create'
stripAdminLocale(pathname): { locale: string | null; path: string }
```
- Client: a `useAdminHref()` hook, plus `<AdminLink>` wrapping `next/link`, which reads the locale from
  `SiteLocalesProvider`.
- Server: `adminRedirect(path)` wraps `redirect()` for server actions (create → redirect to edit).
- Fix every `href="/dashboard…"`, `router.push('/dashboard…')` and `redirect('/dashboard…')`:
  ```bash
  grep -rnE "(href=|push\(|replace\(|redirect\()\s*[\`'\"]/dashboard" src
  ```
  The sidebar (`nav-main.tsx`, `src/menus/index.tsx`, `src/config/pages.ts`) builds its links through
  `adminHref`.
- Add a Biome/ESLint `no-restricted-syntax` rule that flags string literals starting with
  `/dashboard` passed to `href`/`push`/`redirect` outside `admin-href.ts`, so new code can't regress.

### 2.3 The switcher
`LangSwitcher.onChange` → `router.push(swapAdminLocale(pathname + search, code))`.
- On a **single item** (edit, builder, view), switch to that item's **translation** in the same
  `translationGroupId`, using a new server action `findTranslation(kind, id, locale)`. If there is no
  translation, open a dialog: *"No Spanish version yet: Create translation / Stay here"*. Create
  reuses the existing translation code in `entry-translations.tsx`.
- On a list, the same list in the new locale.

### 2.4 "View" buttons → public URL with the locale
`publicUrlFor({ site, locale, slug, kind })` in `src/server/services/site-context.ts`, using the same
rule as `resolveRoute` (default unprefixed). Use it for "View", "Preview", share panel and admin bar so
that `/dashboard/es/pages/{id}` → `/{site}/es/{slug}`.

### 2.5 Tests
- `src/lib/locale/__tests__/admin-href.test.ts`: prefixing, the default locale, query strings, round
  trip with `stripAdminLocale`.
- `src/proxy.test.ts`: `/dashboard/es/pages` rewrites, `/dashboard/api` does not, a spoofed header is
  removed.
- E2E `tests/e2e/admin-locale.spec.ts`: switch to `es` on the pages list → create → URL is
  `/dashboard/es/pages/{id}/edit` → "View" opens `/main/es/{slug}` → switch to `fr` on the edit page
  → the "Create translation" dialog appears.

### 2.6 Done-check
- [ ] No `/dashboard` literal outside `admin-href.ts` (the lint rule passes).
- [ ] Reloading or copying any admin URL keeps its language. Two tabs can work in two languages.

---

## Phase 3 — Translatable admin UI (request 2)

### 3.1 Decision: UI language vs content language
These are two different things:
- **Content locale**: the URL segment from Phase 2, which decides *what* you edit.
- **UI locale**: the language of the admin's buttons and labels.

**Recommendation:** the UI follows the user's own preference (`users.uiLocale`, set in Account), and
when none is set it falls back to the content locale if a dictionary exists for it, otherwise `en`. An
editor translating Japanese content then still reads the admin in their own language.

### 3.2 Library: `next-intl`
It supports App Router RSC, works without its routing (we keep our own), and catches missing keys at
compile time. Use `getTranslations()` in server components, `useTranslations()` in client
components, and `NextIntlClientProvider` in `src/app/(admin)/dashboard/layout.tsx`, which passes only
the namespaces each route needs.

### 3.3 Message files
```
src/i18n/
  config.ts            # UI_LOCALES = ['en','es','ar'], RTL_LOCALES = ['ar'], getUiLocale(), dirFor()
  request.ts           # next-intl getRequestConfig
  messages/en/*.json   # one file per namespace: common, nav, pages, posts, collections,
                       # media, menus, forms, settings, users, analytics, builder, errors, validation
  messages/{es,ar}/*.json
```
- `en` is the source of truth. A type declaration (`global.d.ts`, `IntlMessages`) makes `t('pages.title')`
  type-checked.
- **Zod messages.** `src/i18n/zod.ts` sets a zod v4 error map that looks up `validation.*` keys. It
  covers the `*.schemas.ts` files used by the forms.
- **Data-driven labels.** The `src/menus/index.tsx`, `src/config/pages.ts` and settings-nav entries keep
  a `labelKey` instead of `label`.
- **Builder editor (`packages/editor-ui`).** This package must not import next-intl. Add a
  `messages` prop / `EditorI18nProvider` to the package and inject the strings from the app.
- Dates and numbers: `useFormatter()` instead of `dayjs().format(...)` wherever a value is shown.

### 3.4 Converting the strings (mechanical, done in batches)
1. `scripts/i18n-extract.ts`: finds JSX text and the string literals in `label`, `title`,
   `placeholder`, `description`, `toast.*` and `aria-label`. It writes a report and proposes keys.
2. Convert one area per PR, in this order: **shell & nav → common components (tables, dialogs, empty
   states, toasts) → pages/posts → collections → media/menus → forms/inbox → settings (including the
   new section pages on this branch) → users/roles → analytics → builder UI → remaining tools**.
3. `scripts/i18n-check.ts` (CI): every key in `en` exists in each locale, no unused keys, and no JSX
   text left in converted folders (lint rule `react/jsx-no-literals`, turned on for each folder as it
   is converted).
4. First drafts of the non-English files can be machine-translated and marked `"_status": "draft"`.
   A native speaker reviews them before release.

### 3.5 Done-check
- [ ] `react/jsx-no-literals` is on for all of `src/app/(admin)` and `src/components/{dashboard,molecules,organisms}`.
- [ ] `pnpm i18n:check` passes. Switching the Account → Language setting changes every visible admin
  string, including toasts, validation errors and the builder panels.
- [ ] With the UI set to Arabic, every admin screen is mirrored correctly: sidebar on the right,
  icons pointing the right way, tables, dialogs, dropdowns and the builder panels laid out
  right-to-left (the RTL checks in 3.6 pass).

### 3.6 RTL support (Arabic)
Arabic is a full UI and content locale, so the layout has to work right-to-left too.
- **Direction source.** `dirFor(locale)` in `src/i18n/config.ts`, driven by `RTL_LOCALES` for the UI and
  by `SiteLocale.dir` for content. Admin `<html dir>` follows the **UI** locale. Builder canvas,
  public pages and exports follow the **content** locale.
- **Mixed case.** An English UI editing Arabic content: the admin chrome stays LTR, while the
  builder canvas, rich-text editor (TipTap `dir` attribute), title/slug/excerpt inputs and previews
  are RTL. Wrap content-language fields in a `<ContentDir locale>` component.
- **CSS audit.** Replace physical Tailwind utilities with logical ones (`ml-*`→`ms-*`, `mr-*`→`me-*`,
  `pl/pr`→`ps/pe`, `left/right`→`start/end`, `text-left`→`text-start`, `border-l`→`border-s`,
  `rounded-l`→`rounded-s`). Tailwind 3.4 supports these. Write the codemod as
  `scripts/rtl-codemod.ts` and add a Biome/ESLint rule (or a grep in CI) that rejects physical
  utilities in `src/app/(admin)`, `src/components` and `src/builder/blocks`.
- **Icons.** Flip direction-carrying icons (chevrons, arrows, "back", indent, undo/redo) with
  `rtl:-scale-x-100`. Never flip logos, media controls or checkmarks.
- **Components.** Radix menus, popovers, tooltips and sheets get `dir` through `DirectionProvider`
  (`@radix-ui/react-direction`). Check `react-select`, the date picker, dnd-kit sortable lists, the
  slider/carousel blocks, `react-phone-number-input` and the charts.
- **Builder style system.** Spacing and alignment saved as `left`/`right` in node styles compile to
  logical CSS properties (`margin-inline-start`, `text-align: start`) in the Kirki class compiler.
  Then one design works in both directions without separate RTL styles. An explicit "physical"
  option stays available for the rare case that must not flip.
- **Fonts.** Load an Arabic font (e.g. IBM Plex Sans Arabic or Noto Kufi Arabic, via `next/font`) and
  add it to the theme tokens as `fontFamilyArabic`, used through `:lang(ar)`.
- **Numbers & code.** Keep code blocks, URLs, slugs, emails and IDs LTR (`dir="ltr"` / `<bdi>`). Use
  `useFormatter()` for numbers and dates, so Arabic gets the right digits and calendar format.
- **Tests.** Playwright `tests/e2e/rtl.spec.ts`: admin in Arabic (sidebar position, a dialog, a table,
  the builder) and public Arabic pages on every demo site, with screenshot comparisons in both
  directions.

---

## Phase 4 — Admin branding (request 4)

### 4.1 Name

**Recommended: Meridian**: "every site, every language, one line of control." A meridian is the line
that connects places around the globe, which fits a multi-site, multi-language builder. It is short
and easy to pronounce in all six UI languages.

Alternatives:

| Name | Idea |
|------|------|
| **Tessera** | A mosaic tile: blocks assembled into pages |
| **Loomwork** | Weaving sites, languages and blocks together |
| **Atlasio** | Atlas: many sites and regions in one map |
| **Kirkstone** | Nods to the current `kirki-builder` codename; solid foundation |

> Check the domain, npm scope and trademark before you commit to a name. *Meridian* is a common word,
> so you may need a product suffix such as **Meridian Studio** or **Meridian CMS**.

### 4.2 Logo prompt (for Midjourney / Ideogram / Recraft / Stitch)
```
Minimal vector logo for "Meridian", a website builder and multi-site, multi-language CMS.
Symbol: a single continuous line forming a stylised meridian arc over a globe that also reads as
three stacked layout blocks (nod to page sections). Geometric, balanced, works at 16 px favicon size.
Wordmark: "Meridian" in a clean geometric sans-serif (similar to Inter Display / General Sans),
medium weight, slightly open tracking. Colour: deep indigo #3B3FD8 to violet #7C5CFF gradient on the
symbol only, wordmark in near-black #111318. Provide: horizontal lockup, stacked lockup, symbol-only,
monochrome white on #111318, monochrome black on white. Flat, no 3D, no shadows, no mockups,
plain white background, SVG-style crisp edges.
```
Arabic lockup (for the RTL admin): *"same symbol on the right, wordmark «ميريديان» in a geometric
Arabic sans (IBM Plex Sans Arabic-like) to its left, matching weight and baseline."*

Favicon variant: *"symbol only, centred in a 512×512 rounded square (radius 112), indigo #3B3FD8
background, white symbol, no text."*

### 4.3 Where the name and logo are wired in
- `src/config/brand.ts` (new): `BRAND = { name, shortName, tagline, logo, logoDark, mark, colors }`.
  This is the only place the name is written.
- Replace "Next CMS" / "my-builder" in the sidebar header, login screens (`(auth)`, `src/app/login`),
  `<title>` templates, emails (`email-templates`), user guide PDF cover, admin bar, export README and
  the OpenAPI title.
- `public/brand/{logo.svg, logo-dark.svg, mark.svg}`, plus `src/app/favicon.ico`, `apple-icon.png` and
  `icon.svg`.
- Optional white-label setting: Settings → Branding (this branch already has `settings/branding/`) can
  override name and logo for each install. `BRAND` is the fallback.
- `package.json` `name` → `meridian` (and the workspace packages' `@nextcms/*` scope later, which is a
  separate breaking change).

### 4.4 Done-check
- [ ] `grep -ri "next cms\|nextcms" src --include=*.tsx` finds only code identifiers, no user-facing text.

---

## Phase 5 — Missing builder blocks for the demo sites (request 3, components)

The registry already has: section/container/columns, heading, rich text, image, gallery, lightbox,
video, code, accordion, tabs, slider, TOC, breadcrumbs, icon box, counter, pricing toggle, flip box,
blog posts, query loop + filters, collection blocks, contact form, newsletter, comments, share buttons,
mega menu, overlay and language switcher. Each site still needs the blocks below.
**First check `marketing.tsx` and `custom/`**, and only build a block that is really missing.

| Block | For | Notes |
|-------|-----|-------|
| `docs-sidebar` | Docs | Tree nav from a `docs` post type ordered by `parent` + `menuOrder`. Collapsible, current item highlighted, sticky. Uses the current locale |
| `docs-pager` | Docs | Prev / next links from the same ordering |
| `callout` | Docs, Blog | Variants: info / tip / warning / danger, with icon + rich text |
| `steps` | Docs, Agency | Numbered vertical steps |
| `kbd` + `api-table` | Docs | Keyboard keys inline. Table of prop/field / type / default / description |
| `doc-search` | Docs | Cmd-K dialog over `/api/v1/search`, filtered to the docs post type and locale. Works in export through the static search index |
| `portfolio-grid` | Portfolio | Masonry/grid of `projects` entries + category filter chips (reuses `query-filters`), hover reveal |
| `project-meta` | Portfolio | Client, year, role, services, live link (single template) |
| `before-after` | Portfolio, Agency | Image comparison slider |
| `logo-cloud` | Agency | Grayscale client logos, optional marquee |
| `testimonial` / `testimonial-slider` | Agency, Portfolio | Quote, avatar, name, role, rating |
| `team-grid` | Agency | From a `team` post type |
| `stats-band` | Agency | Wrapper around `counter` |
| `author-card` | Blog | Single template: avatar, bio, socials |
| `reading-progress` | Blog, Docs | Top progress bar |

Every block, new or existing, must render correctly in RTL: logical CSS only, sliders and marquees
moving the right way, direction-carrying icons flipped (see 3.6).

For each block: definition in `src/builder/definitions`, renderer in `src/builder/blocks`, entry in
the registry, a sanitize allow-list entry if needed, a style-element map (`el()` keys) so the Kirki
class system styles it, a unit test in `src/builder/__tests__`, and a page in the user guide.

**Done-check:** each block renders in the editor, on the public site **and** in a static export.

---

## Phase 6 — Seed four multi-language demo sites (request 3, data)

### 6.1 Sites
| Site | `slug` | Default | Locales | Post types |
|------|--------|---------|---------|-----------|
| Main (existing) | `main` | en | en, es, fr, de, ja | (unchanged) |
| **Blog**: "Field Notes" | `blog` | en | en, es, ar | posts, categories, tags, authors |
| **Agency**: "Northwind Studio" | `agency` | en | en, es, ar | services, case-studies, team, testimonials |
| **Documentation**: "Meridian Docs" | `docs` | en | en, es, ar | `docs` (hierarchical), `changelog` |
| **Portfolio**: "Ava Lin" | `portfolio` | en | en, es, ar | projects (taxonomy: discipline) |

All four demo sites use the same three locales: **English, Spanish and Arabic (RTL)**. Each site's
`locales` entry gets a `dir` field: `{ code: 'ar', label: 'العربية', dir: 'rtl' }`. Add the optional
`dir?: 'ltr' | 'rtl'` field to the `SiteLocale` type.

Each site gets its own header and footer templates, single/archive/search templates, menus in every
locale, a contact form, SEO settings and site memberships for the four seed users.

### 6.2 Seed code layout
`index.ts` is already 1,088 lines, so split it:
```
src/db/seed/
  index.ts                 # truncate, roles/users, then run each site seeder
  lib/rng.ts               # seeded PRNG (mulberry32) → deterministic "random" content
  lib/site.ts              # createSite(), createMenus(), createTemplates() helpers from today's code
  lib/translate.ts         # per-locale content map + translationGroupId linking
  sites/main.ts            # today's content, moved without changes
  sites/blog/{index.ts, content.ts, generator.ts}
  sites/agency/{index.ts, content.{en,es,ar}.ts}
  sites/docs/{index.ts, tree.ts, content/{en,es,ar}/*.md}
  sites/portfolio/{index.ts, projects.ts}
```
- `pnpm db:seed`: everything. `pnpm db:seed --site=docs`: reseed one site only (delete rows with that
  `site_id`, no full truncate).

### 6.3 Content per site
- **Blog: random posts.** A generator with a fixed seed: 40 posts across 6 categories and 15 tags,
  4 authors, published dates spread over 18 months, featured images from `SEED_IMAGES`, each body
  built from rich text + callout + image + code + quote blocks in random order. 60% of posts get
  translations in every locale and the rest stay English-only, so the "missing translation" paths get
  exercised. Comments on about a third of the posts.
- **Agency.** Home (hero, logo cloud, services, stats band, case studies, testimonials, CTA), About,
  Services (+ 4 service singles), Work (6 case studies), Team, Contact, Careers (job form). Hand-written
  copy in en; es/ar translations kept in the content files.
- **Documentation: our real product docs.** Generated from the code so it stays accurate:
  - **Builder guide:** one page per block (taken from `src/builder/definitions`: name, purpose,
    every field with type and default → `api-table`), plus guides for layout, the style/class system,
    responsive, interactions, templates, header/footer builder, global blocks, collections and query
    loop.
  - **Admin guide:** taken from `src/content/user-guide` (routes, components) plus new pages for
    sites, languages, users/roles/permissions, media, menus, forms & inbox, SEO, redirects, analytics,
    plugins, external API, licenses, export, backup/restore (Phase 1) and site mode.
  - **Developer section:** plugin SDK (`packages/plugin-sdk`), REST API v1 (from the OpenAPI route),
    custom blocks (`src/builder/custom`).
  - `scripts/docs-generate.ts` writes `sites/docs/content/en/*.md`, so the docs can be regenerated
    after features change. Other locales are translated files, with English used where a translation is
    missing.
  - The pages use `docs-sidebar`, `docs-pager`, `toc`, `breadcrumbs`, `doc-search`, `callout`, `code`
    and `tabs` (for pnpm/npm/yarn).
- **Portfolio.** Home (intro + selected work grid), Work (`portfolio-grid` with discipline filter),
  12 project singles (`project-meta`, gallery, before/after, testimonial), About, Contact.

### 6.4 Stitch design prompts
Use them in Google Stitch, one project per site. Export each design to the builder by hand, matching
blocks from Phase 5. Then save the colours and fonts as theme tokens (`DEFAULT_THEME_TOKENS` for each
site) so the seed uses them.

**Shared preamble (paste first in every prompt):**
```
Design a responsive marketing website (desktop 1440 + mobile 390) built ONLY from these section
types so it can be rebuilt in a block builder: header with nav + language switcher (EN / ES / AR
pill dropdown), hero, logo cloud, feature/icon grid, image+text split, stats band, card grid,
testimonial, pricing, accordion FAQ, CTA band, newsletter, contact form, footer with 4 link columns.
Use an 8 px spacing grid, max content width 1200 px, 12-column grid. Give me a design-token sheet:
6 colours (primary, primary-foreground, surface, surface-muted, text, text-muted), 2 font families,
type scale (display, h1–h4, body, small), radius scale, shadow scale. Design light and dark mode.
All copy must be realistic, no lorem ipsum. Text must fit when translated (allow 30% longer strings).
Also deliver an Arabic RTL version of the home page and one inner page: mirrored layout, Arabic
copy, an Arabic-capable font pairing (e.g. IBM Plex Sans Arabic / Noto Kufi Arabic), icons with
direction (arrows, chevrons) flipped, numbers and code blocks kept LTR.
```

**Blog: "Field Notes"**
```
[preamble] A calm editorial blog about building on the web. Pages: Home (featured post hero, latest
posts grid 3-up with category chip, reading time, author avatar; popular tags; newsletter band),
Category archive (title, description, filter chips, paginated list), Single post (title, meta row,
cover image, 720 px reading column, inline callout, code block, pull quote, author card, share
buttons, related posts, comments), Author page, Search results. Mood: warm off-white #FAF8F5,
ink #1B1B1F, accent terracotta #C8553D. Serif headlines (Fraunces-like) + sans body (Inter-like).
Generous whitespace, thin dividers, top reading-progress bar.
```

**Agency: "Northwind Studio"**
```
[preamble] A bold digital product agency. Pages: Home (full-bleed hero with oversized headline and
showreel thumbnail, client logo marquee, 4 services with icons, stats band "120+ launches / 14
countries / 9 years", case-study cards with hover reveal, testimonial slider, team teaser, big CTA),
Services detail, Case study (hero image, challenge/approach/result, before-after slider, metrics,
next project), Team grid, Careers with open roles list + application form, Contact (form + map +
office cards). Mood: near-black #0E0F12 sections alternating with white, electric lime #C6F432
accent, grotesk display font (Space Grotesk-like), tight tracking, large radius cards (24 px).
```

**Documentation: "Meridian Docs"**
```
[preamble, but replace the section list with:] a documentation site. Layout: top bar (logo,
version dropdown, Cmd-K search field, language switcher, GitHub link, theme toggle); left sidebar
tree navigation with collapsible groups (Getting started / Builder / Blocks / Admin / Developers /
Changelog); centre article column (breadcrumbs, H1, lead paragraph, headings, code blocks with
copy button and pnpm/npm/yarn tabs, callouts info/tip/warning/danger, steps, props table, keyboard
keys, images with captions); right "On this page" table of contents; footer with prev/next cards
and "Edit this page". Also: docs landing page (hero search, 6 category cards, popular guides),
search dialog, 404. Mood: clean and technical, white + slate #0F172A, indigo #3B3FD8 accent,
Inter + JetBrains Mono, 14–16 px UI text, dense but readable.
```

**Portfolio: "Ava Lin"**
```
[preamble] A personal portfolio for a product designer & art director. Pages: Home (big name
statement, short bio, selected work in an asymmetric masonry grid with hover title + discipline),
Work (filter chips: Branding / Product / Motion / Editorial, grid), Project detail (full-width
cover, project meta sidebar: client, year, role, services, live link; long-form image story with
captions, before/after, testimonial, next project), About (portrait, story, experience timeline,
clients list, awards), Contact (simple form + socials). Mood: gallery-white #FFFFFF, graphite
#18181B, one accent colour per project, editorial serif display + mono captions, lots of negative
space, subtle page-transition feel.
```

### 6.5 Done-check
- [ ] `pnpm db:seed` finishes in under 60 s and is deterministic: two runs give the same slugs and text.
- [ ] `/blog`, `/agency`, `/docs` and `/portfolio` and every `/{site}/{locale}/…` page render. The
  language switcher moves between translations, and a missing translation falls back as configured.
- [ ] In the admin, switching sites + `/dashboard/{locale}/…` shows the right content for each site.
- [ ] `tests/e2e/demo-sites.spec.ts` smoke-tests the home page, a single item and the contact form on
  each site in each locale.
- [ ] Every `/{site}/ar/…` page renders with `<html lang="ar" dir="rtl">`, a mirrored header and
  footer, and the Arabic font.

---

## Phase 7 — Exported sites keep live forms (request 6)

**Goal.** The exported site is fully static: pages, posts, menus, search index and media are
generated at export time. Only **forms** call back to the CMS and store their data in its database.

### 7.1 What counts as a form
Contact form, newsletter, comments (submit + reactions), privacy request, consent log, view beacon
(optional analytics). Search stays static (prebuilt JSON index).

### 7.2 CMS side: public form API
- Setting **Export → "CMS endpoint URL"** (`siteSettings.exportApiBase`, default `NEXT_PUBLIC_BASE_URL`).
- Endpoints that accept cross-origin requests: `POST /api/forms/submit`, `/api/comments`,
  `/api/comments/react`, `/api/privacy`, `/api/consent`, `/api/analytics` (beacon).
  - **CORS.** Allow-list = the site's `primaryHost` + `extraDomains` + an "Allowed export origins" list
    in settings. Handle the `OPTIONS` preflight. No credentials.
  - **Site identity.** Every request carries `x-cms-site` (the site id), which is checked against the
    `Origin` allow-list. There is no session.
  - **Abuse protection.** The existing honeypot + per-IP rate limit in `formsService`, plus an optional
    Turnstile/hCaptcha site key from settings (the exported page loads the widget). Leave the size
    limit as it is (`MAX_BODY_BYTES`).
  - **Uploads.** Unchanged (multipart to the same endpoint). Files go to the configured storage.
- Shared helper `src/server/lib/public-cors.ts` used by all of these routes.

### 7.3 Export side
- `export-site.service.ts` writes `window.__CMS__ = { api: '<exportApiBase>', site: '<siteId>',
  locale }` into the exported layout.
- `contact-form-client.tsx`, `newsletter.tsx`, `comments-client.tsx`, `privacy-request-client.tsx`
  and the consent banner use `cmsApi(path)`, which returns `__CMS__.api + path` when set and the
  relative path otherwise. In the live CMS nothing changes.
- An `actionUrl` set on the block (Formspree etc.) still wins over the CMS endpoint.
- Comments in the export: the list is baked into the HTML. New comments go to moderation as they do
  today, and appear after the next export. Optionally a client fetch of `/api/comments/state` can show
  approved comments without re-exporting.
- Replace `EXTERNAL_URL_NOTICE` with a notice explaining the CMS endpoint, plus a check at export
  time: warn when `exportApiBase` is `localhost`, or when the export domain is missing from the CORS
  list.
- Checkout and payments stay external, as they are today.

### 7.4 Tests
- Unit: `public-cors` allow/deny, preflight, an `x-cms-site` that doesn't match the origin is rejected.
- E2E: export `agency` → serve `export/site` on port 4010 → submit the contact form → the entry shows
  up in `/dashboard/contact-forms/inbox`, and a post from an origin not on the list is refused.

### 7.5 Done-check
- [ ] An exported site makes **no** network calls except to its own static files, the CMS form
  endpoints, and the configured media/CDN. You can check this in the Playwright network log.

---

## Phase 8 — Hardening & docs
- Permissions: new admin actions (create translation, branding settings, export origins) need entries
  in `PERMISSION_MATRIX` **and a grant migration** (the matrix seeds only fresh installs).
- Migrations: new columns (`users.ui_locale`, `site_settings.export_api_base`,
  `site_settings.export_allowed_origins`) go into `db:generate` SQL, applied locally with `psql`
  (`db:migrate` is broken locally).
- Update `README.md` with: locale URLs, `db:download`/`db:restore`, the demo sites, branding config and
  export forms. Regenerate the Docs site content (Phase 6 `docs-generate`) so the product documents
  itself.
- Full checks: `pnpm test`, `pnpm test:unit`, `pnpm lint`, `pnpm check`, `tsc --noEmit`, `pnpm test:e2e`.

---

## Order & dependencies

```
P1 DB tools ─┐
P4 Branding ─┼─(independent, can run in parallel)
P2 Locale URLs ──► P3 Admin i18n (uses adminHref + locale provider)
P5 Blocks ──► P6 Demo seed (uses blocks, brand name, locale URLs)
P6 ──► P7 Export forms (E2E uses the agency site)
all ──► P8
```

Rough size: P1 S · P2 M · P3 XL (the biggest: string conversion across about 200 files plus the RTL
audit) · P4 S ·
P5 M–L · P6 L · P7 M · P8 S.

## Decisions (confirmed 2026-11-14)
1. **Admin URL**: proxy rewrite; the default locale has no prefix (`/dashboard/pages`), other locales
   do (`/dashboard/es/pages`).
2. **UI language**: the user's own Account setting; when unset, it follows the URL's content locale.
3. **Brand name**: **Meridian**.
4. **Locales**: **English (`en`), Spanish (`es`) and Arabic (`ar`, RTL)** for the admin UI and all
   four demo sites. RTL is in scope (Phase 3.6). The existing `main` site keeps its current locales.
