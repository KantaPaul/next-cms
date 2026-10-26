import Link from 'next/link';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { formsService } from '@/server/services/forms.service';
import { InboxTable } from './_components/inbox-table';

const TITLE = 'Form inbox';

export const metadata = { ...metaObject(TITLE) };

export default async function FormInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const { status } = await searchParams;
  const filter = status === 'new' || status === 'read' || status === 'archived' ? status : undefined;
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Contact forms', href: PAGES.DASHBOARD.CONTACT_FORMS },
    { title: TITLE, href: PAGES.DASHBOARD.CONTACT_FORMS_INBOX },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="form submissions" />
      </>
    );
  }

  const rows = await formsService.list(filter);
  const exportHref = filter
    ? `/dashboard/contact-forms/inbox/export?status=${filter}`
    : '/dashboard/contact-forms/inbox/export';

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <a href={exportHref} className="text-sm font-medium text-primary hover:underline">
          Export CSV
        </a>
      </PageHeader>
      <div className="mb-4 flex gap-3 text-sm">
        <FilterLink href={PAGES.DASHBOARD.CONTACT_FORMS_INBOX} active={!filter}>
          All
        </FilterLink>
        <FilterLink href={`${PAGES.DASHBOARD.CONTACT_FORMS_INBOX}?status=new`} active={filter === 'new'}>
          New
        </FilterLink>
        <FilterLink href={`${PAGES.DASHBOARD.CONTACT_FORMS_INBOX}?status=read`} active={filter === 'read'}>
          Read
        </FilterLink>
        <FilterLink
          href={`${PAGES.DASHBOARD.CONTACT_FORMS_INBOX}?status=archived`}
          active={filter === 'archived'}
        >
          Archived
        </FilterLink>
      </div>
      <InboxTable
        rows={rows.map(row => ({
          id: row.id,
          status: row.status,
          spam: row.spam,
          createdAt: row.createdAt.toISOString(),
          preview: Object.values(row.payload ?? {})[0] ?? '',
        }))}
      />
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link href={href} className={active ? 'font-semibold' : 'text-muted-foreground'}>
      {children}
    </Link>
  );
}
