import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plugins, siteSettings, type SiteIntegrations } from '@/db/schema';
import { SERVER_PLUGINS_BY_ID } from '@/plugins/generated/server-registry';
import { encryptPluginSecret } from './secrets';

export type MailchimpMigrationDeps = {
  hasPluginRow: (siteId: string) => Promise<boolean>;
  readLegacyApiKey: (siteId: string) => Promise<string | null>;
  insertEnabledPlugin: (
    siteId: string,
    encryptedApiKey: string,
    version: string | null
  ) => Promise<void>;
  clearLegacyApiKey?: (siteId: string) => Promise<void>;
};

/**
 * Pure, testable one-time migration logic: copies legacy
 * `site_settings.integrations.mailchimp.apiKey` into the encrypted `plugins`
 * table and enables `mailchimp` when a key exists.
 */
export async function runMailchimpMigrationOnce(
  siteId: string,
  deps: MailchimpMigrationDeps,
  pluginVersion: string | null = SERVER_PLUGINS_BY_ID.mailchimp?.version ?? null,
  secretOverride?: string
): Promise<{ migrated: boolean; enabled: boolean }> {
  const exists = await deps.hasPluginRow(siteId);
  if (exists) {
    return { migrated: false, enabled: false };
  }

  const legacyKey = (await deps.readLegacyApiKey(siteId))?.trim();
  if (!legacyKey) {
    return { migrated: false, enabled: false };
  }

  const encrypted = encryptPluginSecret(legacyKey, secretOverride);
  await deps.insertEnabledPlugin(siteId, encrypted, pluginVersion);
  if (deps.clearLegacyApiKey) {
    await deps.clearLegacyApiKey(siteId);
  }
  return { migrated: true, enabled: true };
}

const checkedSites = new Set<string>();

/** Ensures legacy Mailchimp settings are migrated at most once per site. */
export async function ensureMailchimpMigrated(siteId: string): Promise<void> {
  if (checkedSites.has(siteId)) return;
  try {
    await runMailchimpMigrationOnce(siteId, {
      hasPluginRow: async sId => {
        const [row] = await db
          .select({ id: plugins.id })
          .from(plugins)
          .where(and(eq(plugins.siteId, sId), eq(plugins.pluginId, 'mailchimp')))
          .limit(1);
        return Boolean(row);
      },
      readLegacyApiKey: async sId => {
        const [row] = await db
          .select({ integrations: siteSettings.integrations })
          .from(siteSettings)
          .where(eq(siteSettings.siteId, sId))
          .limit(1);
        const integrations = row?.integrations as SiteIntegrations | undefined;
        return integrations?.mailchimp?.apiKey ?? null;
      },
      insertEnabledPlugin: async (sId, encryptedApiKey, version) => {
        await db
          .insert(plugins)
          .values({
            siteId: sId,
            pluginId: 'mailchimp',
            enabled: true,
            settings: { apiKey: encryptedApiKey },
            version,
          })
          .onConflictDoNothing();
      },
      clearLegacyApiKey: async sId => {
        const [row] = await db
          .select({ integrations: siteSettings.integrations })
          .from(siteSettings)
          .where(eq(siteSettings.siteId, sId))
          .limit(1);
        const current = (row?.integrations as SiteIntegrations | undefined) ?? {};
        if (!current.mailchimp?.apiKey) return;
        const { apiKey: _removed, ...restMailchimp } = current.mailchimp;
        await db
          .update(siteSettings)
          .set({
            integrations: {
              ...current,
              mailchimp: restMailchimp,
            },
          })
          .where(eq(siteSettings.siteId, sId));
      },
    });
    checkedSites.add(siteId);
  } catch (err) {
    console.warn('[plugins/migrate-mailchimp] migration check failed:', err);
  }
}

export function resetMailchimpMigrationCacheForTest(): void {
  checkedSites.clear();
}
