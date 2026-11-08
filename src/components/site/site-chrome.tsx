import { headers } from 'next/headers';
import Link from 'next/link';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { renderBuilderContent } from '@/builder/render-content';
import { HeaderShell } from '@/components/site/header-shell';
import { LanguageSwitcher } from '@/components/site/language-switcher';
import { MenuLinks } from '@/components/site/menu-links';
import { OverlayHost } from '@/components/site/overlay-host';
import { siteHref } from '@/lib/utils/site-href';
import { validateRequest } from '@/server/actions/auth.actions';
import { blogService, resolvePostRoute } from '@/server/services/blog.service';
import { overlayService } from '@/server/services/overlay.service';
import { getPreviewSession } from '@/server/services/preview-session';
import {
  publicSiteService,
  resolveRoute,
} from '@/server/services/public-site.service';
import {
  siteContext,
  sitePathSegments,
  siteSlugPrefix,
} from '@/server/services/site-context';
import {
  localizedSettings,
  siteSettingsService,
} from '@/server/services/site-settings.service';
import {
  type ResolvableEntity,
  resolveTemplate,
  templateResolverService,
} from '@/server/services/template-resolver.service';

/**
 * Resolves and renders the public header and footer around `children` for the
 * entity at `pathname` (page/post overrides, display rules, locale and site
 * defaults).
 *
 * Render this from a layout *below* the route's dynamic segment (for example
 * `(site)/[[...slug]]/layout.tsx`), never from `(site)/layout.tsx`: App Router
 * keeps a layout mounted across client navigations to its children, so chrome
 * resolved above the dynamic segment would keep showing the first page's
 * header until a full reload.
 */
export async function SiteChrome({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const [settings, site, preview] = await Promise.all([
    siteSettingsService.getPublic(),
    siteContext.publicSite(),
    getPreviewSession(),
  ]);
  const segments = sitePathSegments(pathname, site);
  const siteSlug = siteSlugPrefix(site);
  const postRoute = resolvePostRoute(segments, site);
  const pageRoute = resolveRoute(segments, site);
  const language =
    postRoute?.language ?? pageRoute?.language ?? site.defaultLocale;
  const copy = localizedSettings(settings, language, site.defaultLocale);

  // Resolve page or post entity for templates
  let currentEntity: ResolvableEntity | null = null;
  if (postRoute) {
    const postData =
      preview && preview.postId
        ? await blogService.getDraft(
            postRoute.language,
            postRoute.slug,
            preview.postId
          )
        : await blogService.getPublished(postRoute.language, postRoute.slug);
    if (postData?.view) {
      currentEntity = {
        type: 'post',
        id: (postData.view as { id?: string }).id,
        slug: postRoute.slug,
        headerTemplateId: postData.view.headerTemplateId,
        footerTemplateId: postData.view.footerTemplateId,
        categoryIds: postData.view.categories?.map(c => c.id),
        tagIds: postData.view.tags?.map(t => t.id),
      };
    }
  } else if (pageRoute) {
    const pageData =
      preview && preview.pageId
        ? await publicSiteService.getDraft(
            pageRoute.language,
            pageRoute.slug,
            preview.pageId
          )
        : await publicSiteService.getPublished(
            pageRoute.language,
            pageRoute.slug
          );
    if (pageData) {
      currentEntity = {
        type: 'page',
        id: (pageData as { id?: string }).id,
        slug: pageRoute.slug,
        headerTemplateId: pageData.headerTemplateId,
        footerTemplateId: pageData.footerTemplateId,
      };
    }
  }

  // Load rules for site
  const siteRules = await templateResolverService.getRulesForSite(site.id);

  // Resolve headers and footers via hierarchy:
  // entity override / explicit hide > display rules > locale override > site default > fallback
  const headerRes = resolveTemplate({
    area: 'header',
    entity: currentEntity,
    rules: siteRules,
    localeOverride: copy.headerTemplateId,
    siteDefault: settings.headerTemplateId,
  });

  const footerRes = resolveTemplate({
    area: 'footer',
    entity: currentEntity,
    rules: siteRules,
    localeOverride: copy.footerTemplateId,
    siteDefault: settings.footerTemplateId,
  });

  const headerTemplateId = headerRes.templateId;
  const footerTemplateId = footerRes.templateId;
  const hideHeader = headerRes.isHidden;
  const hideFooter = footerRes.isHidden;

  let customHeader: React.ReactNode = null;
  let headerRootProps: Record<string, unknown> = {};
  if (headerTemplateId && !hideHeader) {
    try {
      const headerBlock = await getGlobalBlockContent(headerTemplateId, {
        siteId: site.id,
        draft: !!preview,
      });
      if (
        headerBlock &&
        (headerBlock.blocks?.length ||
          (headerBlock.content &&
            typeof headerBlock.content === 'object' &&
            Object.keys(headerBlock.content).length > 0))
      ) {
        const root = (
          headerBlock.content as { root?: { props?: Record<string, unknown> } }
        )?.root;
        if (root?.props && typeof root.props === 'object') {
          headerRootProps = root.props;
        }

        customHeader = await renderBuilderContent({
          content: headerBlock.content,
          metadata: {
            themeTokens: settings.themeTokens,
            language,
            siteId: site.id,
            siteSlug: siteSlugPrefix(site),
          },
        });
      }
    } catch {
      customHeader = null;
    }
  }

  let customFooter: React.ReactNode = null;
  if (footerTemplateId && !hideFooter) {
    try {
      const footerBlock = await getGlobalBlockContent(footerTemplateId, {
        siteId: site.id,
        draft: !!preview,
      });
      if (
        footerBlock &&
        (footerBlock.blocks?.length ||
          (footerBlock.content &&
            typeof footerBlock.content === 'object' &&
            Object.keys(footerBlock.content).length > 0))
      ) {
        customFooter = await renderBuilderContent({
          content: footerBlock.content,
          metadata: {
            themeTokens: settings.themeTokens,
            language,
            siteId: site.id,
            siteSlug: siteSlugPrefix(site),
          },
        });
      }
    } catch {
      customFooter = null;
    }
  }

  const [header, footer, session] = await Promise.all([
    publicSiteService.menuFor('header', language, site),
    publicSiteService.menuFor('footer', language, site),
    validateRequest().catch(() => null),
  ]);

  const userState: 'guest' | 'logged-in' = session?.user
    ? 'logged-in'
    : 'guest';
  // Popups and drawers are optional extras: a failure here must not take the page down.
  const activeOverlays = await overlayService
    .activeFor({
      siteId: site.id,
      pathname,
      entity: currentEntity
        ? {
            type: currentEntity.type,
            id:
              typeof currentEntity.id === 'string'
                ? currentEntity.id
                : undefined,
            slug:
              typeof currentEntity.slug === 'string'
                ? currentEntity.slug
                : undefined,
          }
        : null,
      userState,
      draft: !!preview,
      metadata: {
        themeTokens: settings.themeTokens,
        siteId: site.id,
        siteSlug,
        language,
      },
    })
    .catch(error => {
      console.error('Failed to load popups/drawers:', error);
      return [];
    });

  return (
    <>
      {!hideHeader &&
        (customHeader ? (
          <HeaderShell
            sticky={headerRootProps.sticky as any}
            transparent={headerRootProps.transparent as any}
            shrinkOnScroll={headerRootProps.shrinkOnScroll as any}
            hideOnScrollDown={headerRootProps.hideOnScrollDown as any}
            shadow={headerRootProps.shadow as any}
            zIndex={
              typeof headerRootProps.zIndex === 'number'
                ? headerRootProps.zIndex
                : 50
            }
          >
            {customHeader}
          </HeaderShell>
        ) : (
          <header className="s-border border-b">
            <nav
              aria-label="Main"
              className="mx-auto flex max-w-[var(--site-max-width,72rem)] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8"
            >
              <Link
                href={siteHref('/', siteSlug)}
                className="flex items-center gap-2 text-lg font-bold"
              >
                {settings.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logo}
                    alt=""
                    className="size-8 rounded object-cover"
                  />
                )}
                {copy.siteName}
              </Link>
              <div className="flex flex-wrap items-center gap-5">
                <MenuLinks
                  menu={header ?? undefined}
                  siteSlug={siteSlug}
                  activeStyle="none"
                  className="flex flex-wrap items-center gap-5 text-sm font-medium"
                />
                <LanguageSwitcher />
              </div>
            </nav>
          </header>
        ))}
      <main className="flex-1">{children}</main>
      {!hideFooter &&
        (customFooter ? (
          <footer className="site-footer">{customFooter}</footer>
        ) : (
          <footer className="s-border s-surface border-t">
            <div className="mx-auto flex max-w-[var(--site-max-width,72rem)] flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
              <div>
                <p className="font-semibold">{copy.siteName}</p>
                {copy.siteDescription && (
                  <p className="s-muted mt-1 max-w-sm text-sm">
                    {copy.siteDescription}
                  </p>
                )}
              </div>
              <MenuLinks
                menu={footer ?? undefined}
                siteSlug={siteSlug}
                activeStyle="none"
                className="s-muted flex flex-wrap gap-x-6 gap-y-2 text-sm"
              />
            </div>
            <p className="s-muted pb-8 text-center text-xs">
              © {new Date().getFullYear()} {copy.siteName}
            </p>
          </footer>
        ))}
      <OverlayHost overlays={activeOverlays} />
    </>
  );
}

/** `SiteChrome` for a route whose chrome depends only on the request path. */
export async function SiteChromeForRequest({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '/';
  return <SiteChrome pathname={pathname}>{children}</SiteChrome>;
}
