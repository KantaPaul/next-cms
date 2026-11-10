import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { buildBlockManagerEditors } from '@/app/(admin)/dashboard/(shell)/settings/blocks/editors';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  COLLECTION_BLOCK_EDITOR_TYPES,
  normalizeCollectionBlockSettings,
} from '@/config/block-manager';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { loadPostTypeRoute } from '../../../_modules/post-type-route';
import { CollectionBlockManager } from '../../../components/collection-block-manager';

export const metadata = metaObject('Block template settings');

export default async function CollectionBlockSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ editor?: string; kind?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const initialEditor = query.editor ?? query.kind;
  const collection = await loadPostTypeRoute(
    slug,
    PAGES.DASHBOARD.COLLECTION_SETTINGS_BLOCKS
  );
  const { allowed: canManage, access } = await requirePermission(
    PERMISSIONS.POST_TYPES_MANAGE
  );
  const allowed =
    canManage || accessService.can(access, PERMISSIONS.SETTINGS_MANAGE);

  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Post types', href: PAGES.DASHBOARD.COLLECTIONS },
    {
      title: collection.name,
      href: PAGES.DASHBOARD.COLLECTION(collection.slug),
    },
    {
      title: 'Fields & settings',
      href: PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug),
    },
    {
      title: 'Block template settings',
      href: PAGES.DASHBOARD.COLLECTION_SETTINGS_BLOCKS(collection.slug),
    },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader
          title={`Block template settings · ${collection.name}`}
          breadcrumbs={breadcrumbs}
        />
        <AccessDenied what="post type block settings" />
      </>
    );
  }

  const siteSettings = await siteSettingsService.get();
  const collectionBlockSettings = normalizeCollectionBlockSettings(
    collection.blockSettings
  );
  const blockEditors = buildBlockManagerEditors(
    COLLECTION_BLOCK_EDITOR_TYPES,
    siteSettings.blockSettings,
    collectionBlockSettings
  );

  return (
    <>
      <PageHeader
        title={`Block template settings · ${collection.name}`}
        breadcrumbs={breadcrumbs}
      >
        <Button variant="outline" asChild>
          <Link href={PAGES.DASHBOARD.COLLECTION_SETTINGS(collection.slug)}>
            <ArrowLeft className="size-4" /> Back to settings
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Block template settings</CardTitle>
          <CardDescription>
            Choose which blocks appear in this post type’s entry, single
            template, and collection block editors. Uncustomized tabs inherit{' '}
            <Link
              href={PAGES.DASHBOARD.SETTINGS_BLOCKS}
              className="text-primary underline-offset-4 hover:underline"
            >
              Settings → Blocks
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionBlockManager
            collectionId={collection.id}
            collectionSlug={collection.slug}
            editors={blockEditors}
            initialEditor={initialEditor}
          />
        </CardContent>
      </Card>
    </>
  );
}
