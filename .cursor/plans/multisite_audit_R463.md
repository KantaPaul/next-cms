# R463 — Multisite behavior audit (P3-09)

Static audit of every admin, public, preview, API, and background path that touches
site-scoped data. Performed before any fixes (per plan: audit first, then harden).
No running DB/browser in this environment, so "reproduction" is code-level: each
finding lists the exact query/write that crosses site boundaries and the request
path that reaches it.

## Architecture recap

- `src/server/services/site-context.ts` is the resolver: `normalizeHost`,
  `matchHost` (primary_host + extra_domains), `siteForHost`, `publicSite()`
  (host → preview session → admin cookie → `default` fallback), `adminSiteId()`
  (cookie if member → first membership → `default`), `memberships()`.
- `SITE_COOKIE = 'cms_site'`; `switchSite` validates membership before setting it.
- `access.service.getUserAccess` resolves the role from `site_memberships` for the
  active site, falling back to the global `users.roleId` when there is no
  membership row (plus `assignDefaultRole` first-user bootstrap).
- Site-owned tables: sites, site_memberships, site_settings, pages, pageContents,
  pageRevisions, pageTemplates, pageCategories/Tags, posts*, menus, menuItems,
  media, categories, tags, collections, collectionFields, collectionEntries,
  globalBlocks, videos, videoPlaylists, videoProgress, pageViews, analyticsDashboards,
  formSubmissions, redirects, apiKeys, webhookSubscriptions, searchDocuments,
  previewTokens, editorLocks, pageExperiments.
- Proxy (`src/proxy.ts`) forwards `x-cms-host` for public pages; API routes read
  `host` directly. `publicSite()` prefers `x-cms-host` → `x-forwarded-host` → `host`.

## What is already site-correct

- v1 API (`src/server/api/v1.ts`): API key must belong to the host-resolved site
  (`apiKey.siteId !== site.id` → 401); rate limits, scopes, CORS per key.
- `content-api.service.ts`, `blog.service.ts` (public), `public-site.service.ts`,
  `locale-switcher.ts`, `sitemap.ts`: all scoped via `siteContext.publicSite()`.
- `search.service.ts`: index rows carry `page.siteId`/`post.siteId`; `search` filters
  by `publicSite().id`.
- `analytics.service.recordView`: validates the page/post belongs to the resolved
  site before recording; `analytics-boards.service` fully scoped.
- `forms.service`: submissions scoped on submit, list, get, markRead, archive, CSV.
- `redirects.service.find`: scoped by `publicSite()` (proxy lookup is site-aware).
- `api-keys.service`: list/create/revoke/verify all site-scoped.
- `menus`, `media` (list/folders/upload/remove/getById), `taxonomy`, `templates`
  (page templates + global blocks), `collections` (collection + entry CRUD),
  `post-templates` (most ops), `sites.service`, `site-settings.service`,
  `webhook.service.deliver`, `review.service.list`: scoped via `adminSiteId()`.
- Pages/posts list, update, publish, delete, revision flows go through
  `getPageOrThrow`/`alive()` (site-scoped). `duplicate`/`createTranslation` inherit
  the site-validated source's `siteId` — they are NOT cross-site holes.

## Confirmed cross-site defects

### A. Unscoped admin reads/writes (fix in R466)

1. **pages.getById / posts.getById** — `pages.service.ts:354-364`,
   `posts.service.ts:373-383`: `findFirst` by id only (`isNull(deletedAt)`), no
   `siteId`. Any dashboard user can read another site's page/post incl. draft and
   published content by guessing/knowing the id. The edit routes serve this directly.
2. **videos module — every mutation is unscoped** (`videos.service.ts`):
   - `videoService.update` (399-447): fetch + update by id only; also accepts an
     arbitrary `playlistId` (no ownership check) so a video can be attached to
     another site's playlist.
   - `videoLifecycle.publish/unpublish/softDelete/reorder` (608-695): by id only.
   - `playlistService.update/remove` (172-240): by id only.
   - `videoService.create` (351-366): `input.playlistId` never validated against
     the current site.
3. **page-experiment actions** (`page-experiment.actions.ts:26-34, 92-96, 141-144`):
   page lookup by id only — start/pick-winner/end an A/B experiment on another
   site's published page (winner write also inserts `pageContents`).
4. **menus.saveItems** (`menus.service.ts:136-141`): ownership check inside the
   transaction matches `menus.id` only — items can be written into another site's
   menu.
5. **media.update** (`media.service.ts:192-202`): update by id without siteId
   (title/alt/folder of another site's file).
6. **post-templates.update / saveDraft** (`post-templates.service.ts:216-224,
   237-241`): update by id only (create/duplicate/publish/setDefault/delete are
   scoped via `getRowOrThrow`).
7. **collections.updateField / deleteField** (`collections.service.ts:405-423,
   444-453`): field rows fetched by id only — no join back to a site-scoped
   collection.
8. **reviewService.requestChanges** (`review.service.ts:108-112`): update by
   `id + status='review'` without siteId — another site's review item can be
   bounced to draft.
9. **editor-lock service** (`editor-lock.service.ts:34-49, 82-98, 121-137,
   148-156`): lock lookups/writes keyed by `targetType+targetId` only; `siteId` is
   written but never checked. Low severity (ids are cuids) but site-blind.

### B. Cross-site write side effects

10. **clearOtherHomePages / clearOtherBlogIndexPages** (`pages.service.ts:202-234`):
    no `siteId` in the WHERE — making a page home/blog-index clears the flag for
    that language across **all** sites. (posts.service has the same helper.)
11. **pages.create template lookup** (`pages.service.ts:409-413`): `pageTemplates`
    fetched by id without siteId — a page on site A can be seeded from site B's
    template.
12. Minor: `taxonomyService.saveCategory` cycle check loads all categories across
    sites (`taxonomy.service.ts:98-100`); `templatesService.globalBlockUsage`
    (`templates.service.ts:180-197`) and `postTemplatesService.list` usage counts
    (`post-templates.service.ts:111-116`) aggregate across all sites.

### C. Background jobs / scheduled publishing (worst finding)

13. **Scheduled publishing never runs without a dashboard session.**
    `publishDueScheduled` (`pages.service.ts:1019-1050`, `posts.service.ts:961-992`)
    filters with `alive()` → `adminSiteId()` → `getCurrentUserAndTeamId`
    (`auth-utils.ts:45-50`) which calls `redirect(LOGIN)` when there is no session.
    So `/api/cron/publish` (`cron/publish/route.ts:24-27`, no try/catch) throws
    NEXT_REDIRECT on every run, and the traffic-triggered `maybePublishScheduled`
    (`scheduler.ts:14-26`) swallows the same error for anonymous visitors.
    Even when it does run (dashboard session present), it publishes only the
    cookie-selected site — other sites' due content stays scheduled.
14. **Unknown-host fallback serves the `default` site** (`site-context.ts:152-155,
    61-64`): any unassigned domain gets default-site pages, menus, redirects,
    search, settings. Needs an explicit policy (R465).
15. **Videos dashboard page hardcodes the default site** (`videos/page.tsx:19`):
    `playlistService.list('default')` ignores the selected site (the action
    `listPlaylists` is correctly scoped; the page is not).
16. **`revalidatePublicSite()`** (`revalidate-site.ts:5-10`) purges `'/'` layout
    globally — site-blind invalidation. Safe (no leak) but broad; site-aware
    cache tags belong to R468.
17. Caller-supplied `siteId` overrides exist on `mediaService.list/upload`
    (`media.service.ts:63,154`) and `videoService.list` (`videos.service.ts:247`).
    Current callers pass `adminSiteId()` or omit it, but the override is a
    foot-gun — remove or assert it matches the resolved site in R466.

### D. Membership / role model risks (R467, ties to R264)

18. `adminSiteId` falls back to first membership or `default`
    (`site-context.ts:191-196`); `accessService.getUserAccess` falls back to the
    global `users.roleId` when the user has no membership row
    (`access.service.ts:79-100`). A user whose memberships are all deleted keeps
    global-role access to the `default` site. `assignDefaultRole` makes the first
    user a global Admin.
19. `inviteStaff` writes both a global `users.roleId` and a site membership
    (`staff-auth.service.ts:247-255`), perpetuating the fallback.

## Reproducible failing cases (to automate in R469)

1. Member of site A opens `/dashboard/pages/edit/<pageId-of-site-B>` → page loads
   (getById unscoped). Expect: 404/403.
2. Member of site A calls video publish/unpublish/softDelete/reorder/update with a
   site-B video id → mutation succeeds. Expect: 404.
3. Member of site A starts an experiment with a site-B pageId → succeeds. Expect 404.
4. Site A publishes its home page → `isHome` is cleared on site B's home page in
   the same language. Expect: only site A affected.
5. `curl /api/cron/publish` with `Authorization: Bearer $CRON_SECRET` and no
   session → redirect/500, zero publishes; scheduled content on site B never goes
   live. Expect: publishes due content for all sites.
6. Request site-B domain with a path that only site A defined a redirect for →
   no redirect (correct), but request any *unknown* domain → serves site
   `default` content. Policy decision needed (R465).
7. Member of site A opens the Videos dashboard while site B is selected →
   playlists shown are site `default`'s, not site B's.

## Suggested fix mapping

- R464/R465: canonical site context + host policy (findings 14, 17).
- R466: site isolation across CRUD/jobs (findings 1-13, 15) — add a shared
  site-scoped guard helper so every id-based lookup joins back to the site.
- R467: membership semantics + global-role fallback (findings 18-19).
- R468: site-aware revalidation/cache (finding 16).
- R469: the repro cases above as tests.
