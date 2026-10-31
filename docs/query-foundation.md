# Query Foundation (QRY-01–QRY-04)

## Overview
This document specifies the architecture and implementation of the CMS listing query engine foundation, supporting dynamic content listing blocks, term archives, and search.

---

## 1. Typed Listing Query Schema (R571 / QRY-01)
Located in [`packages/builder-core/src/query.ts`](file:///Users/pobon/Documents/testing/cms/next-cms/packages/builder-core/src/query.ts):
- **Approved Sources**: `posts`, `pages`, `collection-entries`, `videos`.
- **Field Allowlisting**:
  - `posts`: `categories`, `tags`, `authorId`, `search`, `publishedAfter`, `publishedBefore`.
  - `pages`: `categories`, `tags`, `authorId`, `search`, `publishedAfter`, `publishedBefore`.
  - `collection-entries`: `collectionId` (required), `search`, `publishedAfter`, `publishedBefore`.
  - `videos`: `playlistId`, `provider`, `search`, `publishedAfter`, `publishedBefore`.
- **Sort Allowlisting**:
  - `posts`: `publishedAt`, `title`, `createdAt`, `updatedAt`.
  - `pages`: `publishedAt`, `title`, `createdAt`, `updatedAt`.
  - `collection-entries`: `publishedAt`, `createdAt`, `updatedAt`.
  - `videos`: `publishedAt`, `title`, `position`, `duration`, `createdAt`.
- **Strict Caps**:
  - `limit`: Validated to $[1, 100]$ (hard ceiling `MAX_PAGE_SIZE = 100`, default 10).
  - `page`: $\ge 1$ (default 1).
  - `offset`: $\ge 0$ (default 0).
  - `excludeCurrent`: Boolean flag with optional `currentId` to exclude the active item on single-item pages.

---

## 2. Server Query Resolver (R572 / QRY-02)
Located in [`src/server/services/listing-query.service.ts`](file:///Users/pobon/Documents/testing/cms/next-cms/src/server/services/listing-query.service.ts):
- **Safety Boundaries**:
  - Multisite isolation: Always scoped to `siteId`.
  - Locale isolation: Always scoped to `language` for posts and pages.
  - Lifecycle: Excludes soft-deleted items (`isNull(deletedAt)`).
  - Status: Strictly `status = 'published'` and `publishedAt <= now()`.
  - Access: Strictly `visibility = 'public'` (or validated viewer permission).
  - Exclude current item: If `excludeCurrent` is set and `currentId` provided, appends `ne(id, currentId)`.
- **Unified Normalized Output**:
  Every source returns items conforming to `NormalizedListingItem`:
  - `id`: string
  - `title`: string
  - `slug`: string
  - `url`: Canonical site link
  - `excerpt`: string or null
  - `image`: Featured image, thumbnail, or cover
  - `publishedAt`: ISO timestamp string or null
  - `author`: `{ id, name, image }` or null
  - `terms`: Array of associated categories and tags `{ id, name, slug, taxonomy }`
  - `source`: `ListingSource`
  - `raw`: Source-specific raw metadata

---

## 3. Namespaced URL Parameters (R573 / QRY-03)
Functions in [`packages/builder-core/src/query.ts`](file:///Users/pobon/Documents/testing/cms/next-cms/packages/builder-core/src/query.ts):
- `formatNamespacedParam(key, namespace)`: Produces `${namespace}_${key}` when a namespace is provided (e.g. `feat_page`, `feed_category`).
- `parseNamespacedParams(rawParams, namespace)`: Extracts parameters (`page`, `search`, `category`, `tag`, `sort`, `order`) isolated to the given block namespace.
- `encodeNamespacedParams(params, namespace)`: Reversibly encodes state for links and browser URL pushes.
- **Benefit**: Two or more listing blocks on the same page (e.g. Featured Posts and Recent Videos) have independent pagination, search, and category filters without parameter collision.

---

## 4. Database Indexes (R574 / QRY-04)
Added in [`src/db/schemas/pages.schema.ts`](file:///Users/pobon/Documents/testing/cms/next-cms/src/db/schemas/pages.schema.ts), [`src/db/schemas/video.schema.ts`](file:///Users/pobon/Documents/testing/cms/next-cms/src/db/schemas/video.schema.ts), and migration [`src/db/migrations/20261031170000_query_foundation_indexes.sql`](file:///Users/pobon/Documents/testing/cms/next-cms/src/db/migrations/20261031170000_query_foundation_indexes.sql):
- `posts`: Composite index on `(site_id, language, status, published_at)` and index on `created_by`.
- `pages`: Composite index on `(site_id, language, status, published_at)` and index on `created_by`.
- `videos`: Composite index on `(site_id, status, published_at)`.
- `page_categories`: Reverse index on `category_id`.
- `page_tags`: Reverse index on `tag_id`.

---

## 5. Verification
- 528 automated unit tests passing across `builder-core`, `server/services`, `builder-react`, and `editor-ui`.
- Zero typecheck errors in `@nextcms/builder-core` and workspace packages.
