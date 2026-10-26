import 'server-only';
import { and, asc, count, eq, isNull, ne } from 'drizzle-orm';
import { ROLE_NAMES, type RoleName } from '@/config/permissions';
import { db } from '@/db';
import { roles, users } from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { accessService } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';

export const usersService = {
  list: async () => {
    await accessService.ensureRolesSeeded();
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        createdAt: users.createdAt,
        role: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(isNull(users.deletedAt))
      .orderBy(asc(users.createdAt));
  },

  setRole: async (
    { userId, role }: { userId: string; role: RoleName },
    actorId: string
  ) => {
    if (!ROLE_NAMES.includes(role))
      throw new ApplicationException('Unknown role.');
    if (userId === actorId)
      throw new ApplicationException(
        'You cannot change your own role. Ask another admin.'
      );

    const allRoles = await accessService.ensureRolesSeeded();
    const target = allRoles.find(r => r.name === role);
    const admin = allRoles.find(r => r.name === 'Admin');
    if (!target || !admin)
      throw new ApplicationException('Roles are not set up yet.');

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
      })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) throw new NotFoundException('User not found');
    if (user.roleId === target.id) return { id: user.id, role };

    if (user.roleId === admin.id) {
      const [{ admins }] = await db
        .select({ admins: count() })
        .from(users)
        .where(
          and(
            eq(users.roleId, admin.id),
            ne(users.id, userId),
            isNull(users.deletedAt)
          )
        );
      if (!admins)
        throw new ApplicationException('At least one admin is required.');
    }

    const previous =
      allRoles.find(r => r.id === user.roleId)?.name ?? 'No role';
    await db
      .update(users)
      .set({ roleId: target.id })
      .where(eq(users.id, userId));
    await auditService.log({
      actorId,
      action: 'role_change',
      targetType: 'user',
      targetId: userId,
      targetName: user.name || user.email,
      details: `${previous} → ${role}`,
    });
    return { id: user.id, role };
  },
};

export type UserListItem = Awaited<
  ReturnType<typeof usersService.list>
>[number];
