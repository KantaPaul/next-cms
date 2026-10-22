# Exported site

Standalone public site generated from the CMS. No database, authentication, or admin UI.

## Run locally

```bash
pnpm install   # or npm install
pnpm build
pnpm start
```

Development:

```bash
pnpm dev
```

## Docker

```bash
docker build -t exported-site .
docker run -p 3000:3000 exported-site
```

## Content

Published pages, posts, menus, theme tokens, and media are baked under `src/content` and `public/media` at export time. Blog listing filters (search, category, tag, sort, pagination) run against the local post catalog JSON.
