---

name: P3 multi-site
overview: Add sites and memberships, scope existing content with site_id backfilled to default, and resolve the public site from the request host. The admin gets a site switcher, each site has its own locales, and menus and default SEO can vary by language.
todos:
- id: r032-r033
  content: Add sites and site_memberships, seed default, and a sites admin page.
  status: completed
- id: r034
  content: Add site_id to content tables, widen slug uniqueness, and scope reads and writes.
  status: completed
- id: r035-r036
  content: Resolve the public site from Host, and switch the admin site with membership permissions.
  status: completed
- id: r037-r039
  content: Use per-site locales, translated menus, and translated site name, description, and default SEO.
  status: completed
  isProject: false

---

# P3 — Multi-site (R032–R039)

Do not start P4. Do not edit the unjournaled [`src/db/migrations/20261022070000_page_views.sql`](src/db/migrations/20261022070000_page_views.sql). Add `site_id` to `page_views` only in the new migration. Journal that migration normally with `pnpm db:generate`, then migrate. If generate also emits `CREATE TABLE page_views`, delete those statements and leave the snapshot as generated.

[`form_submissions`](src/db/schemas/operations.schema.ts), `redirects`, `search_documents`, and `login_tokens` already have `site_id` defaulting to `default`. Keep that value as the id of the first site.

## R032–R033 — Sites and memberships

New tables:

- `sites`: `id` (`default` for the existing install), `name`, nullable `primary_host`, `extra_domains` text array, `default_locale` (`en`), and `locales` jsonb (`{ code, label }[]`). Seed the current five languages from [`SUPPORTED_LANGUAGES`](src/db/schemas/shared.schema.ts) so existing `/es/...` URLs keep working. `primary_host` is unique when set. The `default` site has no host and is the fallback for `localhost`.
- `site_memberships`: `user_id`, `site_id`, `role_id`, unique on `(user_id, site_id)`. Backfill one row per user who already has `users.role_id`, on site `default`, using that same role. Reuse the existing roles table. Do not add a second permission matrix.

A settings page at `/dashboard/sites` (`settings.manage` on the active site) creates a site: name, primary host, extra domains, and locales. The creator becomes an Admin member. Creating a site also inserts an empty `site_settings` row for it.

## R034 — Scope content

Add `site_id text not null default 'default'` and an index to: `pages`, `posts`, `media`, `menus`, `categories`, `tags`, `global_blocks`, `page_templates`, `post_templates`, `site_settings`, `api_keys`, `analytics_dashboards`, and `page_views`. Postgres fills existing rows from the default.

Widen the slug unique indexes on pages and posts from `(slug, language)` to `(site_id, slug, language)`, still ignoring deleted rows. `site_settings.site_id` is unique. The existing settings row stays id `default`.

Every admin list, get, create, and public read for those tables filters or writes the active site. Child rows (menu items, page contents, SEO, submissions that already have `site_id`) follow their parent. [`searchIndex`](src/server/services/search.service.ts), [`redirectsService`](src/server/services/redirects.service.ts), and [`formsService`](src/server/services/forms.service.ts) stop hardcoding `DEFAULT_SITE_ID` and use the resolved site.

## R035–R036 — Host and switcher

One helper, `src/server/services/site-context.ts`:

- Public: `Host` without the port matches `primary_host` or an extra domain. No match uses site `default`.
- Admin: cookie `cms_site`. It must be a site the user belongs to. Otherwise use their first membership.
- [`getUserAccess`](src/server/services/access.service.ts) loads the membership role for that site. `users.role_id` stays for invites and the first Google login, but permission checks use the membership. A user with no memberships still falls back to `users.role_id` on site `default`.

[`publicSiteService`](src/server/services/public-site.service.ts), the blog loader, the site layout, and `GET /api/v1/*` all read through that helper. The redirect lookup in [`src/proxy.ts`](src/proxy.ts) sends the `Host` header to [`/api/internal/redirect`](src/app/api/internal/redirect/route.ts) so a redirect on one site does not fire on another.

The dashboard header gets a site switcher listing the user's memberships. Choosing one sets `cms_site` and refreshes the dashboard. Pages, posts, media, menus, forms, redirects, analytics, and API keys then show only that site.

## R037–R039 — Locales, menus, and default copy

Replace the hardcoded language list in public routing, the language switcher, and the admin language pickers with the active site's `locales`. The site's `default_locale` is unprefixed. Other locales stay `/{code}/...`, which is how [`resolveRoute`](src/server/services/public-site.service.ts) and [`PAGES.SITE`](src/config/pages.ts) already treat English. The seeded site's default stays `en`.

Menus gain `language`, default `en`. A site can have one menu per location and language. The public header and footer load the menu for the current locale, then the default locale. The menu editor can copy a menu into another locale. Pages and posts stay one document per language. Media alt stays on the asset.

`site_settings` gains optional `seo_title` and `seo_description`, plus `translations` jsonb keyed by locale (`siteName`, `siteDescription`, `seoTitle`, `seoDescription`). The settings screen edits the default locale on the main fields and the other locales in that map. Public metadata and the header use the translation for the current locale, then the default fields.

After the work, mark R032–R039 completed in [`.cursor/plans/combined_cms_refs_f96163bc.plan.md`](.cursor/plans/combined_cms_refs_f96163bc.plan.md). Leave R040 pending. `pnpm exec tsc --noEmit` must exit 0. In the browser, confirm `localhost` still renders the current site, the switcher changes which pages are listed, and a second host (or extra domain on `default`) does not show the other site's pages.
