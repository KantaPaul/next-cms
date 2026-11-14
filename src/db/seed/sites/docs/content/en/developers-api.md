# Developer & REST API v1

Meridian exposes a read API at `/api/v1/*` authenticated with Bearer API keys, plus custom blocks in `src/builder/custom` and plugins via `@nextcms/plugin-sdk`.

## Database Backup & Restore

- `pnpm db:download` — dump Postgres to `backups/<db>-YYYYMMDD-HHmmss.dump`
- `pnpm db:restore` — restore from the newest backup in `backups/`
- `pnpm db:backups` — list available backups
