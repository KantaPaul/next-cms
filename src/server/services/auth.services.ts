import 'server-only';
import {
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  like,
  or,
  sql,
  type SQLWrapper,
} from 'drizzle-orm';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { MESSAGES } from '@/config/messages';
import { db } from '@/db';
import type { User, UpdateUser } from '@/db/schemas/auth.schema';
import {
  users as usersModel,
  users,
  userUpdateSchema,
} from '@/db/schemas/auth.schema';

import { ApplicationException } from '@/lib/utils/error';
import { newDate } from '@/lib/utils/format-date';
import type { DBTrx } from '@/lib/types';
import { UserStatus } from '@/db/schema';
import { validateSession } from '@/lib/auth/session.validation';
import { logout } from '@/server/actions/auth.actions';


export type UserParams = {
  size?: number;
  page?: number;
  search?: string;
  status?: string;
  role?: string;
};

const validateUserData = async (data: UpdateUser) => {
  return userUpdateSchema.safeParseAsync(data);
};

/**
 * User Service
 */

export const AuthService = {
  find: async (id: string, orm: DBTrx = db) => {
    const user = await orm.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });

    if (!user) {
      throw new ApplicationException(MESSAGES.USER_NOT_FOUND);
    }

    return {
      ...user,
    };
  },

  findByEmail: async (email: string) => {
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
  },

  getUserDetails: async (id?: string) => {
    if (!id) {
      return;
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });

    if (!user) {
      throw new ApplicationException(MESSAGES.USER_NOT_FOUND);
    }

    // intentionally changing image url here
    if (user.image && user.image?.startsWith('http') == false) {
      user.image = `${process.env.NEXT_PUBLIC_UPLOAD_URL}/${user.image}`;
    }

    return {
      ...user,
    };
  },

  create: async (data: User, orm: DBTrx = db) => {
    const defaultName = data.name || data.email.split('@')[0];

    const [inserted] = await orm
      .insert(usersModel)
      .values({ ...data, name: defaultName })
      .onConflictDoUpdate({
        target: usersModel.email,
        set: {
          name: defaultName,
          email: data.email,
          image: data.image,
          status: data.status,
          googleId: data.googleId,
          emailVerified: data.emailVerified,
        },
      })
      .returning()
      .execute();

    return inserted;
  },

  delete: async (id: string) => {
    const [deleted] = await db
      .update(usersModel)
      .set({ status: UserStatus.Inactive, deletedAt: newDate() })
      .where(eq(usersModel.id, id))
      .returning();

    return deleted;
  },

  update: async (id: string, data: UpdateUser) => {
    const [updated] = await db
      .update(usersModel)
      .set(data)
      .where(eq(usersModel.id, id))
      .returning();

    return updated;
  },

  updateByEmail: async (email: string, data: UpdateUser) => {
    const [updated] = await db
      .update(usersModel)
      .set(data)
      .where(eq(usersModel.email, email))
      .returning();

    return updated;
  },

  getAll: async () => {
    return await db.query.users.findMany({
      orderBy: [desc(usersModel.createdAt)],
    });
  },

  mapUserStatus: (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return UserStatus.Active;
      case 'INACTIVE':
        return UserStatus.Inactive;
      default:
        return undefined;
    }
  },

  /**
   * Get users
   * @param params
   * @returns
   */
  getUsers: async (params: UserParams) => {
    const size = Number(params.size) || 10;
    const page = params.page ? Number(params.page) - 1 : 0;
    const search = params.search || '';
    const status = AuthService.mapUserStatus(params.status || '*');
    const role = params.role || '';

    const conditions: SQLWrapper[] = [];

    if (status) {
      conditions.push(eq(usersModel.status, status));
    }

    if (search.length > 0) {
      const searchText = or(
        ilike(usersModel.name, `%${search}%`),
        ilike(usersModel.email, `%${search}%`)
      );
      searchText && conditions.push(searchText);
    }

    const where = and(...conditions);
    return db.transaction(async db => {
      const users = await db.query.users.findMany({
        where,
        orderBy: [desc(usersModel.createdAt)],
        offset: page * size,
        limit: size,
      });
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(usersModel)
        .where(where);
      const count = result[0].count;
      return {
        users,
        count,
      };
    });
  },

  getUserSession: async (userId: string) => {
    const { getUserSessions } = await import('@/lib/auth/session');
    return await getUserSessions(userId);
  },

  exportUsers: async (params: {
    text?: string;
    status?: string;
    role?: string;
  }) => {
    const text = params.text || '';
    const status = AuthService.mapUserStatus(params.status || '*');

    const where = and(
      status && eq(usersModel.status, status),

      or(
        ilike(usersModel.name, `%${text}%`),
        ilike(usersModel.email, `%${text}%`)
      )
    );

    return await db.query.users.findMany({
      where,
      orderBy: [desc(usersModel.createdAt)],
    });
  },

  updateUser: async (userId: string, data: UpdateUser) => {
    const validatedData = await validateUserData(data);

    if (!validatedData.success) {
      throw new ApplicationException(MESSAGES.INVALID_INPUTS);
    }

    const [updated] = await db
      .update(usersModel)
      .set(validatedData.data)
      .where(eq(usersModel.id, userId))
      .returning();

    return updated;
  },

  signOut: async () => {
    const session = await validateSession();

    if (!session) {
      return {
        error: 'Unauthorized',
      };
    }

    await logout();
    return redirect('/login');
  },
};
