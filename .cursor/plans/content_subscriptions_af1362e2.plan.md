---
name: Content subscriptions
overview: Add a single Stripe subscription that unlocks every post or page marked “Subscribers only.” Each ref is one piece. Name one ref to implement only that piece.
todos:
  - id: S1-01
    content: Add subscribers_only on pages and posts, default false, with a migration
    status: pending
  - id: S1-02
    content: Add nullable users.password_hash
    status: pending
  - id: S1-03
    content: Add the subscriptions table
    status: pending
  - id: S1-04
    content: Add subscription_enabled and subscription_label on site_settings
    status: pending
  - id: S1-05
    content: Add the Subscriber role with no dashboard permissions and seed it
    status: pending
  - id: S1-06
    content: Add optional Stripe env vars
    status: pending
  - id: S2-01
    content: Entitlement check for active or trialing subscriptions
    status: pending
  - id: S2-02
    content: Treat staff roles as entitled and the Subscriber role as not
    status: pending
  - id: S3-01
    content: Password hash and verify helper
    status: pending
  - id: S3-02
    content: Signup action that assigns the Subscriber role directly
    status: pending
  - id: S3-03
    content: Public /subscribe page
    status: pending
  - id: S3-04
    content: Email and password login at /account/login
    status: pending
  - id: S3-05
    content: Account page showing subscription status
    status: pending
  - id: S3-06
    content: Subscriber logout
    status: pending
  - id: S3-07
    content: Redirect the Subscriber role away from the dashboard
    status: pending
  - id: S3-08
    content: Header link to Subscribe or Account
    status: pending
  - id: S4-01
    content: Stripe client helper
    status: pending
  - id: S4-02
    content: Checkout session in subscription mode
    status: pending
  - id: S4-03
    content: Start checkout from /subscribe
    status: pending
  - id: S4-04
    content: Verify the Stripe webhook signature
    status: pending
  - id: S4-05
    content: Handle checkout.session.completed
    status: pending
  - id: S4-06
    content: Handle subscription updated and deleted
    status: pending
  - id: S4-07
    content: Keep past_due, canceled, incomplete, and unpaid locked
    status: pending
  - id: S4-08
    content: Stripe Customer Portal route
    status: pending
  - id: S4-09
    content: Clear message when Stripe env vars are missing
    status: pending
  - id: S5-01
    content: Expose subscribersOnly on public post and page loads
    status: pending
  - id: S5-02
    content: Strip locked post body and canvas before render
    status: pending
  - id: S5-03
    content: Strip locked page content before render
    status: pending
  - id: S5-04
    content: Paywall with title, excerpt, and subscribe or login links
    status: pending
  - id: S5-05
    content: Keep draft preview showing the full body
    status: pending
  - id: S5-06
    content: Omit locked post body and layout from /api/v1
    status: pending
  - id: S5-07
    content: Omit locked page content from /api/v1
    status: pending
  - id: S5-08
    content: Set isAccessibleForFree false on locked JSON-LD
    status: pending
  - id: S6-01
    content: Post form field and validation for subscribers only
    status: pending
  - id: S6-02
    content: Subscribers only switch on the post sidebar
    status: pending
  - id: S6-03
    content: Persist the post flag on save
    status: pending
  - id: S6-04
    content: Copy the post flag when duplicating
    status: pending
  - id: S6-05
    content: Page form field and validation for subscribers only
    status: pending
  - id: S6-06
    content: Subscribers only switch on the page sidebar
    status: pending
  - id: S6-07
    content: Persist the page flag on save
    status: pending
  - id: S6-08
    content: Copy the page flag when duplicating
    status: pending
  - id: S6-09
    content: Settings switch and price label
    status: pending
  - id: S6-10
    content: Subscribers list for settings.manage
    status: pending
isProject: false
---

# Subscriber-only posts and pages

One paid subscription unlocks every gated post and page. Name one ref, such as **S5-02**, to implement only that piece.

The public site already serves content only when `status` is `published` and `visibility` is `public` ([src/server/services/blog.service.ts](src/server/services/blog.service.ts), [src/server/services/public-site.service.ts](src/server/services/public-site.service.ts)). There is no visitor account and no Stripe. Staff sign in with Google at `/login`.

```mermaid
flowchart TD
  visitor[Visitor] --> page[Public post or page]
  page --> flag{subscribersOnly}
  flag -->|no| full[Render full body]
  flag -->|yes| entitled{Active or trialing subscription or staff}
  entitled -->|yes| full
  entitled -->|no| teaser[Title and excerpt plus paywall]
  teaser --> checkout[Stripe Checkout]
  checkout --> webhook[Webhook updates subscriptions]
  webhook --> entitled
```

## Order

```mermaid
flowchart LR
  s1[S1] --> s2[S2]
  s1 --> s3[S3]
  s1 --> s6[S6]
  s2 --> s5[S5]
  s3 --> s4[S4]
  s3 --> s5
```

- **S1** is the schema. Nothing else starts before it.
- **S6** (the editor switch) can follow **S1** without Stripe or visitor accounts.
- **S4** needs **S3** (a subscriber user to attach the Stripe customer to).
- **S5** needs **S2** (the entitlement check) and the `/subscribe` and `/account/login` routes from **S3-03** and **S3-04**.

## S1 — Schema

- **S1-01** `pages.subscribers_only` and `posts.subscribers_only`, boolean, default `false`, in [src/db/schemas/pages.schema.ts](src/db/schemas/pages.schema.ts). Drizzle migration.
- **S1-02** `users.password_hash`, nullable text, in [src/db/schemas/auth.schema.ts](src/db/schemas/auth.schema.ts). Google staff accounts stay passwordless.
- **S1-03** `subscriptions`: `user_id` unique, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`.
- **S1-04** `site_settings.subscription_enabled` (default false) and `subscription_label` (display text such as “$9 / month”) in [src/db/schemas/pages.schema.ts](src/db/schemas/pages.schema.ts).
- **S1-05** Role `Subscriber` in [src/config/permissions.ts](src/config/permissions.ts) and [src/server/services/access.service.ts](src/server/services/access.service.ts). No dashboard permissions. Seeded with the other roles. Signup must assign this role itself so `assignDefaultRole` cannot make the first subscriber Admin or a later one Viewer.
- **S1-06** Optional `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` in [src/env.mjs](src/env.mjs). The app still boots when they are empty.

## S2 — Who can read the body

- **S2-01** `hasAccess(userId)` is true only when that user’s subscription status is `active` or `trialing`.
- **S2-02** A session with role Admin, Editor, Author, or Viewer is entitled. Role Subscriber is not. Draft preview is unchanged and still shows the full draft.

## S3 — Visitor account

Staff Google login stays at `/login`. Subscribers use email and password.

- **S3-01** Hash and verify passwords with Node `scrypt`.
- **S3-02** Signup action creates the user and sets role Subscriber directly. It does not call `assignDefaultRole`.
- **S3-03** Public `/subscribe` page: name, email, password.
- **S3-04** `/account/login` writes the existing `session` cookie from [src/lib/auth/session.ts](src/lib/auth/session.ts).
- **S3-05** `/account` shows email and subscription status.
- **S3-06** Logout clears that session.
- **S3-07** [src/app/(admin)/dashboard/layout.tsx](src/app/(admin)/dashboard/layout.tsx) sends role Subscriber to `/account`.
- **S3-08** Header in [src/app/(site)/layout.tsx](src/app/(site)/layout.tsx) links to Subscribe or Account.

## S4 — Stripe

- **S4-01** Stripe client from `STRIPE_SECRET_KEY`.
- **S4-02** Checkout session, `mode: subscription`, `metadata.userId`, price from `STRIPE_PRICE_ID`.
- **S4-03** `/subscribe` starts that session after the account exists.
- **S4-04** `POST /api/billing/webhook` verifies the Stripe signature on the raw body.
- **S4-05** `checkout.session.completed` upserts `subscriptions` for `metadata.userId`.
- **S4-06** `customer.subscription.updated` and `customer.subscription.deleted` update status and `current_period_end`.
- **S4-07** `past_due`, `canceled`, `incomplete`, and `unpaid` do not unlock content. Only `active` and `trialing` do.
- **S4-08** Billing portal route from `/account`.
- **S4-09** When Stripe env vars are missing, checkout explains that billing is not configured. The paywall still renders.

## S5 — Public gate

Everyone who is not entitled gets the title, excerpt, featured image, and date. The body never reaches the HTML.

- **S5-01** Include `subscribersOnly` on the public post and page types returned by `blogService.getPublished` and `publicSiteService.getPublished`.
- **S5-02** For a locked post, drop `body` and `canvas` before `Render` in [src/app/(site)/[[...slug]]/page.tsx](src/app/(site)/[[...slug]]/page.tsx).
- **S5-03** For a locked page, drop builder JSON and rich-text HTML before render.
- **S5-04** Paywall: title, excerpt, and links to `/subscribe` and `/account/login`. Blog lists already show excerpts only.
- **S5-05** Preview drafts still render the full body.
- **S5-06** `GET /api/v1/posts/[slug]` returns `locked: true` and omits `body` and `layout` when the post is gated.
- **S5-07** `GET /api/v1/pages/[slug]` returns `locked: true` and omits `content` when the page is gated. Editors still open the full document in the dashboard.
- **S5-08** JSON-LD on a locked post sets `isAccessibleForFree` to false. The teaser URL stays in the sitemap.

## S6 — Editor

- **S6-01** `subscribersOnly` on the post zod schema and form defaults.
- **S6-02** “Subscribers only” switch next to Visibility in [src/app/(admin)/dashboard/(shell)/posts/form.tsx](src/app/(admin)/dashboard/(shell)/posts/form.tsx).
- **S6-03** Persist the flag in the post save path.
- **S6-04** Copy the flag when a post is duplicated.
- **S6-05** `subscribersOnly` on the page zod schema and form defaults.
- **S6-06** “Subscribers only” switch next to Visibility in [src/app/(admin)/dashboard/(shell)/pages/_components/sidebar-editor.tsx](src/app/(admin)/dashboard/(shell)/pages/_components/sidebar-editor.tsx).
- **S6-07** Persist the flag in the page save path.
- **S6-08** Copy the flag when a page is duplicated.
- **S6-09** Settings: enable switch and price label, under `settings.manage`.
- **S6-10** Subscribers screen: email, status, and period end, for `settings.manage`, plus a dashboard menu item.
