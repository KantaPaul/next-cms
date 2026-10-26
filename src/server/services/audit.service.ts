import 'server-only';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import type { DBTrx } from '@/lib/types';

export type AuditAction =
  | 'create'
  | 'update'
  | 'publish'
  | 'unpublish'
  | 'delete'
  | 'restore'
  | 'review_requested'
  | 'settings_change'
  | 'media_upload'
  | 'role_change'
  | 'revoke';

export type AuditTarget =
  | 'page'
  | 'post'
  | 'media'
  | 'menu'
  | 'settings'
  | 'role'
  | 'taxonomy'
  | 'template'
  | 'global_block'
  | 'api_key'
  | 'user'
  | 'site';

export const auditService = {
  log: async (
    entry: {
      actorId?: string | null;
      action: AuditAction;
      targetType: AuditTarget;
      targetId?: string | null;
      targetName?: string | null;
      details?: string | null;
    },
    orm: DBTrx = db
  ) => {
    await orm.insert(auditLogs).values({
      ...entry,
      targetName: entry.targetName?.slice(0, 255),
    });
  },

  list: async (limit = 100) =>
    db.query.auditLogs.findMany({
      orderBy: desc(auditLogs.createdAt),
      limit,
      with: {
        actor: { columns: { id: true, name: true, email: true, image: true } },
      },
    }),
};
