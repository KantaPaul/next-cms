import { VideosPage as VideosPageComponent } from './_components/videos-page';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { PERMISSIONS } from '@/config/permissions';
import { playlistService } from './_modules/videos.service';
import type { PlaylistItem } from './_modules/videos.actions';

const TITLE = 'Videos';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function VideosPage() {
  await requirePermission(PERMISSIONS.VIDEOS_CREATE);

  const playlists = await playlistService.list('default');

  return (
    <>
      <PageHeader
        title={TITLE}
        breadcrumbs={[
          { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
          { title: TITLE, href: PAGES.DASHBOARD.VIDEOS },
        ]}
      />
      <VideosPageComponent playlists={playlists} />
    </>
  );
}
