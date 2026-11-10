import 'server-only';
import type {
  PluginContext,
  PluginCronDef,
  ServerPluginDefinition,
} from '@nextcms/plugin-sdk';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plugins, sites } from '@/db/schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { SERVER_PLUGINS_BY_ID } from '@/plugins/generated/server-registry';
import { auditService } from '@/server/services/audit.service';
import { buildPluginContext } from './context';
import { pluginsService } from './plugins.service';
import { decryptPluginSettings } from './secrets';

const HOURLY_MS = 60 * 60 * 1000;
const DAILY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CRON_TIMEOUT_MS = 10_000;

export function cronJobKey(job: PluginCronDef<any>, index: number): string {
  return job.id ? `${job.every}:${job.id}` : `${job.every}:${index}`;
}

export function isCronJobDue(
  every: 'hourly' | 'daily',
  lastRunIso: string | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!lastRunIso) return true;
  const lastMs = Date.parse(lastRunIso);
  if (!Number.isFinite(lastMs)) return true;
  const interval = every === 'daily' ? DAILY_MS : HOURLY_MS;
  return nowMs - lastMs >= interval;
}

function withTimeout<T>(
  promise: Promise<T> | T,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Plugin cron ${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    Promise.resolve(promise)
      .then(val => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export type PluginCronRunnerDeps = {
  listSiteIds: () => Promise<string[]>;
  listEnabledRows: (
    siteId: string
  ) => Promise<
    Array<{
      id: string;
      pluginId: string;
      settings: Record<string, unknown>;
      lastCronRunAt: Record<string, string> | null;
    }>
  >;
  getPlugin: (id: string) => ServerPluginDefinition<any> | undefined;
  buildContext: (opts: {
    pluginId: string;
    siteId: string;
    settings: Record<string, unknown>;
  }) => Promise<PluginContext>;
  saveLastCronRunAt: (
    rowId: string,
    lastCronRunAt: Record<string, string>
  ) => Promise<void>;
  recordError: (siteId: string, pluginId: string, msg: string) => Promise<void>;
};

const defaultDeps: PluginCronRunnerDeps = {
  listSiteIds: async () => {
    const rows = await db.select({ id: sites.id }).from(sites);
    return rows.length > 0 ? rows.map(r => r.id) : [DEFAULT_SITE_ID];
  },
  listEnabledRows: async siteId => {
    const rows = await db
      .select({
        id: plugins.id,
        pluginId: plugins.pluginId,
        settings: plugins.settings,
        lastCronRunAt: plugins.lastCronRunAt,
      })
      .from(plugins)
      .where(and(eq(plugins.siteId, siteId), eq(plugins.enabled, true)));
    return rows.map(r => ({
      id: r.id,
      pluginId: r.pluginId,
      settings: r.settings ?? {},
      lastCronRunAt: r.lastCronRunAt ?? null,
    }));
  },
  getPlugin: id => SERVER_PLUGINS_BY_ID[id],
  buildContext: opts => buildPluginContext(opts),
  saveLastCronRunAt: async (rowId, lastCronRunAt) => {
    await db
      .update(plugins)
      .set({ lastCronRunAt, updatedAt: new Date() })
      .where(eq(plugins.id, rowId));
  },
  recordError: async (siteId, pluginId, msg) => {
    await pluginsService.recordPluginError(siteId, pluginId, msg);
    await auditService
      .log({
        actorId: null,
        action: 'plugin_error',
        targetType: 'plugin',
        targetId: pluginId,
        targetName: pluginId,
        details: msg.slice(0, 1000),
      })
      .catch(() => undefined);
  },
};

export async function runDuePluginCrons(options?: {
  nowMs?: number;
  timeoutMs?: number;
  deps?: PluginCronRunnerDeps;
}): Promise<{
  ran: Array<{ siteId: string; pluginId: string; job: string }>;
  skipped: number;
  errors: Array<{ siteId: string; pluginId: string; job: string; error: string }>;
}> {
  const deps = options?.deps ?? defaultDeps;
  const nowMs = options?.nowMs ?? Date.now();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CRON_TIMEOUT_MS;
  const nowIso = new Date(nowMs).toISOString();

  const siteIds = await deps.listSiteIds();
  const ran: Array<{ siteId: string; pluginId: string; job: string }> = [];
  const errors: Array<{
    siteId: string;
    pluginId: string;
    job: string;
    error: string;
  }> = [];
  let skipped = 0;

  for (const siteId of siteIds) {
    const enabledRows = await deps.listEnabledRows(siteId);
    for (const row of enabledRows) {
      const def = deps.getPlugin(row.pluginId);
      if (!def?.cron?.length) continue;

      const fields = def.settings?.fields ?? {};
      const decrypted = decryptPluginSettings(row.settings, fields);
      const nextCronMap = { ...(row.lastCronRunAt ?? {}) };
      let changed = false;

      for (let i = 0; i < def.cron.length; i++) {
        const job = def.cron[i];
        const key = cronJobKey(job, i);
        if (!isCronJobDue(job.every, nextCronMap[key], nowMs)) {
          skipped++;
          continue;
        }

        try {
          const ctx = await deps.buildContext({
            pluginId: def.id,
            siteId,
            settings: decrypted,
          });
          await withTimeout(
            job.run(ctx),
            timeoutMs,
            `"${def.id}" (${key})`
          );
          nextCronMap[key] = nowIso;
          changed = true;
          ran.push({ siteId, pluginId: def.id, job: key });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ siteId, pluginId: def.id, job: key, error: message });
          await deps.recordError(
            siteId,
            def.id,
            `Cron "${key}": ${message}`
          );
        }
      }

      if (changed) {
        await deps.saveLastCronRunAt(row.id, nextCronMap);
      }
    }
  }

  return { ran, skipped, errors };
}
