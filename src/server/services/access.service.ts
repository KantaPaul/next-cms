import 'server-only';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { cache } from 'react';
import {
  PERMISSION_MATRIX,
  type PermissionKey,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  type RoleName,
} from '@/config/permissions';
import { db } from '@/db';
import { permissions, roles, siteMemberships, users } from '@/db/schema';
import { ApplicationException } from '@/lib/utils/error';
import { siteContext } from '@/server/services/site-context';

export type UserAccess = {
  userId: string;
  role: RoleName | null;
  permissions: PermissionKey[];
};

const toKey = (resource: string, action: string) =>
  `${resource}.${action}` as PermissionKey;

export const accessService = {
  /** Creates the four default roles and their permission rows if they are missing. */
  ensureRolesSeeded: async () => {
    const existing = await db.select().from(roles);
    const byName = new Map(existing.map(r => [r.name, r]));

    for (const name of ROLE_NAMES) {
      let role = byName.get(name);

      if (!role) {
        [role] = await db
          .insert(roles)
          .values({ name, description: ROLE_DESCRIPTIONS[name] })
          .onConflictDoNothing()
          .returning();
        role ??= (await db.select().from(roles).where(eq(roles.name, name)))[0];
      }

      const rows = PERMISSION_MATRIX.filter(p => p.roles[name]).map(p => {
        const [resource, action] = p.key.split('.');
        return { roleId: role!.id, resource, action, allowed: true };
      });

      if (rows.length) {
        await db.insert(permissions).values(rows).onConflictDoNothing();
      }
    }

    return db.select().from(roles);
  },

  /**
   * Users without a role get Viewer by default inside a transaction.
   * Users who already have roleId are left unchanged (R264 / A2-01).
   */
  assignDefaultRole: async (userId: string) => {
    return await db.transaction(async tx => {
      const [user] = await tx
        .select({ id: users.id, roleId: users.roleId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return null;
      if (user.roleId) return user.roleId;

      const allRoles = await accessService.ensureRolesSeeded();
      const viewer = allRoles.find(r => r.name === 'Viewer');
      if (!viewer) throw new Error('Viewer role not found');

      await tx
        .update(users)
        .set({ roleId: viewer.id })
        .where(and(eq(users.id, userId), isNull(users.roleId)));

      return viewer.id;
    });
  },

  getUserAccessForSite: cache(
    async (userId: string, siteId: string): Promise<UserAccess> => {
      const user = await db.query.users.findFirst({
        where: (t, { eq }) => eq(t.id, userId),
        columns: { id: true, roleId: true },
      });

      if (!user) return { userId, role: null, permissions: [] };

      const [membership] = await db
        .select({ roleId: siteMemberships.roleId })
        .from(siteMemberships)
        .where(
          and(
            eq(siteMemberships.userId, userId),
            eq(siteMemberships.siteId, siteId),
            isNull(siteMemberships.deletedAt)
          )
        )
        .limit(1);

      const [anyMembership] = membership
        ? [membership]
        : await db
            .select({ roleId: siteMemberships.roleId })
            .from(siteMemberships)
            .where(
              and(eq(siteMemberships.userId, userId), isNull(siteMemberships.deletedAt))
            )
            .limit(1);

      const roleId = membership
        ? membership.roleId
        : anyMembership
          ? null
          : (user.roleId ?? (await accessService.assignDefaultRole(userId)));

      if (!roleId) return { userId, role: null, permissions: [] };

      const role = await db.query.roles.findFirst({
        where: (t, { eq }) => eq(t.id, roleId),
        with: { permissions: true },
      });

      return {
        userId,
        role: (role?.name as RoleName) ?? null,
        permissions: (role?.permissions ?? [])
          .filter(p => p.allowed)
          .map(p => toKey(p.resource, p.action)),
      };
    }
  ),

  getUserAccess: cache(async (userId: string): Promise<UserAccess> => {
    const siteId = await siteContext.adminSiteId(userId);
    return accessService.getUserAccessForSite(userId, siteId);
  }),

  can: (access: UserAccess, key: PermissionKey) =>
    access.permissions.includes(key),

  assertPermission: async (userId: string, key: PermissionKey) => {
    const access = await accessService.getUserAccess(userId);

    if (!accessService.can(access, key)) {
      throw new ApplicationException(
        `You do not have permission to do this (${key}).`
      );
    }

    return access;
  },
};
