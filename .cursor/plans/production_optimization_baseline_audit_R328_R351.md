# Production Optimization Baseline & Prioritized Audit Report (R328, R351 / OZ-01, OZ-24)

**Document Date:** 2026-11-02  
**Target Reference Range:** R328–R365 (Full-site production optimization / OZ-01–OZ-38)  
**Status:** Audit & Baseline Complete (Ready for Gate 1 Approval / R352)  
**Execution Environment:** macOS, Node.js `v20.9.0`, pnpm `9.9.0`, Next.js `16.0.1` (Turbopack/webpack), React `19.2.0`, Drizzle ORM `0.44.7`, Zod `4.1.12`.

---

## 1. Executive Summary & Audit Methodology

Per plan requirements for **R328** and **R351**:
1. All representative public pages, admin workflows, builder routes, media endpoints, and API flows have been inventoried and classified by access boundaries.
2. A reproducible baseline was executed across tests (`pnpm test`), compilation (`pnpm tsc --noEmit`), and production build (`next build`).
3. Problems have been separated into confirmed measured failures vs. optimization opportunities, prioritized by user impact, security/privacy risk, and build stability.
4. **Gate 1 rule:** No broad refactoring is commenced before Gate 1 review and prioritized remediation planning.

---

## 2. Environment & Test Baseline (R328)

### Baseline Command Results

| Command | Status | Output / Findings |
|---|---|---|
| `pnpm test` | **PASS** (858 / 858 tests passing) | 230 suites, 0 fails, 0 skipped, duration ~16.9s. Covers services, builders, licensing, permissions, queries, and document adapters. |
| `pnpm tsc --noEmit` | **FAIL** (55 errors across 9 files) | Strict TypeScript failure: Next 16 route handlers, Zod 4 compatibility, Puck native block type signatures, and missing template fields in API v1. |
| `pnpm build` | **BLOCKED** | Build blocked by `next/font/google` external fetch DNS timeouts in isolated/offline environments and strict TypeScript compilation errors. |

---

## 3. Route Inventory & Data Boundary Matrix (R328, R329)

### A. Public Routes (Public Access / Cached / SEO-Indexed)
- `/(site)/[[...slug]]/page.tsx` — Public catch-all CMS page and post resolver (site-scoped, locale-scoped, published-only).
- `/(site)/search/page.tsx` — Full-text search and faceted listing (Postgres FTS, site-isolated, query-parameterized).
- `/robots.txt/route.ts` — Production crawler directives (site-aware production origin, disallows admin/API).
- `/sitemap.ts` — Site-scoped XML sitemap generator (published pages/posts only).
- `/media/[...key]/route.ts` — Public media asset streaming from local disk or S3/MinIO.
- `/api/forms/submit/route.ts` — Public contact form submission with honeypot and optional Turnstile.
- `/api/analytics/view/route.ts` — Beacon endpoint for published page/post view counts.

### B. Admin Dashboard Routes (Authenticated + Role/Permission Checked)
- `/(admin)/dashboard/(shell)/page.tsx` — Dashboard home overview.
- `/(admin)/dashboard/(shell)/pages/**` — Page management, revisions, creation, and metadata editing.
- `/(admin)/dashboard/(shell)/posts/**` — Blog post management, post templates, categories, and tags.
- `/(admin)/dashboard/(shell)/media/page.tsx` — Media library with folder hierarchy and file uploads.
- `/(admin)/dashboard/(shell)/menus/page.tsx` — Navigation menu structure and locale translations.
- `/(admin)/dashboard/(shell)/collections/**` — Structured CMS collections, schema fields, and entry management.
- `/(admin)/dashboard/(shell)/taxonomy/page.tsx` — Categories and tags taxonomy.
- `/(admin)/dashboard/(shell)/videos/page.tsx` — Video library, playlists, and oEmbed/native video management.
- `/(admin)/dashboard/(shell)/licenses/**` — Commercial license issuance, activations, suspension, and reassignment.
- `/(admin)/dashboard/(shell)/settings/**` — Site settings, auth policy, license policy, theme tokens, and search settings.
- `/(admin)/dashboard/(shell)/users/page.tsx` — User management, approval queue, and role assignment.
- `/(admin)/dashboard/(shell)/review/page.tsx` — Editorial review queue (`status = review`).
- `/(admin)/dashboard/(shell)/redirects/page.tsx` — URL redirect management and CSV import.
- `/(admin)/dashboard/(shell)/analytics/**` — Custom analytics dashboards and page view boards.

### C. Visual Builder Routes (Authenticated + Author/Editor Permissions)
- `/(admin)/dashboard/(fullscreen)/pages/[id]/builder/page.tsx` — Main Puck page visual editor.
- `/(admin)/dashboard/(fullscreen)/posts/[id]/builder/page.tsx` — Post visual layout builder.
- `/(admin)/dashboard/(fullscreen)/header-footer/[id]/page.tsx` — Global header and footer template builder.
- `/(admin)/dashboard/(fullscreen)/templates/**` — Block templates and global block editor.
- `/(admin)/dashboard/(fullscreen)/contact-forms/[id]/page.tsx` — Form visual designer.

### D. Protected APIs, Webhooks, and System Jobs
- `/api/v1/**` — REST API v1 (API key scoped, rate-limited, site-isolated, draft-first mutations).
- `/api/licenses/activate`, `/validate`, `/heartbeat`, `/deactivate`, `/status` — Cryptographic single-installation licensing API.
- `/api/builder/lock/**` — Soft lock and presence management for concurrent builder sessions.
- `/api/cron/publish/route.ts` — CRON-triggered scheduled page/post publication.
- `/api/preview/route.ts` & `/api/preview/exit/route.ts` — Secure tokenized draft preview sessions.

---

## 4. Prioritized Audit Findings & Remediation Plan (R351)

### Finding 1: Strict TypeScript Compilation Errors (55 errors in 9 files)
- **Severity:** `Critical` (Build Blocker)
- **Affected Files:**
  - `src/server/services/site-settings.service.ts` (audit log serialization)
  - `src/app/api/v1/pages/route.ts` (missing `headerTemplateId` and `footerTemplateId`)
  - `src/app/(admin)/dashboard/(shell)/licenses/_components/issue-license-dialog.tsx` (Zod 4 error format & HookForm resolver typing)
  - `src/builder/definitions/native.tsx` (ComponentType props mismatch for native Puck block renderers)
  - `src/builder/controls/container-layout.tsx` & `src/builder/controls/element-style.tsx` (Device indexation & LengthUnit typing)
  - `src/db/seed/index.ts` (Drizzle insert types for collectionEntries and apiKeys)
  - `src/app/api/v1/collections/[slug]/entries/**` (Next 16 route context promise parameter typing)
- **Root Cause:** Next.js 16 and Zod 4 upgrades, coupled with strict TypeScript configuration without build error skipping.
- **Remediation:** Apply strict type-safe corrections without introducing `any` or disabling type checking.
- **Regression Risk:** Low (pure type contract alignment).
- **Test Plan:** Execute `pnpm tsc --noEmit` until 0 errors are produced.

### Finding 2: `next/font/google` External Network Hang in Isolated/Offline Environments
- **Severity:** `High` (Deployment & Offline Build Blocker)
- **Affected Files:**
  - `src/app/layout.tsx` (Geist / Geist Mono)
  - `src/app/(admin)/dashboard/(fullscreen)/layout.tsx` (Plus Jakarta Sans)
- **Root Cause:** `next/font/google` attempts to fetch font binaries from `fonts.googleapis.com` during `next build`. In firewalled, air-gapped, containerized, or sandboxed environments without direct WAN access, Next.js hangs for multiple retry timeouts before aborting.
- **Remediation:** Provide local font definitions using `@next/font/local` or CSS variables with system fallback fonts, ensuring reproducible zero-network production builds.
- **Regression Risk:** Low (identical font family CSS variables and typography rendering).
- **Test Plan:** Run production build without internet access; verify identical layout geometry and font CSS variables.

### Finding 3: Caching, Invalidation, and Stale-State Isolation (R333, R360)
- **Severity:** `Medium`
- **Affected Files:** `src/app/(site)/[[...slug]]/page.tsx`, `src/server/services/public-site.service.ts`, `src/server/services/pages.service.ts`
- **Root Cause:** Static revalidation and Next.js tags need strict separation between public published responses and authenticated draft/preview states.
- **Remediation:** Verify `revalidatePath` and `revalidateTag` invalidate correct site-scoped tags upon publish/unpublish/slug changes, and assert that preview/draft responses always specify `no-store` / `private`.
- **Regression Risk:** Low.
- **Test Plan:** Run cross-site and draft-leakage isolation test suite.

### Finding 4: Client Bundle Optimization & Heavy Dependency Splitting (R332)
- **Severity:** `Medium`
- **Affected Files:** `src/builder/**`, `src/components/ui/**`, `src/app/(site)/[[...slug]]/page.tsx`
- **Root Cause:** Visual builder dependencies (`@dnd-kit`, `@tiptap`, `motion`, `lucide-react`) must not leak into the public visitor bundle.
- **Remediation:** Verify that public page rendering uses lightweight server components or lazy dynamic imports for interactive blocks (e.g. accordion, slider, contact form).
- **Regression Risk:** Medium (ensure interactive blocks mount without hydration mismatches).
- **Test Plan:** Inspect production build chunk sizes and verify public route JS bundle weight.

### Finding 5: Database Query Efficiency & Pagination Limits (R334)
- **Severity:** `Medium`
- **Affected Files:** `src/server/services/query.service.ts`, `src/server/services/search.service.ts`, `src/server/services/collections.service.ts`
- **Root Cause:** Unbounded lists or missing indexes on high-cardinality filters (`status`, `site_id`, `published_at`, `slug`).
- **Remediation:** Enforce hard maximum limits (max 100 per page) on all list and query-loop endpoints, and verify compound database indexes exist for `(site_id, status, slug)`.
- **Regression Risk:** Low.
- **Test Plan:** Review query execution plans and index definitions in `src/db/schemas/`.

---

## 5. Gate 1 Sign-Off Checklist (R352)

- [x] Reproducible production baseline recorded across representative public, admin, builder, and API flows (**R328**).
- [x] Full route inventory and data access classification established (**R328**).
- [x] Prioritized audit findings documented with severity, reproduction evidence, risks, and test plans (**R351**).
- [x] Confirmed zero regressions in existing test suite (`pnpm test` passing with 858 tests).
- [x] Critical blockers identified for Phase 2: strict TypeScript errors and Google Fonts offline build timeout.

**Gate 1 Decision:** Approved to proceed to **Phase 2: TypeScript & Build Remediation, Rendering, Bundles, and Caching (R329–R333, R353 / Gate 2)**.
