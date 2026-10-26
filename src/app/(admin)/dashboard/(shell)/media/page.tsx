import { MediaLibrary } from '@/app/(admin)/dashboard/(shell)/media/_components/media-library';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';

const TITLE = 'Media Library';

export const metadata = {
  ...metaObject(TITLE),
};

export default function MediaPage() {
  return (
    <>
      <PageHeader
        title={TITLE}
        breadcrumbs={[
          { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
          { title: TITLE, href: PAGES.DASHBOARD.MEDIA },
        ]}
      />
      <MediaLibrary />
    </>
  );
}
