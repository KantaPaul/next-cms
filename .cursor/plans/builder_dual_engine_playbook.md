# Dual render engine playbook (R804)

How to move sites from the Puck renderer to the new renderer (`@nextcms/builder-core`) and back. Part of [custom_builder_engine_refs.plan.md](custom_builder_engine_refs.plan.md), batch B2.

## What the switch does

- Each site has `sites.render_engine`: `puck` (default) or `core`. It only changes how **published content is rendered**: the public pages, single posts, collection entry templates, A/B variant B, and `/api/v1/pages/{slug}` and `/api/v1/posts/{slug}`.
- The editor is still Puck. Both engines read the same stored Puck data, and nothing is written or converted, so switching back is always safe.
- `/api/v1` returns the same Puck-shaped JSON on both engines.

## How to switch

| Action | How | Takes effect |
|---|---|---|
| Switch one site | Dashboard → **Sites** → render engine menu on the site's row (needs settings permission; logged in the audit log as "Render engine: puck → core") | Next request; the site's public cache is cleared |
| Force every site to Puck (kill switch) | Set `BUILDER_RENDER_ENGINE=puck` and restart or redeploy | After restart; overrides every site's setting |
| Force every site to the new renderer (testing) | Set `BUILDER_RENDER_ENGINE=core` and restart | After restart |
| Back to per-site settings | Remove `BUILDER_RENDER_ENGINE` and restart | After restart |

## Before switching a site

1. `pnpm builder:check-documents`: every stored document round-trips, renders the same HTML, and loads the same data.
2. `pnpm builder:compare-engines <base-url>` against a local or staging copy: every published page and post renders the same `<main>` HTML on both engines. Never run it against production, because it changes `render_engine` while it runs.
3. `pnpm test` passes.

## Rollout order

1. **Dev Blog** (fewest pages), then wait 7 days.
2. **Acme Marketing**, then wait 7 days.
3. **Next CMS** (main).

Move to the next site only when the current one has had no new errors for 7 days.

## What to watch after switching

- Server logs for `[builder/loaders]`: a block's data loader failed.
- 5xx rate and page response time for the site, compared with the week before.
- Pages that look wrong: compare with the same URL on a site still on Puck, or switch the site back.

## Known differences between the engines

- **A loader that fails:** on Puck the whole page fails; on the new renderer the page renders without that block's data and the error is logged. This is intentional, so one failing block does not take a page down.
- **A/B variant B:** now loads block data (blog lists, videos) on both engines. Before B2, Puck rendered variant B without loading it.
- **Blocks saved without an id:** the new renderer gives them stable generated ids internally; stored data and API output keep them without an id, as Puck does.

## Rollback

- **One site misbehaves:** switch it back to Puck in Sites. No data needs restoring.
- **Several sites or unsure:** set `BUILDER_RENDER_ENGINE=puck` and restart. Investigate, then remove the variable.
- **After a content publish:** nothing to roll back. Publishing writes the same Puck data whichever engine renders it.

## How long dual mode lasts

Until Gate 36 (R710). Both engines stay in the code while the new editor is built (B3 to B7) and stored data is migrated (R703). Puck rendering is removed in R707, after every site has run on the new renderer without rollback for at least 30 days.

## Evidence for Gate 34 (approved 2026-10-29)

- `pnpm test`: 87 tests pass, including renderer tests against Puck's server build (`@measured/puck/rsc`) for flat pages, Columns, Container, Tabs, Gallery, CollectionItem, and post layouts, plus a check that every block in both Puck configs has a renderer component.
- `pnpm builder:check-documents`: 63 stored documents round-trip unchanged and render the same HTML; 60 load the same data, and the other 3 (the Blog listing template) need a live request and were compared on the site.
- `pnpm builder:compare-engines http://localhost:3100`: 12 of 12 published pages and posts render the same; a temporary page using the Blog listing template also rendered the same with real posts.
- The Sites selector switched Dev Blog to the new renderer and back, with both changes in the audit log.
- Not checked live: `/api/v1` content, which needs an API key; its output comes from the same `resolveBuilderData` the document check compares.
