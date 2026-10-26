import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { formsService } from '@/server/services/forms.service';
import { ArchiveButton } from '../_components/archive-button';

export const metadata = { ...metaObject('Submission') };

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const { id } = await params;
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Form inbox', href: PAGES.DASHBOARD.CONTACT_FORMS_INBOX },
    { title: 'Submission', href: PAGES.DASHBOARD.CONTACT_FORM_SUBMISSION(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title="Submission" breadcrumbs={breadcrumbs} />
        <AccessDenied what="form submissions" />
      </>
    );
  }

  const row = await formsService.get(id);
  if (!row) notFound();
  if (row.status === 'new') await formsService.markRead(id);

  return (
    <>
      <PageHeader title="Submission" breadcrumbs={breadcrumbs}>
        {row.status !== 'archived' && <ArchiveButton id={row.id} />}
      </PageHeader>
      <dl className="grid max-w-2xl gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{row.status === 'new' ? 'read' : row.status}{row.spam ? ' · spam' : ''}</dd>
        </div>
        {Object.entries(row.payload ?? {}).map(([key, value]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
