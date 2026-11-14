import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { metaObject } from '@/lib/utils/metadata';
import { requireSession } from '@/server/actions/auth.actions';
import { accessService } from '@/server/services/access.service';
import { staffAuth } from '@/server/services/staff-auth.service';
import { AccountForms } from './_components/account-forms';

const TITLE = 'Account';

export const metadata = { ...metaObject(TITLE) };

export default async function AccountPage() {
  const session = await requireSession();
  const userId = session.session.userId;
  const access = await accessService.getUserAccess(userId);
  const totp = access.role === 'Admin' ? await staffAuth.totpSetup(userId) : null;
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.ACCOUNT },
  ];

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <AccountForms
        profile={{
          name: session.user.name ?? '',
          image: (session.user as { image?: string | null }).image ?? '',
          bio: (session.user as { bio?: string | null }).bio ?? '',
          jobTitle: (session.user as { jobTitle?: string | null }).jobTitle ?? '',
          website: (session.user as { website?: string | null }).website ?? '',
          social:
            (session.user as { socialLinks?: Record<string, string> | null })
              .socialLinks ?? {},
          uiLocale:
            (session.user as { uiLocale?: string | null }).uiLocale ?? null,
        }}
        hasPassword={Boolean(
          (session.user as { passwordHash?: string | null }).passwordHash
        )}
        totp={totp}
      />
    </>
  );
}
