import { PageHeader } from '@/components/organisms/page-header';
import { breadcrumbs, TITLE } from '@/app/(admin)/dashboard/pages/breadcrumbs';
import { QueryProvider } from '@/providers/query.provider';
import CreateOrUpdateForm from '@/app/(admin)/dashboard/pages/form';

export async function CreateOrUpdate({
  id,
  ...props
}: {
  params?: Promise<{ id: string }>;
  id: string;
}) {
  const params = await props.params;
  return (
    <>
      <PageHeader
        title={params?.id ? `Update ${TITLE}` : `Add a ${TITLE}`}
        breadcrumbs={breadcrumbs}
      />
      <QueryProvider
        promises={
          {
            // ...(params?.id && {
            //   initialValues: shiftsQueries.getById({ id: params.id }),
            // }),
          }
        }
      >
        <CreateOrUpdateForm id={id} />
      </QueryProvider>
    </>
  );
}
