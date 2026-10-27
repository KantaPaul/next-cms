# Zod Schema Consolidation Plan

**Goal:** Move all Zod schema definitions into dedicated, centralized files under `src/schemas/` so schemas are reusable, deduplicated, and easy to maintain.

**Status:** Planning only — implementation not started.

---

## 1. Current State

Zod is used across **54 files**. Schemas exist in three categories:

### Already well-organized (leave as-is)
| File | Schemas |
|------|---------|
| `src/db/schemas/auth.schema.ts` | `userInsertSchema`, `userUpdateSchema` (drizzle-zod derived) |
| `src/db/schemas/shared.schema.ts` | `UserStatus`, `PageStatus`, `VisibilityStatus`, `EditorType`, `PostLayout`, `ContentKind`, `RevisionKind` |
| `src/db/schemas/analytics.schema.ts` | `widgetMetricSchema`, `widgetSchema`, `boardLayoutSchema`, etc. |
| `src/db/schemas/personalization.schema.ts` | `personalizationDataset` |
| `src/db/validations/pages.validation.ts` | `seoSchema`, `createPagesSchema`, `updatePagesSchema`, `idSchema`, etc. |
| `src/db/validations/posts.validation.ts` | `createPostSchema`, `updatePostSchema`, `savePostDraftSchema`, etc. |
| `src/db/validations/personalization.validation.ts` | `createPersonalizationSchema`, etc. |
| `src/app/(admin)/dashboard/(shell)/sites/_modules/sites.schemas.ts` | `createSiteSchema` |
| `src/app/(admin)/dashboard/(shell)/collections/_modules/collections.schemas.ts` | `createCollectionSchema`, `collectionFieldSchema`, `collectionEntrySlugSchema` |
| `src/builder/schema.ts` | `GENERATABLE_BLOCKS`, `generatedBlockSchema`, `generatedPageSchema` |

### Inline schemas needing extraction (30+ files)
Server actions, API routes, React components, and utilities define schemas inline instead of in dedicated files.

### Type-only usage (no extraction needed)
`procedure-types.ts`, `gemini.ts`, `error.ts`, `procedure.builder.ts`, `openapi.ts` (utility function only).

---

## 2. Target Architecture

Create `src/schemas/` with domain-organized subdirectories:

```
src/schemas/
  index.ts                      # barrel re-exports
  shared.ts                     # shared primitives (idSchema, slugRegex, baseSearchParamsSchema)
  actions/
    index.ts
    media.ts                    # listSchema, updateSchema
    redirects.ts                # redirectInput
    boards.ts                   # createBoard/updateBoard/previewWidget inline schemas
    inbox.ts                    # archiveSubmission inline schema
    ai.ts                       # seoResultSchema, rewriteSchema
    page-experiments.ts         # startPageExperiment / pickWinner / end inline schemas
    collections.ts              # createCollectionSchema, addFieldSchema, createEntrySchema, etc.
    settings.ts                 # settingsSchema
    users.ts                    # setUserRole, inviteUser inline schemas
    review.ts                   # target inline schema
    menus.ts                    # url, itemSchema inline schemas
    api-keys.ts                 # createApiKey, revokeApiKey inline schemas
    templates.ts                # blockItemSchema, globalBlockContentSchema inline schemas
    blog.ts                     # blogQuerySchema, relatedSchema
    site.ts                     # locale inline schema
  api/
    index.ts
    pages.ts                    # createPageSchema, updatePageSchema
    posts.ts                    # re-export / thin wrapper around db/validations/posts.validation.ts
    collections.ts              # createEntrySchema, updateEntrySchema
    responses.ts                # OpenAPI response schemas (moved from server/api/v1.ts)
  components/
    index.ts
    sites-manager.ts            # localeSchema, createSiteSchema (single source of truth)
    collections.ts              # entry form schemas, updateFieldSchema
```

Existing well-organized files stay where they are:
- `src/db/schemas/*.ts`
- `src/db/validations/*.ts`
- `src/app/.../sites/_modules/sites.schemas.ts`
- `src/app/.../collections/_modules/collections.schemas.ts`
- `src/builder/schema.ts`

---

## 3. Critical Duplicates to Resolve

| Schema | Current Locations | Resolution |
|--------|------------------|------------|
| `createSiteSchema` | `sites.schemas.ts`, `site.actions.ts`, `sites-manager.tsx` | Single source in `src/schemas/components/sites-manager.ts` |
| `createPostSchema` / `updatePostSchema` | `posts.validation.ts`, `posts/route.ts`, `posts/[slug]/route.ts` | Keep in `posts.validation.ts`; API routes import from there |
| `seoSchema` | `pages.validation.ts`, `server/api/v1.ts` | Keep in `pages.validation.ts`; `api/v1.ts` imports from there |
| `RESERVED_COLLECTION_SLUGS` | `collections.schemas.ts`, `collections.service.ts` | Keep in `collections.schemas.ts`; service imports from there |
| `createEntrySchema` | `collections.actions.ts`, `collections/entries/route.ts` | Single source in `src/schemas/actions/collections.ts` or `src/schemas/api/collections.ts` |
| `locale` / site locale schema | `site.actions.ts`, `sites-manager.tsx` | Single source in `src/schemas/components/sites-manager.ts` |

---

## 4. File Mapping (Source → New Location)

| Source File | Inline Schema(s) | New Location |
|-------------|-----------------|--------------|
| `media.actions.ts` | `listSchema`, `updateSchema` | `src/schemas/actions/media.ts` |
| `redirects.actions.ts` | `redirectInput` | `src/schemas/actions/redirects.ts` |
| `boards.actions.ts` | createBoard/updateBoard/previewWidget inline | `src/schemas/actions/boards.ts` |
| `inbox.actions.ts` | archiveSubmission inline | `src/schemas/actions/inbox.ts` |
| `ai.actions.ts` | `seoResultSchema`, `rewriteSchema` | `src/schemas/actions/ai.ts` |
| `page-experiment.actions.ts` | 3 inline schemas | `src/schemas/actions/page-experiments.ts` |
| `collections.actions.ts` | 5 inline schemas | `src/schemas/actions/collections.ts` |
| `settings.actions.ts` | `settingsSchema` | `src/schemas/actions/settings.ts` |
| `users.actions.ts` | setUserRole, inviteUser inline | `src/schemas/actions/users.ts` |
| `review.actions.ts` | `target` | `src/schemas/actions/review.ts` |
| `menus.actions.ts` | `url`, `itemSchema` | `src/schemas/actions/menus.ts` |
| `api-keys.actions.ts` | 2 inline schemas | `src/schemas/actions/api-keys.ts` |
| `templates.actions.ts` | `blockItemSchema`, `globalBlockContentSchema` | `src/schemas/actions/templates.ts` |
| `blog.actions.ts` | `blogQuerySchema`, `relatedSchema` | `src/schemas/actions/blog.ts` |
| `site.actions.ts` | `locale` | `src/schemas/actions/site.ts` |
| `pages/route.ts` | `createPageSchema` | `src/schemas/api/pages.ts` |
| `pages/[slug]/route.ts` | `updatePageSchema` | `src/schemas/api/pages.ts` |
| `posts/route.ts` | `createPostSchema` | import from `db/validations/posts.validation.ts` |
| `posts/[slug]/route.ts` | `updatePostSchema` | import from `db/validations/posts.validation.ts` |
| `collections/entries/route.ts` | `createEntrySchema` | `src/schemas/api/collections.ts` |
| `collections/entries/[id]/route.ts` | `updateEntrySchema` | `src/schemas/api/collections.ts` |
| `server/api/v1.ts` | all response schemas + `apiSchemas` | `src/schemas/api/responses.ts` |
| `sites-manager.tsx` | `localeSchema`, `createSiteSchema` | `src/schemas/components/sites-manager.ts` |
| `create-entry-form.tsx` | inline entry schema | `src/schemas/components/collections.ts` |
| `edit-entry-form.tsx` | inline entry schema | `src/schemas/components/collections.ts` |
| `field-list.tsx` | `updateFieldSchema` | `src/schemas/components/collections.ts` |
| `parse-search-params.ts` | `baseSearchParamsSchema` | `src/schemas/shared.ts` |

---

## 5. Import Path Convention

All new files use the `@/*` path alias (already configured in `tsconfig.json`):

```
import { createSiteSchema } from '@/schemas/components/sites-manager'
import { listSchema } from '@/schemas/actions/media'
import { createPageSchema } from '@/schemas/api/pages'
import { idSchema } from '@/schemas/shared'
```

---

## 6. Execution Order (Recommended)

1. **Create `src/schemas/shared.ts`** — shared primitives, no dependencies on new files
2. **Create `src/schemas/api/responses.ts`** — move OpenAPI response schemas out of `server/api/v1.ts`
3. **Create `src/schemas/actions/*.ts`** — one domain at a time; update the corresponding action file immediately after
4. **Create `src/schemas/api/pages.ts`, `posts.ts`, `collections.ts`** — update route files
5. **Create `src/schemas/components/*.ts`** — update component files
6. **Deduplicate** — resolve `createSiteSchema` ×3, `createPostSchema` ×2, `seoSchema` ×2, etc.
7. **Create `src/schemas/index.ts`** barrel — export everything from new files last
8. **Verify** — run `tsc --noEmit`, `next build`, and any existing tests

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Circular imports | New `src/schemas/` only imports from `src/db/`, never the reverse. Keep `db/validations` → `db/schemas` imports as-is. |
| Naming collisions during transition | Use unique names in new files, then dedupe in step 6. |
| React-hook-form `zodResolver` needs schema reference | Components import schema from new location; usage pattern unchanged. |
| `drizzle-zod` derived schemas | `userInsertSchema` / `userUpdateSchema` stay in `db/schemas/auth.schema.ts` — not moved. |

---

## 8. Verification Checklist

- [ ] `tsc --noEmit` passes with no type errors
- [ ] `next build` completes successfully
- [ ] No duplicate schema names remain across the codebase
- [ ] All inline schema definitions removed from action/route/component files
- [ ] Barrel file `src/schemas/index.ts` exports all new schemas

---

**Next step:** Begin implementation by creating `src/schemas/shared.ts` and `src/schemas/index.ts`, then work through the action/domain files one at a time.
