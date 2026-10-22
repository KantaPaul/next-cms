import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { PERMISSIONS } from '@/config/permissions';
import { AccessDenied } from '@/components/organisms/access-denied';
import { TemplatesAndGlobals } from './_components/templates-and-globals';
import { templatesService } from './_modules/templates.service';

const TITLE = 'Templates & Globals';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function TemplatesPage() {
  const { access, allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.TEMPLATES },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="templates and global blocks" />
      </>
    );
  }

  const [templates, globals, usage] = await Promise.all([
    templatesService.listTemplates(),
    templatesService.listGlobalBlocks(),
    templatesService.globalBlockUsage(),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <TemplatesAndGlobals
        templates={templates}
        globals={globals.map(({ content, ...g }) => ({
          ...g,
          sectionTypes: templatesService.getGlobalBlockItems(content).map(b => b.type),
          pages: usage[g.id] ?? 0,
        }))}
        can={{
          create: access.permissions.includes(PERMISSIONS.PAGES_CREATE),
          manage: access.permissions.includes(PERMISSIONS.SETTINGS_MANAGE),
          deleteGlobals: access.permissions.includes(PERMISSIONS.PAGES_DELETE),
        }}
      />
    </>
  );
}
