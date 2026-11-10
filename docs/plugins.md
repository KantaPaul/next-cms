# Next CMS Plugin Developer Guide

Next CMS uses **build-time code plugins**. Plugins are local folders under `plugins/` or published npm packages listed in `nextcms.plugins.ts`. Adding, updating, or removing a plugin requires syncing (`pnpm plugins:sync`), rebuilding, and redeploying; site admins then enable, disable, and configure plugins per site in **Dashboard → Plugins**.

---

## 1. Quick Start

Scaffold a new plugin with the starter command:

```bash
pnpm plugin:new my-plugin
```

This creates `plugins/my-plugin/` with:
- `plugin.server.ts` — server-side definition (`definePlugin`)
- `plugin.client.tsx` — browser-side definition (`defineClientPlugin`)
- `README.md` — local notes
- `__tests__/my-plugin.test.ts` — unit test

It also registers `'./plugins/my-plugin'` in `nextcms.plugins.ts` and runs `pnpm plugins:sync` to regenerate `src/plugins/generated/`.

Run `pnpm dev` or `pnpm build` (both run `pnpm plugins:sync` automatically).

---

## 2. Plugin Anatomy

Every plugin separates server and client entry points so server secrets, database queries, and Node APIs are never bundled into browser code:

| File | Runs on | SDK entry | Purpose |
| --- | --- | --- | --- |
| `plugin.server.ts` | Server only | `definePlugin` from `@nextcms/plugin-sdk` | Metadata, settings schema, permissions, hooks, filters, API routes, cron jobs, form actions |
| `plugin.client.tsx` | Browser + SSR | `defineClientPlugin` from `@nextcms/plugin-sdk/client` | Builder blocks, custom inspector fields, admin dashboard pages |

See `plugins/reading-time/` for a fully commented template.

---

## 3. Server Definition (`definePlugin`)

```ts
import { definePlugin } from '@nextcms/plugin-sdk';
import { z } from 'zod';

export default definePlugin({
  id: 'my-plugin',          // lowercase kebab-case
  name: 'My Plugin',
  version: '1.0.0',         // semver
  description: 'What the plugin does.',
  requires: '>=0.1.0',      // compatible Next CMS semver range
  settings: { /* ... */ },
  permissions: [ /* ... */ ],
  hooks: { /* ... */ },
  filters: { /* ... */ },
  routes: [ /* ... */ ],
  cron: [ /* ... */ ],
  formActions: [ /* ... */ ],
});
```

### Runtime Context (`ctx`)

Every hook, filter, route handler, cron job, and form action receives `ctx`:

- `ctx.pluginId` — the plugin's `id`
- `ctx.settings` — the plugin's saved settings for the current site, with `secret: true` fields decrypted (server-side only)
- `ctx.site` — `{ id, name, slug, url, defaultLocale }`
- `ctx.logger` — `{ info, warn, error, debug }` prefixed with `[plugin:<id>]`
- `ctx.mail` — CMS `sendMail({ to, subject, text, replyTo })` helper
- `ctx.storage` — active storage driver (`put`, `read`, `remove`)
- `ctx.safeFetch` — SSRF-protected `fetch` (`src/server/lib/safe-fetch.ts`)
- `ctx.db` — Drizzle database client
- `ctx.kv` — scoped key-value store (`get`, `set`, `delete`, `list`) backed by `plugin_kv`

---

## 4. Settings & Secrets

Declare a Zod object schema and field metadata:

```ts
settings: {
  schema: z.object({
    apiKey: z.string().optional(),
    wordsPerMinute: z.coerce.number().int().min(50).max(1000).default(200),
  }),
  fields: {
    apiKey: {
      label: 'API Key',
      secret: true,
      placeholder: 'sk_...',
    },
    wordsPerMinute: {
      label: 'Words per minute',
      type: 'number',
      defaultValue: 200,
    },
  },
}
```

- Supported `type` values: `'text' | 'password' | 'textarea' | 'number' | 'boolean' | 'select' | 'url'`.
- **Secrets (`secret: true`)**:
  - Encrypted at rest in `plugins.settings` using AES-256-GCM with `PLUGIN_SECRET_KEY` (falling back to `AUTH_SECRET`).
  - Masked (`••••...`) before being sent to any browser/admin UI. Submitting the mask leaves the stored secret intact.
  - Scrubbed automatically from site backups.

---

## 5. Action Hooks Reference

Action hooks run asynchronously after the HTTP response via Next.js `after()` (with a 10 s timeout and per-plugin `try/catch` isolation; failures are recorded on `plugins.last_error` and the audit log).

| Hook | Payload | Fired from |
| --- | --- | --- |
| `content.published` | `{ id, type: 'page' \| 'post' \| 'entry', slug?, title?, siteId, actorId?, scheduled? }` | `pages.service.ts`, `posts.service.ts` (`create`, `update`, `publish`, `publishDueScheduled`) |
| `content.unpublished` | `{ id, type, slug?, title?, siteId, actorId? }` | `pages.service.ts`, `posts.service.ts` (`update`, `unpublish`) |
| `content.deleted` | `{ id, type, slug?, title?, siteId, actorId? }` | `pages.service.ts`, `posts.service.ts` (`softDelete`) |
| `entry.changed` | `{ id, type: 'entry', collectionId?, slug?, action, siteId, actorId? }` | `collections.service.ts` (`createEntry`, `updateEntry`, `publishEntry`, `unpublishEntry`, `deleteEntry`, `publishDueScheduledEntries`) |
| `form.submitted` | `{ submissionId, siteId, payload, files }` | `form-actions.ts` |
| `comment.created` | `{ id, postId, parentId, authorName, status, siteId }` | `comments.service.ts` |
| `media.uploaded` | `{ id, key, url, filename, mime, size, siteId, actorId? }` | `media.service.ts` |
| `user.signed_in` | `{ userId, method, siteId? }` | `staff-auth.service.ts`, OAuth callback |

Webhooks are a built-in subscriber of `content.*`, `form.submitted`, and `entry.changed`, so publishing from either the dashboard or the REST API triggers webhook deliveries once.

---

## 6. Filters Reference

Filters run synchronously in ascending `priority` order (default `10`). If a plugin throws, it is logged to `plugins.last_error`, skipped, and the previous value passes through unchanged.

### `form.actions`

Registers extra "Actions after submit" on Contact Form blocks (or declare `formActions: [...]` directly on `definePlugin`).

### `site.head` (Consent Rule)

Lets plugins add `<meta>`, `<link>`, non-script HTML, or `<script>` tags to `<head>`.

**Important:** Any script added through `site.head` **must** declare `consentCategory: 'necessary' | 'functional' | 'analytics' | 'marketing'`. Scripts without a valid `consentCategory` are rejected at runtime. Approved scripts are routed through `<CustomCode />` (`src/components/site/custom-code.tsx`) so they obey the site's cookie consent banner.

```ts
filters: {
  'site.head': items => [
    ...items,
    { type: 'meta', attrs: { name: 'my-plugin', content: 'active' } },
    {
      type: 'script',
      consentCategory: 'analytics',
      src: 'https://example.com/tracker.js',
      defer: true,
    },
  ],
}
```

### `content.html`

Transforms sanitized post body HTML, RichText block HTML, and classic page HTML before rendering. Output is cached with the rendered Next.js page and invalidated when a plugin is toggled or updated.

---

## 7. Blocks, Custom Fields, and Admin Pages (`defineClientPlugin`)

```tsx
import { defineBlock } from '@nextcms/builder-core';
import { defineClientPlugin } from '@nextcms/plugin-sdk/client';

export default defineClientPlugin({
  id: 'my-plugin',
  blocks: [
    defineBlock({
      type: 'my-plugin/Banner', // MUST start with "<pluginId>/"
      label: 'Plugin Banner',
      category: 'content',
      render: () => <div>Banner</div>,
    }),
  ],
  fields: {
    'my-picker': MyCustomInspectorField,
  },
  adminPages: [
    {
      slug: 'overview',
      title: 'My Plugin Overview',
      permission: 'my_plugin.manage',
      component: MyAdminPage,
    },
  ],
});
```

- **Block namespacing:** Every block `type` must start with `<pluginId>/` (e.g. `reading-time/ReadingTime`).
- **When a plugin is disabled:**
  - Its blocks are removed from the editor insert panel.
  - Existing instances show a **"Plugin disabled"** notice in the editor and render nothing on the public site.
  - Its admin pages (`/dashboard/plugins/<id>/<page>`) and API routes (`/api/plugins/<id>/...`) return `404`.

---

## 8. Routes, Permissions, and Cron

- **Routes:** Mounted at `/api/plugins/<id>/<path>`. Each route specifies `method`, `path`, `auth: 'public' | '<permission>'`, and `handler`. Routes without `auth` default to the plugin's first declared permission or `settings.manage` (denied by default).
- **Permissions:** Declared on `definePlugin({ permissions: [...] })` and merged into `src/config/permissions.ts` during `pnpm plugins:sync`, so they appear in **Dashboard → Users & Roles → Permissions**.
- **Cron:** `cron: [{ id: 'sync', every: 'hourly' | 'daily', run: async ctx => {} }]`. Triggered via `GET` or `POST /api/cron/plugins` with `Authorization: Bearer $CRON_SECRET`.

---

## 9. Testing

Put tests in `plugins/<id>/__tests__/*.test.ts` using `node:test`. Run the full suite with:

```bash
pnpm plugins:sync
pnpm test
npx tsc --noEmit
pnpm check
```

---

## 10. Publishing as an npm Package

To distribute a plugin via npm instead of a local `plugins/` folder:

1. Publish a package (for example `nextcms-plugin-acme`) with exports for `./server` (calling `definePlugin`) and `./client` (calling `defineClientPlugin`) in `package.json`:

```json
{
  "name": "nextcms-plugin-acme",
  "version": "1.0.0",
  "exports": {
    "./server": "./dist/plugin.server.js",
    "./client": "./dist/plugin.client.js"
  },
  "peerDependencies": {
    "@nextcms/plugin-sdk": "*",
    "@nextcms/builder-core": "*",
    "react": "^19.0.0",
    "zod": "^4.0.0"
  }
}
```

2. Install it in the Next CMS host app (`pnpm add nextcms-plugin-acme`), add `'nextcms-plugin-acme'` to `nextcms.plugins.ts`, add it to `transpilePackages` in `next.config.ts` if shipping TypeScript source, and rebuild.
