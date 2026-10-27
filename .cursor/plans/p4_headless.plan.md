---

name: P4 Headless
overview: Add site-scoped collections with validated JSON entries and generated admin screens, then expose them through a public collection route and draft-first API writes. Existing read keys keep working; publish stays behind pages.publish; rate limits and webhooks move to Postgres.
todos:
  - id: r040-r041
    content: Add collections, fields, and entries, and validate entry JSON from the field list.
    status: completed
  - id: r042
    content: Generate the admin list and edit screens for collections and entries.
    status: completed
  - id: r043
    content: Add the CollectionItem block and the public /{collection}/{slug} route.
    status: completed
  - id: r044-r045
    content: Scope API keys and add draft-first write endpoints for pages, posts, entries, and media.
    status: completed
  - id: r046
    content: Replace the in-memory API rate limit with a Postgres window.
    status: completed
  - id: r047
    content: Add signed webhook subscriptions and a delivery log.
    status: completed
isProject: false
---
