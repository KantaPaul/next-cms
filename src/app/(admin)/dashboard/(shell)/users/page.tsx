import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { auditService } from '@/server/services/audit.service';
import { requirePermission } from '@/server/services/require-permission';
import { UsersAndRoles } from './_components/users-and-roles';
import { usersService } from './_modules/users.service';

const TITLE = 'Users & Roles';

export const metadata = {
  ...metaObject(TITLE),
};

export default async function UsersPage() {
  const { allowed, userId } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: TITLE, href: PAGES.DASHBOARD.USERS },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
        <AccessDenied what="users and roles" />
      </>
    );
  }

  const [users, activity] = await Promise.all([usersService.list(), auditService.list(200)]);

  return (
    <>
      <PageHeader title={TITLE} breadcrumbs={breadcrumbs} />
      <UsersAndRoles
        currentUserId={userId}
        users={users}
        activity={activity.map(a => ({
          id: a.id,
          action: a.action,
          targetType: a.targetType,
          targetName: a.targetName,
          details: a.details,
          createdAt: a.createdAt,
          actor: a.actor ? { name: a.actor.name, email: a.actor.email, image: a.actor.image } : null,
        }))}
      />
    </>
  );
}
