# next-cms

Visual page builder CMS on Next.js, Puck, Drizzle, and Postgres.

## Requirements

- Node 20+
- pnpm
- Postgres 15+
- Optional: S3-compatible storage (MinIO or AWS), Google OAuth, Gemini API key, cron worker

## Quick start

```bash
# Optional local network for Docker services
docker network create nextcms_network 2>/dev/null || true

# Copy env and fill values
cp .env.example .env.local   # or create .env.local from the vars below

pnpm install
pnpm db:push                 # or pnpm db:migrate
pnpm db:seed
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)  
Admin: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Environment

### Postgres

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nextcms
```

### Google OAuth (staff login)

```env
AUTH_SECRET=generate-a-long-random-string
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=http://localhost:3000
```

Create an OAuth client in Google Cloud Console. Authorized redirect URI:

`http://localhost:3000/api/auth/callback/google`

### Storage (media library)

S3-compatible endpoint (AWS S3 or MinIO):

```env
S3_BUCKET=
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=                 # optional; set for MinIO e.g. http://localhost:9000
S3_PUBLIC_URL=               # optional public base URL for objects
```

### Gemini (AI builder helpers)

```env
GEMINI_API_KEY=
```

### Cron / background jobs

If you run scheduled tasks (cleanup, digests, license checks):

```env
CRON_SECRET=generate-a-long-random-string
```

Protect cron routes with `Authorization: Bearer $CRON_SECRET`.

### Optional Stripe (products / subscriptions)

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

The app boots when these are empty.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server on port 3000 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm db:generate` | Drizzle migration from schema |
| `pnpm db:migrate` / `pnpm db:push` | Apply schema |
| `pnpm db:seed` | Seed roles, templates, demo content |
| `pnpm db:ui` | Drizzle Studio |
| `pnpm lint` | ESLint |

## Project layout

- `src/app/(admin)` — dashboard, builder, settings
- `src/app/(site)` — public site catch-all
- `src/builder` — Puck config, blocks, theme
- `src/db` — Drizzle schema, migrations, seed
- `src/server` — services and server actions

## License

Private / see repository settings.
