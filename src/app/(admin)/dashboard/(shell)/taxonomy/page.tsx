import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import {
  CategoriesManager,
  TagsManager,
} from './_components/taxonomy-managers';
import { taxonomyService } from './_modules/taxonomy.service';

const TITLE = 'Taxonomies';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function TaxonomyPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.TAXONOMY },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="taxonomies" />
      </>
    );
  }

  const [categories, tags] = await Promise.all([
    taxonomyService.listCategories(),
    taxonomyService.listTags(),
  ]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <div className="grid gap-6 xl:grid-cols-2">
        <CategoriesManager categories={categories} />
        <TagsManager tags={tags} />
      </div>
    </>
  );
}
