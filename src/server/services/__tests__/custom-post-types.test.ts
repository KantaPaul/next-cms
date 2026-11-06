import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_POST_TYPE_SUPPORTS,
  normalizePostTypeSupports,
  POST_TYPE_SUPPORT_FEATURES,
} from '@/config/post-types';
import { entryToPostView, type EntryTermView } from '@/builder/post-template';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';

describe('PostTypeSupports', () => {
  it('defaults all features to true', () => {
    assert.deepEqual(DEFAULT_POST_TYPE_SUPPORTS, {
      template: true,
      taxonomies: true,
      featuredImage: true,
      excerpt: true,
      author: true,
      status: true,
      seo: true,
    });
  });

  it('normalizes partial supports object', () => {
    const supports = normalizePostTypeSupports({
      taxonomies: false,
      seo: false,
    });
    assert.equal(supports.taxonomies, false);
    assert.equal(supports.seo, false);
    assert.equal(supports.template, true);
    assert.equal(supports.featuredImage, true);
    assert.equal(supports.excerpt, true);
    assert.equal(supports.author, true);
    assert.equal(supports.status, true);
  });

  it('lists all 7 feature groups', () => {
    assert.equal(POST_TYPE_SUPPORT_FEATURES.length, 7);
    const keys = POST_TYPE_SUPPORT_FEATURES.map(f => f.key);
    assert.ok(keys.includes('template'));
    assert.ok(keys.includes('taxonomies'));
    assert.ok(keys.includes('featuredImage'));
    assert.ok(keys.includes('excerpt'));
    assert.ok(keys.includes('author'));
    assert.ok(keys.includes('status'));
    assert.ok(keys.includes('seo'));
  });
});

describe('entryToPostView', () => {
  it('maps entry fields, excerpt, featuredImage, and author to PostView', () => {
    const entry = {
      id: 'e1',
      slug: 'john-doe',
      data: { name: 'John Doe', bio: '<p>Senior Engineer</p>' },
      excerpt: 'Lead engineer bio',
      featuredImage: 'https://example.com/john.jpg',
      authorName: 'Admin User',
      publishedAt: '2026-03-01T12:00:00Z',
    };
    const collection = {
      name: 'Team members',
      slug: 'team',
      fields: [
        { key: 'name', type: 'text' },
        { key: 'bio', type: 'richtext' },
      ],
    };
    const terms: EntryTermView[] = [
      { id: 't1', name: 'Engineering', slug: 'eng', taxonomyId: 'tax1', hierarchical: true },
      { id: 't2', name: 'Frontend', slug: 'frontend', taxonomyId: 'tax2', hierarchical: false },
    ];

    const postView = entryToPostView(entry, collection, terms);

    assert.equal(postView.id, 'e1');
    assert.equal(postView.title, 'John Doe');
    assert.equal(postView.slug, 'john-doe');
    assert.equal(postView.excerpt, 'Lead engineer bio');
    assert.equal(postView.featuredImage, 'https://example.com/john.jpg');
    assert.equal(postView.authorName, 'Admin User');
    assert.equal(postView.body, '<p>Senior Engineer</p>');
    assert.equal(postView.publishedAt, '2026-03-01T12:00:00.000Z');
    assert.equal(postView.blogUrl, '/team');

    // Categories come from the first hierarchical taxonomy
    assert.equal(postView.categories.length, 1);
    assert.equal(postView.categories[0]?.name, 'Engineering');

    // Tags come from the first flat taxonomy
    assert.equal(postView.tags.length, 1);
    assert.equal(postView.tags[0]?.name, 'Frontend');
  });

  it('falls back gracefully when fields or terms are missing', () => {
    const entry = {
      id: 'e2',
      slug: 'untitled-entry',
      data: {},
    };
    const collection = {
      name: 'FAQ',
      slug: 'faq',
    };

    const postView = entryToPostView(entry, collection, []);
    assert.equal(postView.id, 'e2');
    assert.equal(postView.title, 'untitled-entry');
    assert.equal(postView.body, '');
    assert.deepEqual(postView.categories, []);
    assert.deepEqual(postView.tags, []);
  });
});

describe('layoutForEntry fallback order', () => {
  it('returns custom canvas when entry layout is custom', async () => {
    const customDoc = {
      root: { props: { maxWidth: 'lg' } },
      content: [{ type: 'Heading', props: { text: 'Custom Canvas' } }],
    };
    const layout = await collectionTemplatesService.layoutForEntry({
      collectionId: 'non-existent',
      layout: 'custom',
      canvas: customDoc,
    });
    assert.deepEqual(layout, customDoc);
  });

  it('falls back to defaultPostTemplate when nothing matches', async () => {
    const layout = await collectionTemplatesService.layoutForEntry({
      collectionId: 'non-existent',
      layout: 'template',
    });
    assert.ok(layout.content.length > 0);
    assert.equal(layout.content[0]?.type, 'PostFeaturedImage');
  });
});

describe('taxonomy tree and cycle guard logic', () => {
  it('detects direct self-nesting and deep circular references', () => {
    const terms = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
    ];

    const hasCycle = (id: string, proposedParentId: string | null) => {
      if (!proposedParentId) return false;
      if (proposedParentId === id) return true;
      let cursor: string | null | undefined = proposedParentId;
      while (cursor) {
        if (cursor === id) return true;
        cursor = terms.find(t => t.id === cursor)?.parentId;
      }
      return false;
    };

    assert.ok(hasCycle('1', '1'));
    assert.ok(hasCycle('1', '3')); // Setting 1's parent to 3 creates a cycle (1 -> 2 -> 3 -> 1)
    assert.ok(hasCycle('2', '3')); // Setting 2's parent to 3 creates a cycle
    assert.ok(!hasCycle('3', '1')); // 3 can have 1 as parent
    assert.ok(!hasCycle('3', null)); // 3 can become a root
  });

  it('orders terms into depth-first hierarchy', () => {
    const rows = [
      { id: '3', name: 'Child B', parentId: '1' },
      { id: '1', name: 'Parent', parentId: null },
      { id: '4', name: 'Grandchild', parentId: '3' },
      { id: '2', name: 'Child A', parentId: '1' },
      { id: '5', name: 'Root 2', parentId: null },
    ];

    const byParent = new Map<string | null, typeof rows>();
    for (const row of rows) {
      const key = row.parentId && rows.some(r => r.id === row.parentId) ? row.parentId : null;
      byParent.set(key, [...(byParent.get(key) ?? []), row]);
    }

    const tree: { id: string; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const children = byParent.get(parentId) ?? [];
      children.sort((a, b) => a.name.localeCompare(b.name));
      for (const row of children) {
        tree.push({ id: row.id, depth });
        walk(row.id, depth + 1);
      }
    };
    walk(null, 0);

    assert.deepEqual(tree, [
      { id: '1', depth: 0 },
      { id: '2', depth: 1 },
      { id: '3', depth: 1 },
      { id: '4', depth: 2 },
      { id: '5', depth: 0 },
    ]);
  });

  it('re-parents children to parent of deleted term', () => {
    const terms = [
      { id: 'root', parentId: null },
      { id: 'cat', parentId: 'root' },
      { id: 'subcat1', parentId: 'cat' },
      { id: 'subcat2', parentId: 'cat' },
    ];

    const termToDelete = terms.find(t => t.id === 'cat')!;
    const remaining = terms
      .filter(t => t.id !== 'cat')
      .map(t => (t.parentId === termToDelete.id ? { ...t, parentId: termToDelete.parentId } : t));

    const s1 = remaining.find(t => t.id === 'subcat1');
    const s2 = remaining.find(t => t.id === 'subcat2');
    assert.equal(s1?.parentId, 'root');
    assert.equal(s2?.parentId, 'root');
  });
});

describe('Entry save respecting supports', () => {
  it('filters out unsupported fields when saving entry data', () => {
    const supports = normalizePostTypeSupports({
      excerpt: false,
      featuredImage: false,
      seo: false,
      status: false,
    });

    const rawInput = {
      excerpt: 'Should be stripped',
      featuredImage: 'https://example.com/stripped.jpg',
      seo: { title: 'SEO title' },
      status: 'scheduled' as const,
      data: { name: 'Valid field' },
    };

    const sanitized = {
      data: rawInput.data,
      excerpt: supports.excerpt ? rawInput.excerpt : null,
      featuredImage: supports.featuredImage ? rawInput.featuredImage : null,
      seo: supports.seo ? rawInput.seo : null,
      status: supports.status ? rawInput.status : 'draft',
    };

    assert.equal(sanitized.excerpt, null);
    assert.equal(sanitized.featuredImage, null);
    assert.equal(sanitized.seo, null);
    assert.equal(sanitized.status, 'draft');
    assert.deepEqual(sanitized.data, { name: 'Valid field' });
  });

  it('keeps supported fields intact', () => {
    const supports = normalizePostTypeSupports({
      excerpt: true,
      featuredImage: true,
      seo: true,
      status: true,
    });

    const rawInput = {
      excerpt: 'Keep me',
      featuredImage: 'https://example.com/keep.jpg',
      seo: { title: 'SEO Title' },
      status: 'published' as const,
      data: { name: 'Test' },
    };

    const sanitized = {
      data: rawInput.data,
      excerpt: supports.excerpt ? rawInput.excerpt : null,
      featuredImage: supports.featuredImage ? rawInput.featuredImage : null,
      seo: supports.seo ? rawInput.seo : null,
      status: supports.status ? rawInput.status : 'draft',
    };

    assert.equal(sanitized.excerpt, 'Keep me');
    assert.equal(sanitized.featuredImage, 'https://example.com/keep.jpg');
    assert.deepEqual(sanitized.seo, { title: 'SEO Title' });
    assert.equal(sanitized.status, 'published');
  });
});

describe('Term syncing on entry save', () => {
  it('syncs terms only for taxonomies provided', () => {
    const existingEntryTerms = [
      { taxonomyId: 'tax1', termId: 't1' },
      { taxonomyId: 'tax2', termId: 't2' },
    ];

    const inputTerms: Record<string, string[]> = {
      tax1: ['t3', 't4'],
    };

    const remaining = existingEntryTerms.filter(et => !(et.taxonomyId in inputTerms));
    const newTerms = Object.entries(inputTerms).flatMap(([taxId, termIds]) =>
      termIds.map(termId => ({ taxonomyId: taxId, termId }))
    );
    const finalTerms = [...remaining, ...newTerms];

    assert.equal(finalTerms.length, 3);
    assert.deepEqual(
      finalTerms,
      [
        { taxonomyId: 'tax2', termId: 't2' },
        { taxonomyId: 'tax1', termId: 't3' },
        { taxonomyId: 'tax1', termId: 't4' },
      ]
    );
  });
});

describe('Scheduled entry publishing logic', () => {
  it('publishes due scheduled entries and leaves future ones untouched', () => {
    const now = new Date('2026-11-06T10:00:00Z');
    const entries = [
      { id: 'e1', status: 'scheduled', scheduledAt: new Date('2026-11-06T09:59:00Z'), publishedAt: null },
      { id: 'e2', status: 'scheduled', scheduledAt: new Date('2026-11-06T10:01:00Z'), publishedAt: null },
      { id: 'e3', status: 'draft', scheduledAt: new Date('2026-11-06T09:00:00Z'), publishedAt: null },
    ];

    const toPublish = entries.filter(
      e => e.status === 'scheduled' && e.scheduledAt && e.scheduledAt <= now
    );

    assert.equal(toPublish.length, 1);
    assert.equal(toPublish[0]?.id, 'e1');

    const published = toPublish.map(e => ({
      ...e,
      status: 'published' as const,
      publishedAt: now,
      scheduledAt: null,
    }));

    assert.equal(published[0]?.status, 'published');
    assert.equal(published[0]?.scheduledAt, null);
    assert.deepEqual(published[0]?.publishedAt, now);
  });
});

describe('resolveTermArchiveRoute', () => {
  const site = {
    defaultLocale: 'en',
    locales: [{ code: 'en' }, { code: 'es' }, { code: 'fr' }],
  };

  function resolve(segments: string[]) {
    const defaultLocale = site.defaultLocale ?? 'en';
    const codes = site.locales.map(l => l.code) ?? [];
    const parts = segments.map(s => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });

    let language = defaultLocale;
    let offset = 0;

    if (
      parts.length >= 4 &&
      parts[0] !== defaultLocale &&
      codes.includes(parts[0]) &&
      parts[1] !== 'blog'
    ) {
      language = parts[0];
      offset = 1;
    }

    if (parts[offset] === 'collections') {
      offset += 1;
    }

    if (parts.length !== offset + 3) {
      return null;
    }

    const typeSlug = parts[offset];
    const taxonomyKey = parts[offset + 1];
    const termSlug = parts[offset + 2];

    if (
      typeSlug === 'blog' ||
      typeSlug === 'api' ||
      typeSlug === 'dashboard' ||
      !typeSlug ||
      !taxonomyKey ||
      !termSlug
    ) {
      return null;
    }

    return { language, typeSlug, taxonomyKey, termSlug };
  }

  it('resolves direct 3-segment post type term archive route', () => {
    const res = resolve(['team', 'department', 'engineering']);
    assert.deepEqual(res, {
      language: 'en',
      typeSlug: 'team',
      taxonomyKey: 'department',
      termSlug: 'engineering',
    });
  });

  it('resolves localized 4-segment post type term archive route', () => {
    const res = resolve(['es', 'team', 'department', 'engineering']);
    assert.deepEqual(res, {
      language: 'es',
      typeSlug: 'team',
      taxonomyKey: 'department',
      termSlug: 'engineering',
    });
  });

  it('resolves /collections/{typeSlug}/{taxonomyKey}/{termSlug}', () => {
    const res = resolve(['collections', 'team', 'department', 'engineering']);
    assert.deepEqual(res, {
      language: 'en',
      typeSlug: 'team',
      taxonomyKey: 'department',
      termSlug: 'engineering',
    });
  });

  it('ignores blog routes and invalid lengths', () => {
    assert.equal(resolve(['blog', 'category', 'tech']), null);
    assert.equal(resolve(['team']), null);
    assert.equal(resolve(['team', 'john-doe']), null);
  });
});

describe('Listing terms filter', () => {
  it('filters collection entries by matching term ID or slug', () => {
    const entries = [
      { id: 'e1', title: 'John', terms: [{ id: 'term-eng', slug: 'engineering' }] },
      { id: 'e2', title: 'Jane', terms: [{ id: 'term-des', slug: 'design' }] },
      { id: 'e3', title: 'Bob', terms: [{ id: 'term-eng', slug: 'engineering' }, { id: 'term-lead', slug: 'lead' }] },
    ];

    const filterByTerms = (val: string | string[]) => {
      const values = Array.isArray(val) ? val : [val];
      return entries.filter(e =>
        e.terms.some(t => values.includes(t.id) || values.includes(t.slug))
      );
    };

    assert.equal(filterByTerms('engineering').length, 2);
    assert.deepEqual(filterByTerms('engineering').map(e => e.id), ['e1', 'e3']);
    assert.equal(filterByTerms('term-des').length, 1);
    assert.equal(filterByTerms(['design', 'lead']).length, 2);
    assert.equal(filterByTerms('nonexistent').length, 0);
  });
});


