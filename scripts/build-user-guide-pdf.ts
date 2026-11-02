/**
 * Builds public/docs/user-guide.pdf from the user guide content in
 * src/content/user-guide. Run with `pnpm guide:pdf`; no dev server needed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { GUIDE_PDF_PATH, GUIDE_TOPICS, renderGuideHtml } from '@/content/user-guide';

async function main() {
  const output = path.join(process.cwd(), 'public', GUIDE_PDF_PATH);
  // Playwright's own Chromium if downloaded, otherwise an installed Chrome.
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    try {
      browser = await chromium.launch({ channel: 'chrome' });
    } catch (error) {
      console.error('Could not start Chromium. Install it with: npx playwright install chromium');
      throw error;
    }
  }
  try {
    const page = await browser.newPage();
    await page.setContent(renderGuideHtml(), { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888">Next CMS user guide</div>',
      footerTemplate:
        '<div style="font-size:8px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, pdf);
    console.info(`Wrote ${path.relative(process.cwd(), output)} (${GUIDE_TOPICS.length} topics, ${Math.round(pdf.length / 1024)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
