import 'server-only';
import type {
  PluginContext,
  PluginLogger,
  PluginSiteInfo,
} from '@nextcms/plugin-sdk';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { siteSettings, sites } from '@/db/schema';
import { safeFetch } from '@/server/lib/safe-fetch';
import { sendMail } from '@/server/services/mail';
import { storage } from '@/server/storage';
import { createPluginKv } from './kv';

export function createPluginLogger(pluginId: string): PluginLogger {
  const prefix = `[plugin:${pluginId}]`;
  return {
    info: (...args: unknown[]) => console.info(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
  };
}

export async function resolvePluginSiteInfo(
  siteId: string
): Promise<PluginSiteInfo> {
  try {
    const [[siteRow], [settingsRow]] = await Promise.all([
      db
        .select({
          id: sites.id,
          name: sites.name,
          slug: sites.slug,
          defaultLocale: sites.defaultLocale,
        })
        .from(sites)
        .where(eq(sites.id, siteId))
        .limit(1),
      db
        .select({
          siteName: siteSettings.siteName,
          siteUrl: siteSettings.siteUrl,
        })
        .from(siteSettings)
        .where(eq(siteSettings.siteId, siteId))
        .limit(1),
    ]);

    return {
      id: siteId,
      name: settingsRow?.siteName ?? siteRow?.name ?? 'Next CMS',
      slug: siteRow?.slug ?? null,
      url: settingsRow?.siteUrl ?? null,
      defaultLocale: siteRow?.defaultLocale ?? 'en',
    };
  } catch {
    return {
      id: siteId,
      name: 'Next CMS',
      slug: null,
      url: null,
      defaultLocale: 'en',
    };
  }
}

export async function buildPluginContext<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
>(options: {
  pluginId: string;
  siteId: string;
  settings: TSettings;
  siteInfo?: PluginSiteInfo;
}): Promise<PluginContext<TSettings>> {
  const site = options.siteInfo ?? (await resolvePluginSiteInfo(options.siteId));
  return {
    pluginId: options.pluginId,
    settings: options.settings,
    site,
    logger: createPluginLogger(options.pluginId),
    mail: sendMail,
    storage: storage(),
    safeFetch: ((input, init) =>
      safeFetch(
        typeof input === 'string' || input instanceof URL ? input : input.url,
        init
      )) as typeof fetch,
    db,
    kv: createPluginKv(options.siteId, options.pluginId),
  };
}
