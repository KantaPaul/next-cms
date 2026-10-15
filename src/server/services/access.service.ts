import 'server-only';
import { and, eq, isNotNull } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { permissions, roles, users } from '@/db/schema';
import {
  PERMISSION_MATRIX,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  type PermissionKey,
  type RoleName,
} from '@/config/permissions';
import { ApplicationException } from '@/lib/utils/error';

export type UserAccess = {
  userId: string;
  role: RoleName | null;
  permissions: PermissionKey[];
};

const toKey = (resource: string, action: string) => `${resource}.${action}` as PermissionKey;

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
   * Users without a role get one on first access: the first user becomes Admin
   * so a fresh install is usable, everyone after that starts as Viewer.
   */
  assignDefaultRole: async (userId: string) => {
    const allRoles = await accessService.ensureRolesSeeded();
    const admin = allRoles.find(r => r.name === 'Admin')!;
    const viewer = allRoles.find(r => r.name === 'Viewer')!;

    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.roleId, admin.id), isNotNull(users.roleId)))
      .limit(1);

    const roleId = existingAdmin ? viewer.id : admin.id;
    await db.update(users).set({ roleId }).where(eq(users.id, userId));
    return roleId;
  },

  getUserAccess: cache(async (userId: string): Promise<UserAccess> => {
    const user = await db.query.users.findFirst({
      where: (t, { eq }) => eq(t.id, userId),
      columns: { id: true, roleId: true },
    });

    if (!user) return { userId, role: null, permissions: [] };

    const roleId = user.roleId ?? (await accessService.assignDefaultRole(userId));

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
  }),

  can: (access: UserAccess, key: PermissionKey) => access.permissions.includes(key),

  assertPermission: async (userId: string, key: PermissionKey) => {
    const access = await accessService.getUserAccess(userId);

    if (!accessService.can(access, key)) {
      throw new ApplicationException(`You do not have permission to do this (${key}).`);
    }

    return access;
  },
};
