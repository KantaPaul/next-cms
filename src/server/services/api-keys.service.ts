import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, users } from '@/db/schema';
import { NotFoundException } from '@/lib/utils/error';
import { auditService } from './audit.service';

const KEY_PREFIX = 'ncms_';
const LAST_USED_RESOLUTION_MS = 60_000;

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

export const apiKeysService = {
  list: async () =>
    db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
        createdByName: users.name,
      })
      .from(apiKeys)
      .leftJoin(users, eq(users.id, apiKeys.createdBy))
      .orderBy(desc(apiKeys.createdAt)),

  /** Returns the plaintext key once. Only its hash is stored. */
  create: async (name: string, actorId: string) => {
    const key = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
    const [row] = await db
      .insert(apiKeys)
      .values({
        name,
        prefix: key.slice(0, 12),
        hashedKey: hashKey(key),
        createdBy: actorId,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
      });
    await auditService.log({
      actorId,
      action: 'create',
      targetType: 'api_key',
      targetId: row.id,
      targetName: name,
    });
    return { ...row, key };
  },

  revoke: async (id: string, actorId: string) => {
    const [row] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
      .returning({ id: apiKeys.id, name: apiKeys.name });
    if (!row)
      throw new NotFoundException('API key not found or already revoked');
    await auditService.log({
      actorId,
      action: 'revoke',
      targetType: 'api_key',
      targetId: id,
      targetName: row.name,
    });
    return row;
  },

  /** Resolves an active key from its plaintext value and records when it was last used. */
  verify: async (key: string) => {
    if (!key.startsWith(KEY_PREFIX)) return null;
    const [row] = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        lastUsedAt: apiKeys.lastUsedAt,
      })
      .from(apiKeys)
      .where(
        and(eq(apiKeys.hashedKey, hashKey(key)), isNull(apiKeys.revokedAt))
      )
      .limit(1);
    if (!row) return null;

    const now = Date.now();

    if (
      !row.lastUsedAt ||
      now - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
    ) {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date(now) })
        .where(eq(apiKeys.id, row.id));
    }

    return { id: row.id, name: row.name };
  },
};

export type ApiKeyListItem = Awaited<
  ReturnType<typeof apiKeysService.list>
>[number];
