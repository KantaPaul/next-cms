import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PERMISSIONS } from '@/config/permissions';
import {
  exportSiteService,
  isExportTarget,
} from '@/server/services/export-site.service';
import { requirePermission } from '@/server/services/require-permission';
import { siteContext } from '@/server/services/site-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Downloads the current admin site as a deployable Next.js project (.zip).
 * `?target=vercel` sets it up for Vercel (vercel.json, deploy README);
 * the default `standalone` adds a Dockerfile for self-hosting.
 */
export async function GET(request: Request) {
  const { userId, allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return new Response('Forbidden', { status: 403 });

  const targetParam = new URL(request.url).searchParams.get('target') ?? 'standalone';
  if (!isExportTarget(targetParam)) {
    return new Response('Unknown export target', { status: 400 });
  }

  const siteId = await siteContext.adminSiteId(userId);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cms-export-'));
  try {
    const name = targetParam === 'vercel' ? 'site-vercel' : 'site';
    const { zipPath } = await exportSiteService.exportSite({
      siteId,
      outDir: path.join(workDir, name),
      zipPath: path.join(workDir, `${name}.zip`),
      target: targetParam,
    });
    const zip = await fs.readFile(zipPath);
    return new Response(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${name}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
