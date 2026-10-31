# Dynamic Content and Global Styles

This document describes the native dynamic data binding and global design token system in Next CMS (refs **R413–R423**, **R428–R433** / **BLD-21–31**, **BLD-36–41**).

---

## 1. Dynamic Content (BLD-21 to BLD-26)

Dynamic content bindings allow visual builder blocks to display live data from CMS entities (pages, posts, site metadata, authors, and custom fields) rather than hardcoded static text or images.

### Data Model & Schema

Dynamic bindings store a reference to a data source rather than a static snapshot:

```typescript
export interface DynamicBinding {
  $dynamic: string;      // The dynamic source key ('page' | 'post' | 'site' | 'author' | 'custom')
  path?: string;         // Field path ('title', 'authorName', 'url', etc.)
  fallback?: string;     // Value used when the dynamic data is absent, null, or empty
  transform?: 'uppercase' | 'lowercase' | 'titlecase' | 'date' | 'slug';
}
```

Stored properties use a discriminated union validated with Zod via `dynamic(innerSchema)`. Plain values (strings, numbers) and `{ $dynamic: ... }` objects are both accepted.

### Supported Data Sources & Fields

1. **`page`** (Current Page):
   - `title`: Page title
   - `slug`: Route slug
   - `seoTitle`: Meta SEO title
   - `seoDescription`: Meta SEO description
   - `createdAt`: ISO created timestamp
   - `updatedAt`: ISO modified timestamp

2. **`post`** (Current Blog Post):
   - `title`: Post title
   - `slug`: Post permalink slug
   - `excerpt`: Post summary / excerpt
   - `content`: HTML / Rich text body
   - `featuredImage`: Primary media URL
   - `authorName`: Post author display name
   - `publishedAt`: Publication timestamp
   - `createdAt`: Created timestamp

3. **`site`** (Global Site Metadata):
   - `name`: Site name
   - `description`: Site tagline / description
   - `url`: Canonical base URL
   - `logo`: Site logo media URL

4. **`author`** (Current Content Author):
   - `name`: Author display name
   - `email`: Author contact email
   - `avatar`: Profile picture URL

5. **`custom`** (Custom Collection Fields):
   - Arbitrary fields defined on custom collection entries or template models.

### Resolution & Security Boundaries

Dynamic bindings are resolved strictly on the server or in verified data loaders (`resolveDocumentData`):
- **Tenant & Site Isolation**: Lookups are scoped to the active `siteId` and `language` in `DynamicContext`.
- **Prototype Pollution Defense**: Key paths containing `__proto__`, `prototype`, or `constructor` are blocked.
- **URL Protocol Allowlist**: When resolving dynamic URLs (links, images), dangerous schemes such as `javascript:`, `data:`, and `vbscript:` are stripped and replaced with the safe fallback.
- **Cycle & Depth Limit**: Dynamic bindings nested inside resolved data have a maximum depth limit of 2, preventing infinite recursion loops.
- **Deterministic Fallbacks**: Missing, null, or empty values automatically resolve to `fallback` (or empty string), ensuring pages never crash or render `undefined`.

---

## 2. Global Design System & Styles (BLD-27 to BLD-31)

Global design tokens define site-wide color palettes and typography presets, ensuring visual consistency across all pages.

### Token Types & CSS Custom Properties

`ThemeTokens` includes both core semantic colors and extensible custom tokens:

```typescript
export interface GlobalColorTokens {
  primary?: string;     // --site-color-primary / --site-primary
  secondary?: string;   // --site-color-secondary
  accent?: string;      // --site-color-accent / --site-accent
  text?: string;        // --site-color-text
  textMuted?: string;   // --site-color-text-muted
  background?: string;  // --site-color-background
  surface?: string;     // --site-color-surface
  border?: string;      // --site-color-border
  custom?: Array<{      // --site-token-[id]
    id: string;
    name: string;
    value: string;
  }>;
}
```

### Typography Presets

Site-wide typography presets standardize text sizing, weight, and responsive scaling:
- Presets: `h1`, `h2`, `h3`, `body`, `caption`, `button`
- Emits CSS variables:
  - `--site-type-[id]-font`
  - `--site-type-[id]-size`
  - `--site-type-[id]-weight`
  - `--site-type-[id]-line-height`
  - `--site-type-[id]-letter-spacing`

### Inheritance & Missing-Token Fallback

- **Global Inheritance**: A block property set to `token:primary` or `token:accent` inherits its live color from `:root` CSS variables.
- **Per-Element Overrides**: Users can override a specific block with a custom hex code. Choosing "Inherit token" resets the block to the global token.
- **Missing or Deleted Tokens**: If a custom token is deleted from site settings, `resolveTokenValue` and CSS variable resolution automatically fall back to the default semantic color or `#0f172a`, preventing style breakage.

---

## 3. Legacy Migration & Normalization (BLD-36)

- Existing pages stored with static literal values continue to render seamlessly without schema modifications.
- `normalizeBuilderDocument` and `normalizeProps` provide idempotent data sanitization, ensuring documents with legacy props or missing token references remain valid and render correctly.
