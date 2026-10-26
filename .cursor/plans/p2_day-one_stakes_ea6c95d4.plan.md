---

name: P2 day-one stakes
overview: "Add the day-one CMS pieces in R012–R031: a first-party form inbox, redirects, Postgres search, staff password and magic-link login, an invite flow, optional admin TOTP, a review queue, and an OpenAPI spec. New tables carry `site_id` defaulting to `default` and are journaled normally."
todos:
- id: r012-r017
  content: Add form_submissions, first-party submit, inbox, CSV, honeypot/Turnstile, and owner email.
  status: completed
- id: r018-r021
  content: Add redirects, proxy lookup, CSV import, and the publish-time redirect offer.
  status: completed
- id: r022-r024
  content: Index published pages and posts and expose /search plus GET /api/v1/search.
  status: completed
- id: r025-r028
  content: Add password login, magic links, invites, and optional admin TOTP without a lockout table.
  status: completed
- id: r029-r031
  content: Add the review queue, author emails, and an OpenAPI spec from the v1 zod schemas.
  status: completed
  isProject: false

---

# P2 — Day-one table stakes (R012–R031)

Do not start P3. Do not edit the unjournaled `page_views` SQL files or [`src/db/migrations/meta/_journal.json`](src/db/migrations/meta/_journal.json) entries for them. New tables and columns in this slice are normal Drizzle migrations (`pnpm db:generate`, then migrate). Every new table gets `site_id text not null default 'default'` and no foreign key to `sites` (that table is R032).

Leave [`assignDefaultRole`](src/server/services/access.service.ts) as it is. R264 owns the Viewer-only change. Do not add `auth_attempts`, `failed_login_count`, or `locked_until`. Those belong to R263 and R276.

## R012–R017 — Forms

Contact forms live as `global_blocks` with `category = 'contact-form'`. [`ContactFormClient`](src/builder/blocks/contact-form-client.tsx) currently posts only when `actionUrl` is set, and the button stays disabled without it.

- Table `form_submissions`: `site_id`, nullable `form_global_id` (the global block id), `payload` jsonb, `status` (`new` | `read` | `archived`), `spam` boolean, timestamps. Index `(site_id, status, created_at)`.
- `POST /api/forms/submit` accepts `FormData`. Validate field names against the global’s ContactForm props when `formId` is present. Store the payload. An optional `actionUrl` still posts to that external URL; an empty one posts here, so the public form works with no Formspree URL.
- Stamp `formId` onto ContactForm items when [`GlobalRef`](src/builder/blocks/content.tsx) renders a global. Inline forms submit with a null id.
- Honeypot field `company` (hidden). If it is filled, store `spam = true` and return the same success response. If `TURNSTILE_SECRET_KEY` is set, require a Turnstile token and verify it with Cloudflare; if the secret is unset, skip that check. Site key is `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Inbox at `/dashboard/contact-forms/inbox` (same `pages.edit` gate as [the forms list](src/app/(admin)/dashboard/(shell)/contact-forms/page.tsx)): list, open a submission (marks it read), archive. CSV download of the current filter.
- One mail adapter in `src/server/services/mail.ts`. Use Resend when `RESEND_API_KEY` is set, otherwise SMTP when `SMTP_HOST` is set. `MAIL_FROM` and `FORM_NOTIFY_TO` are optional. Missing mail config still saves the submission and skips the email. Notify only for non-spam submissions.

## R018–R021 — Redirects

- Table `redirects`: `site_id`, `from_path`, `to_path`, `status_code` (`301` | `302`). Unique `(site_id, from_path)`. Paths are site-relative and start with `/`.
- Next 16 resolves this in [`src/proxy.ts`](src/proxy.ts) (`export function proxy`), which is this version’s middleware file. Matcher skips `/_next`, `/api`, `/dashboard`, `/login`, and files with an extension. One indexed lookup; on a hit, `NextResponse.redirect` with the stored status. Do not add a second `middleware.ts`.
- Admin page `/dashboard/redirects` (`settings.manage`): list, add, and CSV import (`from,to,status`). Reject duplicate sources.
- When a page or post that was already published changes slug or language, `publishPage` / the post publish action returns `{ redirectOffer: { from, to } }` and does not insert a row. The pages table, page form, builder chrome, and the post equivalents show a confirm dialog. Accepting calls a server action that inserts a 301.

## R022–R024 — Search

- Table `search_documents`: `site_id`, `kind` (`page` | `post`), nullable `page_id` / `post_id` with `num_nonnulls = 1`, `title`, `path`, `language`, `body`, and a generated `tsvector` with a GIN index.
- Rebuild the row inside the existing publish transaction and delete it on unpublish or delete. Page body is plain text walked out of published Puck JSON (string props only). Post body is the published rich-text `post_contents.body` with tags stripped, plus canvas text when the layout is custom.
- Public [`/search`](src/app/(site)/search/page.tsx) reads `q` and lists title, path, and a short snippet. Empty query shows the field and no results.
- `GET /api/v1/search` uses the existing [`apiHandler`](src/server/api/v1.ts) (API key, rate limit, CORS). Query `q` is required; `lang` is optional.

## R025–R028 — Staff auth

Keep Google in [`src/auth.ts`](src/auth.ts) and the session cookie from [`src/lib/auth/session.ts`](src/lib/auth/session.ts).

- Nullable `users.password_hash`. One helper in `src/lib/auth/password.ts` using Node `scrypt` (hash and verify). No second hasher.
- [`LoginForm`](src/components/templates/auth/login-form.tsx) gains email and password. Success calls the existing `login()`. Unknown email, wrong password, and a user with no hash all return the same message. Password login calls `recordAuthAttempt` / `clearAuthAttempts` in `src/server/services/auth-attempts.ts`. Those functions are empty until R276. Do not create a lockout table here.
- Magic link: `login_tokens` stores a sha256 of the token, email, expiry (15 minutes), and `used_at`. The login page can email a link to `/login/magic?token=`. The link is single-use and creates the same session. Reuse the mail adapter; if mail is not configured, the action says so.
- Invite on the Users page (`settings.manage`): email, optional name, role select defaulting to Viewer. Insert the user as Active with that `roleId` directly. Do not call `assignDefaultRole`. Send a magic link so they can set a password after they arrive. This path does not make the first Google user Admin.
- Optional TOTP for Admins only: nullable `users.totp_secret` and `totp_enabled`. Setup and disable live under the user menu. After a successful password or magic-link check, an enabled Admin must enter the code before `login()` runs. Verify with Node `crypto` HMAC-SHA1. A wrong code does not create a session.

## R029–R031 — Review and OpenAPI

- `/dashboard/review` lists pages and posts with `status = review`. Visible with `pages.publish`. Approve calls the existing publish path. Request changes sets `draft`, writes the note on the existing audit log, and does not add a workflow table.
- Email the author’s `users.email` on approve and on request changes through the same mail adapter. A mail failure does not roll back the status change.
- Add zod schemas for the current read handlers in [`src/server/api/v1.ts`](src/server/api/v1.ts) (pages, page by slug, posts, post by slug, menus, media, settings, and search). Generate an OpenAPI 3 document from those schemas and serve it at `GET /api/v1/openapi` without an API key. Document bearer auth on the read routes.

After the work, mark R012–R031 completed in [`.cursor/plans/combined_cms_refs_f96163bc.plan.md`](.cursor/plans/combined_cms_refs_f96163bc.plan.md). Leave R032 pending. `pnpm exec tsc --noEmit` must exit 0. Verify the public form submit, inbox, redirect, `/search`, login, and review queue in the browser.
