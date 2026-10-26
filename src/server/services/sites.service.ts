import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { eq, isNull } from 'drizzle-orm';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { roles, siteMemberships, siteSettings, sites } from '@/db/schema';
import {
  DEFAULT_SITE_LOCALES,
  type SiteLocale,
} from '@/db/schemas/sites.schema';
import { ApplicationException } from '@/lib/utils/error';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { normalizeHost, siteContext } from '@/server/services/site-context';

export type CreateSiteInput = {
  name: string;
  primaryHost?: string | null;
  extraDomains?: string | null;
  defaultLocale: string;
  locales: SiteLocale[];
};

function domains(value: string | null | undefined) {
  return (value ?? '')
    .split(/[\s,]+/)
    .map(normalizeHost)
    .filter(Boolean);
}

export const sitesService = {
  create: async (input: CreateSiteInput, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const locales = input.locales.filter(locale => locale.code && locale.label);
    if (!locales.length) {
      throw new ApplicationException('Choose at least one language.');
    }
    if (!locales.some(locale => locale.code === input.defaultLocale)) {
      throw new ApplicationException(
        'The default language has to be one of the site languages.'
      );
    }

    const primaryHost = normalizeHost(input.primaryHost) || null;
    const [admin] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, 'Admin'))
      .limit(1);
    if (!admin) throw new ApplicationException('Roles are not set up yet.');

    const siteId = createId();
    try {
      await db.transaction(async tx => {
        await tx.insert(sites).values({
          id: siteId,
          name: input.name.trim(),
          primaryHost,
          extraDomains: domains(input.extraDomains),
          defaultLocale: input.defaultLocale,
          locales,
        });
        await tx.insert(siteMemberships).values({
          userId: access.userId,
          siteId,
          roleId: admin.id,
        });
        await tx.insert(siteSettings).values({
          id: createId(),
          siteId,
          siteName: input.name.trim(),
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('sites_primary_host_unique')) {
        throw new ApplicationException('That host is already used by another site.');
      }
      throw error;
    }

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'site',
      targetId: siteId,
      targetName: input.name.trim(),
    });
    return siteContext.getById(siteId);
  },

  listForUser: async (userId: string) => {
    const memberships = await siteContext.memberships(userId);
    const roleRows = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(isNull(roles.deletedAt));
    const names = new Map(roleRows.map(role => [role.id, role.name]));
    return memberships.map(row => ({
      ...row,
      roleName: names.get(row.roleId) ?? 'Member',
    }));
  },
};

export const languageChoices = DEFAULT_SITE_LOCALES;

export async function assertSiteLocale(code: string, siteId: string) {
  const site = await siteContext.getById(siteId);
  if (!site?.locales.some(locale => locale.code === code)) {
    throw new ApplicationException(
      'That language is not enabled for this site.'
    );
  }
}

export async function currentAdminSite() {
  const { getCurrentUserAndTeamId } = await import('@/lib/auth');
  const { userId } = await getCurrentUserAndTeamId();
  return siteContext.adminSite(userId);
}
