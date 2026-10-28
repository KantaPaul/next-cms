import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { MenusManager } from './_components/menus-manager';
import { menusService } from './_modules/menus.service';

const TITLE = 'Menus';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function MenusPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.MENUS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="menus" />
      </>
    );
  }

  const [list, linkablePages, settings, site] = await Promise.all([
    menusService.list(),
    menusService.linkablePages(),
    siteSettingsService.get(),
    siteContext.publicSite(),
  ]);
  const siteSlug = siteSlugPrefix(site);
  const menus = (
    await Promise.all(list.map(menu => menusService.getWithItems(menu.id)))
  ).filter(m => m !== null);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <MenusManager
        menus={menus}
        linkablePages={linkablePages}
        siteSlug={siteSlug}
        assigned={{
          header: settings.headerMenuId,
          footer: settings.footerMenuId,
        }}
      />
    </>
  );
}
