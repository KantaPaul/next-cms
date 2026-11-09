import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { SettingsNav } from '../_components/settings-nav';
import { CustomCodeForm } from './_components/custom-code-form';

const TITLE = 'Custom code';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function CustomCodePage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Settings', href: PAGES.DASHBOARD.SETTINGS },
    { title: TITLE, href: PAGES.DASHBOARD.SETTINGS_CUSTOM_CODE },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="custom code settings" />
      </>
    );
  }

  const settings = await siteSettingsService.get();

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <SettingsNav />
      <CustomCodeForm initialValues={settings.customCode} />
    </>
  );
}
