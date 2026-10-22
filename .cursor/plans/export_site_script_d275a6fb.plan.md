---
name: Export site script
overview: Add the missing `scripts/export-site.ts` so `pnpm export:site` snapshots published content and media into a standalone Next app at `export/site` and zips it.
todos:
  - id: write-script
    content: "Add scripts/export-site.ts: snapshot pages, posts, menus, settings, catalog, and filter options; copy the template and renderer; rewrite media; zip export/site."
    status: pending
  - id: verify-export
    content: Run pnpm export:site, then install and build export/site and spot-check home, a page, a post, and a filtered blog list.
    status: pending
isProject: false
---

# Fix `pnpm export:site`

`package.json` runs `tsx --conditions=react-server scripts/export-site.ts`, and [`src/app/api/export-site/route.ts`](src/app/api/export-site/route.ts) shells out to the same command. The file does not exist, which is the `ERR_MODULE_NOT_FOUND` in the terminal. The rest of the feature is already in the repo: [`export-template/`](export-template/), the database-free render map in [`src/builder/render.tsx`](src/builder/render.tsx), and `export/` in [`.gitignore`](.gitignore).

## Script behavior

Add [`scripts/export-site.ts`](scripts/export-site.ts). It loads the CMS the same way the seed does (`import { db } from '@/db'`, which pulls in `dotenv/config`) and writes `export/site` plus `export/site.zip`.

1. **Snapshot content** into `export-template`’s JSON shapes in [`export-template/src/lib/content.ts`](export-template/src/lib/content.ts):
   - Published, public pages via [`publicSiteService`](src/server/services/public-site.service.ts) (`listPublishedForSitemap` + `getPublished`). Paths from [`PAGES.SITE.page`](src/config/pages.ts). Builder pages are passed through Puck `resolveAllData(content, builderConfig, { themeTokens, searchParams: {}, language })` so `GlobalRef` is expanded before JSON is written. `BlogPosts` props are left for the template’s `hydrateBlogBlocks` (it overwrites them from the catalog). Rich text is stored as sanitized HTML.
   - Published posts via [`blogService.getPublished`](src/server/services/blog.service.ts) and `layoutFor`, then `resolveAllData` with `postBuilderConfig` so `RelatedPosts` is baked once. Full card list by paging `blogService.list` (page size 48) into `post-catalog.json`. `blogService.taxonomy()` into `filter-options.json`.
   - Settings from [`siteSettingsService.get`](src/server/services/site-settings.service.ts) and header/footer menus from `publicSiteService.getMenusById`, slimmed to `{ id, title, items }` with `{ id, label, url, target, badge, children }`.

2. **Copy the app.** Replace `export/site` with a copy of [`export-template/`](export-template/) (skip `node_modules` and `.next`), then copy the database-free renderer into `export/site/src/builder`: `render.tsx`, `sanitize.ts`, `motion.tsx`, `style.ts`, `animation-catalog.ts`, `data.ts`, `post-template.ts`, `icons.tsx`, `site.css`, `hover.css`, and `blocks/`. Do not copy `config.tsx`, `controls/`, `fields/`, or `schema.ts`. Patch the copied `theme.ts` so it imports `DEFAULT_THEME_TOKENS` from [`export-template/src/builder/theme-tokens.ts`](export-template/src/builder/theme-tokens.ts) instead of `@/db/schemas/pages.schema`. When `settings.robotsTxt` is non-empty, remove the copied `src/app/robots.ts` and write that text to `public/robots.txt`.

3. **Media.** Walk settings and content for `/media/...` paths and absolute `http(s)` URLs. Copy local files from `MEDIA_LOCAL_DIR` (via [`storage().read`](src/server/storage/index.ts)) into `export/site/public/media`. Download remote URLs into that folder and rewrite them in the JSON. URLs that fail stay remote and are listed in `export/site/export-report.json`.

4. **Zip** `export/site` to `export/site.zip` with `archiver` (source and media only).

## Check

Run `pnpm export:site` against the current database, then `pnpm install && pnpm build` inside `export/site`, and open the home page, a builder page, a blog post, and a blog list with a filter. Confirm the zip exists and the CMS dashboard is not in the export.
