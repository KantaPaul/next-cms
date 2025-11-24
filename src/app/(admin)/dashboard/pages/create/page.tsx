import { TITLE } from '@/app/(admin)/dashboard/pages/breadcrumbs';
import { CreateOrUpdate } from '@/app/(admin)/dashboard/pages/create-update';
import { metaObject } from '@/lib/utils/metadata';

export const metadata = {
  ...metaObject(TITLE),
};

const formId = 'add-page-form';

export default function CreatePage() {
  return <CreateOrUpdate id={formId} />;
}
