#!/usr/bin/env tsx
import path from 'node:path';
import { exportSiteService } from '../src/server/services/export-site.service';

async function main() {
  console.log('Starting baked website export...');
  const siteIdArg = process.argv.find(arg => arg.startsWith('--site='))?.split('=')[1] || 'default';
  const outDir = path.join(process.cwd(), 'export', 'site');
  const zipPath = path.join(process.cwd(), 'export', 'site.zip');

  const result = await exportSiteService.exportSite({
    siteId: siteIdArg,
    outDir,
    zipPath,
  });

  console.log('Export completed successfully!');
  console.log('Site ID:', result.report.siteId);
  console.log('Published Pages:', result.report.pagesCount);
  console.log('Published Posts:', result.report.postsCount);
  console.log('Menus:', result.report.menusCount);
  console.log('Media Assets:', result.report.mediaAssetsCount);
  console.log('Output Directory:', result.outDir);
  console.log('Zip Archive:', result.zipPath);
  console.log('Important Notice:', result.report.externalUrlNotice);
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
