import 'server-only';
import type { PluginKvStore } from '@nextcms/plugin-sdk';
import { and, eq, like } from 'drizzle-orm';
import { db } from '@/db';
import { pluginKv } from '@/db/schema';

function escapeLike(prefix: string): string {
  return prefix.replace(/[\\%_]/g, ch => `\\${ch}`);
}

export function createPluginKv(siteId: string, pluginId: string): PluginKvStore {
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const [row] = await db
        .select({ value: pluginKv.value })
        .from(pluginKv)
        .where(
          and(
            eq(pluginKv.siteId, siteId),
            eq(pluginKv.pluginId, pluginId),
            eq(pluginKv.key, key)
          )
        )
        .limit(1);
      return row ? (row.value as T) : null;
    },

    async set<T = unknown>(key: string, value: T): Promise<void> {
      await db
        .insert(pluginKv)
        .values({
          siteId,
          pluginId,
          key,
          value,
        })
        .onConflictDoUpdate({
          target: [pluginKv.siteId, pluginKv.pluginId, pluginKv.key],
          set: {
            value,
            updatedAt: new Date(),
          },
        });
    },

    async delete(key: string): Promise<void> {
      await db
        .delete(pluginKv)
        .where(
          and(
            eq(pluginKv.siteId, siteId),
            eq(pluginKv.pluginId, pluginId),
            eq(pluginKv.key, key)
          )
        );
    },

    async list(prefix?: string): Promise<Array<{ key: string; value: unknown }>> {
      const conditions = [
        eq(pluginKv.siteId, siteId),
        eq(pluginKv.pluginId, pluginId),
      ];
      if (prefix) {
        conditions.push(like(pluginKv.key, `${escapeLike(prefix)}%`));
      }
      return db
        .select({ key: pluginKv.key, value: pluginKv.value })
        .from(pluginKv)
        .where(and(...conditions));
    },
  };
}
