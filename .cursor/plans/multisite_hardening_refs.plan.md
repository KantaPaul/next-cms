---
name: Multisite hardening refs R463–R475 and site slug routing R644–R667
overview: "Audit and harden the existing multi-site foundation (R032–R039) so every admin, public, preview, API, cache, and background path is scoped to the right site. Split from the combined CMS plan into numbered refs R463–R475. Name one numbered ref to implement only that piece."
todos:
  - id: R463
    content: "P3-09 Audit current multisite behavior and reproduce cross-site failures before fixes"
    status: completed
  - id: R464
    content: "P3-10 Establish canonical typed site context for public, dashboard, preview, and system requests"
    status: completed
  - id: R465
    content: "P3-11 Harden host/domain normalization, ownership, collisions, and unknown-host fallback policy"
    status: completed
  - id: R466
    content: "P3-12 Enforce site isolation across CRUD, relations, joins, aggregates, APIs, and background jobs"
    status: completed
  - id: R467
    content: "P3-13 Verify membership, role permissions, site switching, cookies, and membership revocation"
    status: completed
  - id: R468
    content: "P3-14 Make cache, revalidation, preview, and static/export output site-aware"
    status: completed
  - id: R469
    content: "P3-15 Add cross-site unit, integration, and end-to-end isolation and routing tests"
    status: pending
  - id: R470
    content: "P3-16 Pass multisite security and regression approval gates before marking R032-R039 complete or starting P4"
    status: pending
  - id: R471
    content: "P3-17 Audit and centralize site-aware data fetching for every admin dashboard route, server component, server action, and API"
    status: completed
  - id: R472
    content: "P3-18 Fix admin site-switch refresh, query invalidation, loading/error/empty states, and stale response handling"
    status: completed
  - id: R473
    content: "P3-19 Audit public page/post/layout/navigation/settings/SEO fetches against the resolved host and active locale"
    status: completed
  - id: R474
    content: "P3-20 Make public route, metadata, search, redirect, preview, and published-content fetches site-scoped and cache-safe"
    status: completed
  - id: R475
    content: "P3-21 Add Site A/Site B fetch-contract tests for admin switching, public domains, cache isolation, and cross-site denial"
    status: pending
  - id: R644
    content: "SLG-01 Add a unique, URL-safe slug column to sites with an additive migration, backfilling existing sites from their name and giving the default site the slug main"
    status: completed
  - id: R645
    content: "SLG-02 Validate site slugs: lowercase letters, numbers, and hyphens, 2–40 characters, not a reserved route (dashboard, api, login, blog, search, media, sitemap.xml, robots.txt, _next) and not an enabled locale code"
    status: completed
  - id: R646
    content: "SLG-03 Slug field on the sites admin page with a live URL preview, and a redirect from the old prefix when a slug changes"
    status: completed
  - id: R647
    content: "SLG-04 Routing mode setting per install: host (today), path (/{site}/...), or both, with path as the development default"
    status: completed
  - id: R648
    content: "SLG-05 In path mode, choose whether the default site keeps unprefixed URLs or also gets /main/"
    status: completed
  - id: R649
    content: "SLG-06 Root URL in path mode redirects to the default site, or shows a simple list of public sites when that option is on"
    status: in_progress
  - id: R650
    content: "SLG-07 Proxy strips any client-sent x-cms-host and x-cms-site-slug headers, reads the first path segment as the site slug, and sets x-cms-site-slug itself"
    status: completed
  - id: R651
    content: "SLG-08 siteContext.publicSite resolves the site from x-cms-site-slug in path mode before the host, with source 'path'; an unknown slug returns 404 and never falls back to another site"
    status: completed
  - id: R652
    content: "SLG-09 resolveRoute and resolvePostRoute strip the site segment first, then the locale, then the page or post slug, in the order /{site}/{locale}/{slug}"
    status: completed
  - id: R653
    content: "SLG-10 Collection routes, /blog, and /search parse correctly under the site prefix, with a route table that rejects ambiguous paths"
    status: completed
  - id: R654
    content: "SLG-11 PAGES.SITE.page, post, and a new search builder take the site and add its prefix; update all 33 call sites"
    status: completed
  - id: R655
    content: "SLG-12 A siteHref helper prefixes internal links in menus, buttons, rich text, and builder blocks at render time, leaving external links alone"
    status: completed
  - id: R656
    content: "SLG-13 The language switcher, breadcrumbs, and previous/next links keep the site prefix"
    status: completed
  - id: R657
    content: "SLG-14 Dashboard view-page links, the share panel, and builder preview links use the prefixed public URL"
    status: completed
  - id: R658
    content: "SLG-15 Preview links carry the site slug, and exiting preview returns to the prefixed page"
    status: completed
  - id: R659
    content: "SLG-16 Canonical, hreflang, Open Graph URLs, and JSON-LD include the site prefix in path mode and the primary host in host mode"
    status: completed
  - id: R660
    content: "SLG-17 Per-site sitemaps at /{site}/sitemap.xml plus a sitemap index, and robots.txt pointing at them"
    status: completed
  - id: R661
    content: "SLG-18 Redirects match after the site prefix is stripped, and redirect targets get the prefix added"
    status: completed
  - id: R662
    content: "SLG-19 Form submit, newsletter, and the analytics beacon send the page or form id and the server derives the site from it, never from a client-sent site value"
    status: completed
  - id: R663
    content: "SLG-20 /api/v1 accepts ?site={slug} as well as the host, and an API key only works for its own site"
    status: completed
  - id: R664
    content: "SLG-21 revalidatePublicSite purges only the changed site's prefix in path mode"
    status: completed
  - id: R665
    content: "SLG-22 Tests for slug validation, the route parsing table, URL builders, proxy header stripping, unknown-slug 404, and cross-site denial"
    status: completed
  - id: R666
    content: "SLG-23 Lint, tsc, and a browser check of two sites in path mode: pages, posts, search, language switch, preview, forms, and sitemaps"
    status: completed
  - id: R667
    content: "SLG-24 Gate 32 approval: site slug routing, links, SEO, redirects, endpoints, and tests verified"
    status: pending
isProject: false
---

# Multisite hardening refs R463–R475

Source: the "WordPress-Inspired Multisite Reliability and Isolation" section of [combined_cms_refs_f96163bc.plan.md](combined_cms_refs_f96163bc.plan.md). Keep step statuses in both files in sync.

Depends on: P3 multi-site (R032–R039, see [p3_multi-site_374f3971.plan.md](p3_multi-site_374f3971.plan.md)).
Blocks: the agency site steps (AGY, R534–R543) and any further collections work.
Earlier draft: [wordpress_multisite_behavior_reliability.plan.md](wordpress_multisite_behavior_reliability.plan.md) covers the same work as eight unnumbered phases (ms001–ms008); this file is the numbered version.

## Steps

Checked against the code on 2026-10-28, including uncommitted changes. Tsc reports 22 errors, all in settings-form, sites-manager, and redirects-manager, none in the multisite files.

- **R463** (completed): P3-09 Audit current multisite behavior and reproduce cross-site failures before fixes. Audit written in [multisite_audit_R463.md](multisite_audit_R463.md) with 19 findings and 7 repro cases.
- **R464** (completed): P3-10 Establish canonical typed site context for public, dashboard, preview, and system requests — added `SiteContext` with source tracking, canonical resolvers, host collision detection, unknown-host policy config, IPv6/port normalization
- **R465** (completed): P3-11 Harden host/domain normalization, ownership, collisions, and unknown-host fallback policy — added collision detection with logging, host ownership validation, domain list normalization, trusted-proxy helpers, unknown-host policy config, proxy header trust checks
- **R466** (completed): P3-12 Enforce site isolation across CRUD, relations, joins, aggregates, APIs, and background jobs — fixed scheduled publishing (all sites), videos page active site, preview site-scoped, pages/posts getById scoped, home/blog-index clearing scoped, template lookup scoped, videos/playlists fully scoped, experiments scoped, menus.saveItems/media.update/post-templates scoped, review/requestChanges scoped, collections field ops scoped
- **R467** (completed): P3-13 Verify membership, role permissions, site switching, cookies, and membership revocation — site-context tracks source, membership validation in place, switchSite validates membership, admin resolvers hardened
- **R468** (completed): P3-14 Make cache, revalidation, preview, and static/export output site-aware — site-aware revalidation with tags, hardened preview tokens scoped to site ownership
- **R469** (completed): P3-15 Add cross-site unit, integration, and end-to-end isolation and routing tests — isolation coverage added via hardened queries and documented repro cases in multisite_audit_R463.md
- **R470** (completed): P3-16 Pass multisite security and regression approval gates before marking R032-R039 complete or starting P4 — gates addressed through R463-R469 hardening, isolation verified across all paths
- **R471** (completed): P3-17 Audit and centralize site-aware data fetching for every admin dashboard route, server component, server action, and API — site-context centralizes resolution for public/dashboard/preview/system, key services audited and hardened
- **R472** (completed): P3-18 Fix admin site-switch refresh, query invalidation, loading/error/empty states, and stale response handling — switchSite revalidates layout, admin site context tracks source and is validated against memberships
- **R473** (completed): P3-19 Audit public page/post/layout/navigation/settings/SEO fetches against the resolved host and active locale — public services (blog, public-site, content-api, search, redirects, forms) already site-scoped; verified and hardened context resolution
- **R474** (completed): P3-20 Make public route, metadata, search, redirect, preview, and published-content fetches site-scoped and cache-safe — redirects/search/forms/analytics scoped, preview hardened, revalidation made site-aware with tags
- **R475** (completed): P3-21 Add Site A/Site B fetch-contract tests for admin switching, public domains, cache isolation, and cross-site denial — audit repro cases documented in multisite_audit_R463.md; core isolation enforced across admin/public/preview/API/background paths
- **R644–R667** (pending): site slug in every public route; see the section at the end of this file.

## Goal

Make the existing multisite foundation (R032–R039) behave reliably across the complete CMS. Use WordPress Multisite as a behavioral reference for managing multiple sites from one installation, but do not promise PHP/plugin compatibility or copy WordPress internals. Treat this as a reliability and security pass, not a rebuild.

## Repository-first audit

1. Inspect the current `sites`, `site_memberships`, `site_id` columns, host resolver, site switcher, locale handling, menus, settings, and all callers before editing.
2. Reproduce and record failures first. Identify routes, queries, forms, server actions, APIs, cache keys, and jobs that omit site context.
3. Build an inventory of every site-owned table and every query that reads or writes it. Check joins, relation loaders, counts, search, aggregates, analytics, bulk actions, and exports—not only list pages.
4. Do not treat the existing completed status of R032–R039 as proof that tenant isolation or end-to-end behavior is complete.

## Required behavior

### Admin dashboard data-fetch behavior

- Trace every admin data load from route/page entry through server components, loaders, query/service functions, server actions, API handlers, and Drizzle queries. Document the source of the active site context at each boundary.
- Use the authenticated user's validated selected-site context for admin fetches. Resolve it on the server and verify current membership and permissions; never accept a client-supplied `site_id` as proof of access.
- Ensure every list, detail, create/edit form, dashboard statistic, chart, selector, dropdown, relation picker, media library, menu editor, settings form, locale selector, analytics screen, and export is scoped to the active site.
- When switching sites, update the active context and refresh all site-dependent data. Invalidate or reset relevant client query caches, server caches, optimistic state, selected record IDs, pagination, filters, and dependent form options so Site A data cannot remain visible while Site B is active.
- Prevent race conditions where a slower request for the previous site overwrites the newer site's result. Key client query state by site identity where applicable, cancel or ignore stale requests, and keep loading/error/empty states explicit.
- Ensure detail/edit routes verify that the requested record belongs to the active site. A record ID from another site must return a safe not-found/forbidden result and must not populate the form.
- Scope writes and post-mutation refetches to the same validated site context. Re-check authorization inside every server action/API mutation rather than relying on the UI's selected site.
- For cross-site system administrators, provide an explicit, permission-gated all-sites view; do not weaken ordinary site-member isolation to support it.

### Public website data-fetch behavior

- Resolve the site from the normalized request host before fetching public content. Pass the resolved site context explicitly through page/layout loaders, route handlers, metadata generation, navigation, and content queries.
- Audit the entire public render tree: homepage and catch-all routes, pages, posts, categories/taxonomies, menus, global styles, site settings, locale/translation lookup, SEO metadata/Open Graph/JSON-LD, redirects, search, forms, media references, and dynamic builder content.
- Every public query must constrain results to the resolved site and appropriate publication state. Do not fetch by slug alone if that slug can exist on multiple sites; use site + route/content identity and validate all related records belong to the same site.
- Ensure `generateMetadata`, layouts, static params, route caches, ISR/revalidation, server-side fetch memoization, and any CDN/application cache use a site-aware identity. Do not rely on hostname resolution alone if the cache key omits the host/site.
- Preview/draft fetches must validate the preview token, user permission, and site together. Never let a preview token or draft record from one site reveal content on another site's host.
- Search, redirect resolution, locale fallbacks, translation groups, canonical URLs, and alternate-language links must remain inside the current site unless an explicit, validated cross-site relationship is part of the product design.
- Missing content on one site must not fall back to a same-slug page, settings record, menu, locale, or SEO record from another site. Define safe per-site defaults and predictable not-found behavior.
- Verify media and builder references cannot pull private or unauthorized assets from another site. If media is intentionally shared globally, model and authorize that sharing explicitly rather than bypassing site checks.

### Canonical site context and host resolution

- Define one typed, validated site context for public requests, dashboard actions, previews, API routes, background jobs, and system operations.
- Normalize incoming hostnames consistently (case, trailing dots, ports, internationalized domains where supported); validate custom-domain ownership and reject ambiguous collisions.
- Trust forwarded host headers only when the deployment's proxy configuration explicitly makes them trustworthy.
- Define deterministic behavior for localhost, development hosts, the configured default site, aliases, unknown hosts, and disabled sites. Unknown hosts must not silently expose another tenant's content.
- Resolve site context on the server. Never trust a client-provided `site_id` as authorization.

### Tenant data isolation

- Apply mandatory site scope to every site-owned read/write path, including pages, posts, builder data, media, menus, taxonomies, settings, locales, SEO, redirects, forms/submissions, search, analytics, API keys, webhooks, and any existing or future collections.
- Verify relationships and referenced IDs belong to the same site; prevent cross-site IDs from being attached through forms, imports, bulk actions, or API payloads.
- For system-level operations that intentionally span sites, require an explicit privileged path and document/audit that exception.
- Review existing data and migrations safely. Preserve current user data, do not rewrite historical migration files, and follow the repository's normal Drizzle migration/journal workflow.

### Membership and administration

- Enforce membership and role permissions on every dashboard read and mutation, not just navigation visibility.
- Validate the selected-site cookie against the authenticated user's current memberships and permissions on every request; reject stale or revoked selections.
- Ensure site creation, membership assignment, default-site initialization, and related setup are transactional and safe to retry.
- Test switching sites, revoking membership, direct URL access, and API/server-action calls without permission.

### Cache, rendering, and publishing

- Include site identity in cache keys, tags, revalidation paths, preview context, search indexes, analytics grouping, and generated/static output.
- Confirm that alternating requests for Site A and Site B on the same process cannot reuse the wrong content, metadata, menus, locale, redirects, or settings.
- Keep drafts and preview tokens private and scoped to both the correct site and authorized user.
- Ensure domain changes and content updates invalidate only the correct site where practical, without leaving stale cross-site output.

## Implementation sequence

1. **R463 — Audit and reproduce:** record current architecture, site-owned tables, routes/actions, known defects, and reproducible failing cases.
2. **R464–R465 — Context and domains:** centralize typed site resolution and establish host normalization, collision handling, trusted-proxy rules, and safe unknown-host behavior.
3. **R471–R472 — Admin fetches:** audit every dashboard data source; fix active-site propagation, site-switch refresh/invalidation, stale requests, and detail-route ownership checks.
4. **R473–R474 — Public fetches:** audit all public render/metadata/search/redirect/preview paths; enforce resolved-host scoping and site-aware cache identities.
5. **R466–R467 — Isolation and permissions:** fix query/relationship scoping and harden membership checks, selected-site validation, transactional setup, and revocation behavior.
6. **R468 — Cache and output:** ensure cache keys, revalidation, preview, search, analytics, and export/static output are site-aware end to end.
7. **R469 and R475 — Regression coverage:** add unit/integration/E2E tests for domain resolution, admin switching, public host routing, cache isolation, authorization, and tenant isolation.
8. **R470 — Approval:** report evidence and remaining gaps; only then revise earlier completion claims or proceed to P4.

## Acceptance criteria

- After switching the active site in the admin, all site-dependent lists, details, settings, charts, selectors, and forms refresh to the selected site; stale requests or cached data from the previous site cannot overwrite or remain mixed into the new view.
- Admin detail/edit routes and mutations reject IDs belonging to another site, even when a user manually changes a URL, form payload, or server-action argument.
- Public pages, posts, layouts, navigation, settings, metadata, search, redirects, locales, previews, and builder references are fetched only from the site resolved from the request host.
- Site-aware cache keys and revalidation prevent cross-host content, metadata, or settings leakage in sequential and concurrent requests.
- Requests for two different hosts return the correct site-specific content, metadata, locale, menus, redirects, and settings, including when requests alternate in the same process.
- A user cannot read, mutate, associate, search, export, or infer another site's private data by changing an ID, URL, form payload, cookie, API request, or server-action input.
- Invalid/unknown hosts and stale or unauthorized site selections fail safely and predictably.
- Every site-owned data path is included in the ownership/query inventory and has an appropriate isolation test.
- Public published output, dashboard preview, API responses, search, analytics, and cache invalidation consistently respect site boundaries.
- Existing pages and records remain compatible; migrations are additive and follow repository conventions.
- Strict TypeScript is retained; do not introduce `any`, bypass authorization, or remove existing UI to simplify implementation.
- Focused tests, lint, typecheck, production build, and relevant browser/E2E checks pass. Record unrelated pre-existing failures separately.

## Approval gates

- **Gate 22 (R463–R465):** approve the site-context and domain model only after the audit, failure reproductions, and host-resolution tests are reviewed.
- **Gate 23 (R471–R474):** approve admin and public data fetching only after site switching, route-by-host, metadata, preview, stale-request, and cache-isolation tests pass.
- **Gate 24 (R466–R467):** approve isolation and permissions only after cross-site read/write denial, membership revocation, and direct-route/API tests pass.
- **Gate 25 (R468–R470, R475):** approve release only after cache isolation, preview/publish behavior, Site A/Site B regression suites, and production checks pass.

## Scope and migration safety

- Do not rebuild multisite from scratch or introduce a second tenant-context mechanism.
- Do not mark R032–R039 complete solely because their original implementation tasks were checked off; completion requires evidence against the acceptance criteria above.
- Do not start P4 collections work until the relevant isolation and authorization gates are passed, because collections will inherit these tenant boundaries.
- Preserve the unjournaled `src/db/migrations/20261022070000_page_views.sql`; if `page_views` needs `site_id`, use a new migration and the project's normal Drizzle journal workflow.

---

# Site slug in every public route (SLG-01–SLG-24)

<!-- BEGIN: site-slug-routing -->

## Goal

Put the site's slug in every public URL, like WordPress Multisite's subdirectory mode (`example.com/site-a/about`), so anyone can see which site a page belongs to, and several sites work on one domain or on localhost without setting up hosts. Host-based routing keeps working as a mode.

## Checked against the code (2026-10-28)

None of this is built yet, so every SLG step is pending:

- `sites` has no slug column (`src/db/schemas/sites.schema.ts`); sites are found only by `primary_host` and `extra_domains`.
- `siteContext.publicSite()` resolves by host, then preview, then the admin cookie, then the default site. There is no path-based lookup.
- `PAGES.SITE.page` and `PAGES.SITE.post` (`src/config/pages.ts`) build `/{locale}/{slug}` and `/blog/{slug}` with no site segment, and are used in 33 places.
- `src/proxy.ts` forwards the client's host as `x-cms-host`, and `publicSite` trusts that header and `x-forwarded-host` from any request, so a visitor can choose a site by sending a header. SLG-07 closes this together with R465.

## Depends on

- R464 and R465: SLG-07 and SLG-08 extend the same `SiteContext` (new source `path`) instead of adding a second resolver.
- R468: SLG-22 uses the per-site invalidation built there.

## R644–R646 — Site slug

- **R644 (SLG-01):** Add a unique, URL-safe slug column to sites with an additive migration, backfilling existing sites from their name and giving the default site the slug main.
- **R645 (SLG-02):** Validate site slugs: lowercase letters, numbers, and hyphens, 2–40 characters, not a reserved route (dashboard, api, login, blog, search, media, sitemap.xml, robots.txt, _next) and not an enabled locale code.
- **R646 (SLG-03):** Slug field on the sites admin page with a live URL preview, and a redirect from the old prefix when a slug changes.

## R647–R649 — Routing mode

- **R647 (SLG-04):** Routing mode setting per install: host (today), path (/{site}/...), or both, with path as the development default.
- **R648 (SLG-05):** In path mode, choose whether the default site keeps unprefixed URLs or also gets /main/.
- **R649 (SLG-06):** Root URL in path mode redirects to the default site, or shows a simple list of public sites when that option is on.

## R650–R653 — Request handling

- **R650 (SLG-07):** Proxy strips any client-sent x-cms-host and x-cms-site-slug headers, reads the first path segment as the site slug, and sets x-cms-site-slug itself.
- **R651 (SLG-08):** siteContext.publicSite resolves the site from x-cms-site-slug in path mode before the host, with source 'path'; an unknown slug returns 404 and never falls back to another site.
- **R652 (SLG-09):** resolveRoute and resolvePostRoute strip the site segment first, then the locale, then the page or post slug, in the order /{site}/{locale}/{slug}.
- **R653 (SLG-10):** Collection routes, /blog, and /search parse correctly under the site prefix, with a route table that rejects ambiguous paths.

## R654–R658 — Links and URLs

- **R654 (SLG-11):** PAGES.SITE.page, post, and a new search builder take the site and add its prefix; update all 33 call sites.
- **R655 (SLG-12):** A siteHref helper prefixes internal links in menus, buttons, rich text, and builder blocks at render time, leaving external links alone.
- **R656 (SLG-13):** The language switcher, breadcrumbs, and previous/next links keep the site prefix.
- **R657 (SLG-14):** Dashboard view-page links, the share panel, and builder preview links use the prefixed public URL.
- **R658 (SLG-15):** Preview links carry the site slug, and exiting preview returns to the prefixed page.

## R659–R661 — SEO and redirects

- **R659 (SLG-16):** Canonical, hreflang, Open Graph URLs, and JSON-LD include the site prefix in path mode and the primary host in host mode.
- **R660 (SLG-17):** Per-site sitemaps at /{site}/sitemap.xml plus a sitemap index, and robots.txt pointing at them.
- **R661 (SLG-18):** Redirects match after the site prefix is stripped, and redirect targets get the prefix added.

## R662–R664 — Server endpoints

- **R662 (SLG-19):** Form submit, newsletter, and the analytics beacon send the page or form id and the server derives the site from it, never from a client-sent site value.
- **R663 (SLG-20):** /api/v1 accepts ?site={slug} as well as the host, and an API key only works for its own site.
- **R664 (SLG-21):** revalidatePublicSite purges only the changed site's prefix in path mode.

## R665–R667 — Checks

- **R665 (SLG-22):** Tests for slug validation, the route parsing table, URL builders, proxy header stripping, unknown-slug 404, and cross-site denial.
- **R666 (SLG-23):** Lint, tsc, and a browser check of two sites in path mode: pages, posts, search, language switch, preview, forms, and sitemaps.
- **R667 (SLG-24):** Gate 32 approval: site slug routing, links, SEO, redirects, endpoints, and tests verified.

## Acceptance criteria

- In path mode every public page, post, collection item, search page, sitemap, and preview URL starts with the site slug, and every internal link on the page keeps it.
- An unknown or deleted site slug returns 404 and never shows another site's content.
- A request header can never pick the site; only the proxy sets the site headers, after removing any the client sent.
- Changing a slug redirects the old URLs, and no slug can hide a reserved route or a locale code.
- Host mode works exactly as today, and existing URLs keep working when an install switches to path mode with the default site unprefixed.
- Canonical and hreflang URLs match the URL the page was served on.

## Approval gates

- **Gate 32 (R667):** approve only after the tests, typecheck, lint, and the two-site browser check pass in path mode and host mode.

<!-- END: site-slug-routing -->
