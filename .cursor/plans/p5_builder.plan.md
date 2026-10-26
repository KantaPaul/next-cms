---
name: P5 Builder
overview: Add the missing marketing blocks, including the image-morph block, and load extra blocks from src/builder/custom without editing the Puck config again. Pages and posts get a soft edit lock, and a page can run one A/B variant with a manual winner.
todos:
  - id: r048-r057
    content: Add Video, Embed, Logo cloud, Team, Timeline, Map, Spacer, Button, Code, and Newsletter blocks.
    status: pending
  - id: r058
    content: Add the Image Morph block, inspector, and sanitized SVG path extraction.
    status: pending
  - id: r059-r060
    content: Load local plugins from src/builder/custom and document the registration type.
    status: pending
  - id: r061
    content: Soft-lock the page and post builders and show who has them open.
    status: pending
  - id: r062-r063
    content: Run one A/B variant per page, record it on the beacon, and pick a winner by hand.
    status: pending
isProject: false
---

# P5 — Builder (R048–R063)

Do not start P6. Do not build the `VideoLibrary` widget (R150), the Location block (R318), `parseVideoUrl` (R126), or `buildEmbed` (R127). Do not add a second Team component for R317. Do not edit the unjournaled page-views SQL. New columns and tables are journaled with `pnpm db:generate`, then migrate. If generate emits `CREATE TABLE page_views` or `CREATE TABLE analytics_dashboards`, delete those statements and leave the snapshot as generated.

Every new block is registered once in [`src/builder/config.tsx`](src/builder/config.tsx) and in [`src/builder/blocks/registry.ts`](src/builder/blocks/registry.ts), so columns and global blocks can render it. Each block is wrapped in the existing `Section` and gets the `section` field from `withSection`, which is the section inspector. These blocks stay on the page builder. Do not add them to `POST_BLOCK_TYPES`. Leave [`src/builder/schema.ts`](src/builder/schema.ts) unchanged so AI page generation does not emit them.

## R048–R057 — Block library

Add a Marketing category for Logo cloud, Team, and Timeline, and keep the smaller blocks in Content or Layout.

- **Video** (`Video`). One URL field. The block itself recognizes a YouTube watch or embed URL, a Vimeo URL, or a direct `https` `.mp4` or `.webm` URL, and renders that one player. Anything else shows the empty state in the editor and nothing on the public page. This helper stays private to the block. It is not `parseVideoUrl` and it is not the library widget.
- **Embed** (`Embed`). One `https` URL. Render a sandboxed iframe only when the host is YouTube, Vimeo, Google Maps, or OpenStreetMap. Do not render pasted HTML or scripts.
- **Logo cloud** (`LogoCloud`). A list of media URL, alt text, and optional link, using the existing `UrlField` and media field.
- **Team** (`Team`). A list of photo, name, and role. This is the only Team block. R317 later confirms these fields and does not register a second component.
- **Timeline** (`Timeline`). A list of date, title, and body text.
- **Map** (`Map`). An address string shown as text and as an OpenStreetMap search iframe. No hours field and no map-link field. Those belong to Location (R318), which this phase does not build.
- **Spacer** (`Spacer`). A height in pixels, clamped, with no other content.
- **Button** (`Button`). Label, `UrlField` link, and alignment.
- **Code** (`Code`). A plain textarea. Render it in `pre`/`code` with the text escaped. Do not add a syntax-highlighting package.
- **Newsletter** (`Newsletter`). Title, short text, and an email field. The client posts to the existing `/api/forms/submit` with the honeypot field `company` and a hidden form name `newsletter`. Submissions land in the form inbox from R012. Do not add a second inbox or a second mail path.

## R058 — Image morph

Follow [image_morphing_block_544e3097.plan.md](.cursor/plans/image_morphing_block_544e3097.plan.md). `ImageMorph` is a content block on pages and inside global blocks, not a style control on other blocks. It keeps the shared `section` field.

- [`src/builder/morph.ts`](src/builder/morph.ts) exports `resolveMorph`. It is the only reader of the stored JSON and drops unknown keys with the existing `pick`, `clamp`, `safeColor`, and `safeUrl` helpers. Effect is `image`, `color`, or `gradient`. Shape is four built-in closed blob paths, or 2–6 custom shapes whose stored value is sanitized path `d` strings. Timing is an allowlisted easing, direction `normal` | `reverse` | `alternate`, loop, and clamped duration, delay, and end delay. Style is opacity, zoom, position, and filters built only from clamped numbers.
- One custom field, [`src/builder/controls/image-morph.tsx`](src/builder/controls/image-morph.tsx), using `Choose`, `Slider`, `SelectInput`, `ColorInput`, and `MediaField`. Content tab: effect, shape, timing. Style tab: image, color, gradient, shape size. Layout tab: nothing from this field. With no tab, every group is visible.
- Custom shapes come from the media library. A media action loads that row only, rejects a non-SVG, caps the body size, and returns path data. The stored value is never SVG markup. The field asks for at least two shapes. Do not embed a blob drawing tool.
- [`src/builder/blocks/image-morph.tsx`](src/builder/blocks/image-morph.tsx) is a client component. Image fill uses `<image>` inside a `<clipPath>`. Color fill uses a `<path>` with optional stroke. Gradient fill uses a `<linearGradient>` from the resolved numbers. `flubber` interpolates the paths. `prefers-reduced-motion` shows the first shape and does not animate. Invalid or single-shape data renders the first path with no tween. `useId` keeps clip and gradient ids unique. Add the `flubber` dependency.

## R059–R060 — Local plugins

[`src/builder/custom/index.ts`](src/builder/custom/index.ts) exports an array of block registrations. [`src/builder/config.tsx`](src/builder/config.tsx) and [`src/builder/blocks/registry.ts`](src/builder/blocks/registry.ts) spread that array once. Adding a later block means adding a file under `src/builder/custom/` and one line in that index. It does not mean editing `config.tsx` again.

The registration type is:

```ts
type CustomBlock = {
  key: string;
  label: string;
  category?: string;
  fields: Fields;
  defaultProps: Record<string, unknown>;
  render: ComponentType<Record<string, unknown>>;
};
```

The loader adds the `section` field, so a plugin does not reimplement the section inspector. A duplicate `key` that matches a built-in block is ignored. Document this type, the folder, and the index line in the README. There is no marketplace and no remote install.

Ship one example file, `src/builder/custom/example.tsx`, registered in the index, so the loader is exercised. It renders a heading and a text line and can be removed by deleting those two references.

## R061 — Soft lock and presence

New table `editor_locks`: `target_type` (`page` or `post`), `target_id`, `user_id`, `last_seen_at`. Unique on `(target_type, target_id)`.

The page and post builders send a heartbeat every 20 seconds while open, and once on close. The lock is fresh for 2 minutes after `last_seen_at`. The first editor to open a document holds it and can save. A second editor sees that person’s name, the canvas is read-only, and Take over stays disabled until the lock is stale. Take over rewrites the row and the previous editor’s next save is rejected with a message that someone else took the document. Autosave uses the same check. There is no shared cursor and no merge of two Puck documents.

The heartbeat and take-over actions require `pages.edit` on the active site. A lock for a page or post on another site is not readable.

## R062–R063 — One variant per page

New table `page_experiments`: `page_id` unique, `variant_content` jsonb, `weight` integer default 50, `status` (`draft`, `running`, or `ended`). Posts are not included. A page has at most one variant.

The page sidebar, for a published builder page, edits the variant document in the same builder and sets the split weight from 1 to 99. Weight is the chance of B. Starting the experiment requires `pages.publish` and a non-empty variant. Ending it stops the split and leaves the published page as it is.

On a public request for a running experiment, the server reads cookie `cms_ab`. The cookie value is `{pageId}:{a|b}`. A missing or foreign value assigns `b` when a random integer from 1 to 100 is less than or equal to `weight`, otherwise `a`, and sets the cookie for 30 days. `a` renders the published page content. `b` renders `variant_content`. Preview still shows the draft, not the variant.

Add nullable `variant` (`a` or `b`) to `page_views` in the new migration only. [`ViewBeacon`](src/components/analytics/view-beacon.tsx) sends that value, and [`analyticsService.recordView`](src/server/services/analytics.service.ts) stores it. Views without an experiment stay null.

The analytics board query for a page gains a variant breakdown: view count and unique visitors for `a` and `b`. The page sidebar shows the same two counts and a Pick winner action. Picking A keeps the published content. Picking B copies `variant_content` onto the published content. Either choice sets the experiment to `ended`. Both require `pages.publish`. Do not compute significance, confidence, or a recommended winner.

## Verification

`pnpm exec tsc --noEmit` exits 0. Do not loosen `strict`.

In the browser, add Team, Newsletter, and Image Morph to a page. Publish it and confirm the public page shows the team members, a newsletter submit appears in the form inbox, and the default blobs morph. Confirm `prefers-reduced-motion` holds the morph on the first shape. Open the same page builder in a second session and confirm the second session is read-only until the lock is stale. Start an experiment, load the public page twice with a cleared cookie, and confirm the beacon rows carry `a` or `b`. Pick a winner and confirm the experiment stops.

Mark R048–R063 completed in [`.cursor/plans/combined_cms_refs_f96163bc.plan.md`](.cursor/plans/combined_cms_refs_f96163bc.plan.md). Leave R064 pending. Do not commit unless asked.
