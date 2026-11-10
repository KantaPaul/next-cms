import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parseWxr } from '../wxr';

const fixtureXml = fs.readFileSync(
  path.join(process.cwd(), 'src/server/import/__tests__/fixtures/sample-wxr.xml'),
  'utf8'
);

describe('WXR parser', () => {
  it('normalizes authors, nested categories, tags, menus, posts, pages, attachments, comments, meta, and CPT skips', () => {
    const parsed = parseWxr(fixtureXml);

    assert.equal(parsed.wxrVersion, '1.2');
    assert.equal(parsed.siteTitle, 'Acme Demo Site');
    assert.equal(parsed.siteUrl, 'https://old-wp.example.com');

    // Authors
    assert.equal(parsed.authors.length, 2);
    assert.equal(parsed.authors[0]?.login, 'alice');
    assert.equal(parsed.authors[0]?.email, 'alice@example.com');

    // Terms: 2 categories (nested), 1 tag, 1 nav_menu
    const cats = parsed.terms.filter(t => t.taxonomy === 'category');
    assert.equal(cats.length, 2);
    assert.equal(cats.find(c => c.slug === 'frontend')?.parentSlug, 'engineering');
    const tags = parsed.terms.filter(t => t.taxonomy === 'post_tag');
    assert.equal(tags.length, 1);
    assert.equal(tags[0]?.slug, 'nextjs');
    const menus = parsed.terms.filter(t => t.taxonomy === 'nav_menu');
    assert.equal(menus.length, 1);
    assert.equal(menus[0]?.slug, 'primary-menu');

    // Posts, pages, attachments, nav_menu_items, CPT
    const posts = parsed.posts.filter(p => p.postType === 'post');
    const pages = parsed.posts.filter(p => p.postType === 'page');
    const attachments = parsed.posts.filter(p => p.postType === 'attachment');
    const menuItems = parsed.posts.filter(p => p.postType === 'nav_menu_item');
    assert.equal(posts.length, 1);
    assert.equal(pages.length, 2);
    assert.equal(attachments.length, 1);
    assert.equal(menuItems.length, 2);
    assert.deepEqual(parsed.skippedTypes, { product: 1 });

    // Post details & meta
    const hello = posts[0]!;
    assert.equal(hello.slug, 'hello-world');
    assert.deepEqual(hello.categories, ['frontend']);
    assert.deepEqual(hello.tags, ['nextjs']);
    assert.equal(hello.meta._thumbnail_id, '100');
    assert.equal(
      hello.meta._yoast_wpseo_metadesc,
      'Yoast SEO description for hello world.'
    );

    // Elementor page meta
    const landing = pages.find(p => p.slug === 'landing')!;
    assert.ok(landing.meta._elementor_data.includes('"widgetType":"heading"'));

    // Comments: 2 approved (threaded), 1 spam (unapproved)
    assert.equal(parsed.comments.length, 3);
    assert.equal(parsed.comments.filter(c => c.approved).length, 2);
    assert.equal(parsed.comments.find(c => c.wpId === '502')?.parentWpId, '501');
  });

  it('rejects XML with entity expansion declarations', () => {
    const xxe = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;">
]>
<rss><channel><title>&lol2;</title></channel></rss>`;
    assert.throws(() => parseWxr(xxe), /entity declarations/i);
  });
});
