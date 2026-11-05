#!/usr/bin/env tsx
import path from 'node:path';
import {
  exportSiteService,
  isExportTarget,
} from '../src/server/services/export-site.service';

async function main() {
  console.log('Starting baked website export...');
  const siteIdArg = process.argv.find(arg => arg.startsWith('--site='))?.split('=')[1] || 'default';
  // --target=vercel writes a project set up for Vercel; default: standalone/Docker.
  const targetArg = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] || 'standalone';
  if (!isExportTarget(targetArg)) {
    throw new Error(`Unknown --target "${targetArg}". Use "standalone" or "vercel".`);
  }
  const name = targetArg === 'vercel' ? 'site-vercel' : 'site';
  const outDir = path.join(process.cwd(), 'export', name);
  const zipPath = path.join(process.cwd(), 'export', `${name}.zip`);

  const result = await exportSiteService.exportSite({
    siteId: siteIdArg,
    outDir,
    zipPath,
    target: targetArg,
  });

  console.log('Export completed successfully!');
  console.log('Target:', result.target);
  console.log('Site ID:', result.report.siteId);
  console.log('Published Pages:', result.report.pagesCount);
  console.log('Published Posts:', result.report.postsCount);
  console.log('Menus:', result.report.menusCount);
  console.log('Media Assets:', result.report.mediaAssetsCount);
  console.log('Output Directory:', result.outDir);
  console.log('Zip Archive:', result.zipPath);
  console.log('Important Notice:', result.report.externalUrlNotice);
  // The database pool keeps the event loop alive; the export is done.
  process.exit(0);
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
