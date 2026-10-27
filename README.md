# Next CMS

A Next.js CMS with a visual page builder, blog, media library, and first-party analytics.

## Requirements

- Node.js 20+
- pnpm
- Docker, for local Postgres

## Setup

Install dependencies and start Postgres:

```bash
pnpm install
docker compose up -d
```

Postgres listens on port 5432. The Compose file creates database `nextcms` with user `nextcms` and password `nextcms_pass`.

Copy the variables below into `.env`. `DATABASE_URL` must match that database:

```bash
DATABASE_URL=postgres://nextcms:nextcms_pass@localhost:5432/nextcms
SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Next CMS
```

Apply the schema and seed content:

```bash
pnpm db:migrate
pnpm db:push
pnpm db:seed
```

`pnpm db:migrate` applies the journaled migrations. `page_views` is not in that journal yet. `pnpm db:push` creates it and adds nullable `page_id` plus `post_id` from the Drizzle schema. A later step will journal `src/db/migrations/20261022070000_page_views.sql` unchanged. Do not edit that file.

Start the app:

```bash
pnpm dev
```

The public site is [http://localhost:3000](http://localhost:3000). The admin is [http://localhost:3000/dashboard](http://localhost:3000/dashboard). Sign in at [http://localhost:3000/login](http://localhost:3000/login).

## Google OAuth

Create an OAuth client in Google Cloud and set the authorized redirect URI to `http://localhost:3000/login/google/callback`.

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/login/google/callback
```

The login page sends the browser to `/login/google`, which starts the Google flow. Placeholders in code let the app boot without real credentials, but sign-in fails until these are set.

## Storage

Uploads stay on disk by default.

```bash
STORAGE_DRIVER=local
MEDIA_LOCAL_DIR=uploads
MEDIA_MAX_UPLOAD_MB=10
```

For S3-compatible storage:

```bash
STORAGE_DRIVER=s3
S3_BUCKET=
S3_REGION=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=
```

`S3_ENDPOINT` and `S3_PUBLIC_URL` are optional. Set them for MinIO or another non-AWS endpoint.

## Forms, mail, and sign-in

Contact forms post to the site inbox. Optional mail and Turnstile:

```bash
MAIL_FROM=
FORM_NOTIFY_TO=
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Resend is used when `RESEND_API_KEY` is set. Otherwise SMTP is used when `SMTP_HOST` is set. Submissions are still saved when mail is not configured. Staff can sign in with email and password or a magic link from `/login`, in addition to Google.

## Gemini

AI writing, rewrite, SEO, and alt text use Gemini. Leave the key empty to hide those actions.

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

## Cron

Scheduled pages and posts publish when something calls:

```bash
curl -X POST http://localhost:3000/api/cron/publish \
  -H "Authorization: Bearer $CRON_SECRET"
```

`GET` accepts the same header. Set `CRON_SECRET` in the environment. Without it the route returns 503. The public site layout also calls a best-effort publisher at most once a minute, which is not a substitute for the cron route.

## Scripts

| Command                     | What it does                                    |
| --------------------------- | ----------------------------------------------- |
| `pnpm dev`                  | Dev server on port 3000                         |
| `pnpm build` / `pnpm start` | Production build and server                     |
| `pnpm lint`                 | ESLint                                          |
| `pnpm db:migrate`           | Apply journaled SQL migrations                  |
| `pnpm db:push`              | Push the Drizzle schema, including `page_views` |
| `pnpm db:seed`              | Seed starter content                            |
| `pnpm exec tsc --noEmit`    | Typecheck                                       |

## Builder plugins

Local blocks live in `src/builder/custom/`. The loader lives in `src/builder/custom/index.ts`:

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

The loader adds the `section` field, so a plugin does not reimplement the section inspector. A duplicate `key` that matches a built-in block is ignored. Adding a later block means adding a file under `src/builder/custom/` and one line in that index. There is no marketplace and no remote install.

Ship one example file, `src/builder/custom/example.tsx`, registered in the index, so the loader is exercised. It renders a heading and a text line and can be removed by deleting those two references.
