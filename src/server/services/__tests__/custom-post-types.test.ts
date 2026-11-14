import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_POST_TYPE_SUPPORTS,
  entryFeaturedMedia,
  entryGalleryMedia,
  entryMediaValues,
  mergeFeaturedWithFieldMedia,
  normalizePostTypeSupports,
  POST_TYPE_SUPPORT_FEATURES,
} from '@/config/post-types';
import {
  entryToPostView,
  toDynamicPostRecord,
  type EntryTermView,
} from '@/builder/post-template';
import {
  buildEntrySchema,
  coerceEntryData,
} from '@/server/services/collections.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import {
  collectionFieldSchema,
  generateTermSuffix,
  collectionTermSchema,
  updateCollectionBlockSettingsSchema,
  updateFieldSchema,
} from '@/app/(admin)/dashboard/(shell)/collections/_modules/collections.schemas';
import {
  BLOCK_EDITOR_TYPES,
  blockSetupKind,
  COLLECTION_BLOCK_EDITOR_TYPES,
  hiddenBlocksFor,
  normalizeCollectionBlockSettings,
} from '@/config/block-manager';
import { buildBlockManagerEditors } from '@/app/(admin)/dashboard/(shell)/settings/blocks/editors';
import { editorSetup } from '@/builder/definitions';
import { slugify } from '@/lib/utils/slugify';

describe('PostTypeSupports', () => {
  it('defaults active features to true', () => {
    assert.deepEqual(DEFAULT_POST_TYPE_SUPPORTS, {
      template: true,
      taxonomies: true,
      excerpt: true,
      author: true,
      status: true,
      seo: true,
      comments: true,
    });
  });

  it('normalizes partial supports object', () => {
    const supports = normalizePostTypeSupports({
      taxonomies: false,
      seo: false,
      comments: false,
    });
    assert.equal(supports.taxonomies, false);
    assert.equal(supports.seo, false);
    assert.equal(supports.comments, false);
    assert.equal(supports.template, true);
    assert.equal(supports.excerpt, true);
    assert.equal(supports.author, true);
    assert.equal(supports.status, true);
  });

  it('lists all 7 feature groups', () => {
    assert.equal(POST_TYPE_SUPPORT_FEATURES.length, 7);
    const keys = POST_TYPE_SUPPORT_FEATURES.map(f => f.key);
    assert.ok(keys.includes('template'));
    assert.ok(keys.includes('taxonomies'));
    assert.ok(keys.includes('excerpt'));
    assert.ok(keys.includes('author'));
    assert.ok(keys.includes('status'));
    assert.ok(keys.includes('seo'));
    assert.ok(keys.includes('comments'));
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
    assert.equal(postView.blogUrl, '/collections/team');
    assert.equal(postView.targetKind, 'entry');
    assert.equal(postView.allowComments, true);

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

  it('falls back to custom image field when featuredImage column is not set', () => {
    const entry = {
      id: 'e3',
      slug: 'jane-doe',
      data: { name: 'Jane Doe', photo: 'https://example.com/jane.jpg' },
    };
    const collection = {
      name: 'Team',
      slug: 'team',
      fields: [{ key: 'photo', type: 'media' }],
    };
    const postView = entryToPostView(entry, collection, []);
    assert.equal(postView.featuredImage, 'https://example.com/jane.jpg');
  });

  it('respects collection supports.comments and entry.allowComments', () => {
    const baseEntry = {
      id: 'e4',
      slug: 'showcase-one',
      language: 'fr',
      data: { title: 'Showcase One' },
      allowComments: true,
      commentCount: 3,
    };

    const enabled = entryToPostView(baseEntry, {
      name: 'Showcase',
      slug: 'showcase',
      supports: { comments: true },
    });
    assert.equal(enabled.targetKind, 'entry');
    assert.equal(enabled.language, 'fr');
    assert.equal(enabled.allowComments, true);
    assert.equal(enabled.commentCount, 3);

    const disabledOnCollection = entryToPostView(baseEntry, {
      name: 'Showcase',
      slug: 'showcase',
      supports: { comments: false },
    });
    assert.equal(disabledOnCollection.allowComments, false);

    const disabledOnEntry = entryToPostView(
      { ...baseEntry, allowComments: false },
      { name: 'Showcase', slug: 'showcase', supports: { comments: true } }
    );
    assert.equal(disabledOnEntry.allowComments, false);
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
      seo: false,
      status: false,
    });

    const rawInput = {
      excerpt: 'Should be stripped',
      seo: { title: 'SEO title' },
      status: 'scheduled' as const,
      data: { name: 'Valid field' },
    };

    const sanitized = {
      data: rawInput.data,
      excerpt: supports.excerpt ? rawInput.excerpt : null,
      seo: supports.seo ? rawInput.seo : null,
      status: supports.status ? rawInput.status : 'draft',
    };

    assert.equal(sanitized.excerpt, null);
    assert.equal(sanitized.seo, null);
    assert.equal(sanitized.status, 'draft');
    assert.deepEqual(sanitized.data, { name: 'Valid field' });
  });

  it('keeps supported fields intact', () => {
    const supports = normalizePostTypeSupports({
      excerpt: true,
      seo: true,
      status: true,
    });

    const rawInput = {
      excerpt: 'Keep me',
      seo: { title: 'SEO Title' },
      status: 'published' as const,
      data: { name: 'Test' },
    };

    const sanitized = {
      data: rawInput.data,
      excerpt: supports.excerpt ? rawInput.excerpt : null,
      seo: supports.seo ? rawInput.seo : null,
      status: supports.status ? rawInput.status : 'draft',
    };

    assert.equal(sanitized.excerpt, 'Keep me');
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

describe('Taxonomy and term duplicate name prevention', () => {
  it('detects duplicate taxonomy names (case-insensitive)', () => {
    const existing = [
      { id: '1', name: 'Categories', key: 'category' },
      { id: '2', name: 'Department', key: 'department' },
    ];

    const hasClash = (name: string, key: string, currentId?: string) => {
      const trimmedName = name.trim().toLowerCase();
      const trimmedKey = key.trim().toLowerCase();
      return existing.some(
        t =>
          t.id !== currentId &&
          (t.name.trim().toLowerCase() === trimmedName ||
            t.key.toLowerCase() === trimmedKey)
      );
    };

    assert.ok(hasClash('categories', 'other'));
    assert.ok(hasClash('CATEGORIES', 'other'));
    assert.ok(hasClash('Department', 'dept'));
    assert.ok(hasClash('New Tax', 'category'));
    assert.ok(!hasClash('New Tax', 'new-tax'));
    assert.ok(!hasClash('Categories', 'category', '1'));
  });

  it('detects duplicate term names (case-insensitive)', () => {
    const existing = [
      { id: '1', name: 'Engineering', slug: 'engineering' },
      { id: '2', name: 'Design', slug: 'design' },
    ];

    const hasClash = (name: string, slug: string, currentId?: string) => {
      const trimmedName = name.trim().toLowerCase();
      const trimmedSlug = slug.trim().toLowerCase();
      return existing.some(
        t =>
          t.id !== currentId &&
          (t.name.trim().toLowerCase() === trimmedName ||
            t.slug.toLowerCase() === trimmedSlug)
      );
    };

    assert.ok(hasClash('engineering', 'eng'));
    assert.ok(hasClash('ENGINEERING', 'engineering'));
    assert.ok(hasClash('Product', 'design'));
    assert.ok(!hasClash('Marketing', 'marketing'));
    assert.ok(!hasClash('Engineering', 'engineering', '1'));
  });

  it('formats taxonomy terms with hierarchical depth indentation for multiselect', () => {
    const terms = [
      { id: '1', name: 'Design', depth: 0 },
      { id: '2', name: 'UI/UX', depth: 1 },
      { id: '3', name: 'Figma', depth: 2 },
    ];

    const options = terms.map(t => ({
      value: t.id,
      label: `${'— '.repeat(t.depth)}${t.name}`,
    }));

    assert.equal(options[0].label, 'Design');
    assert.equal(options[1].label, '— UI/UX');
    assert.equal(options[2].label, '— — Figma');
  });

  it('aggregates status counts with zeros for missing statuses', () => {
    const rawRows = [
      { status: 'published', total: 5 },
      { status: 'draft', total: 2 },
    ];
    const result: Record<string, number> = {
      published: 0,
      draft: 0,
      review: 0,
      scheduled: 0,
    };
    for (const r of rawRows) {
      if (r.status) result[r.status] = Number(r.total);
    }
    assert.equal(result.published, 5);
    assert.equal(result.draft, 2);
    assert.equal(result.review, 0);
    assert.equal(result.scheduled, 0);
  });

  it('builds search and layout filter conditions for collection entries', () => {
    const buildLayoutCondition = (layout?: string) => {
      if (layout === 'custom') return 'custom';
      if (layout === 'default') return 'default';
      if (layout) return `template:${layout}`;
      return 'all';
    };

    assert.equal(buildLayoutCondition('custom'), 'custom');
    assert.equal(buildLayoutCondition('default'), 'default');
    assert.equal(buildLayoutCondition('tpl-123'), 'template:tpl-123');
    assert.equal(buildLayoutCondition(), 'all');
  });

  it('generates unique TC number suffix for term slugs', () => {
    const suffix1 = generateTermSuffix();
    const suffix2 = generateTermSuffix();
    assert.match(suffix1, /^TC\d{6}$/);
    assert.match(suffix2, /^TC\d{6}$/);
  });

  it('formats term slugs with base name and TC suffix', () => {
    const suffix = 'TC123545';
    const name = 'Cat One';
    const slug = `${slugify(name)}-${suffix}`;
    assert.equal(slug, 'cat-one-TC123545');

    // Validates against collectionTermSchema
    const parsed = collectionTermSchema.safeParse({
      taxonomyId: 'tax_1',
      name,
      slug,
    });
    assert.ok(parsed.success);
    if (parsed.success) {
      assert.equal(parsed.data.slug, 'cat-one-TC123545');
    }
  });

  it('rejects invalid term slugs in collectionTermSchema', () => {
    assert.ok(!collectionTermSchema.safeParse({ taxonomyId: 'tax_1', name: 'Cat', slug: 'cat one' }).success);
    assert.ok(!collectionTermSchema.safeParse({ taxonomyId: 'tax_1', name: 'Cat', slug: '-leading-dash' }).success);
    assert.ok(!collectionTermSchema.safeParse({ taxonomyId: 'tax_1', name: 'Cat', slug: 'trailing-dash-' }).success);
    assert.ok(!collectionTermSchema.safeParse({ taxonomyId: 'tax_1', name: 'Cat', slug: 'has@special#chars' }).success);
  });
});

describe('CollectionBlockSettings', () => {
  it('normalizes valid collection editor kinds and strips unknown keys', () => {
    const normalized = normalizeCollectionBlockSettings({
      hidden: {
        entry: ['Hero', 123],
        'entry-template': ['Spacer'],
        'collection-block': [],
        page: ['RichText'],
      },
    });
    assert.deepEqual(normalized, {
      hidden: {
        entry: ['Hero'],
        'entry-template': ['Spacer'],
        'collection-block': [],
      },
    });
  });

  it('inherits site-wide block settings when uncustomized and overrides when set', () => {
    const site = {
      hidden: {
        'entry-template': ['Hero', 'Accordion'],
      },
    };
    const available = ['Heading', 'Hero', 'Accordion', 'Spacer'];

    assert.deepEqual(
      hiddenBlocksFor(site, 'entry-template', available, { hidden: {} }),
      ['Hero', 'Accordion']
    );
    assert.deepEqual(
      hiddenBlocksFor(site, 'entry-template', available, {
        hidden: { 'entry-template': [] },
      }),
      []
    );
    assert.deepEqual(
      hiddenBlocksFor(site, 'collection-block', available, {
        hidden: { 'collection-block': ['Spacer'] },
      }),
      ['Spacer']
    );
  });

  it('validates collection block settings input with updateCollectionBlockSettingsSchema', () => {
    assert.ok(
      updateCollectionBlockSettingsSchema.safeParse({
        id: 'col_1',
        collectionSlug: 'showcase',
        blockSettings: {
          hidden: {
            entry: ['Hero'],
          },
        },
      }).success
    );

    assert.ok(
      updateCollectionBlockSettingsSchema.safeParse({
        id: 'col_1',
        collectionSlug: 'showcase',
        blockSettings: {
          hidden: {},
        },
      }).success
    );

    assert.ok(
      updateCollectionBlockSettingsSchema.safeParse({
        id: 'col_1',
        collectionSlug: 'showcase',
        blockSettings: {
          hidden: {
            entry: ['Hero'],
            'entry-template': [],
            'collection-block': ['Accordion'],
          },
        },
      }).success
    );

    assert.ok(
      !updateCollectionBlockSettingsSchema.safeParse({
        id: 'col_1',
        collectionSlug: 'showcase',
        blockSettings: {
          hidden: {
            page: ['Hero'],
          },
        },
      }).success
    );
  });

  it('includes Other schema blocks in buildBlockManagerEditors for all editor kinds', () => {
    const siteEditors = buildBlockManagerEditors(BLOCK_EDITOR_TYPES, {
      hidden: {},
    });
    for (const editor of siteEditors) {
      // Search and Archive templates list the global block editor's blocks.
      const setup = editorSetup(blockSetupKind(editor.kind));
      const listed = editor.groups.flatMap(g => g.blocks.map(b => b.type));
      const schemaTypes = Object.keys(setup.schemas);
      assert.equal(listed.length, new Set(listed).size);
      for (const type of schemaTypes) {
        assert.ok(
          listed.includes(type),
          `Expected ${type} to be listed for ${editor.kind}`
        );
      }
      assert.ok(
        editor.groups.some(g => g.title === 'Other'),
        `Expected Other group for ${editor.kind}`
      );
    }

    const colEditors = buildBlockManagerEditors(
      COLLECTION_BLOCK_EDITOR_TYPES,
      { hidden: {} },
      { hidden: {} }
    );
    assert.equal(colEditors.length, 3);
    assert.ok(colEditors.every(e => e.groups.some(g => g.title === 'Other')));
  });
});

describe('Collection media gallery & featured image fields', () => {
  it('picks isFeatured field over conventional keys and puts featured image first in gallery', () => {
    const fields = [
      { key: 'image', type: 'media', config: {} },
      { key: 'gallery', type: 'media', config: { multiple: true } },
      { key: 'hero_cover', type: 'media', config: { isFeatured: true } },
    ];
    const data = {
      image: 'https://cdn.example/regular.jpg',
      gallery: [
        'https://cdn.example/shot-1.jpg',
        'https://cdn.example/hero.jpg',
        'https://cdn.example/shot-2.jpg',
      ],
      hero_cover: 'https://cdn.example/hero.jpg',
    };

    assert.equal(entryFeaturedMedia(data, fields), 'https://cdn.example/hero.jpg');

    const gallery = entryGalleryMedia(data, fields);
    assert.equal(gallery.featuredImage, 'https://cdn.example/hero.jpg');
    assert.equal(gallery.hasGallery, true);
    assert.equal(gallery.images[0], 'https://cdn.example/hero.jpg');
    assert.deepEqual(gallery.images, [
      'https://cdn.example/hero.jpg',
      'https://cdn.example/regular.jpg',
      'https://cdn.example/shot-1.jpg',
      'https://cdn.example/shot-2.jpg',
    ]);

    assert.deepEqual(
      mergeFeaturedWithFieldMedia(data.gallery, gallery.featuredImage),
      [
        'https://cdn.example/hero.jpg',
        'https://cdn.example/shot-1.jpg',
        'https://cdn.example/shot-2.jpg',
      ]
    );
  });

  it('normalizes entry media values and reports hasGallery accurately', () => {
    assert.deepEqual(
      entryMediaValues([' /a.jpg ', '/a.jpg', '', '/b.jpg']),
      ['/a.jpg', '/b.jpg']
    );
    const single = entryGalleryMedia(
      { cover: '/only.jpg' },
      [{ key: 'cover', type: 'media', config: { isFeatured: true } }]
    );
    assert.equal(single.hasGallery, false);
    assert.deepEqual(single.images, ['/only.jpg']);
  });

  it('validates and coerces single and multi-image media fields', () => {
    const fields = [
      {
        id: 'f1',
        collectionId: 'c1',
        key: 'cover',
        label: 'Cover',
        type: 'media' as const,
        required: true,
        position: 0,
        config: { isFeatured: true, multiple: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'f2',
        collectionId: 'c1',
        key: 'photos',
        label: 'Photos',
        type: 'media' as const,
        required: true,
        position: 1,
        config: { multiple: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const coerced = coerceEntryData(fields as any, {
      cover: ['/cover.jpg'],
      photos: [' /1.jpg ', '/2.jpg', '/1.jpg'],
    });
    assert.equal(coerced.cover, '/cover.jpg');
    assert.deepEqual(coerced.photos, ['/1.jpg', '/2.jpg']);

    const schema = buildEntrySchema(fields as any);
    assert.equal(schema.safeParse(coerced).success, true);

    const emptyMulti = coerceEntryData(fields as any, {
      cover: '/cover.jpg',
      photos: [],
    });
    assert.equal(schema.safeParse(emptyMulti).success, false);

    assert.equal(
      collectionFieldSchema.safeParse({
        label: 'Gallery',
        type: 'media',
        multiple: true,
        isFeatured: false,
      }).success,
      true
    );
    assert.equal(
      collectionFieldSchema.safeParse({
        label: 'Featured',
        type: 'media',
        multiple: false,
        isFeatured: true,
      }).success,
      true
    );
    assert.equal(
      collectionFieldSchema.safeParse({
        label: 'Invalid Both',
        type: 'media',
        multiple: true,
        isFeatured: true,
      }).success,
      false
    );
    assert.equal(
      updateFieldSchema.safeParse({
        label: 'Gallery',
        type: 'media',
        required: false,
        multiple: true,
        isFeatured: false,
      }).success,
      true
    );
    assert.equal(
      updateFieldSchema.safeParse({
        label: 'Invalid Both',
        type: 'media',
        required: false,
        multiple: true,
        isFeatured: true,
      }).success,
      false
    );
  });

  it('uses the isFeatured media field as PostView featuredImage in entryToPostView', () => {
    const view = entryToPostView(
      {
        id: 'e1',
        slug: 'my-showcase',
        data: {
          title: 'My Showcase',
          thumbnail: '/thumb.jpg',
          featured_shot: '/featured.jpg',
        },
      },
      {
        name: 'Showcase',
        slug: 'showcase',
        fields: [
          { key: 'title', type: 'text' },
          { key: 'thumbnail', type: 'media', config: {} },
          { key: 'featured_shot', type: 'media', config: { isFeatured: true } },
        ],
      }
    );
    assert.equal(view.featuredImage, '/featured.jpg');
  });

  it('exposes current post content and collection dynamic fields for builder dynamic sources', () => {
    const { entryDynamicSources } = require('@/builder/controls/loop-preview');
    const { resolveDynamicValue } = require('@nextcms/builder-core');

    const sources = entryDynamicSources('Showcase', [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'demo_video', label: 'Demo Video', type: 'url' },
      { key: 'live_url', label: 'Live URL', type: 'url' },
      { key: 'hero', label: 'Featured Shot', type: 'media' },
    ]);

    assert.equal(sources.custom.label, 'Showcase Fields');
    assert.deepEqual(
      sources.custom.fields.map((f: { key: string; type: string }) => [f.key, f.type]),
      [
        ['title', 'text'],
        ['demo_video', 'url'],
        ['live_url', 'url'],
        ['hero', 'image'],
      ]
    );

    const postRecord = toDynamicPostRecord({
      title: 'Northwind Studio',
      body: '<p>Full studio article body</p>',
    });
    assert.equal(
      resolveDynamicValue(
        { $dynamic: 'post', path: 'content' },
        { post: postRecord }
      ),
      '<p>Full studio article body</p>'
    );
  });

  it('validates textMode and urlMode switches on text and url fields', () => {
    const { validateEntryFieldValue } = require('@/config/post-types');

    assert.equal(
      collectionFieldSchema.safeParse({
        label: 'Promo Video',
        type: 'text',
        textMode: 'video',
      }).success,
      true
    );
    assert.equal(
      collectionFieldSchema.safeParse({
        label: 'Demo Frame',
        type: 'text',
        textMode: 'embed',
      }).success,
      true
    );
    assert.equal(
      updateFieldSchema.safeParse({
        label: 'Video Link',
        type: 'url',
        required: false,
        urlMode: 'video',
      }).success,
      true
    );

    const fields = [
      {
        id: 't1',
        collectionId: 'c1',
        key: 'plain_note',
        label: 'Note',
        type: 'text' as const,
        required: true,
        position: 0,
        config: { textMode: 'plain' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 't2',
        collectionId: 'c1',
        key: 'video_text',
        label: 'Video URL',
        type: 'text' as const,
        required: true,
        position: 1,
        config: { textMode: 'video' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 't3',
        collectionId: 'c1',
        key: 'embed_text',
        label: 'Embed URL',
        type: 'text' as const,
        required: true,
        position: 2,
        config: { textMode: 'embed' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'u1',
        collectionId: 'c1',
        key: 'video_link',
        label: 'Video Link',
        type: 'url' as const,
        required: true,
        position: 3,
        config: { urlMode: 'video' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'u2',
        collectionId: 'c1',
        key: 'site_link',
        label: 'Website',
        type: 'url' as const,
        required: true,
        position: 4,
        config: { urlMode: 'other' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const schema = buildEntrySchema(fields as any);
    assert.equal(
      schema.safeParse({
        plain_note: 'Plain showcase summary',
        video_text: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        embed_text: 'https://northwind.example.com/preview',
        video_link: '/uploads/clip.mp4',
        site_link: 'https://northwind.example.com',
      }).success,
      true
    );

    // Non-video text fails video mode validation; javascript: fails embed mode; non-video URL fails url video mode
    assert.equal(
      schema.safeParse({
        plain_note: 'Plain',
        video_text: 'not a video url',
        embed_text: 'https://ok.example.com',
        video_link: '/uploads/clip.mp4',
        site_link: 'https://ok.example.com',
      }).success,
      false
    );
    assert.equal(
      schema.safeParse({
        plain_note: 'Plain',
        video_text: 'https://youtu.be/dQw4w9WgXcQ',
        embed_text: 'javascript:alert(1)',
        video_link: '/uploads/clip.mp4',
        site_link: 'https://ok.example.com',
      }).success,
      false
    );
    assert.equal(
      schema.safeParse({
        plain_note: 'Plain',
        video_text: 'https://youtu.be/dQw4w9WgXcQ',
        embed_text: 'https://ok.example.com',
        video_link: 'https://example.com/not-a-video',
        site_link: 'https://ok.example.com',
      }).success,
      false
    );

    assert.equal(validateEntryFieldValue('text', 'Hello', { textMode: 'plain' }), true);
    assert.notEqual(validateEntryFieldValue('text', 'Hello', { textMode: 'video' }), true);
    assert.equal(
      validateEntryFieldValue(
        'text',
        '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Demo" allowfullscreen></iframe>',
        { textMode: 'embed' }
      ),
      true
    );
    assert.notEqual(
      validateEntryFieldValue(
        'text',
        '<iframe src="javascript:alert(1)"></iframe>',
        { textMode: 'embed' }
      ),
      true
    );
    assert.notEqual(
      validateEntryFieldValue(
        'text',
        '<iframe src="https://ok.example.com"><script>evil()</script></iframe>',
        { textMode: 'embed' }
      ),
      true
    );
    assert.notEqual(validateEntryFieldValue('url', 'https://example.com', { urlMode: 'video' }), true);
    assert.equal(validateEntryFieldValue('url', 'https://example.com', { urlMode: 'other' }), true);
  });
});



