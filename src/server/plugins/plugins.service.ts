import 'server-only';
import {
  isMaskedSecret,
  type PluginSettingField,
  satisfiesCmsVersion,
  type ServerPluginDefinition,
} from '@nextcms/plugin-sdk';
import { and, eq } from 'drizzle-orm';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { plugins } from '@/db/schema';
import { DEFAULT_SITE_ID } from '@/db/schemas/sites.schema';
import packageJson from '../../../package.json';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { CLIENT_PLUGINS_BY_ID } from '@/plugins/generated/client-registry';
import {
  SERVER_PLUGINS,
  SERVER_PLUGINS_BY_ID,
} from '@/plugins/generated/server-registry';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import { ensureMailchimpMigrated } from './migrate-mailchimp';
import {
  decryptPluginSettings,
  encryptPluginSettings,
  maskPluginSettingsForClient,
} from './secrets';

export type PluginStatus =
  | 'enabled'
  | 'disabled'
  | 'available'
  | 'missing_code';

export type DashboardPluginItem = {
  id: string;
  name: string;
  version: string | null;
  description: string | null;
  requires: string | null;
  status: PluginStatus;
  enabled: boolean;
  hasSettings: boolean;
  lastError: string | null;
  lastErrorAt: Date | null;
  installedAt: Date | null;
  adminPages: Array<{ slug: string; title: string; navLabel?: string; permission?: string }>;
};

export type AdminPluginDetail = {
  id: string;
  name: string;
  version: string;
  description: string | null;
  requires: string | null;
  status: Exclude<PluginStatus, 'missing_code'>;
  enabled: boolean;
  lastError: string | null;
  lastErrorAt: Date | null;
  fields: Record<string, PluginSettingField>;
  values: Record<string, unknown>;
  adminPages: Array<{ slug: string; title: string; navLabel?: string; permission?: string }>;
};

/**
 * The CMS product version from package.json, which plugin `requires` ranges
 * are written against. NEXT_PUBLIC_APP_VERSION is a per-deployment tag
 * (e.g. "v0.0.1-local") and made every `>=0.1.0` plugin impossible to enable.
 */
function currentCmsVersion(): string {
  const raw = String(packageJson.version ?? '').trim();
  return /^\d+\.\d+\.\d+$/.test(raw) ? raw : '0.0.0';
}

export const pluginsService = {
  /** Lists all plugins (in code and/or DB) for Dashboard -> Plugins. */
  async listForDashboard(siteIdOverride?: string): Promise<DashboardPluginItem[]> {
    const siteId = siteIdOverride ?? (await adminSiteId());
    await ensureMailchimpMigrated(siteId);

    const rows = await db
      .select()
      .from(plugins)
      .where(eq(plugins.siteId, siteId));
    const rowById = new Map(rows.map(r => [r.pluginId, r]));

    const items: DashboardPluginItem[] = SERVER_PLUGINS.map(def => {
      const row = rowById.get(def.id);
      const client = CLIENT_PLUGINS_BY_ID[def.id];
      const status: PluginStatus = !row
        ? 'available'
        : row.enabled
          ? 'enabled'
          : 'disabled';
      return {
        id: def.id,
        name: def.name,
        version: def.version,
        description: def.description ?? null,
        requires: def.requires ?? null,
        status,
        enabled: row?.enabled ?? false,
        hasSettings: Boolean(
          def.settings && Object.keys(def.settings.fields).length > 0
        ),
        lastError: row?.lastError ?? null,
        lastErrorAt: row?.lastErrorAt ?? null,
        installedAt: row?.installedAt ?? null,
        adminPages: (client?.adminPages ?? []).map(p => ({
          slug: p.slug,
          title: p.title,
          navLabel: p.navLabel,
          permission: p.permission,
        })),
      };
    });

    // Any plugin in DB whose code was removed from `nextcms.plugins.ts`
    for (const row of rows) {
      if (SERVER_PLUGINS_BY_ID[row.pluginId]) continue;
      items.push({
        id: row.pluginId,
        name: row.pluginId,
        version: row.version ?? null,
        description: 'Plugin code is no longer configured in nextcms.plugins.ts.',
        requires: null,
        status: 'missing_code',
        enabled: false,
        hasSettings: false,
        lastError: row.lastError ?? null,
        lastErrorAt: row.lastErrorAt ?? null,
        installedAt: row.installedAt ?? null,
        adminPages: [],
      });
    }

    return items;
  },

  /** Returns a Map of enabled `pluginId -> decryptedSettings` for `siteId`. */
  async getEnabledSettingsMap(
    siteId: string = DEFAULT_SITE_ID
  ): Promise<Map<string, Record<string, unknown>>> {
    await ensureMailchimpMigrated(siteId);
    const map = new Map<string, Record<string, unknown>>();
    try {
      const rows = await db
        .select()
        .from(plugins)
        .where(and(eq(plugins.siteId, siteId), eq(plugins.enabled, true)));
      for (const row of rows) {
        const def = SERVER_PLUGINS_BY_ID[row.pluginId];
        if (!def) continue;
        const fields = def.settings?.fields ?? {};
        map.set(
          row.pluginId,
          decryptPluginSettings(row.settings ?? {}, fields)
        );
      }
    } catch {
      // If DB is not migrated yet (e.g. unit test without DB), return empty map.
    }
    return map;
  },

  async getEnabledIds(siteId: string = DEFAULT_SITE_ID): Promise<Set<string>> {
    const map = await this.getEnabledSettingsMap(siteId);
    return new Set(map.keys());
  },

  async isEnabled(siteId: string, pluginId: string): Promise<boolean> {
    if (!SERVER_PLUGINS_BY_ID[pluginId]) return false;
    await ensureMailchimpMigrated(siteId);
    try {
      const [row] = await db
        .select({ enabled: plugins.enabled })
        .from(plugins)
        .where(
          and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId))
        )
        .limit(1);
      return Boolean(row?.enabled);
    } catch {
      return false;
    }
  },

  async getServerSettings(
    siteId: string,
    pluginId: string
  ): Promise<Record<string, unknown>> {
    const def = SERVER_PLUGINS_BY_ID[pluginId];
    if (!def) return {};
    await ensureMailchimpMigrated(siteId);
    const [row] = await db
      .select({ settings: plugins.settings })
      .from(plugins)
      .where(and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId)))
      .limit(1);
    return decryptPluginSettings(
      row?.settings ?? {},
      def.settings?.fields ?? {}
    );
  },

  /** Returns plugin metadata and masked settings for Dashboard -> Plugins -> [id]. */
  async getForAdmin(
    pluginId: string,
    siteIdOverride?: string
  ): Promise<AdminPluginDetail | null> {
    const def = SERVER_PLUGINS_BY_ID[pluginId];
    if (!def) return null;
    const siteId = siteIdOverride ?? (await adminSiteId());
    await ensureMailchimpMigrated(siteId);

    const [row] = await db
      .select()
      .from(plugins)
      .where(and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId)))
      .limit(1);

    const fields = def.settings?.fields ?? {};
    const values = maskPluginSettingsForClient(row?.settings ?? {}, fields);
    const client = CLIENT_PLUGINS_BY_ID[pluginId];
    const status: AdminPluginDetail['status'] = !row
      ? 'available'
      : row.enabled
        ? 'enabled'
        : 'disabled';

    return {
      id: def.id,
      name: def.name,
      version: def.version,
      description: def.description ?? null,
      requires: def.requires ?? null,
      status,
      enabled: row?.enabled ?? false,
      lastError: row?.lastError ?? null,
      lastErrorAt: row?.lastErrorAt ?? null,
      fields,
      values,
      adminPages: (client?.adminPages ?? []).map(p => ({
        slug: p.slug,
        title: p.title,
        navLabel: p.navLabel,
        permission: p.permission,
      })),
    };
  },

  async enable(pluginId: string, access: UserAccess) {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const def = SERVER_PLUGINS_BY_ID[pluginId];
    if (!def) {
      throw new NotFoundException(`Plugin "${pluginId}" not found.`);
    }
    if (!satisfiesCmsVersion(currentCmsVersion(), def.requires)) {
      throw new ApplicationException(
        `Plugin "${def.name}" requires CMS version ${def.requires}.`
      );
    }

    const siteId = await adminSiteId();
    await ensureMailchimpMigrated(siteId);
    await accessService.ensureRolesSeeded().catch(() => undefined);

    const [existing] = await db
      .select()
      .from(plugins)
      .where(and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId)))
      .limit(1);

    if (existing) {
      await db
        .update(plugins)
        .set({
          enabled: true,
          version: def.version,
          lastError: null,
          lastErrorAt: null,
          updatedAt: new Date(),
        })
        .where(eq(plugins.id, existing.id));
    } else {
      await db.insert(plugins).values({
        siteId,
        pluginId,
        enabled: true,
        settings: {},
        version: def.version,
      });
    }

    await auditService.log({
      actorId: access.userId,
      action: 'enable',
      targetType: 'plugin',
      targetId: pluginId,
      targetName: def.name,
    });
    revalidatePublicSite();
    return { id: pluginId, enabled: true };
  },

  async disable(pluginId: string, access: UserAccess) {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const def: ServerPluginDefinition<any> | undefined =
      SERVER_PLUGINS_BY_ID[pluginId];
    const siteId = await adminSiteId();
    await ensureMailchimpMigrated(siteId);

    const [existing] = await db
      .select()
      .from(plugins)
      .where(and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId)))
      .limit(1);

    if (existing) {
      await db
        .update(plugins)
        .set({
          enabled: false,
          updatedAt: new Date(),
        })
        .where(eq(plugins.id, existing.id));
    } else if (def) {
      await db.insert(plugins).values({
        siteId,
        pluginId,
        enabled: false,
        settings: {},
        version: def.version,
      });
    } else {
      throw new NotFoundException(`Plugin "${pluginId}" not found.`);
    }

    await auditService.log({
      actorId: access.userId,
      action: 'disable',
      targetType: 'plugin',
      targetId: pluginId,
      targetName: def?.name ?? pluginId,
    });
    revalidatePublicSite();
    return { id: pluginId, enabled: false };
  },

  async updateSettings(
    pluginId: string,
    rawInput: Record<string, unknown>,
    access: UserAccess
  ) {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const def = SERVER_PLUGINS_BY_ID[pluginId];
    if (!def) {
      throw new NotFoundException(`Plugin "${pluginId}" not found.`);
    }

    const siteId = await adminSiteId();
    await ensureMailchimpMigrated(siteId);

    const [existing] = await db
      .select()
      .from(plugins)
      .where(and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId)))
      .limit(1);

    const fields = def.settings?.fields ?? {};
    const existingStored = existing?.settings ?? {};
    const existingDecrypted = decryptPluginSettings(existingStored, fields);

    // Replace unchanged mask sentinels with existing decrypted value before Zod validation
    const candidateForValidation: Record<string, unknown> = { ...rawInput };
    for (const [key, meta] of Object.entries(fields)) {
      if (meta.secret && isMaskedSecret(candidateForValidation[key])) {
        candidateForValidation[key] = existingDecrypted[key];
      }
    }

    let validated: Record<string, unknown> = candidateForValidation;
    if (def.settings?.schema) {
      const parsed = def.settings.schema.safeParse(candidateForValidation);
      if (!parsed.success) {
        throw new ApplicationException(
          parsed.error.issues[0]?.message ?? 'Invalid plugin settings.'
        );
      }
      validated = parsed.data;
    }

    const encryptedSettings = encryptPluginSettings(
      validated,
      fields,
      existingStored
    );

    if (existing) {
      await db
        .update(plugins)
        .set({
          settings: encryptedSettings,
          version: def.version,
          updatedAt: new Date(),
        })
        .where(eq(plugins.id, existing.id));
    } else {
      await db.insert(plugins).values({
        siteId,
        pluginId,
        enabled: false,
        settings: encryptedSettings,
        version: def.version,
      });
    }

    await auditService.log({
      actorId: access.userId,
      action: 'settings_change',
      targetType: 'plugin',
      targetId: pluginId,
      targetName: def.name,
    });
    revalidatePublicSite();
    return {
      values: maskPluginSettingsForClient(encryptedSettings, fields),
    };
  },

  async clearError(pluginId: string, access: UserAccess) {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    await db
      .update(plugins)
      .set({ lastError: null, lastErrorAt: null, updatedAt: new Date() })
      .where(and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId)));
    return { ok: true };
  },

  async recordPluginError(
    siteId: string,
    pluginId: string,
    message: string
  ): Promise<void> {
    try {
      await db
        .update(plugins)
        .set({
          lastError: message.slice(0, 2000),
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(plugins.siteId, siteId), eq(plugins.pluginId, pluginId))
        );
    } catch {
      // Never throw while recording a plugin error
    }
  },
};
