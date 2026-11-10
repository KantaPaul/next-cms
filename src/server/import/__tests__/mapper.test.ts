import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMenuTree,
  buildTaxonomyRedirectPaths,
  buildWordPressRedirectPaths,
  mapWpStatus,
  resolveUniqueSlug,
} from '../mapper';
import type { WxrPost } from '../wxr';

describe('Import mapper helpers', () => {
  it('maps WordPress statuses accurately and respects importAsDrafts', () => {
    assert.deepEqual(mapWpStatus('publish'), { status: 'published', visibility: 'public' });
    assert.deepEqual(mapWpStatus('draft'), { status: 'draft', visibility: 'public' });
    assert.deepEqual(mapWpStatus('pending'), { status: 'draft', visibility: 'public' });
    assert.deepEqual(mapWpStatus('future'), { status: 'scheduled', visibility: 'public' });
    assert.deepEqual(mapWpStatus('private'), { status: 'draft', visibility: 'private' });
    assert.deepEqual(mapWpStatus('publish', true), { status: 'draft', visibility: 'public' });
  });

  it('renames slug conflicts with -2, -3 suffixes', () => {
    const used = new Set(['about', 'about-2']);
    assert.deepEqual(resolveUniqueSlug('contact', used), {
      slug: 'contact',
      renamed: false,
    });
    assert.deepEqual(resolveUniqueSlug('about', used), {
      slug: 'about-3',
      renamed: true,
    });
    assert.deepEqual(resolveUniqueSlug('about', used), {
      slug: 'about-4',
      renamed: true,
    });
  });

  it('generates 301 redirect paths for date, slug, ?p=ID, and taxonomy permalinks', () => {
    const postPaths = buildWordPressRedirectPaths(
      {
        wpId: '101',
        postType: 'post',
        slug: 'hello-world',
        link: 'https://old.example.com/2024/05/hello-world/',
        postDate: '2024-05-15 12:00:00',
        postDateGmt: '2024-05-15 12:00:00',
        pubDate: '',
      },
      '/blog/hello-world'
    );
    assert.ok(postPaths.includes('/2024/05/hello-world'));
    assert.ok(postPaths.includes('/2024/05/15/hello-world'));
    assert.ok(postPaths.includes('/hello-world'));
    assert.ok(postPaths.includes('/?p=101'));

    const pagePaths = buildWordPressRedirectPaths(
      {
        wpId: '102',
        postType: 'page',
        slug: 'about',
        link: 'https://old.example.com/company/about/',
        postDate: '',
        postDateGmt: '',
        pubDate: '',
      },
      '/about-2'
    );
    assert.ok(pagePaths.includes('/company/about'));
    assert.ok(pagePaths.includes('/about'));
    assert.ok(pagePaths.includes('/?page_id=102'));
    assert.ok(pagePaths.includes('/?p=102'));

    assert.deepEqual(
      buildTaxonomyRedirectPaths(
        { taxonomy: 'category', slug: 'news' },
        '/blog/category/news'
      ),
      ['/category/news']
    );
  });

  it('builds a 2-level menu tree and rewrites internal links', () => {
    const items: WxrPost[] = [
      {
        wpId: '201',
        postType: 'nav_menu_item',
        title: 'About',
        slug: '201',
        status: 'publish',
        link: '',
        guid: '',
        creatorLogin: '',
        pubDate: '',
        postDate: '',
        postDateGmt: '',
        content: '',
        excerpt: '',
        postParent: '0',
        menuOrder: 1,
        categories: [],
        tags: [],
        navMenuSlugs: ['primary'],
        meta: {
          _menu_item_type: 'post_type',
          _menu_item_object: 'page',
          _menu_item_object_id: '102',
          _menu_item_menu_item_parent: '0',
        },
        comments: [],
      },
      {
        wpId: '202',
        postType: 'nav_menu_item',
        title: 'Team',
        slug: '202',
        status: 'publish',
        link: '',
        guid: '',
        creatorLogin: '',
        pubDate: '',
        postDate: '',
        postDateGmt: '',
        content: '',
        excerpt: '',
        postParent: '0',
        menuOrder: 2,
        categories: [],
        tags: [],
        navMenuSlugs: ['primary'],
        meta: {
          _menu_item_type: 'custom',
          _menu_item_url: 'https://old.example.com/team/',
          _menu_item_menu_item_parent: '201',
          _menu_item_target: '_blank',
        },
        comments: [],
      },
    ];

    const tree = buildMenuTree(items, {
      postUrlByWpId: new Map([['102', '/about-2']]),
      termUrlByWpId: new Map(),
      urlByOldUrl: new Map([['https://old.example.com/team', '/team']]),
    });

    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.url, '/about-2');
    assert.equal(tree[0]?.children.length, 1);
    assert.equal(tree[0]?.children[0]?.url, '/team');
    assert.equal(tree[0]?.children[0]?.target, '_blank');
  });
});
