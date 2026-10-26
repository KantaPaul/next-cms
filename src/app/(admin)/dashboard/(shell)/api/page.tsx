import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { env } from '@/env.mjs';
import { metaObject } from '@/lib/utils/metadata';
import { apiKeysService } from '@/server/services/api-keys.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { ApiKeys } from './_components/api-keys';

const TITLE = 'API Keys';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function ApiKeysPage() {
  const { allowed } = await requirePermission(PERMISSIONS.API_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.API },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="API keys" />
      </>
    );
  }

  const [keys, settings] = await Promise.all([
    apiKeysService.list(),
    siteSettingsService.get(),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <ApiKeys
        keys={keys}
        baseUrl={`${(settings.siteUrl || env.SITE_URL).replace(/\/$/, '')}/api/v1`}
      />
    </>
  );
}
