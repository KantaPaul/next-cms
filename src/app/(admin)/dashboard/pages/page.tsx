import CreateButton from '@/components/atoms/buttons/create-button';
import { Box } from '@/components/atoms/layout';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { breadcrumbs, TITLE } from '@/app/(admin)/dashboard/pages/breadcrumbs';
import { metaObject } from '@/lib/utils/metadata';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function Page() {
  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <CreateButton href={PAGES.DASHBOARD.PAGES.CREATE} />
      </PageHeader>
    </>
  );
}
