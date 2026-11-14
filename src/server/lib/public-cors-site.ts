import 'server-only';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '@/db';
import { siteSettings, sites } from '@/db/schema';
import { siteContext } from '@/server/services/site-context';
import {
  type CorsSiteConfig,
  corsHeaders,
  evaluatePublicCors,
  publicCorsPreflight,
} from './public-cors';

export async function getCorsSiteForRequest(
  request: Request
): Promise<CorsSiteConfig> {
  const headerSiteId = request.headers.get('x-cms-site')?.trim();
  if (headerSiteId) {
    const [row] = await db
      .select({
        id: sites.id,
        primaryHost: sites.primaryHost,
        extraDomains: sites.extraDomains,
      })
      .from(sites)
      .where(and(eq(sites.id, headerSiteId), isNull(sites.deletedAt)))
      .limit(1);

    if (row) {
      const [settings] = await db
        .select({ exportAllowedOrigins: siteSettings.exportAllowedOrigins })
        .from(siteSettings)
        .where(eq(siteSettings.siteId, row.id))
        .limit(1);
      return {
        id: row.id,
        primaryHost: row.primaryHost,
        extraDomains: row.extraDomains,
        exportAllowedOrigins: settings?.exportAllowedOrigins ?? [],
      };
    }
  }

  const fallback = await siteContext.publicSite();
  const [settings] = await db
    .select({ exportAllowedOrigins: siteSettings.exportAllowedOrigins })
    .from(siteSettings)
    .where(eq(siteSettings.siteId, fallback.id))
    .limit(1);

  return {
    id: fallback.id,
    primaryHost: fallback.primaryHost,
    extraDomains: fallback.extraDomains,
    exportAllowedOrigins: settings?.exportAllowedOrigins ?? [],
  };
}

export async function handlePublicCorsOptions(request: Request) {
  const site = await getCorsSiteForRequest(request);
  return publicCorsPreflight(request, site);
}

export async function checkPublicCors(request: Request): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  reason?: string;
}> {
  const site = await getCorsSiteForRequest(request);
  const evalRes = evaluatePublicCors(request, site);
  return {
    allowed: evalRes.allowed,
    headers: corsHeaders(evalRes.allowOriginHeader),
    reason: evalRes.reason,
  };
}
