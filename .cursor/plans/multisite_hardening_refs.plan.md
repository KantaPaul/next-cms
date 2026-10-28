---
name: Multisite hardening refs R463–R475 (P3-09–P3-21)
overview: "Audit and harden the existing multi-site foundation (R032–R039) so every admin, public, preview, API, cache, and background path is scoped to the right site. Split from the combined CMS plan into numbered refs R463–R475. Name one numbered ref to implement only that piece."
todos:
  - id: R463
    content: "P3-09 Audit current multisite behavior and reproduce cross-site failures before fixes"
    status: pending
  - id: R464
    content: "P3-10 Establish canonical typed site context for public, dashboard, preview, and system requests"
    status: pending
  - id: R465
    content: "P3-11 Harden host/domain normalization, ownership, collisions, and unknown-host fallback policy"
    status: pending
  - id: R466
    content: "P3-12 Enforce site isolation across CRUD, relations, joins, aggregates, APIs, and background jobs"
    status: pending
  - id: R467
    content: "P3-13 Verify membership, role permissions, site switching, cookies, and membership revocation"
    status: pending
  - id: R468
    content: "P3-14 Make cache, revalidation, preview, and static/export output site-aware"
    status: pending
  - id: R469
    content: "P3-15 Add cross-site unit, integration, and end-to-end isolation and routing tests"
    status: pending
  - id: R470
    content: "P3-16 Pass multisite security and regression approval gates before marking R032-R039 complete or starting P4"
    status: pending
  - id: R471
    content: "P3-17 Audit and centralize site-aware data fetching for every admin dashboard route, server component, server action, and API"
    status: pending
  - id: R472
    content: "P3-18 Fix admin site-switch refresh, query invalidation, loading/error/empty states, and stale response handling"
    status: pending
  - id: R473
    content: "P3-19 Audit public page/post/layout/navigation/settings/SEO fetches against the resolved host and active locale"
    status: pending
  - id: R474
    content: "P3-20 Make public route, metadata, search, redirect, preview, and published-content fetches site-scoped and cache-safe"
    status: pending
  - id: R475
    content: "P3-21 Add Site A/Site B fetch-contract tests for admin switching, public domains, cache isolation, and cross-site denial"
    status: pending
isProject: false
---

# Multisite hardening refs R463–R475

Source: the "WordPress-Inspired Multisite Reliability and Isolation" section of [combined_cms_refs_f96163bc.plan.md](combined_cms_refs_f96163bc.plan.md). Keep step statuses in both files in sync.

Depends on: P3 multi-site (R032–R039, see [p3_multi-site_374f3971.plan.md](p3_multi-site_374f3971.plan.md)).
Blocks: the agency site steps (AGY, R534–R543) and any further collections work.
Earlier draft: [wordpress_multisite_behavior_reliability.plan.md](wordpress_multisite_behavior_reliability.plan.md) covers the same work as eight unnumbered phases (ms001–ms008); this file is the numbered version.

## Steps

- **R463** (pending): P3-09 Audit current multisite behavior and reproduce cross-site failures before fixes
- **R464** (pending): P3-10 Establish canonical typed site context for public, dashboard, preview, and system requests
- **R465** (pending): P3-11 Harden host/domain normalization, ownership, collisions, and unknown-host fallback policy
- **R466** (pending): P3-12 Enforce site isolation across CRUD, relations, joins, aggregates, APIs, and background jobs
- **R467** (pending): P3-13 Verify membership, role permissions, site switching, cookies, and membership revocation
- **R468** (pending): P3-14 Make cache, revalidation, preview, and static/export output site-aware
- **R469** (pending): P3-15 Add cross-site unit, integration, and end-to-end isolation and routing tests
- **R470** (pending): P3-16 Pass multisite security and regression approval gates before marking R032-R039 complete or starting P4
- **R471** (pending): P3-17 Audit and centralize site-aware data fetching for every admin dashboard route, server component, server action, and API
- **R472** (pending): P3-18 Fix admin site-switch refresh, query invalidation, loading/error/empty states, and stale response handling
- **R473** (pending): P3-19 Audit public page/post/layout/navigation/settings/SEO fetches against the resolved host and active locale
- **R474** (pending): P3-20 Make public route, metadata, search, redirect, preview, and published-content fetches site-scoped and cache-safe
- **R475** (pending): P3-21 Add Site A/Site B fetch-contract tests for admin switching, public domains, cache isolation, and cross-site denial

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
