# Next CMS — Feature Gap Analysis & Engineering Tickets

**Project:** `next-cms`  
**Benchmarked Competitors:** WordPress + Elementor Pro, Webflow, Framer, Bricks Builder, Divi  
**Date:** 2026-11-12  

---

## Executive Summary

`next-cms` already implements 75+ built-in blocks, Header/Footer/Overlay builders, `QueryLoop` and `LoopGrid`, custom post types (`collections`), multi-site support, multi-step forms, localization (`entry_languages`), a local plugin SDK, and WordPress WXR / Elementor JSON importers.

The largest remaining product gaps fall into three tiers:
1. **P0 (Platform & Revenue):** Native E-Commerce, Public Memberships/Paywalls, and External API Query Loops.
2. **P1 (Visual Builder & Growth):** Component Variants, Native A/B Testing, Release Branching, Cloud Template Sync, and AI Bulk Localization.
3. **P2 (Ecosystem & Editor UX):** Self-Serve Plugin Marketplace, Conditional Form Logic/Calculations, and On-Canvas Inline Rich-Text Editing.

---

## Competitor Gap Matrix

| Capability Area | Competitor Benchmark | Current State in `next-cms` | Ticket |
| :--- | :--- | :--- | :--- |
| **E-Commerce & Storefront** | [Elementor WooCommerce Theme Builder](https://elementor.com/help/the-elementor-theme-builder/), [Webflow E-commerce](https://medium.com/@brandon.mccrae/framer-vs-webflow-which-website-builder-should-you-use-10afc6ed214a) | Missing (no product, variant, cart, or order schemas/blocks) | `CMS-101` |
| **Memberships & Gated Content** | [WordPress restricted access](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/560936808968283) | Missing (staff/admin RBAC only; no public member tiers or paywalls) | `CMS-102` |
| **External API Query Loops** | [Bricks Query Data from APIs](https://academy.bricksbuilder.io/builder/dynamic-content/query-data-from-apis/) | Missing (`QueryLoop` queries internal Postgres collections/posts only) | `CMS-103` |
| **Component Variants** | [Webflow Component Variants](https://www.youtube.com/watch?v=5SGYFUgOZN0) | Partial (`GlobalRef` exists, no named variants or per-instance prop overrides) | `BLD-201` |
| **A/B Testing & Experiments** | [Framer built-in A/B testing](https://www.trueform.agency/compare/webflow-vs-framer) | Missing (analytics boards exist, no traffic splitting or variant conversion tracking) | `BLD-202` |
| **Canvas Branching & Staging** | [Framer branching workflows](https://www.framer.com/ai/) | Missing (per-entry revisions exist, no multi-page release branches) | `BLD-203` |
| **Cloud Template Sharing** | [Elementor Cloud Templates](https://elementor.com/pricing/), [WordPress Synced Patterns](https://fullsiteediting.com/lessons/introduction-to-block-patterns/) | Missing (local `site-templates` only; no cross-site cloud sync) | `BLD-204` |
| **AI Bulk Localization** | [Framer Localization translation table](https://get-lantis.com/en/blog/traducir-cms-framer-colecciones) | Partial (`entry_languages` + switcher exist; no translation matrix or auto-routing) | `CMS-205` |
| **1-Click Plugin Marketplace** | [WordPress Plugin Directory](https://wordpress.org/about/features/) | Partial (local `plugins/` SDK + DB table exist; no remote registry or 1-click install) | `CMS-301` |
| **Conditional Form Logic** | [WordPress form builders](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/560936808968283) | Partial (multi-step, file, acceptance exist; no conditional rules or calculated fields) | `BLD-302` |
| **On-Canvas Inline Editing** | [Framer canvas-first editor](https://focusreactive.com/blog/webflow-vs-framer-which-visual-builder-wins-for-modern-web/), [Divi Visual Builder](https://wpmarmite.com/en/compare/best-wordpress-page-builders/divi-builder/) | Partial (inspector-driven editing; lacks double-click canvas rich text & drag guides) | `BLD-303` |

---

## P0 — Critical Platform & Revenue Gaps

### `CMS-101` — Native E-Commerce Engine & Storefront Blocks
- **Priority:** P0 (Critical)
- **Category:** CMS / Commerce
- **Competitor Benchmark:** [Elementor WooCommerce Theme Builder](https://elementor.com/help/the-elementor-theme-builder/), [Webflow E-commerce](https://medium.com/@brandon.mccrae/framer-vs-webflow-which-website-builder-should-you-use-10afc6ed214a)
- **Problem / Gap:** `src/db/schemas/` has no `products`, `variants`, `carts`, or `orders` tables, and `src/builder/blocks/registry.ts` lacks Cart, Checkout, Add-to-Cart, and Product Archive blocks.
- **Scope & Technical Notes:**
  - Add Drizzle schemas in `src/db/schemas/commerce.schema.ts` for products, SKUs/variants, inventory, carts, and orders.
  - Add Stripe checkout + webhook handlers under `src/app/api/commerce/` and order management under `src/app/(admin)/dashboard/(shell)/commerce/`.
  - Register `ProductGrid`, `AddToCart`, `CartDrawer`, and `Checkout` blocks in `src/builder/blocks/registry.ts` with `LoopGrid` compatibility.
- **Acceptance Criteria:**
  - [ ] Admins can create products with variants, pricing, and inventory in the dashboard.
  - [ ] Visitors can add items to a persistent cart and complete checkout via Stripe.
  - [ ] Designers can build custom product single/archive templates using `TemplateResolver` and `LoopGrid`.

### `CMS-102` — Public Membership, Subscriptions & Content Gating
- **Priority:** P0 (Critical)
- **Category:** Auth / Access Control
- **Competitor Benchmark:** [WordPress restricted page access](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/560936808968283)
- **Problem / Gap:** `src/auth.ts` handles staff/admin users only; there is no public member registration, subscription tiering, or block/page-level visibility gating by membership status.
- **Scope & Technical Notes:**
  - Separate public `members` table/role from staff accounts with self-serve sign-up, login, and profile portal.
  - Add `visibilityRules` (logged-in state, membership tier, purchased product) to `Section`, `Container`, and page/post templates.
  - Add `MemberLogin`, `AccountPortal`, and `PaywallGate` builder blocks.
- **Acceptance Criteria:**
  - [ ] Public visitors can register and manage a member account without accessing `/dashboard`.
  - [ ] Any page, post, or builder container can be gated by membership tier with a fallback redirect or paywall block.

### `CMS-103` — External REST/GraphQL API Query Loop
- **Priority:** P0 (Critical)
- **Category:** Dynamic Data / Builder
- **Competitor Benchmark:** [Bricks Builder Query Data from APIs](https://academy.bricksbuilder.io/builder/dynamic-content/query-data-from-apis/)
- **Problem / Gap:** `QueryLoop` and `LoopGrid` (`src/server/services/listing-query.service.ts`) only query internal Postgres collections and posts.
- **Scope & Technical Notes:**
  - Add a data-source adapter in `listing-query.service.ts` for external REST/GraphQL endpoints with auth headers, caching TTL, and JSONPath root mapping.
  - Expose fetched JSON keys inside `LoopItemField` dynamic tags (`{{api.field}}`).
- **Acceptance Criteria:**
  - [ ] Users can configure a REST/GraphQL endpoint on a `QueryLoop` block with headers and cache TTL.
  - [ ] Child `LoopItemField` blocks bind to fields from the external API response in both SSR and editor preview.
  - [ ] Failed or timed-out API requests render a configurable fallback state without crashing the page.

---

## P1 — Visual Builder & Growth Parity

### `BLD-201` — Reusable Component Variants & Slot Overrides
- **Priority:** P1 (High)
- **Category:** Visual Builder / Design System
- **Competitor Benchmark:** [Webflow Component Variants](https://www.youtube.com/watch?v=5SGYFUgOZN0)
- **Problem / Gap:** `GlobalRef` syncs a single static block instance, whereas Webflow and Framer support named variants (e.g., `Primary`, `Compact`, `Dark`) and per-instance prop/text/image overrides.
- **Acceptance Criteria:**
  - [ ] Any `Container` or `Section` can be saved as a Component with exposed editable props (text, image, link, boolean).
  - [ ] Components support multiple named variants sharing a base structure with variant-specific style overrides.
  - [ ] Updating a master component propagates structural/style changes to all instances while preserving per-instance overrides.

### `BLD-202` — Native A/B Testing & Conversion Experiments
- **Priority:** P1 (High)
- **Category:** Growth / Analytics
- **Competitor Benchmark:** [Framer built-in A/B testing](https://www.trueform.agency/compare/webflow-vs-framer)
- **Problem / Gap:** First-party analytics (`src/db/schemas/analytics.schema.ts`) tracks page views, but there is no experiment engine to split traffic across page or block variants and measure conversion lift.
- **Acceptance Criteria:**
  - [ ] Add `experiments` schema supporting page-level or block-level A/B variants and traffic split percentages.
  - [ ] Assign deterministic cookie/edge buckets in `src/app/(site)/[[...slug]]`.
  - [ ] Track conversion events (form submit, CTA click) and display conversion rates per variant in `/dashboard/analytics`.

### `BLD-203` — Multi-Page Release Branches & Staged Publishing
- **Priority:** P1 (High)
- **Category:** Workflow / Publishing
- **Competitor Benchmark:** [Framer branching and review workflows](https://www.framer.com/ai/)
- **Problem / Gap:** Revisions and review (`src/server/services/review.service.ts`) operate per individual page/post; teams cannot bundle coordinated edits across pages, headers, and templates into a single previewable release.
- **Acceptance Criteria:**
  - [ ] Introduce `releases` grouping draft changes across pages, templates, menus, and global styles.
  - [ ] Provide a shareable preview URL for the full release before merging to live.
  - [ ] Support atomic publish and one-click rollback of an entire release.

### `BLD-204` — Cloud Template Library & Cross-Site Synced Patterns
- **Priority:** P1 (High)
- **Category:** Templates / Multi-Site
- **Competitor Benchmark:** [Elementor Cloud Templates](https://elementor.com/pricing/), [WordPress Synced Patterns](https://fullsiteediting.com/lessons/introduction-to-block-patterns/)
- **Problem / Gap:** Templates are scoped to the local database (`site-templates`); agencies managing multiple sites via `sites.schema.ts` cannot push/pull reusable sections from a shared library.
- **Acceptance Criteria:**
  - [ ] Support exporting/importing portable JSON + media asset bundles for sections and full page kits.
  - [ ] Provide a workspace-wide shared template library accessible across all sites in a multi-site instance.

### `CMS-205` — AI Translation Matrix & Geo/Locale Auto-Routing
- **Priority:** P1 (High)
- **Category:** Localization / AI
- **Competitor Benchmark:** [Framer Localization translation table](https://get-lantis.com/en/blog/traducir-cms-framer-colecciones)
- **Problem / Gap:** `entry_languages` and `LanguageSwitcherBlock` exist, but editors must translate pages and collections manually without a centralized translation table, slug localization rules, or browser/geo redirect controls.
- **Acceptance Criteria:**
  - [ ] Add a side-by-side Translation Matrix in the dashboard for pages, CMS collections, and SEO metadata.
  - [ ] Integrate Gemini (`src/server/ai/gemini.ts`) for one-click bulk translation with `draft` / `approved` review states.
  - [ ] Support per-locale custom URL slugs and optional `Accept-Language` auto-redirect rules.

---

## P2 — Ecosystem, Forms & Editor UX

### `CMS-301` — Self-Serve Plugin & Theme Marketplace
- **Priority:** P2 (Medium)
- **Category:** Extensibility / Ecosystem
- **Competitor Benchmark:** [WordPress Plugin Directory](https://wordpress.org/about/features/)
- **Problem / Gap:** `README.md` notes there is no marketplace and no remote install—plugins (`plugins/`) require manual file placement and `pnpm plugins:sync`.
- **Acceptance Criteria:**
  - [ ] Build a signed plugin manifest registry API and `/dashboard/plugins/marketplace` browser UI.
  - [ ] Support one-click install, upgrade, and uninstall with permission scopes and migration hooks.

### `BLD-302` — Conditional Form Logic & Calculated/Payment Fields
- **Priority:** P2 (Medium)
- **Category:** Forms / Lead Capture
- **Competitor Benchmark:** [WordPress interactive forms](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/560936808968283) & Elementor Pro Form enhancements
- **Problem / Gap:** `src/builder/blocks/contact-form-client.tsx` supports multi-step, file, radio, checkbox, and acceptance fields, but lacks conditional show/hide rules, calculated totals, and inline payment fields.
- **Acceptance Criteria:**
  - [ ] Add a visual rule builder (`show/hide/require` when field matches condition) to form field schemas.
  - [ ] Add a `Calculated` field type supporting arithmetic expressions over numeric and select fields.

### `BLD-303` — On-Canvas Inline Rich-Text Editing & Freeform Guides
- **Priority:** P2 (Medium)
- **Category:** Visual Editor UX
- **Competitor Benchmark:** [Framer canvas-first editor](https://focusreactive.com/blog/webflow-vs-framer-which-visual-builder-wins-for-modern-web/), [Divi Visual Builder](https://wpmarmite.com/en/compare/best-wordpress-page-builders/divi-builder/)
- **Problem / Gap:** Content editing relies heavily on the inspector sidebar (`packages/builder-react/src/inspector.tsx`) rather than direct double-click inline editing on the canvas with floating formatting toolbars and snap guides.
- **Acceptance Criteria:**
  - [ ] Enable direct on-canvas Tiptap editing for `Heading`, `RichText`, `Button`, and `Hero` copy with a floating toolbar.
  - [ ] Add visual spacing/margin drag handles and alignment snap guides directly on selected blocks.
