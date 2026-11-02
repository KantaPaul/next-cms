import 'server-only';
import { and, asc, count, eq, isNull, ne } from 'drizzle-orm';
import { ROLE_NAMES, type RoleName } from '@/config/permissions';
import { db } from '@/db';
import { roles, users, UserStatus } from '@/db/schema';
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
        status: users.status,
        approvedAt: users.approvedAt,
        lockedUntil: users.lockedUntil,
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

  approveUser: async ({ userId }: { userId: string }, actorId: string) => {
    return await db.transaction(async tx => {
      const [user] = await tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          status: users.status,
          roleId: users.roleId,
          approvedAt: users.approvedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) throw new NotFoundException('User not found');

      const allRoles = await accessService.ensureRolesSeeded();
      const viewer = allRoles.find(r => r.name === 'Viewer');
      const targetRoleId = user.roleId || viewer?.id;

      const now = new Date();
      await tx
        .update(users)
        .set({
          status: UserStatus.Active,
          approvedAt: now,
          roleId: targetRoleId,
        })
        .where(eq(users.id, userId));

      await auditService.log({
        actorId,
        action: 'update',
        targetType: 'user',
        targetId: userId,
        targetName: user.name || user.email,
        details: 'Approved pending user',
      });

      return { id: user.id, approved: true };
    });
  },
};

export type UserListItem = Awaited<
  ReturnType<typeof usersService.list>
>[number];
