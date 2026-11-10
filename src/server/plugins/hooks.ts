import 'server-only';
import type {
  FilterName,
  FilterRegistration,
  FilterValueMap,
  HookName,
  HookPayloadMap,
  HookRegistration,
  PluginContext,
  ServerPluginDefinition,
} from '@nextcms/plugin-sdk';
import { after } from 'next/server';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import { SERVER_PLUGINS } from '@/plugins/generated/server-registry';
import { auditService } from '@/server/services/audit.service';
import { buildPluginContext } from './context';
import { pluginsService } from './plugins.service';
import { deliverWebhooksForHook } from './webhooks-subscriber';

const DEFAULT_HOOK_TIMEOUT_MS = 10_000;

export type PluginHookRuntime = {
  plugins: ServerPluginDefinition<any>[];
  getEnabledPluginMap: (
    siteId: string
  ) => Promise<Map<string, Record<string, unknown>>>;
  buildContext: (options: {
    pluginId: string;
    siteId: string;
    settings: Record<string, unknown>;
  }) => Promise<PluginContext>;
  recordError: (
    siteId: string,
    pluginId: string,
    message: string
  ) => Promise<void>;
  runBuiltinSubscriber: <K extends HookName>(
    name: K,
    payload: HookPayloadMap[K]
  ) => Promise<void>;
};

const defaultRuntime: PluginHookRuntime = {
  plugins: SERVER_PLUGINS,
  getEnabledPluginMap: siteId => pluginsService.getEnabledSettingsMap(siteId),
  buildContext: options => buildPluginContext(options),
  recordError: async (siteId, pluginId, message) => {
    await pluginsService.recordPluginError(siteId, pluginId, message);
    await auditService
      .log({
        actorId: null,
        action: 'plugin_error',
        targetType: 'plugin',
        targetId: pluginId,
        targetName: pluginId,
        details: message.slice(0, 1000),
      })
      .catch(() => undefined);
  },
  runBuiltinSubscriber: (name, payload) => deliverWebhooksForHook(name, payload),
};

function withTimeout<T>(
  promise: Promise<T> | T,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Plugin ${label} timed out after ${timeoutMs}ms`));
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

function unwrapHook<K extends HookName>(
  reg: HookRegistration<K, any>
): { priority: number; run: (payload: HookPayloadMap[K], ctx: PluginContext) => Promise<void> | void } {
  if (typeof reg === 'function') {
    return { priority: 10, run: reg };
  }
  return { priority: reg.priority ?? 10, run: reg.run };
}

function unwrapFilter<K extends FilterName>(
  reg: FilterRegistration<K, any>
): {
  priority: number;
  run: (
    value: FilterValueMap[K]['value'],
    ctx: PluginContext & { meta: FilterValueMap[K]['meta'] }
  ) => Promise<FilterValueMap[K]['value']> | FilterValueMap[K]['value'];
} {
  if (typeof reg === 'function') {
    return { priority: 10, run: reg };
  }
  return { priority: reg.priority ?? 10, run: reg.run };
}

function siteIdOfPayload<K extends HookName>(payload: HookPayloadMap[K]): string {
  const maybe = (payload as { siteId?: string }).siteId;
  return maybe && typeof maybe === 'string' ? maybe : DEFAULT_SITE_ID;
}

/**
 * Immediately runs built-in subscribers and every enabled plugin's handler for
 * hook `name`, isolating timeouts and errors per plugin.
 */
export async function runActionNow<K extends HookName>(
  name: K,
  payload: HookPayloadMap[K],
  options?: { timeoutMs?: number; runtime?: PluginHookRuntime }
): Promise<{ executed: string[]; errors: Array<{ pluginId: string; error: string }> }> {
  const rt = options?.runtime ?? defaultRuntime;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS;
  const siteId = siteIdOfPayload(payload);

  // Built-in subscribers (e.g. webhooks) always run in isolation too.
  try {
    await rt.runBuiltinSubscriber(name, payload);
  } catch (err) {
    console.error(`[plugins/hooks] builtin subscriber failed for ${name}:`, err);
  }

  const enabledMap = await rt.getEnabledPluginMap(siteId);
  const candidates = rt.plugins
    .filter(p => enabledMap.has(p.id) && p.hooks?.[name])
    .map(p => ({
      plugin: p,
      ...unwrapHook(p.hooks![name]!),
    }))
    .sort((a, b) => a.priority - b.priority);

  const executed: string[] = [];
  const errors: Array<{ pluginId: string; error: string }> = [];

  for (const entry of candidates) {
    const settings = enabledMap.get(entry.plugin.id) ?? {};
    try {
      const ctx = await rt.buildContext({
        pluginId: entry.plugin.id,
        siteId,
        settings,
      });
      await withTimeout(
        entry.run(payload, ctx),
        timeoutMs,
        `"${entry.plugin.id}" hook "${name}"`
      );
      executed.push(entry.plugin.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ pluginId: entry.plugin.id, error: message });
      console.error(
        `[plugin:${entry.plugin.id}] hook "${name}" failed:`,
        err
      );
      await rt
        .recordError(siteId, entry.plugin.id, `Hook "${name}": ${message}`)
        .catch(() => undefined);
    }
  }

  return { executed, errors };
}

/**
 * Dispatches an action hook after the current response via Next.js `after()`.
 * Outside a Next.js request scope (e.g. tests, CLI scripts, cron), runs directly.
 */
export async function doAction<K extends HookName>(
  name: K,
  payload: HookPayloadMap[K],
  options?: { timeoutMs?: number; runtime?: PluginHookRuntime }
): Promise<void> {
  try {
    after(async () => {
      await runActionNow(name, payload, options);
    });
  } catch {
    await runActionNow(name, payload, options);
  }
}

/**
 * Runs enabled plugins' filter handlers for `name` in priority order.
 * A throwing plugin is skipped and logged, passing the previous value through unchanged.
 */
export async function applyFilters<K extends FilterName>(
  name: K,
  initialValue: FilterValueMap[K]['value'],
  meta: FilterValueMap[K]['meta'],
  options?: { timeoutMs?: number; runtime?: PluginHookRuntime }
): Promise<FilterValueMap[K]['value']> {
  const rt = options?.runtime ?? defaultRuntime;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS;
  const siteId = meta.siteId || DEFAULT_SITE_ID;
  const enabledMap = await rt.getEnabledPluginMap(siteId);

  let current = initialValue;

  // For `form.actions`, also merge plugins' declarative `formActions` before running custom filters.
  if (name === 'form.actions') {
    const declarative = rt.plugins
      .filter(p => enabledMap.has(p.id) && p.formActions?.length)
      .flatMap(p =>
        (p.formActions ?? []).map(a => ({ ...a, pluginId: a.pluginId ?? p.id }))
      );
    if (declarative.length > 0) {
      current = [
        ...(current as FilterValueMap['form.actions']['value']),
        ...declarative,
      ] as FilterValueMap[K]['value'];
    }
  }

  const candidates = rt.plugins
    .filter(p => enabledMap.has(p.id) && p.filters?.[name])
    .map(p => ({
      plugin: p,
      ...unwrapFilter(p.filters![name]!),
    }))
    .sort((a, b) => a.priority - b.priority);

  for (const entry of candidates) {
    const settings = enabledMap.get(entry.plugin.id) ?? {};
    try {
      const baseCtx = await rt.buildContext({
        pluginId: entry.plugin.id,
        siteId,
        settings,
      });
      const nextVal = await withTimeout(
        entry.run(current, { ...baseCtx, meta }),
        timeoutMs,
        `"${entry.plugin.id}" filter "${name}"`
      );
      if (nextVal !== undefined) {
        if (name === 'form.actions' && Array.isArray(nextVal)) {
          current = nextVal.map(item =>
            item && typeof item === 'object' && !('pluginId' in item && item.pluginId)
              ? { ...item, pluginId: entry.plugin.id }
              : item
          ) as FilterValueMap[K]['value'];
        } else {
          current = nextVal;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[plugin:${entry.plugin.id}] filter "${name}" failed:`,
        err
      );
      await rt
        .recordError(siteId, entry.plugin.id, `Filter "${name}": ${message}`)
        .catch(() => undefined);
    }
  }

  return current;
}
