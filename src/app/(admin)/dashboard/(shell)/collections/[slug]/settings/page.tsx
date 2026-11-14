import { Blocks } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { normalizePostTypeSupports } from '@/config/post-types';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { collectionsService } from '@/server/services/collections.service';
import { requirePermission } from '@/server/services/require-permission';
import { loadPostTypeRoute } from '../../_modules/post-type-route';
import { AddFieldForm } from '../../components/add-field-form';
import { CollectionSettingsForm } from '../../components/collection-settings-form';
import { FieldList } from '../../components/field-list';
import { PostTypeFeaturesCard } from '../../components/post-type-features-card';
import { PostTypeTabs } from '../../components/post-type-tabs';
import { PostTypeTaxonomiesCard } from '../../components/post-type-taxonomies-card';
import { getAdminTranslations } from '@/i18n/server';
import { postTypesCrumbs } from '@/app/(admin)/dashboard/(shell)/collections/breadcrumbs';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(
    slug,
    PAGES.DASHBOARD.COLLECTION_SETTINGS
  );
  const { allowed: canManage, access } = await requirePermission(
    PERMISSIONS.POST_TYPES_MANAGE
  );
  const allowed =
    canManage || accessService.can(access, PERMISSIONS.SETTINGS_MANAGE);

  const t = await getAdminTranslations('collections.settings');
  const breadcrumbs = [
    ...(await postTypesCrumbs()),
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
    {
      title: t('fieldsSettings'),
      href: PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={collection.name} breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const [fields, templatePages, allTypes, taxonomies] = await Promise.all([
    collectionsService.getFields(collection.id),
    pagesServices.listTemplateOptions(),
    collectionsService.list(),
    collectionTaxonomiesService.listTaxonomies(collection.id),
  ]);
  const supports = normalizePostTypeSupports(collection.supports);

  return (
    <>
      <PageHeader title={collection.name} breadcrumbs={breadcrumbs}>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link
              href={PAGES.DASHBOARD.COLLECTION_SETTINGS_BLOCKS(collection.slug)}
            >
              <Blocks className="size-4" /> {t('blockTemplateSettings')}
            </Link>
          </Button>
          <Button asChild>
            <Link href={PAGES.DASHBOARD.COLLECTION(collection.slug)}>
              {t('manage', { name: collection.name })}
            </Link>
          </Button>
        </div>
      </PageHeader>
      {/* <PostTypeTabs
        slug={collection.slug}
        taxonomies={taxonomies}
        supports={supports}
      /> */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CollectionSettingsForm
                collection={collection}
                templatePages={templatePages}
              />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 lg:col-span-8">
          <PostTypeFeaturesCard
            collectionId={collection.id}
            collectionSlug={collection.slug}
            initialSupports={supports}
          />
          <PostTypeTaxonomiesCard
            collectionId={collection.id}
            collectionSlug={collection.slug}
            taxonomies={taxonomies}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t('addField')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AddFieldForm
                collectionId={collection.id}
                postTypes={allTypes
                  .filter(t => t.id !== collection.id)
                  .map(t => ({ id: t.id, name: t.name }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('fields')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldList fields={fields} collectionId={collection.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
