# Collections Feature — Fix & Implementation Plan

## Scope

Directory: `src/app/(admin)/dashboard/(shell)/collections/`

Files reviewed (16 total):
- `page.tsx` — Collections listing page
- `[id]/page.tsx` — Collection settings page
- `[id]/entries/page.tsx` — Collection entries list page
- `[id]/entries/[entryId]/page.tsx` — Edit entry page
- `_modules/collections.actions.ts` — Server actions
- `_modules/collections.schemas.ts` — Zod schemas
- `_modules/form-helpers.ts` — FormData helpers
- `components/collection-list.tsx`
- `components/create-collection-form.tsx`
- `components/collection-settings-form.tsx`
- `components/add-field-form.tsx`
- `components/field-list.tsx`
- `components/create-entry-form.tsx`
- `components/edit-entry-form.tsx`
- `components/entry-list.tsx`
- `components/entry-status-card.tsx`

---

## What was found

TypeScript strict mode (`tsc --noEmit`) reported **7 actual type errors** across 3 files; pages and `_modules` compiled cleanly.

### Type errors fixed

| # | File | Error |
|---|------|-------|
| 1 | `components/add-field-form.tsx:112` | `<Select>` received invalid `id` prop; `onValueChange` value typed as `string` doesn't match `field.onChange` enum union |
| 2 | `components/entry-list.tsx:99` | `<form action={unpublishCollectionEntry}>` signature mismatch: action takes `(entryId, collectionId)` but `<form action>` requires `(formData: FormData) => void \| Promise<void>` |
| 3 | `components/entry-list.tsx:115` | Same mismatch for `publishCollectionEntry` |
| 4 | `components/entry-status-card.tsx:33` | Same mismatch for `unpublishCollectionEntry` |
| 5 | `components/entry-status-card.tsx:44` | Same mismatch for `publishCollectionEntry` |
| 6 | `components/entry-status-card.tsx:73` | Same mismatch for `deleteCollectionEntry` |

### Correctness issues fixed

| # | File | Issue | Fix |
|---|------|-------|-----|
| 7 | `_modules/collections.actions.ts` | Local copies of `createCollectionSchema`/`updateCollectionSchema` diverged from `_modules/collections.schemas.ts` (server missing slug rules) | Imported schemas from `collections.schemas.ts`, removed local duplicates |
| 8 | `components/collection-settings-form.tsx` | Used `createCollectionSchema` (slug regex + reserved slugs + required fields) for an **update** form | Switched to new `updateCollectionSchema` (optional `id`, optional name/slug/templatePageId) |

### Changes made

1. `_modules/collections.schemas.ts` — Added exported `updateCollectionSchema` + `UpdateCollectionInput` type.
2. `_modules/collections.actions.ts` — Imported schemas; removed local duplicates; guarded missing `id` in `updateCollection`; converted `publishCollectionEntry`/`unpublishCollectionEntry`/`deleteCollectionEntry` to accept `FormData` and return `Promise<void>` (used only via `<form action>`, return value not consumed).
3. `components/collection-settings-form.tsx` — Switched resolver to `updateCollectionSchema`.
4. `components/add-field-form.tsx` — Removed invalid `id` from `<Select>`; cast `onValueChange` value.

### Verification

`tsc --noEmit` reports **0 errors** under `src/app/(admin)/dashboard/(shell)/collections/`. Remaining `tsc` errors are pre-existing generated-file issues in `.next/dev/types/validator.ts` (Next.js API route types), unrelated to this directory.

---

## Implement later (TODO)

- [ ] Wire up real `collectionsService` methods (`create`, `update`, `delete`, `get`, `getFields`, `addField`, `updateField`, `deleteField`, `listEntries`, `createEntry`, `updateEntry`, `publishEntry`, `unpublishEntry`, `deleteEntry`, `getEntry`, `getPublishedEntry`) — currently stubbed/assumed to exist in `@/server/services/collections.service`.
- [ ] Add collection entry API routes under `src/app/api/v1/collections/...` if not present.
- [ ] Add database schema/migrations for collections, collection fields, and collection entries (`src/db/schemas/collections.schema.ts`).
- [ ] Add navigation menu item for Collections (already partially in `src/menus/index.tsx` — verify).
- [ ] Add client-side confirmation dialogs for delete actions (currently `window.confirm` in `entry-status-card.tsx` only).
- [ ] Add `entryData` typing instead of `Record<string, unknown> | undefined` casts.
- [ ] Add optimistic updates / revalidation handling for entry create/edit.
- [ ] Add field config editor for select/media/relation field types (config JSON).
- [ ] Add bulk actions on entry list.
- [ ] Add search/filter/pagination to `CollectionList` and `EntryList`.
- [ ] Add image upload support for media fields.
- [ ] Add relations UI for relation fields.
- [ ] Add entry draft/publish workflow statuses beyond published/draft.
- [ ] Add permission checks per collection (currently `PERMISSIONS.PAGES_EDIT` / `SETTINGS_MANAGE` coarse-grained).
- [ ] Add unit tests for schemas and server actions.
- [ ] Add E2E/Playwright tests for collection CRUD flows.

---

## Notes

- Pre-existing uncommitted changes exist elsewhere in the repo (not part of this task); they were left untouched.
- All changes are isolated to untracked collections feature files.
