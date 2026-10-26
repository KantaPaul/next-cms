# International Website Builder Competitive Gap Audit

Status: proposed; audit and implementation tasks are pending.
Purpose: prioritize market-relevant features for the existing Next.js CMS builder sold as commercial software to international developers, freelancers, and agencies. Do not clone every hosted-builder feature; prioritize evidence-backed gaps that support a self-hostable, developer-friendly product.

## Market reference points

- Wix Studio emphasizes responsive breakpoints, reusable assets, client handoff, roles, and collaboration: https://www.wix.com/studio/features
- Webflow Localize supports locale-specific content, styles, and assets: https://help.webflow.com/hc/en-us/articles/33961240676371-Localize-content-and-styles
- Framer documents localization and RTL support: https://www.framer.com/help/localization/
- WordPress supports reusable/synced patterns: https://wordpress.org/documentation/article/block-pattern/
- Webflow's 2026 CMS updates emphasize nested collections and more capable dynamic content: https://origin.webflow.com/updates/next-gen-cms-available-for-everyone

These references are market signals, not proof that every feature is required. Verify current docs and inspect the actual repository before deciding whether any capability is missing.

## Required repository audit

For each feature, record: shipped, partial, missing, not applicable, or intentionally deferred. Include source files/routes, current behavior, test evidence, user impact, estimated effort, security implications, and acceptance criteria. Do not mark a feature missing based only on a quick UI scan.

## Competitive feature checklist

1. **Core editor reliability**
   - Autosave with truthful save/error state.
   - Undo/redo, revision history, restore, and unsaved-change recovery.
   - Draft preview, publishing, rollback, and safe handling of preview links.
   - Clear loading, empty, error, and permission states.

2. **Visual design system**
   - Reusable sections/components/patterns, including synced versus detached behavior.
   - Global design tokens for typography, colors, spacing, widths, borders, shadows, and buttons.
   - Responsive editing and preview across desktop, tablet, and mobile; configurable breakpoints if supported by architecture.
   - Predictable per-breakpoint overrides without accidental global regressions.

3. **CMS content modeling**
   - Custom fields and reusable content types.
   - Relations/references, filters, pagination, dynamic templates, and predictable large-list behavior.
   - Stable media references and safe replacement of assets.
   - Versioned schema and migration safety.

4. **International readiness**
   - Localized page and CMS content, locale-specific metadata and alt text.
   - Locale-aware URLs, canonical/hreflang behavior, and fallback rules.
   - Right-to-left layout support if validated target customers need it.
   - Never auto-translate published legal/product content without review.

5. **SEO and content distribution**
   - Per-page title/description, canonical, robots/indexability, sitemap, structured data, social previews, redirects.
   - Correct metadata after publish, clone, locale changes, and slug updates.
   - Public routes return useful server-rendered HTML where appropriate.
   - Structured data matches visible content and must not invent reviews/ratings.

6. **Accessibility**
   - Semantic HTML, keyboard editing, accessible labels, focus order, headings, alt-text workflow, contrast guidance, reduced motion.
   - Test rendered pages; do not claim automatic WCAG compliance.

7. **Forms and media**
   - Form validation, spam/rate-limit controls, submission storage/export, delivery status, retry, and clear failure states.
   - Image metadata/alt text, responsive variants, focal points where useful, upload limits, and export-safe paths.
   - No silent loss of submitted form data.

8. **Publishing, domains, and export**
   - Custom-domain instructions and status, HTTPS/SSL guidance, canonical host and redirects.
   - Repeatable static export with correct paths, assets, fonts, links, metadata, and no leaked secrets/admin code.
   - Explicitly document dynamic functionality that static export cannot support.
   - Backup/restore, content portability, and recovery procedures.

9. **Agency workflows**
   - Site-scoped roles and permissions; Viewer is read-only on the server.
   - Safe client handoff, demo/starter templates, onboarding, empty states, and quick-start documentation.
   - Collaboration/comments, multi-site management, and shared template synchronization only after buyer validation.

10. **Extensibility and AI**
   - Stable, documented API/hooks/webhooks with scoped permissions if an extension model is justified.
   - AI-assisted copy/layout generation only after core reliability, editor history, and user-controlled review are in place.
   - Do not build a proprietary marketplace or complex plugin runtime before demand is proven.

## Recommended priority

### Must work before commercial launch
- Reliable save/restore and publish/preview lifecycle.
- Responsive output, reusable sections, and consistent design tokens.
- SEO fundamentals and accessible rendered output.
- Clear deployment/export path and documentation.
- Permission-safe customer handoff and secure media/forms if those are advertised features.

### Strong differentiators after the audit
- Synced components/global styles.
- CMS relations and dynamic templates.
- Reliable revision history and rollback.
- Forms with trustworthy submission delivery.
- Client-safe role permissions and streamlined first-publish onboarding.

### Add only after validation
- Localization/RTL, collaboration/comments, advanced animation controls, AI generation, multi-site agency controls, template marketplace, and extension ecosystem.
- Hosted CDN, built-in ecommerce, booking, or managed hosting unless these are part of the validated product strategy.

## Approval gates

- Gate 11: choose the top three customer-critical gaps using target-buyer feedback, competitor evidence, impact, effort, and maintenance cost.
- Gate 12: test a full journey: create from template, edit reusable sections and responsive styles, update CMS/media, preview, publish, verify SEO, export/deploy if supported, and restore a prior revision. Include keyboard accessibility and a second locale if localization is in scope.
- Final report: list shipped, partial, missing, excluded, and deferred features with evidence, test results, trade-offs, and next-quarter priorities.

## Acceptance rules

- No feature is marked complete without a reproducible test.
- Preserve current functionality and user data; use migrations for schema changes.
- Keep TypeScript strict and avoid `any`.
- Do not add dependencies or large subsystems without demonstrated need.
- Never expose drafts, preview tokens, private media, or another site's data through public routes or caches.
- Optimize based on measured user impact and actual buyer feedback, not feature-count parity.
