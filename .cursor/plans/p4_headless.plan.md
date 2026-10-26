---
name: P4 Headless
overview: Add site-scoped collections with validated JSON entries and generated admin screens, then expose them through a public collection route and draft-first API writes. Existing read keys keep working; publish stays behind pages.publish; rate limits and webhooks move to Postgres.
todos:
  - id: r040-r041
    content: Add collections, fields, and entries, and validate entry JSON from the field list.
    status: pending
  - id: r042
    content: Generate the admin list and edit screens for collections and entries.
    status: pending
  - id: r043
    content: Add the CollectionItem block and the public /{collection}/{slug} route.
    status: pending
  - id: r044-r045
    content: Scope API keys and add draft-first write endpoints for pages, posts, entries, and media.
    status: pending
  - id: r046
    content: Replace the in-memory API rate limit with a Postgres window.
    status: pending
  - id: r047
    content: Add signed webhook subscriptions and a delivery log.
    status: pending
isProject: false
---

# P4 — Headless (R040–R047)

Do not start P5. Pages and posts stay first-class. Collections do not replace them. Do not add a second permission matrix or a second crypto package. Do not edit the unjournaled page-views SQL. Journal new tables with `pnpm db:generate`, then migrate. If generate emits `CREATE TABLE page_views` or `CREATE TABLE analytics_dashboards`, delete those statements and leave the snapshot as generated.

Every new table has `site_id` defaulting to `default` and an index. Admin reads and writes use `adminSiteId()`. Public reads use `siteContext.publicSite()`. API reads and writes use the verified key’s `siteId`, which [`apiHandler`](src/server/api/v1.ts) already checks against the host. Do not call `adminSiteId()` from a v1 route: it redirects to login when there is no dashboard session. [`GET /api/v1/media`](src/app/api/v1/media/route.ts) currently does that through `mediaService.list`. Give that list a `siteId` argument and pass the public site.

Reuse existing permissions:

- Defining a collection and its fields requires `settings.manage`.
- Creating and editing entries uses `pages.create` and `pages.edit`.
- Publishing an entry uses `pages.publish`.
- Creating and revoking keys stays `api.manage`.
- Webhook subscriptions use `settings.manage`.

## R040–R041 — Collections and validated entries

New tables in a collections schema, exported from [`src/db/schema.ts`](src/db/schema.ts):

- `collections`: `id`, `site_id`, `name`, `slug`, nullable `template_page_id` (a page on the same site). Unique `(site_id, slug)` where `deleted_at` is null. `slug` cannot be a site locale code, `blog`, or anything in `RESERVED_SLUGS`.
- `collection_fields`: `collection_id`, `key`, `label`, `type`, `required`, `position`, `config` jsonb. Types are `text`, `richtext`, `number`, `boolean`, `date`, `select`, `media`, and `relation`. `config` holds select choices (`string[]`) or the related collection id. Unique `(collection_id, key)`.
- `collection_entries`: `site_id`, `collection_id`, `slug`, `status` (`draft` or `published`), `data` jsonb, `published_at`. Unique `(collection_id, slug)` where `deleted_at` is null. Entries are not translated. One document per entry.

[`src/server/services/collections.service.ts`](src/server/services/collections.service.ts) builds a Zod object from the field rows and parses `data` on create and update. Unknown keys are stripped. Rules:

- `text` and `richtext` are strings. Rich text is sanitized with the existing sanitizer when rendered, not stored as a second format.
- `number` is a finite number. `boolean` is a boolean. `date` is an ISO date string.
- `select` must be one of the field’s choices.
- `media` is a media id that belongs to the same site, or an empty string when optional.
- `relation` is an entry id in the configured collection on the same site. A collection cannot relate to itself in a way that creates a cycle of required relations; optional self-relations are allowed.
- Required fields fail validation. Optional fields may be omitted.

A failed parse returns the field errors to the admin form and `400` from the API.

## R042 — Generated admin screens

`/dashboard/collections` lists the active site’s collections and creates one (name, slug). `/dashboard/collections/[id]` edits the field list: add, rename, reorder, and delete fields. Deleting a field does not rewrite existing JSON; validation ignores stored keys that are no longer in the schema, and the editor simply stops showing them.

`/dashboard/collections/[id]/entries` is the generated list: slug, status, updated time, and one column per text field up to three. `/dashboard/collections/[id]/entries/[entryId]` is the generated edit form. Each field type renders with the existing dashboard inputs (text, textarea, number, checkbox, date, select, and the media picker). A relation is a select of the target collection’s entries. Save stays a draft. Publish and unpublish call the entry service and require `pages.publish`.

Add a Collections item to the dashboard menu next to Pages, gated by `pages.edit` for the list and `settings.manage` for the schema screen. Viewers can open neither.

## R043 — CollectionItem and the public route

Register `CollectionItem` in [`src/builder/config.tsx`](src/builder/config.tsx) under a Collections category. It has no required props. In the editor it shows a placeholder: the block fills in on the collection URL. On the public site it reads the current entry from a small React context.

Public resolution in [`src/app/(site)/[[...slug]]/page.tsx`](src/app/(site)/[[...slug]]/page.tsx) stays page, then post, then collection. A collection hit is exactly two segments whose first segment is not a locale code: `/{collectionSlug}/{entrySlug}`. Load the published entry for the public site. Render the collection’s `template_page_id` with the existing Puck renderer, and set the entry context so every `CollectionItem` on that page prints the entry. The block lists each field’s label and value. Rich text goes through the sanitizer. Media renders the asset URL. A relation renders the related entry’s slug.

If the collection has no template page, render a plain field list in the site layout instead of 404ing. Draft entries and other sites’ entries 404. A collection slug does not steal `/blog/...` or `/{locale}/...`, because those are resolved first.

The collection editor can pick the template page from the active site’s pages.

## R044–R045 — Scoped keys and draft-first writes

Add `scopes text[] not null default '{content:read}'` to `api_keys`. Existing keys keep read access and do not gain write. The API keys screen offers `content:read`, `content:write`, and `media:write` when creating a key. Scopes are fixed after creation because the plaintext is shown once.

[`apiHandler`](src/server/api/v1.ts) takes the scopes a route requires. Missing scope is `403`. Existing `GET` routes require `content:read`. CORS methods become `GET, POST, PATCH, OPTIONS`.

New routes, all on the key’s site, all draft-first:

- `POST /api/v1/pages` and `PATCH /api/v1/pages/[id]` with `content:write`. Create uses the pages service with status `draft`. Patch refuses a published row: the caller must duplicate or edit in the dashboard. The body is title, slug, language, and optional Puck `content`. Language must be one of the site’s locales.
- `POST /api/v1/posts` and `PATCH /api/v1/posts/[id]`, same rule.
- `POST /api/v1/collections/[slug]/entries` and `PATCH /api/v1/collections/[slug]/entries/[id]` with `content:write`. Body is slug plus `data`. Status stays `draft`.
- `POST /api/v1/media` with `media:write`, multipart file upload through the existing storage adapter. The asset’s `site_id` is the key’s site.

`POST .../publish` exists for pages, posts, and entries and is the only write that publishes. It loads the key’s `createdBy` user and checks `pages.publish` on that site through `getUserAccess`. No creator, or a creator without that permission, returns `403`. Unpublish is not an API route.

Extend the hand-written OpenAPI document in [`src/server/api/openapi.ts`](src/server/api/openapi.ts) with these routes and the scope list. `GET /api/v1/openapi` stays public.

## R046 — Postgres rate limit

Replace the in-memory `Map` in [`src/server/api/v1.ts`](src/server/api/v1.ts) with `api_rate_windows` (`api_key_id`, `window_start`, `count`, primary key on the first two). The window is the current minute. One statement inserts the row or increments `count` and returns it. The limit stays 60 requests per minute, with the same `X-RateLimit-*` and `Retry-After` headers. Two processes share the count because it lives in Postgres.

## R047 — Signed webhooks

`webhook_subscriptions`: `site_id`, `url`, `secret`, `events` text array, `disabled_at`. Events are `content.published`, `content.unpublished`, `form.submitted`, and `entry.changed`. The secret is a random value shown once, stored as plaintext only because it is a signing key, not a password. The admin page at `/dashboard/webhooks` (`settings.manage`) creates a subscription, shows the secret once, and lists recent deliveries. It can disable a subscription.

`webhook_deliveries`: `subscription_id`, `event`, `payload` jsonb, `status` (`pending`, `delivered`, `failed`), `response_status`, `error`, `created_at`.

After a successful page or post publish or unpublish, a form submit, or an entry create, update, or delete, write one delivery row per matching subscription and `POST` the JSON body. The header is `X-CMS-Signature: sha256=<hex>` using Node `crypto` HMAC-SHA256 over the raw body. A non-2xx response or a network error marks the row `failed` and stores the status or message. It does not retry and does not fail the user’s action. Await the delivery with a short timeout so the log is written before the response returns.

The payload is `{ id, event, siteId, occurredAt, data }`. `data` is the public id, type (`page`, `post`, `entry`, or `form`), and slug when there is one. It does not include the form’s field values beyond the submission id.

## Verification

`pnpm exec tsc --noEmit` exits 0. Do not loosen `strict`.

In the browser, on the active site: create a collection with a text field, add a draft entry, publish it, place `CollectionItem` on a page, set that page as the template, and open `/{collection}/{slug}`. The entry’s text is on the page. A draft slug 404s.

With curl against the dev server: a key with only `content:read` can `GET /api/v1/pages` and receives `403` on `POST /api/v1/pages`. A key with `content:write` creates a draft page and receives `403` on publish when the key owner lacks `pages.publish`. An Admin-owned key with `content:write` can publish. `POST /api/v1/media` with `media:write` stores a file on that site. After a publish, a webhook subscription aimed at a closed local port leaves a `failed` delivery row, and the publish itself still succeeds. The `api_rate_windows` row for that key increases.

Mark R040–R047 completed in [`.cursor/plans/combined_cms_refs_f96163bc.plan.md`](.cursor/plans/combined_cms_refs_f96163bc.plan.md). Leave R048 pending. Do not commit unless asked.
