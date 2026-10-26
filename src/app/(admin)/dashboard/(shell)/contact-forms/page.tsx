import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { ContactFormsList } from './_components/contact-forms-list';

const TITLE = 'Contact forms';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function ContactFormsPage() {
  const { access, allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.CONTACT_FORMS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="contact forms" />
      </>
    );
  }

  const [globals, usage] = await Promise.all([
    templatesService.listGlobalBlocks(),
    templatesService.globalBlockUsage(),
  ]);

  const forms = globals
    .filter(g => g.category === 'contact-form')
    .map(({ content, ...g }) => ({
      ...g,
      pages: usage[g.id] ?? 0,
    }));

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs}>
        <a
          href={PAGES.DASHBOARD.CONTACT_FORMS_INBOX}
          className="text-sm font-medium text-primary hover:underline"
        >
          Inbox
        </a>
      </PageHeader>
      <ContactFormsList
        forms={forms}
        can={{
          create: access.permissions.includes(PERMISSIONS.PAGES_CREATE),
          delete: access.permissions.includes(PERMISSIONS.PAGES_DELETE),
        }}
      />
    </>
  );
}
