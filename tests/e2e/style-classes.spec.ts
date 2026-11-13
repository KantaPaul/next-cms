/**
 * Style classes end to end on the public site (KRK-01, step 1.9).
 *
 * Seeds a class and a published page that uses it straight into Postgres,
 * then checks in a real browser that the compiled CSS reaches the page and
 * cascades as designed: block defaults < classes < the block's own values.
 * Everything it creates is deleted again.
 *
 * Needs a running dev server (PLAYWRIGHT_TEST_BASE_URL, default :3001),
 * DATABASE_URL pointing at the same database, and Playwright's Chromium
 * (`npx playwright install chromium`). Pages are served under the site slug
 * (E2E_SITE_PATH, default `/main`).
 *
 * The editor half of the done-check (create .card in the inspector, apply it
 * to two blocks, publish) is not here yet: it needs the builder page, which
 * currently fails to compile because of an unrelated import error.
 */
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

const STAMP = Date.now();
const RUN = `e2e${STAMP}`;
const CLASS_ID = `${RUN}-class`;
const CLASS_NAME = `e2e-card-${STAMP}`;
const PAGE_ID = `${RUN}-page`;
const PAGE_SLUG = `e2e-style-classes-${STAMP}`;
const PLAIN_PAGE_ID = `${RUN}-plain`;
const PLAIN_SLUG = `${PAGE_SLUG}-plain`;
const SITE_PATH = process.env.E2E_SITE_PATH ?? '/main';

const RED = 'rgb(255, 0, 0)';
const BLUE = 'rgb(0, 0, 255)';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Block = { id: string; text: string; classIds?: string[]; section?: Record<string, unknown> };

/** A builder document (legacy Puck shape, as the seed stores it) of RichText blocks. */
function content(blocks: Block[]) {
  return {
    root: { props: {} },
    zones: {},
    content: blocks.map(block => ({
      type: 'RichText',
      props: {
        id: block.id,
        content: `<p>${block.text}</p>`,
        ...(block.classIds ? { classIds: block.classIds } : {}),
        ...(block.section ? { section: block.section } : {}),
      },
    })),
  };
}

async function seedPage(id: string, slug: string, blocks: Block[]) {
  const author = await pool.query<{ id: string }>('select id from users order by created_at limit 1');
  await pool.query(
    `insert into pages (id, title, slug, status, editor_type, created_by, published_at, site_id)
     values ($1, $2, $3, 'published', 'builder', $4, now(), 'default')`,
    [id, `E2E style classes ${id}`, slug, author.rows[0].id]
  );
  for (const kind of ['draft', 'published']) {
    await pool.query(
      `insert into page_contents (id, page_id, kind, content) values ($1, $2, $3::content_kind, $4::jsonb)`,
      [`${id}-${kind}`, id, kind, JSON.stringify(content(blocks))]
    );
  }
}

const block = (page: import('@playwright/test').Page, text: string) =>
  page.locator(`.c-${CLASS_NAME}`, { hasText: text }).first();

test.describe('style classes on the public site', () => {
  test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is not set');

  test.beforeAll(async () => {
    await pool.query(
      `insert into style_classes (id, site_id, name, kind, variants) values ($1, 'default', $2, 'class', $3::jsonb)`,
      [
        CLASS_ID,
        CLASS_NAME,
        JSON.stringify({
          desktop: { paddingTop: '11px' },
          tablet: { color: '#ff0000', paddingTop: '22px' },
          'tablet:hover': { color: '#0000ff' },
        }),
      ]
    );
    await seedPage(PAGE_ID, PAGE_SLUG, [
      { id: 'rt-default', text: 'Default spacing', classIds: [CLASS_ID] },
      { id: 'rt-own', text: 'Own spacing', classIds: [CLASS_ID], section: { spacing: { desktop: { top: 40 } } } },
    ]);
    await seedPage(PLAIN_PAGE_ID, PLAIN_SLUG, [{ id: 'rt-plain', text: 'No classes here' }]);
  });

  test.afterAll(async () => {
    await pool.query('delete from page_contents where page_id = any($1)', [[PAGE_ID, PLAIN_PAGE_ID]]);
    await pool.query('delete from pages where id = any($1)', [[PAGE_ID, PLAIN_PAGE_ID]]);
    await pool.query('delete from style_classes where id = $1', [CLASS_ID]);
    await pool.end();
  });

  test('emits the class CSS and applies tablet and hover styles at 800px', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    const response = await page.goto(`${SITE_PATH}/${PAGE_SLUG}`);
    expect(response?.status()).toBe(200);

    const css = await page.locator('style[data-style-classes]').first().textContent();
    expect(css).toContain(`:where(.site-root) .c-${CLASS_NAME}{padding-top:11px;}`);
    expect(css).toContain(`@media (max-width:1023px){:where(.site-root) .c-${CLASS_NAME}{color:#ff0000;padding-top:22px;}`);

    // The class beats the block's default section padding…
    const styled = block(page, 'Default spacing');
    await expect(styled).toHaveCSS('padding-top', '22px');
    await expect(styled).toHaveCSS('color', RED);
    await styled.hover();
    await expect(styled).toHaveCSS('color', BLUE);

    // …but the block's own spacing beats the class.
    await expect(block(page, 'Own spacing')).toHaveCSS('padding-top', '40px');
    await expect(block(page, 'Own spacing')).toHaveCSS('color', RED);
  });

  test('uses the desktop value and no tablet styles at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${SITE_PATH}/${PAGE_SLUG}`);
    const styled = block(page, 'Default spacing');
    await expect(styled).toHaveCSS('padding-top', '11px');
    await expect(styled).not.toHaveCSS('color', RED);
  });

  test('a page without classes gets no class stylesheet', async ({ page }) => {
    const response = await page.goto(`${SITE_PATH}/${PLAIN_SLUG}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('style[data-style-classes]')).toHaveCount(0);
    await expect(page.getByText('No classes here')).toBeVisible();
  });
});
