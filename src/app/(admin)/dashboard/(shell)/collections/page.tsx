import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { getAdminTranslations } from '@/i18n/server';
import { postTypesCrumbs } from '@/app/(admin)/dashboard/(shell)/collections/breadcrumbs';
import { accessService } from '@/server/services/access.service';
import { requirePermission } from '@/server/services/require-permission';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { collectionsService } from '@/server/services/collections.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CollectionList } from './components/collection-list';
import { CreateCollectionForm } from './components/create-collection-form';
import { PresetPicker } from './components/preset-picker';

export async function generateMetadata() {
  const t = await getAdminTranslations('collections');
  return metaObject(t('title'));
}

export default async function CollectionsPage() {
  const { allowed, access } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const [breadcrumbs, t] = await Promise.all([
    postTypesCrumbs(),
    getAdminTranslations('collections'),
  ]);
  const TITLE = t('title');

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const canManage =
    accessService.can(access, PERMISSIONS.POST_TYPES_MANAGE) ||
    accessService.can(access, PERMISSIONS.SETTINGS_MANAGE);

  const [rows, templatePages] = await Promise.all([
    collectionsService.list(),
    canManage ? pagesServices.listTemplateOptions() : Promise.resolve([]),
  ]);

  const rowsWithTemplate = rows.map(r => ({
    ...r,
    templateName:
      templatePages.find(p => p.id === r.templatePageId)?.title ?? null,
  }));

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('presets.title')}</CardTitle>
            <CardDescription>
              {t('presets.intro')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PresetPicker />
          </CardContent>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-12">
        {canManage && (
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>{t('create.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateCollectionForm templatePages={templatePages} />
            </CardContent>
          </Card>
        )}
        <div className={canManage ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <CollectionList rows={rowsWithTemplate} canManage={canManage} />
        </div>
      </div>
    </>
  );
}
