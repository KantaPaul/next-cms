---

name: P1 CMS finish
overview: "Finish the eleven “P1 — Finish what is started” items (R001–R011): register and render Slider, Tabs, and Accordion, hide contact-form options except for dropdown and radio, record post views, add a public language switcher, wire URL and icon fields, turn typecheck back on, and replace the boilerplate README."
todos:
- id: r001-r002
  content: Keep Slider, Tabs, and Accordion registered; pass title through as the panel label so public and nested renders show headings and slot content.
  status: completed
- id: r003
  content: Show ContactForm options textarea only when the field type is select or radio.
  status: completed
- id: r004-r006
  content: Finish page_views post_id schema and alter SQL, record post views, mount the beacon on posts, and show posts on analytics lists and boards.
  status: completed
- id: r007
  content: Add post hreflang from translationGroupId and a public header language switcher that links only to siblings.
  status: completed
- id: r008-r009
  content: Wire UrlField on Hero, CTA, Pricing, and Image, and IconPickerField on Features.
  status: completed
- id: r010
  content: Turn off typescript.ignoreBuildErrors and fix the 167 tsc errors, starting with the any-typed database client.
  status: completed
- id: r011
  content: Replace README.md with Postgres, Google OAuth, storage, Gemini, and cron setup, then mark R001–R011 done.
  status: completed
  isProject: false

---

# P1 — Finish what is started (R001–R011)

Working tree already has pieces of this slice. Keep them and finish the gaps. Do not start P2, and do not journal [`src/db/migrations/20261022070000_page_views.sql`](src/db/migrations/20261022070000_page_views.sql). That file is R123’s job and must stay unchanged.

## R001–R002 — Slider, Tabs, Accordion

[`src/builder/config.tsx`](src/builder/config.tsx) already lists the three blocks in the Layout category and defines `Slider`, `Tabs`, and `Accordion` with `renderPanels`. [`src/builder/blocks/registry.ts`](src/builder/blocks/registry.ts) already exports them for nested [`BlockList`](src/builder/blocks/block-list.tsx) renders. The public page renders with `<Render config={builderConfig}>` in [`src/app/(site)/[[...slug]]/page.tsx`](src/app/(site)/[[...slug]]/page.tsx).

The labels do not survive that path. Config stores Slider and Accordion titles on `title`, while `renderPanels` and `panelsFrom` only read `label`. Accordion headings on the public site come out empty.

- In `renderPanels` and `panelsFrom` in [`src/builder/blocks/interactive.tsx`](src/builder/blocks/interactive.tsx), use `label ?? title`.
- Leave slot resolution in `renderPanels` so Puck slot functions never cross into the client components.

## R003 — Contact-form options only for dropdown and radio

[`src/builder/fields/contact-form-options-field.tsx`](src/builder/fields/contact-form-options-field.tsx) always renders the textarea. Wire it as the ContactForm `options` array field in [`src/builder/config.tsx`](src/builder/config.tsx).

Inside the field, read the selected Puck item and the array index from the field name. Render the textarea only when that item’s `type` is `select` or `radio`. Returning nothing leaves the stored options in place when the author switches the type away and back.

## R004–R006 — Post views

Schema in [`src/db/schemas/pages.schema.ts`](src/db/schemas/pages.schema.ts) already makes `page_id` nullable and adds `post_id` plus an index. Finish it:

- Check constraint `num_nonnulls(page_id, post_id) = 1`, same idea as `preview_tokens`.
- Relate `pageViews.post` and `posts.views`.
- Hand-write a follow-up SQL file that alters the existing table (`DROP NOT NULL` on `page_id`, add `post_id`, FK, index, check). Do not edit the unjournaled create script, and do not run `drizzle-kit generate`. The latest snapshot has no `page_views`, so generate would emit `CREATE TABLE` and collide with R123. Apply the alter locally with `pnpm db:push` (or the SQL file) against the current database. Leave both SQL files out of [`src/db/migrations/meta/_journal.json`](src/db/migrations/meta/_journal.json).

[`analyticsService.recordView`](src/server/services/analytics.service.ts) still requires a published page and writes `postId` only as an extra column. Change it so the body is exactly one of `pageId` or `postId`:

- Page path stays as it is: published, public, not deleted, deduped on `(pageId, visitorId)`.
- Post path checks the same on `posts`, dedupes on `(postId, visitorId)`, and inserts `postId` with `pageId` null.

[`src/app/api/analytics/view/route.ts`](src/app/api/analytics/view/route.ts) and [`ViewBeacon`](src/components/analytics/view-beacon.tsx) accept `pageId` or `postId`, still skip preview cookies, and still require `path`.

Mount the beacon in `PostRoute` in [`src/app/(site)/[[...slug]]/page.tsx`](src/app/(site)/[[...slug]]/page.tsx) for published posts only, with `postId` and `PAGES.SITE.post(...)`.

Include posts anywhere a page list is built from `page_views`:

- `summary.topPages`, `trends` list `pages`, and widget dimension `page`: union page rows and post rows (title, path, id). Inner-joining only `pages` drops post views.
- Trends filter and board widget filter: optional `postId` beside `pageId`, mutually exclusive. Add `postId` as optional on [`widgetQuerySchema`](src/db/schemas/analytics.schema.ts) so saved boards still parse. The board editor lists published posts under the existing page picker.
- Edit links go to the post editor when the row is a post.

## R007 — Language switcher and hreflang

Pages already emit `alternates.languages` from `translationGroupId` in `generateMetadata`. Posts do not.

- Load published (or, in preview, group) siblings in [`src/server/services/blog.service.ts`](src/server/services/blog.service.ts), same shape as `loadAlternates` in [`src/server/services/public-site.service.ts`](src/server/services/public-site.service.ts).
- Set post `alternates.languages` in `postMetadata` with `PAGES.SITE.post`. Omit the map when there is only one language.
- Add a compact switcher in the public header in [`src/app/(site)/layout.tsx`](src/app/(site)/layout.tsx). The layout does not receive the catch-all slug, and P2-08 owns middleware, so the switcher is a client island: `usePathname()` plus a server lookup that runs `resolveRoute` / `resolvePostRoute`, then returns only locales that have a sibling. Labels come from `SUPPORTED_LANGUAGES`. The current locale is marked, not linked. Hide the control when there is no sibling.

## R008–R009 — URL field and icon picker

[`UrlField`](src/builder/fields/client-fields.tsx) and [`resolveLinkProps`](src/builder/style.ts) already exist. [`ButtonLink`](src/builder/blocks/section.tsx) already accepts `UrlValue`. Hero, CTA, and Pricing still use `text()` for links; Image uses `href={p.link}` as a string.

- Point Hero `primaryButtonLink` / `secondaryButtonLink`, CTA’s two links, Pricing `buttonLink`, and Image `link` at `UrlField`.
- Widen those prop types to `UrlValue`. Image wraps with `resolveLinkProps` (`target` and `rel` when set).
- A plain string is still valid. `UrlField` stores a string when “new tab” and “nofollow” are off, so current pages keep working. Leave the AI block schemas as strings.

Replace Features `icon: select('Icon', ICON_OPTIONS)` with `IconPickerField`. Stored values stay icon name strings.

## R010 — Typecheck

[`next.config.ts`](next.config.ts) has `typescript.ignoreBuildErrors: true`. `tsc --noEmit` currently reports **167** errors. About 130 are implicit `any` because [`createDrizzleConnection`](src/db/index.ts) returns `drizzle(...)` or an `any` Proxy, so the exported client collapses to `any`.

- Type the exported client as `NodePgDatabase<typeof schema>` and cast only the fallback proxy. Annotate the pool `error` callback.
- Then fix what remains:
  - Drop the re-export of missing `aliasEntrance`, `aliasExit`, and `aliasHover` from [`src/builder/style.ts`](src/builder/style.ts). Nothing imports them. Drop the `!== ''` checks in `resolveAnimation`; those unions do not include `''`.
  - [`HoverSettings`](src/builder/style.ts) has `fill`, not `fillColor`. Point the hover background picker in [`section-inspector.tsx`](src/builder/controls/section-inspector.tsx) at `fill`. Remove the `filter` hover control or stop reading a field the type does not have.
  - [`MotionSection`](src/builder/motion.tsx) does not take `hasItems`, and [`MotionItem`](src/builder/motion.tsx) does not take `as`. Accept `hasItems` and wrap children in `MotionBoundary` the same way `Section` does. Let `MotionItem` render `details` for FAQ.
  - [`sql-helpers.ts`](src/lib/utils/sql-helpers.ts) calls `Day.parseDate` / `Day.isValid`. `Day` is the dayjs function. Use `dayjs(value).isValid()` (and the existing `isValidDate` helper).
  - Annotate the few remaining callbacks and the status-map indexes (`TS7053`) once `db` is typed.
- Set `ignoreBuildErrors` to `false`. `pnpm exec tsc --noEmit` must exit 0. Do not loosen `strict`.

## R011 — README

Replace the create-next-app stub in [`README.md`](README.md) with setup that matches this repo:

- `pnpm install`, `docker compose up -d` (Postgres user `nextcms`, database `nextcms`, port 5432 from [`docker-compose.yml`](docker-compose.yml)).
- `DATABASE_URL`, then `pnpm db:migrate` and `pnpm db:seed`. Note that `page_views` is applied with `pnpm db:push` until R123 journals it.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (`/login/google/callback`). Login starts at `/login/google`.
- Storage: `STORAGE_DRIVER=local` (default, `MEDIA_LOCAL_DIR`) or `s3` with the `S3_*` vars from [`src/env.mjs`](src/env.mjs).
- Gemini: optional `GEMINI_API_KEY` and `GEMINI_MODEL`.
- Cron: `GET` or `POST` `/api/cron/publish` with `Authorization: Bearer $CRON_SECRET`. Without the secret the route returns 503; the public layout also calls `maybePublishScheduled` as a best-effort fallback.
- `pnpm dev` on port 3000. Admin is `/dashboard`, the site is `/`.

After the work, mark R001–R011 completed in [`.cursor/plans/combined_cms_refs_f96163bc.plan.md`](.cursor/plans/combined_cms_refs_f96163bc.plan.md).
