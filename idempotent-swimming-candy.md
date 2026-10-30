# Remove `@measured/puck` — make the custom engine the only editor/renderer

Repo: `/Users/pobon/Documents/testing/cms/next-cms`

## Context

This CMS has been migrating off the third-party Puck page-builder onto a
custom replacement engine (`packages/builder-core` + `packages/builder-react`,
surfaced to the app via `src/builder/`) across many prior batches (B0–B14 of
`.cursor/plans/custom_builder_engine_refs.plan.md`). That work built the new
engine's document model, renderer, and editor shell, and wired a dual-engine
switch so both could coexist during rollout — but Puck itself was never
actually removed, pending an approved 30-day no-rollback production soak
(`.cursor/plans/builder_dual_engine_playbook.md`, R804) that assumes real
production traffic.

The user has now asked to remove Puck "from everywhere" and make the new
engine fully compatible/complete as the sole editor and renderer. Since this
repo is a dev/test environment with no live traffic to protect, the user
explicitly decided to skip that production soak and do a full cutover now,
rather than leave dual-engine code around waiting for a 30-day clock. Two
other product decisions are locked in (see "Decisions" below). The outcome
should be: Puck fully deleted (code + dependency), the new engine as the only
editor and renderer, with no fallback path left behind.

### Decisions (binding — do not revisit)
1. **Full cutover now.** New engine becomes the real, persisted default for
   both editing and public rendering. Real content migration runs against
   this environment's actual seeded DB. `@measured/puck` is then physically
   removed — no dual-engine code left behind afterward.
2. **Stubbed collaboration features stay out of scope.** `PresencePanel`,
   `LiveChecksPanel`, `VersionCompare`, and `CommentsPanel`'s lack of
   persistence are **not** being built out. They must keep behaving exactly
   as they do today (empty/local state) after the cutover.
3. **Port every remaining block to native `defineBlock`.** Finish the
   existing block-by-block native-porting pattern for every block still
   authored via Puck's `config.tsx`, then delete the Puck→native bridge
   (`from-puck.ts`) entirely.

## Verified current-state inventory

### Render-engine switch (public rendering)
`src/builder/render-content.tsx`:
- `renderEngineFor(site) = env.BUILDER_RENDER_ENGINE ?? site.renderEngine`
  ('puck' | 'core', column defaults to 'puck'; the env var is a global kill
  switch).
- `renderBuilderContent()` and `resolveBuilderData()` both branch on
  `engine === 'core'` vs. Puck's `resolveAllData`/`<Render>`. Both read the
  same stored Puck-shaped JSON via `toDocument`/`toPuckData`.
- Called from `src/app/(site)/[[...slug]]/page.tsx`,
  `src/app/api/v1/pages/[slug]/route.ts`, `src/app/api/v1/posts/[slug]/route.ts`.

### Admin editor switch
`src/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor.tsx`
reads a `?editor=new` query param (not persisted) to pick `BuilderLoader`
(Puck's `<Puck>` editor) or `NewEditor` (built on builder-react primitives:
`EditorProvider`, `EditorCanvas`, `Inspector`, `BlockList`, `LayersPanel`,
`CommentsPanel`, `PresencePanel`, `LiveChecksPanel`, `VersionCompare`, etc.).
Already wired into **all six** builder screens: pages, posts, post
templates, page templates, global blocks, contact forms.

`NewEditor` already reuses the same app-level plumbing as Puck through a
shared adapter layer (`builder-adapters.ts`'s `adapterFor()`, explicitly
documented as "shared by the Puck builder and the new editor"), the same
save/revision/lock server actions, and the same AI/save-as-global/save-as-
template dialogs.

### The three dialogs — exact split already in place
`ai-dialogs.tsx`, `save-global-dialog.tsx`, `save-template-dialog.tsx` each
export:
- An engine-agnostic `*View` component (already used by `NewEditor`, zero
  Puck dependency).
- A Puck-only wrapper (`useGetPuck()`-based) consumed **only** by
  `builder-chrome.tsx`.

Removing Puck here means **deleting the wrapper exports only** — the `*View`
exports are untouched and already correct.

### Block-porting inventory
`src/builder/definitions/native.tsx` has 3 native blocks today: `Hero`,
`Button`, `Spacer`. **34 blocks remain** Puck-shaped in `src/builder/config.tsx`
(28 page blocks + 5 post blocks: `PostTitle`, `PostFeaturedImage`, `PostMeta`,
`PostContent`, `RelatedPosts`) plus 1 plugin block (`example` in
`src/builder/custom/index.ts`, which has no native plugin-registration
mechanism yet at all — a real design gap, not just a port).

`defineBlock`/`BlockDefinition` already support `slots`/`arraySlots` (proven
by `from-puck.ts` deriving them today), so `Columns`/`Slider`/`Tabs`/
`Accordion` are more work but not architecturally blocked. Reusable field
helpers already exist in `src/builder/definitions/fields.ts`
(`urlField`, `mediaField`, `iconField`, `sectionField`, `sectionSchema`, etc.)
and are already used by the 3 native blocks.

### Tooling gaps to fix as part of this work
- `src/builder/check-documents.tsx`'s `loadAll()` never queries `postRevisions`
  (checks everything else: `page_contents`, `post_contents`, `page_revisions`,
  `global_blocks`, `page_templates`, `post_templates.content`+`draftContent`).
- `scripts/migrate-content-format.ts` never migrates `post_templates.draft_content`
  (migrates everything else including `post_revisions.canvas`).
- `packages/builder-core`'s converter has one accepted, already-documented
  limitation (empty inline-format slots can't round-trip) — not a blocker,
  no action needed.

### Other references
- `src/builder/__tests__/renderer.test.tsx` imports Puck to assert the native
  renderer's HTML matches Puck's server build — the authoritative parity
  test, needs a replacement once Puck is gone.
- `package.json`: `"@measured/puck": "^0.20.2"`, no other `@measured/*`
  packages, no Puck peer deps. `react-dropzone` is unrelated — keep it.
- No `@measured/puck` import exists under `src/db/`, `src/server/`, or
  `src/app/api/v1/*` — removal is contained to `src/builder/*` and the admin
  builder UI.
- `.env` has `DATABASE_URL=postgresql://nextcms:nextcms_pass@localhost:5432/nextcms`
  (local Docker Postgres). `pnpm db:seed` seeds realistic Puck-shaped
  multisite data across 3 sites.

## Ordering rationale

1. Native block porting finishes **before** `from-puck.ts` is deleted —
   `pageDefinitions`/`postDefinitions` currently merge
   `definitionsFromPuck(builderConfig, ...)` with `NATIVE_BLOCKS`; removing
   the bridge while blocks are still Puck-shaped deletes their only
   definition source.
2. Content migration runs and is verified **before** any Puck-reading code
   is deleted — once the Puck render branch and `check-documents.tsx`'s
   comparison are gone, nothing left in the repo can validate un-migrated
   content; it would be silently misinterpreted, not rejected.
3. The render-engine branch is deleted only **after** `check-documents`/
   `compare-engines` confirm native output matches Puck's for every seeded
   document — this is the real regression gate, replacing the 30-day soak.
4. Puck-only editor UI files are deleted only after the admin default is
   flipped to `NewEditor` for all six screens (otherwise `BuilderLoader`'s
   Puck tree is still the live default).
5. `@measured/puck` comes out of `package.json` only once
   `grep -rl "@measured/puck" src packages` returns empty.

## Phase 1 — Finish native block porting (34 blocks + plugin mechanism)

Add one `defineBlock(...)` export per remaining block to
`src/builder/definitions/native.tsx`, following the exact pattern already
established by `HeroBlock`/`ButtonBlock`/`SpacerBlock` (zod `schema` with
`.default(...)` matching the Puck `defaultProps`, `fields` using the
`fields.ts` helpers, `render` pointing at the same render component). Port in
dependency order:
1. Simple field-only blocks: `Container`, `RichText`, `Image`, `Video`,
   `Embed`, `Map`, `Code`, `Newsletter`, `ImageMorph`, `LogoCloud`,
   `CollectionItem`, `PostTitle`, `PostFeaturedImage`, `PostMeta`,
   `PostContent`.
2. Array-field blocks: `Features`, `Stats`, `Pricing`, `Testimonials`, `FAQ`,
   `Team`, `Timeline`, `BlogPosts`, `Gallery`, `VideoLibrary`,
   `RelatedPosts`, `ContactForm` (object-typed array items), `CTA`.
3. Slot-bearing blocks: `Columns` (4 named slots, carry over
   `disallow: ['Columns', 'GlobalRef']` verbatim), `Slider`, `Tabs`,
   `Accordion` (array items each with a nested `content: slot`).
4. `GlobalRef` last — port only the field definition; its data loading is
   already native (`registry.registerBatch('GlobalRef', loadGlobalRefs)` in
   `src/builder/loaders.ts`) and must not be touched.
5. The `example` plugin block from `src/builder/custom/index.ts` — design and
   implement a native plugin-registration shape (e.g. a `NATIVE_CUSTOM_BLOCKS`
   array of `defineBlock` results) so the Puck-shaped `customBlockEntries`
   mechanism is no longer needed. No existing native counterpart to copy —
   design this explicitly.

Also port root-level (page-settings) fields off `rootFieldsFromPuck()` — add
native root-field defs (e.g. in `native.tsx` or a new `root-fields.tsx`)
mirroring `config.tsx`'s `builderConfig.root.fields`/`postBuilderConfig.root.fields`,
and port category/group derivation (currently `config.categories`-based in
`src/builder/definitions/index.ts`'s `groupsOf`/`pageBlockGroups`) into a
native `CATEGORIES` structure alongside `NATIVE_BLOCKS`.

Do **not** touch `src/builder/config.tsx` or `src/builder/custom/index.ts` in
this phase beyond reading them for reference — they still back the Puck
editor/renderer until Phase 4/5. Only add to `native.tsx`/`definitions/index.ts`.

**Verify:** `pnpm test`; `pnpm builder:check-documents` (now exercises every
native definition against real seeded content — a default/field mismatch
shows up as an HTML diff); `tsc --noEmit`/`pnpm build`; manually open each of
the six builder screens with `?editor=new` and confirm every block inserts,
edits, and the inspector fields match the Puck editor 1:1.

## Phase 2 — Make the native engine the real, persisted default everywhere

- `src/db/schemas/sites.schema.ts` — change `renderEngine` column default
  from `'puck'` to `'core'` (keep the column itself for now; removed in
  Phase 6). Add a migration setting existing rows to `'core'` as part of
  Phase 3's data migration step.
- `src/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor.tsx` —
  replace the `?editor=new` check with an unconditional
  `return <NewEditor ... />`; drop the `BuilderLoader` import/branch. Since
  Puck is being fully removed (not kept as a fallback), "there is only one
  editor" is the correct mechanism — no new persisted flag needs inventing.
- Leave `BuilderLoader`/`builder-editor.tsx`/etc. in place but now
  unreachable — deleted in Phase 4, keeping this phase a small, reviewable
  default-flip only.

**Verify:** `pnpm test`, `tsc --noEmit`/`pnpm build`; start `pnpm dev` and open
all six builder URLs without `?editor=new`, confirm `NewEditor` now loads by
default and the Puck editor is no longer reachable.

## Phase 3 — Run and verify the real content migration against the seeded dev DB

**Fix the two tooling gaps first:**
- `src/builder/check-documents.tsx` — add a `postRevisions` query to
  `loadAll()` (mirrors `pageRevisions`; content column is `canvas`).
- `scripts/migrate-content-format.ts` + `scripts/lib/content-migration.ts` —
  add `post_templates.draft_content` as a migratable cell (new `TableName`
  variant, e.g. `'post_templates_draft'`, writing to `draftContent`). Add a
  unit test in `scripts/lib/__tests__/content-migration.test.ts` for it.

**Then run manually against the real seeded Postgres DB (not part of the
automated test suite):**
1. Confirm local Postgres is running and `DATABASE_URL` resolves.
2. `pnpm db:seed` if not already seeded.
3. `tsx scripts/migrate-content-format.ts` (dry run) — inspect counts;
   investigate any `unrecognized` cell before proceeding.
4. `tsx scripts/migrate-content-format.ts --execute` — writes a timestamped
   JSON backup, migrates everything in one transaction.
5. Set every `sites.render_engine` row to `'core'` explicitly if seeded rows
   still say `'puck'`.

**Verify:** `pnpm builder:check-documents` must report zero mismatches;
`pnpm builder:compare-engines` (needs the dev server running) must show zero
diffs between engines, then re-confirm every site is left on `'core'`
afterward; spot-check `tsx scripts/migrate-content-format.ts --rollback <file>`
runs cleanly; `pnpm test`.

## Phase 4 — Delete the Puck-only editor UI and rewrite the three dialogs

**Delete:** `builder-editor.tsx`, `builder-shell.tsx`, `selection-card.tsx`,
`builder-chrome.tsx`, `layers-panel.tsx` (Puck's own — distinct from
builder-react's `LayersPanel` already used by `NewEditor`, do not confuse the
two), `puck-editor-bridge.tsx`, `builder-loader.tsx` (all under
`pages/[id]/builder/_components/`).

**Rewrite (not delete):**
- `ai-dialogs.tsx`, `save-global-dialog.tsx`, `save-template-dialog.tsx` —
  remove the `useGetPuck`/`@measured/puck` import and the non-`View` wrapper
  component in each. Keep every `*View` export unchanged.
- `builder-adapters.ts` — remove `import type { Config, Data } from
  '@measured/puck'`; replace with the equivalent core/local types.
- `contact-forms/[id]/page.tsx`, `templates/globals/[id]/page.tsx`,
  `templates/[id]/page.tsx` — each only imports `type { Data }`; replace with
  the actual type returned by `loadEditorData`/`resolveBuilderData`/`toDocument`.

**Verify:** `grep -rl "@measured/puck" "src/app/(admin)"` returns empty;
`pnpm test`, `tsc --noEmit`/`pnpm build`, `pnpm check`; manually click through
all six builder screens end-to-end (edit, save draft, publish, AI dialogs,
save-as-global, save-as-template, editor lock/takeover); confirm the stubbed
panels still behave exactly as before — this phase must not change them.

## Phase 5 — Remove the render-engine branch, `from-puck.ts`, and the Puck parity test

- `src/builder/render-content.tsx` — delete `RenderEngine`,
  `renderEngineFor`, and the engine branching in both functions; keep only
  the core-engine body. Remove the `@measured/puck` import and
  `builderConfig`/`postBuilderConfig` usage.
- `src/builder/check-documents.tsx` — once there's no Puck path to compare
  against, this script's reason for existing goes away. Decide explicitly:
  delete it (and its `pnpm` script entry), or repurpose into a narrower
  "every stored document parses as a valid `BuilderDocument`" check with no
  Puck import. Don't leave it half-updated.
- `scripts/compare-engines.sh` and its `pnpm` script entry — delete.
- `src/builder/definitions/from-puck.ts` — delete.
- `src/builder/definitions/index.ts` — remove `definitionsFromPuck`/
  `rootFieldsFromPuck`/`builderConfig`/`postBuilderConfig` imports;
  `pageDefinitions`/`postDefinitions`/`pageRootFields`/`pageBlockGroups`
  become pure functions of `NATIVE_BLOCKS` and the native categories
  structure from Phase 1.
- `src/builder/config.tsx` — delete once every block's render component is
  confirmed to live outside this file (the 3 native blocks already import
  their components from `src/builder/blocks/*` — follow that pattern for
  every port in Phase 1) and nothing else imports `builderConfig`/
  `postBuilderConfig`/`BLOCK_TYPES`/`BUILDER_VIEWPORTS` from it (move those
  to a small native-only module first if still needed elsewhere).
- `src/builder/custom/index.ts` — delete once Phase 1's native plugin
  mechanism replaces it.
- `src/builder/__tests__/renderer.test.tsx` — rewrite to drop the Puck
  import and comparison; replace with golden-HTML assertions for the same
  block types it covered (flat pages, Columns, Container, Tabs, Gallery,
  CollectionItem, post layouts) captured from the now-verified native
  renderer. This is a real test-design decision — don't silently drop coverage.

**Verify:** `grep -rl "@measured/puck" src packages` returns empty; `pnpm test`,
`tsc --noEmit`/`pnpm build`, `pnpm check`; full manual click-through of all six
builder screens plus every seeded public page/post; confirm
`/api/v1/pages/[slug]` and `/api/v1/posts/[slug]` response shape is unchanged
(they intentionally return "Puck-shaped JSON" per `resolveBuilderData`'s doc
comment, which can become a locally-defined type of the same shape).

## Phase 6 — Remove the `@measured/puck` dependency and dead schema/env

- `package.json` — remove `"@measured/puck": "^0.20.2"`; `pnpm install` to
  update the lockfile.
- `src/db/schemas/sites.schema.ts` — drop the `renderEngine` column (Drizzle
  migration). Per the user's "no dual-engine code left behind," prefer
  actually dropping it over leaving a dead column.
- `src/env.mjs` — remove `BUILDER_RENDER_ENGINE` from schema and mapping;
  remove any `.env`/`.env.example` references.
- `src/server/services/site-context.ts` — remove `renderEngine` from
  `ResolvedSite` and wherever it's selected/constructed.
- Final sweep: `grep -rn "renderEngine\|RenderEngine\|BUILDER_RENDER_ENGINE\|@measured/puck" src packages scripts` must return nothing.

**Verify:** `pnpm install` succeeds, `node_modules/@measured` absent; `pnpm test`,
`tsc --noEmit`/`pnpm build`, `pnpm check`, `pnpm lint`; full regression pass
(dev server, all six builder screens, public site, API routes); confirm the
migration dropping `sites.render_engine` applies cleanly to the seeded dev DB.

## Phase 7 — Update docs/plans that assume Puck exists

- `.cursor/plans/custom_builder_engine_refs.plan.md` — mark R703, R707, R710
  (Gate 36) and batch B14 complete; note plainly that the 30-day soak was
  explicitly waived by product decision for this dev environment, so a
  future reader knows why.
- `.cursor/plans/builder_dual_engine_playbook.md` — delete, or replace its
  body with a short note that the dual-engine period ended on the date of
  this cutover.
- Run `grep -rln "puck" --include="*.md" .` (case-insensitive) to find any
  other README/architecture doc referencing Puck as the current editor —
  don't assume only the two `.cursor/plans` files are affected.

**Verify:** the same grep shows only historical/changelog-style mentions, not
current-tense architecture claims.

## Summary verification checklist (run in full once, at the very end)

1. `grep -rn "@measured/puck\|useGetPuck\|renderEngine\|RenderEngine\|BUILDER_RENDER_ENGINE" src packages scripts package.json` → empty.
2. `pnpm install` — lockfile has no `@measured/puck`.
3. `pnpm test` → all pass.
4. `tsc --noEmit` and/or `pnpm build` → no type errors.
5. `pnpm check` (biome) and `pnpm lint` → clean.
6. `pnpm builder:check-documents` (if kept in some form) → clean.
7. Dev server: all six admin builder screens — create, edit every block
   type, save draft, publish, revisions drawer, AI dialogs, save-as-global,
   save-as-template, editor lock/takeover.
8. Public site: every seeded page and post across all 3 seeded sites
   (including the A/B variant) renders correctly.
9. `/api/v1/pages/[slug]` and `/api/v1/posts/[slug]` return the expected
   Puck-shaped JSON for a sample of seeded slugs.
10. Drizzle migrations apply cleanly to a fresh database (seed → migrate →
    serve), proving the cutover works for a brand-new environment too.

## Critical files
- `src/builder/definitions/native.tsx`
- `src/builder/definitions/index.ts`
- `src/builder/render-content.tsx`
- `src/app/(admin)/dashboard/(fullscreen)/_editor/builder-or-new-editor.tsx`
- `scripts/migrate-content-format.ts`
- `src/builder/check-documents.tsx`
