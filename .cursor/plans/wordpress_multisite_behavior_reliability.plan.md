---
name: WordPress multisite behavior reliability
overview: Audit and harden the existing multi-site implementation so each site behaves like an independent WordPress Multisite site within one CMS installation. Preserve the existing data model and completed P3 work where correct; diagnose real failures before changing code, close tenant-isolation and host-resolution gaps, and prove behavior with automated and browser tests.
todos:
  - id: ms001
    content: Audit the current multi-site implementation and document reproducible failures against the acceptance matrix
    status: pending
  - id: ms002
    content: Define one canonical site-context and authorization path for public, dashboard, API, background, preview, and cache operations
    status: pending
  - id: ms003
    content: Fix domain/host resolution, domain validation, fallback behavior, and proxy/forwarded-host handling
    status: pending
  - id: ms004
    content: Enforce site isolation for all reads, writes, relations, mutations, and derived data
    status: pending
  - id: ms005
    content: Make site membership, role checks, switching, and site creation/deletion lifecycle reliable
    status: pending
  - id: ms006
    content: Make site-specific settings, locales, navigation, media, SEO, redirects, forms, search, analytics, and API behavior consistent
    status: pending
  - id: ms007
    content: Add regression tests for isolation, host routing, permissions, migration/backfill, and cache correctness
    status: pending
  - id: ms008
    content: Run typecheck, lint, migration checks, automated tests, and browser acceptance gates; update the combined plan accurately
    status: pending
---

# WordPress Multisite Behavior — Reliability and Parity Plan

## Objective

Make the existing multi-site feature reliable rather than layering a second implementation on top of it. Treat this CMS installation as a network containing multiple independently configured sites, similar to the useful operational behavior of WordPress Multisite:

- One application and shared user identity can administer multiple sites through explicit memberships.
- Each site has its own content, settings, menus, locale configuration, domains, redirects, forms, media associations, API credentials, analytics, and SEO defaults.
- A public request resolves to exactly one site using a validated host/domain mapping.
- Dashboard operations are scoped to the selected site and authorized against that site's membership role.
- Site data never leaks through a direct query, relationship, API, preview, search result, background task, or shared cache.
- Existing installations and the current `default` site continue to work without data loss or route regressions.

This is a behavior and correctness plan, not a requirement to copy WordPress internals. Do not implement WordPress PHP/plugin compatibility, a separate database per site, or multisite network administration unless the repository already requires it.

## Important repository context

The P3 plan `.cursor/plans/p3_multi-site_374f3971.plan.md` describes `sites`, `site_memberships`, `site_id` on content, host resolution, a `cms_site` dashboard cookie, per-site locales, translated menus, and translated site metadata. The combined plan lists R032–R039 as completed. Treat these as claims to verify, not proof that every code path is correct.

Before editing:
1. Read both plans and inspect the actual schema, migrations, services, route handlers, server components, middleware/proxy, authentication, authorization, cache/revalidation, media storage, and tests.
2. Establish the current branch and working tree. Never discard unrelated user changes.
3. Reproduce each reported or discovered failure. Record the route, input, expected behavior, actual behavior, and relevant code path.
4. Trace the entire request lifecycle before deciding on a fix. Prefer repairing shared abstractions over adding route-specific patches.
5. Do not start P4 collection work or change unrelated builder features.

## Phase 0 — Audit and failure inventory

Inspect at minimum:

- `sites`, `site_memberships`, roles, users, site settings, all migrations and migration journal/snapshots.
- Pages, posts, media, menus/menu items, categories, tags, global blocks, templates, page views, form submissions, redirects, search documents, API keys, analytics dashboards, and any other site-owned tables.
- Every Drizzle query and mutation touching these tables, including nested relations, aggregates, joins, counts, exports, bulk actions, soft-deleted records, and transaction callbacks.
- Public route resolution, catch-all routes, blog/post routes, locale routing, sitemap/robots/metadata generation, API v1, search, redirect handling, preview/draft routes, image/media URLs, form submission, analytics, and static generation.
- Server and client caches, React/Next.js caching, tag/path revalidation, CDN headers, ISR/static output, and cache keys.
- Background jobs, scheduled tasks, webhooks, email links, and CLI/seed tasks that may run without a request cookie or Host header.
- Site creation, domain editing, membership changes, site switching, invitation/login flows, and user access fallback logic.

Deliverable: a short failure matrix in this plan (or a linked audit note) with severity, reproduction steps, root cause, affected paths, and regression test. Do not mark a feature complete merely because its UI exists.

## Phase 1 — Single source of truth for site context

Create or repair a typed site-context service (reuse `src/server/services/site-context.ts` if it exists). Avoid multiple competing implementations.

The API should make context explicit and distinguish at least:
- **Public request context:** resolved from the validated request hostname.
- **Dashboard context:** selected site from `cms_site`, validated against the authenticated user's active membership.
- **System context:** an explicit site ID passed to jobs, migrations, seed tasks, and webhooks; never infer it from a browser cookie.
- **Preview context:** resolved site plus a valid, scoped preview authorization.
- **No-context behavior:** fail closed for operations that require a site; only use the documented default-site fallback for eligible public requests and legacy-compatible flows.

Requirements:
- Use a branded/validated site ID or the repository's existing schema type; do not pass arbitrary request strings into database filters without validation.
- Make it difficult for callers to omit site scope accidentally. Prefer helpers that require `siteId` as a mandatory argument for site-owned data access.
- Resolve context once per request and pass it through services. Do not repeatedly derive context from different headers/cookies deeper in the call stack.
- Keep server-only resolution and authorization code out of client bundles.
- Avoid module-level mutable request state.
- Do not treat `users.role_id` as a global authorization override where site membership is required. Preserve legacy fallback only if explicitly justified and tested.
- Use transactions for operations that must atomically create/update a site and its initial settings, membership, and related records.

## Phase 2 — Domain and request-host resolution

Support the domain model already represented by the schema: primary host plus extra domains. Add subdomain or subdirectory network modes only if product requirements and existing routing architecture call for them.

Requirements:
- Normalize hostnames consistently: lowercase, remove a trailing dot, safely handle ports, IDNs/punycode, and reject malformed values. Store/compare normalized hostnames.
- Match a request host against a unique primary host or extra domain and resolve exactly one site.
- Prevent one hostname from being assigned to multiple sites. Enforce uniqueness at the database/service boundary, including collisions between a site's primary host and another site's extra domain.
- Never trust arbitrary `X-Forwarded-Host` values unless the deployment's trusted-proxy configuration explicitly allows them. Document which header is authoritative behind the supported reverse proxy.
- Ignore ports for hostname matching, but do not strip arbitrary path or userinfo data from malformed host input and then accept it.
- Unknown public hosts must follow one documented policy: use the default site only for approved development/local hosts or explicit fallback configuration; otherwise return a safe not-found/unknown-host response. Do not silently serve the default site on every arbitrary production domain.
- `localhost` and existing development workflows must continue to render the default site.
- Domain changes must validate ownership/collisions before saving. Removing or changing a domain must not leave stale mappings or caches.
- The redirect middleware/proxy must pass the same trusted host context used by the application and must not redirect based on another site's redirect table.
- Canonical URLs, absolute links, OAuth/email callbacks, sitemap URLs, and metadata must use the resolved site's configured canonical host rather than a hardcoded environment URL where appropriate.

Tests: primary host, extra domain, mixed case, trailing dot, port, malformed host, unknown production host, localhost fallback, duplicate host, primary/extra collision, spoofed forwarded host, and changed/removed domain.

## Phase 3 — Complete tenant isolation

Create a table inventory and classify each table as:
1. site-owned (requires `site_id`),
2. globally shared by design (for example, user identity and shared role definitions), or
3. child-owned (inherits site ownership through a parent relation and must validate that relation).

Do not blindly add `site_id` to every table. Use the actual schema and access patterns to determine ownership. Any child row that can be referenced independently must be checked against the parent site's ID.

Requirements:
- Scope every site-owned SELECT, INSERT, UPDATE, DELETE, aggregate, count, join, relation load, export, and bulk action.
- On create, derive `site_id` from trusted server context, never from a client-supplied body field. If an API accepts a site ID explicitly, authorize it and validate membership before use.
- On update/delete, include both record ID and active `site_id` in the mutation predicate; do not fetch by ID alone and authorize later.
- For related records, verify both parent ID and matching site ID. A page on Site A must not attach media, menu items, categories, templates, redirects, or other site-owned records from Site B.
- Scope unique constraints and indexes appropriately, including slug/language uniqueness, soft-delete semantics, and nullable host constraints.
- Backfill legacy rows to `default` through a reviewed, journaled migration. Verify row counts before and after; never rewrite or drop the existing unjournaled migration mentioned in the P3 plan. Add a new migration and update the journal/snapshot through the repository's normal workflow.
- Keep global user identity shared, but require a site membership for all site administration and content access.
- Avoid leaking cross-site data through error messages, ID existence checks, autocomplete, selectors, exports, or analytics.

Add a regression test that creates same-slug records on two sites and proves both are independently addressable, while cross-site ID mutation and relationship attachment fail safely.

## Phase 4 — Memberships, permissions, and site switcher

Requirements:
- A user can see only sites with a valid membership, except a clearly defined network-level administrator capability if the project intentionally supports one.
- Every dashboard loader, server action, API endpoint, mutation, upload, export, and settings page revalidates membership and the role's permission on the server. Hiding a navigation item is not authorization.
- The `cms_site` cookie is untrusted input: validate format, existence, membership, and current permission on every request that uses it. Use secure cookie options appropriate to deployment (`httpOnly`, `sameSite`, `secure`, path, expiry).
- Invalid, stale, or unauthorized selected-site cookies must fall back deterministically to the user's first authorized membership or show a site-selection/forbidden state. Never use an unauthorized site ID.
- Switching sites updates the server-validated selection and refreshes all site-dependent server data. Prevent stale client state from displaying Site A data after switching to Site B.
- Site creation must atomically create the site, settings, creator membership, and any required default locale/menu configuration. Failure must roll back all parts.
- If site deletion is supported, require an explicit confirmation, protect the default site, handle domain and membership cleanup, and define whether content is archived or permanently deleted. If deletion is not supported, do not expose a misleading delete action.
- Role changes and membership revocation take effect immediately for subsequent requests and invalidate relevant sessions/caches.
- Document whether a user with no site membership is denied access or receives a legacy default-site migration path. Do not silently grant access because `users.role_id` exists.

Tests: multi-site member, single-site member, revoked membership, stale cookie, forged cookie, role change, last admin protection if applicable, and atomic site creation rollback.

## Phase 5 — Feature-by-feature site scoping

Audit and fix each applicable feature using the canonical site context:

- **Pages and posts:** list/detail/create/edit/delete/publish/preview, slug checks, revisions if present, related content, status counts, and route resolution.
- **Page builder:** page templates, post templates, global blocks, reusable layouts, dynamic content references, and any builder data loaded by ID must be scoped and relationship-validated.
- **Media:** library queries, upload authorization, replacement/deletion, alt text, generated sizes, storage paths, signed URLs, and public delivery. Decide explicitly whether binary files are physically shared but site-associated or physically namespaced; never expose private/unpublished assets across sites by guessing URLs.
- **Menus:** location plus locale uniqueness per site, editor queries, menu-item relationships, copy-to-locale actions, and public header/footer fallback.
- **Taxonomy:** categories/tags and their links to content must remain within one site.
- **Settings/locales:** settings rows must be unique per site; the site's default locale must be in its enabled locale list; unsupported locale URLs must have deterministic behavior.
- **SEO and discovery:** metadata, canonical URL, hreflang, sitemap, robots, Open Graph, structured data, RSS/feed routes if present, and translated site title/description must use the current site.
- **Redirects:** lookup, create, import/export, loop detection, status code, and slug-change suggestions must be site-scoped. One site's redirect must never affect another.
- **Forms:** submissions, spam protection, notification recipients, exports, and form identifiers must be validated against the resolved site. Rate limits should be scoped appropriately.
- **Search:** indexing, document IDs, queries, ranking, rebuild jobs, and API search must be site-scoped; rebuilding one site must not delete another site's documents.
- **Analytics:** page views, dashboards, aggregation, filters, and exports must not mix sites unless a deliberate network-level report is authorized.
- **API keys and API v1:** keys should be associated with a site and checked against both site and allowed scopes. Never let an API key select a different site by changing a query parameter or header.
- **Webhooks and integrations:** verify signatures, bind each integration to a site, validate event ownership, and scope delivery logs and retries.
- **Authentication and emails:** invite/reset/preview/verification links must retain the intended site safely without trusting arbitrary return URLs. Do not let a site switch change the identity or privilege of the signed-in user.
- **Background tasks:** every task that handles site data must receive an explicit site ID, or intentionally iterate through sites with per-site isolation. Never depend on `cms_site` or request headers in a worker.
- **Public APIs and forms:** CORS, origin validation, rate limits, and absolute URLs must align with the site's configured domain policy.

Update this list based on the repository's real features; mark non-applicable items with a reason instead of silently skipping them.

## Phase 6 — Cache, revalidation, and static output

This is a high-risk source of cross-site leakage.

Requirements:
- Include the resolved site ID and any relevant locale/content version in cache keys for site-dependent data. For public host-dependent responses, ensure cache/CDN configuration varies safely by normalized host.
- Audit `unstable_cache`, `use cache`, `fetch` caching, React cache, ISR, route segment settings, memoization, and any custom in-memory cache used by this Next.js version. Use only APIs supported by the installed Next.js version.
- Never cache a response that depends on cookies or request headers under a key that omits those dimensions.
- Site-specific revalidation tags should include site identity; publishing or editing content on Site A must not invalidate or reveal Site B content accidentally.
- Host-specific pages must not be statically generated once and then served for every hostname unless output is explicitly keyed by host/site.
- Preview and draft responses must be private/no-store as appropriate and require authorization. They must never be shared through a public cache.
- Domain changes, locale changes, content publishing, menu changes, settings updates, and membership changes must invalidate the correct cache entries.
- Test two hosts in the same process and in alternating request order to expose cache contamination.

## Phase 7 — Migration and operational safety

- Inspect current production schema and migration history before writing migrations.
- Preserve the existing `default` site and existing IDs. Never regenerate, edit, or delete the unjournaled migration called out in the P3 plan; use a new migration for additional schema changes and journal it normally.
- Add indexes and constraints based on actual query patterns. Avoid adding a uniqueness constraint before auditing and resolving existing collisions.
- If a data repair is needed, make it idempotent or provide a safe one-time migration with clear preconditions and postconditions.
- Do not silently discard duplicate domains, content, or memberships. Produce a report and require an explicit resolution strategy.
- Add structured logs for unknown hosts and failed site resolution without logging secrets, tokens, or sensitive content.
- Update setup/deployment documentation for trusted proxy headers, custom domains, DNS/TLS prerequisites, local host testing, and production fallback policy.

## Phase 8 — Test strategy

Use the repository's installed test tools; do not introduce a new framework unless needed and justified.

### Unit tests
- Host normalization and validation.
- Domain collision detection.
- Site-context resolution and fallback rules.
- Membership/role authorization.
- Locale selection and fallback.
- Site-scoped cache key/tag construction.

### Integration tests
- Site creation transaction and rollback.
- All key CRUD operations scoped to the active site.
- Cross-site IDs rejected for updates, deletes, and relations.
- Same slug/language allowed on different sites but rejected within the same site when applicable.
- Search index, redirects, forms, media, menus, and analytics remain isolated.
- API key cannot read another site's records.
- Migration/backfill leaves legacy content on `default`.

### End-to-end tests
Create Site A and Site B with distinct domains, content, menus, locales, metadata, redirects, media, and memberships. Verify:
1. Host A renders only A's published content and metadata.
2. Host B renders only B's published content and metadata.
3. Unknown production host follows the documented unknown-host policy.
4. `localhost` still renders the existing default site.
5. Dashboard switching changes every site-dependent list and form, not just the header label.
6. A user without membership cannot access or mutate the other site by URL, API, cookie, or crafted request.
7. Same slugs on different sites resolve to the correct site's content.
8. Search, sitemap, redirects, forms, analytics, and API responses remain isolated.
9. A/B requests in alternating order do not leak data via cache.
10. Existing single-site routes and content still work after migration.

Use Playwright if already installed; otherwise use the project's existing end-to-end strategy and explain any manual-only gate.

## Phase 9 — Required approval gates

Do not mark the plan complete until each gate passes.

- **Gate A — Diagnosis:** reproducible issue list with root causes and regression tests agreed; no speculative rewrite.
- **Gate B — Data safety:** migration reviewed; legacy row counts and `default` behavior verified; no destructive migration.
- **Gate C — Security:** site isolation and membership checks tested for every high-risk path; no cross-site reads/writes or media/API leaks.
- **Gate D — Routing:** host/domain matrix passes, including localhost, custom domains, malformed/unknown hosts, and trusted proxy behavior.
- **Gate E — Feature parity:** pages/posts, builder data, menus, media, settings/locales, SEO, redirects, forms, search, analytics, API keys, and background jobs audited and tested where present.
- **Gate F — Cache isolation:** alternating-host tests pass; cache keys, tags, and revalidation are site-aware.
- **Gate G — Quality:** `pnpm exec tsc --noEmit`, the repository's lint command, relevant unit/integration tests, migration checks, and production build pass. Report any existing unrelated failures separately; do not hide or waive failures.
- **Gate H — Browser acceptance:** demonstrate the full two-site scenario with screenshots or test output and verify existing default-site behavior.
- **Gate I — Plan integrity:** update R032–R039 in `.cursor/plans/combined_cms_refs_f96163bc.plan.md` only after evidence supports completion; keep incomplete or regressed work pending. Update `.cursor/plans/p3_multi-site_374f3971.plan.md` with actual findings and status. Do not mark this reliability plan complete while any gate fails.

## Implementation rules

- TypeScript strictness: no `any`; use the repository's established types and Zod validation where applicable.
- Reuse existing Drizzle, auth, permission, and service conventions. Avoid duplicate context helpers and unnecessary abstractions.
- Do not solve isolation by merely hiding UI, adding client-side filters, or trusting `site_id` supplied by the browser.
- Do not change existing user-facing behavior outside the multi-site scope without documenting why.
- Do not remove existing UI or features as a shortcut.
- Keep changes incremental and reviewable. After each phase, run focused tests before proceeding.
- When implementation differs from the plan, update the plan to reflect reality rather than claiming success.
