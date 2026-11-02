import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALLOWED_FILTER_FIELDS,
  ALLOWED_SORT_FIELDS,
  encodeNamespacedParams,
  formatNamespacedParam,
  listingQuerySchema,
  MAX_PAGE_SIZE,
  parseNamespacedParams,
  puckToDocument,
  resolveDynamicDocument,
  resolveDynamicValue,
} from '@nextcms/builder-core';
import {
  buildItemListJsonLd,
  convertBlogBlockToQueryLoop,
  toLoopItemContext,
} from '@/builder/blocks/query-loop';
import {
  buildListingSeoMetadata,
  resolveArchiveRoute,
} from '@/lib/listing-seo';
import {
  buildPrefixTsQuery,
  expandQueryWithSynonyms,
  getPostgresTextSearchConfig,
  highlightTextSnippet,
  matchPinnedResults,
  normalizeSearchQueryLog,
  stripAccents,
} from '@/lib/search-text';

describe('Query foundation & boundaries (R571, R572, R573 / QRY-01–03)', () => {
  it('enforces hard maximum limit of 100 items', () => {
    assert.equal(MAX_PAGE_SIZE, 100);

    const parsed = listingQuerySchema.parse({
      source: 'posts',
      limit: 100,
    });
    assert.equal(parsed.limit, 100);

    assert.throws(() => {
      listingQuerySchema.parse({
        source: 'posts',
        limit: 101,
      });
    }, /too_big/);
  });

  it('validates allowlisted filters per source (posts, pages, collection-entries, videos)', () => {
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('categories'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('tags'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('authorId'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('search'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('hasImage'));
    assert.ok(ALLOWED_FILTER_FIELDS.posts.includes('booleanToggle'));

    assert.ok(ALLOWED_FILTER_FIELDS.videos.includes('playlistId'));
    assert.ok(ALLOWED_FILTER_FIELDS.videos.includes('provider'));
    assert.ok(ALLOWED_FILTER_FIELDS.videos.includes('minNumber'));
    assert.ok(ALLOWED_FILTER_FIELDS.videos.includes('maxNumber'));

    assert.ok(
      ALLOWED_FILTER_FIELDS['collection-entries'].includes('collectionId')
    );

    // Rejects non-allowlisted column injection
    assert.throws(() => {
      listingQuerySchema.parse({
        source: 'posts',
        filters: [{ field: 'passwordHash', operator: 'eq', value: 'secret' }],
      });
    }, /Filter field 'passwordHash' is not allowed for source 'posts'/);
  });

  it('validates allowlisted sort fields per source', () => {
    assert.ok(ALLOWED_SORT_FIELDS.posts.includes('publishedAt'));
    assert.ok(ALLOWED_SORT_FIELDS.posts.includes('title'));
    assert.ok(ALLOWED_SORT_FIELDS.videos.includes('position'));

    assert.throws(() => {
      listingQuerySchema.parse({
        source: 'videos',
        sortField: 'salary',
      });
    }, /Sort field 'salary' is not allowed for source 'videos'/);
  });

  it('handles excludeCurrent and currentId parameters safely', () => {
    const config = listingQuerySchema.parse({
      source: 'posts',
      excludeCurrent: true,
      currentId: 'current-post-id',
    });
    assert.equal(config.excludeCurrent, true);
    assert.equal(config.currentId, 'current-post-id');
  });

  it('prevents parameter collision between multiple listings on the same page (R573)', () => {
    const multiBlockUrlParams = {
      // Feed A
      blog_page: '3',
      blog_q: 'design',
      blog_category: 'architecture,systems',
      blog_tag: 'nextjs,cms',
      blog_from: '2026-01-01',
      blog_to: '2026-12-31',
      blog_toggle: '1',

      // Feed B
      video_page: '1',
      video_sort: 'duration',
      video_order: 'asc',
      video_min: '60',
      video_max: '600',
    };

    const blogParams = parseNamespacedParams(multiBlockUrlParams, 'blog');
    assert.equal(blogParams.page, 3);
    assert.equal(blogParams.search, 'design');
    assert.equal(blogParams.category, 'architecture');
    assert.deepEqual(blogParams.categories, ['architecture', 'systems']);
    assert.deepEqual(blogParams.tags, ['nextjs', 'cms']);
    assert.equal(blogParams.from, '2026-01-01');
    assert.equal(blogParams.to, '2026-12-31');
    assert.equal(blogParams.toggle, true);
    assert.equal(blogParams.sort, undefined);

    const videoParams = parseNamespacedParams(multiBlockUrlParams, 'video');
    assert.equal(videoParams.page, 1);
    assert.equal(videoParams.search, undefined);
    assert.equal(videoParams.sort, 'duration');
    assert.equal(videoParams.order, 'asc');
    assert.equal(videoParams.min, 60);
    assert.equal(videoParams.max, 600);

    // Encoding works reversibly
    const encoded = encodeNamespacedParams(blogParams, 'blog');
    assert.equal(encoded.blog_page, '3');
    assert.equal(encoded.blog_q, 'design');
    assert.equal(encoded.blog_category, 'architecture,systems');
    assert.equal(encoded.blog_tag, 'nextjs,cms');
    assert.equal(encoded.blog_from, '2026-01-01');
    assert.equal(encoded.blog_to, '2026-12-31');
    assert.equal(encoded.blog_toggle, '1');
    assert.equal(formatNamespacedParam('page', 'blog'), 'blog_page');
  });
});

describe('Query Loop & Dynamic Per-Item Resolution (R575–R580 / QRY-05–10)', () => {
  it('preserves loopItem bindings at document level and resolves them per item', () => {
    const doc = puckToDocument({
      root: { props: {} },
      content: [
        {
          type: 'Heading',
          props: {
            id: 'h-1',
            text: {
              $dynamic: 'loopItem',
              path: 'title',
              fallback: 'Untitled',
            },
          },
        },
      ],
    });

    // Document-level resolution with preserveLoopBindings keeps loopItem binding intact
    const pageResolved = resolveDynamicDocument(doc, {
      preserveLoopBindings: true,
      page: { title: 'Blog Index' },
    });
    const rawHeadingText = pageResolved.nodes['h-1']?.props.text as {
      $dynamic?: string;
      path?: string;
    };
    assert.equal(rawHeadingText?.$dynamic, 'loopItem');
    assert.equal(rawHeadingText?.path, 'title');

    // Per-item resolution resolves loopItem against the current item context
    const loopCtx = toLoopItemContext({
      id: 'post-1',
      title: 'Building Modular Queries',
      slug: 'building-modular-queries',
      url: '/blog/building-modular-queries',
      excerpt: 'How the Query Loop works',
      image: '/media/hero.jpg',
      publishedAt: '2026-10-15T00:00:00.000Z',
      author: { id: 'a1', name: 'Ada Lovelace', image: null },
      terms: [
        {
          id: 'c1',
          name: 'Engineering',
          slug: 'engineering',
          taxonomy: 'category',
        },
        { id: 't1', name: 'CMS', slug: 'cms', taxonomy: 'tag' },
      ],
      source: 'posts',
    });

    const resolvedTitle = resolveDynamicValue(rawHeadingText, {
      loopItem: loopCtx,
    });
    assert.equal(resolvedTitle, 'Building Modular Queries');
    assert.equal(loopCtx.category, 'Engineering');
    assert.equal(loopCtx.tags, 'CMS');
    assert.equal(loopCtx.authorName, 'Ada Lovelace');
  });

  it('converts legacy BlogPosts and RelatedPosts nodes to QueryLoop (R580 / QRY-10)', () => {
    const doc = puckToDocument({
      root: { props: {} },
      content: [
        {
          type: 'BlogPosts',
          props: {
            id: 'blog-1',
            title: 'Recent Articles',
            columns: 3,
            pageSize: 9,
            lockedCategory: 'news',
            showExcerpt: true,
          },
        },
        {
          type: 'RelatedPosts',
          props: {
            id: 'rel-1',
            title: 'More Like This',
            columns: 2,
            limit: 4,
          },
        },
      ],
    });

    const convertedBlog = convertBlogBlockToQueryLoop(doc, 'blog-1');
    const blogNode = convertedBlog.nodes['blog-1'];
    assert.equal(blogNode?.type, 'QueryLoop');
    assert.equal(blogNode?.props.source, 'posts');
    assert.equal(blogNode?.props.title, 'Recent Articles');
    assert.equal(blogNode?.props.columnsDesktop, 3);
    assert.equal(blogNode?.props.pageSize, 9);
    assert.equal(blogNode?.props.lockedCategory, 'news');
    assert.equal(blogNode?.props.sortField, 'publishedAt');
    assert.equal(blogNode?.props.sortOrder, 'desc');

    const convertedRelated = convertBlogBlockToQueryLoop(
      convertedBlog,
      'rel-1'
    );
    const relNode = convertedRelated.nodes['rel-1'];
    assert.equal(relNode?.type, 'QueryLoop');
    assert.equal(relNode?.props.excludeCurrent, true);
    assert.equal(relNode?.props.pageSize, 4);
    assert.equal(relNode?.props.pagination, 'none');
  });

  it('generates ItemList JSON-LD only for visible items (R597 / QRY-27)', () => {
    const jsonLd = buildItemListJsonLd(
      [
        {
          id: 'p1',
          title: 'Post One',
          slug: 'post-one',
          url: '/blog/post-one',
          image: 'https://example.com/p1.jpg',
          source: 'posts',
        },
        {
          id: 'p2',
          title: 'Post Two',
          slug: 'post-two',
          url: '/blog/post-two',
          source: 'posts',
        },
      ],
      'Latest Posts'
    );

    assert.equal(jsonLd['@type'], 'ItemList');
    assert.equal(jsonLd.name, 'Latest Posts');
    assert.equal(jsonLd.numberOfItems, 2);
    const elements = jsonLd.itemListElement as Array<Record<string, unknown>>;
    assert.equal(elements.length, 2);
    assert.equal(elements[0]?.position, 1);
    assert.equal(elements[0]?.url, '/blog/post-one');
    assert.equal(elements[1]?.position, 2);
  });
});

describe('Site Search Quality, Locales, Synonyms & Highlighting (R586–R594 / QRY-16–24)', () => {
  it('resolves locale-aware Postgres text search configurations (R588 / QRY-18)', () => {
    assert.equal(getPostgresTextSearchConfig('en'), 'english');
    assert.equal(getPostgresTextSearchConfig('en-US'), 'english');
    assert.equal(getPostgresTextSearchConfig('es'), 'spanish');
    assert.equal(getPostgresTextSearchConfig('fr'), 'french');
    assert.equal(getPostgresTextSearchConfig('de'), 'german');
    assert.equal(getPostgresTextSearchConfig('ja'), 'simple');
    assert.equal(getPostgresTextSearchConfig('unknown'), 'simple');
  });

  it('strips diacritics and builds safe prefix tsquery expressions (R587, R588)', () => {
    assert.equal(stripAccents('Café résumé naïve'), 'Cafe resume naive');
    assert.equal(buildPrefixTsQuery('next cms'), 'next:* & cms:*');
    assert.equal(
      buildPrefixTsQuery('hello! @world#'),
      'hello:* & world:*'
    );
  });

  it('expands search queries with configured synonyms (R593 / QRY-23)', () => {
    const synonyms = [
      { term: 'pricing', synonyms: ['cost', 'billing'] },
      { term: 'cms', synonyms: ['builder'] },
    ];
    const expanded = expandQueryWithSynonyms('pricing guide', synonyms).flat();
    assert.ok(expanded.includes('pricing'));
    assert.ok(expanded.includes('cost'));
    assert.ok(expanded.includes('billing'));
    assert.ok(expanded.includes('guide'));
  });

  it('matches pinned search results for configured trigger queries (R593 / QRY-23)', () => {
    const pinned = [
      {
        query: 'pricing',
        title: 'Plans & Pricing',
        path: '/pricing',
        snippet: 'Compare all tiers',
        kind: 'page' as const,
      },
      {
        query: 'support',
        title: 'Help Center',
        path: '/support',
      },
    ];
    const matches = matchPinnedResults('Pricing', pinned);
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.path, '/pricing');
    assert.equal(matchPinnedResults('unrelated', pinned).length, 0);
  });

  it('highlights matched terms in snippets with escaped HTML and <mark> tags (R591 / QRY-21)', () => {
    const snippet = highlightTextSnippet(
      'Welcome to <script>alert(1)</script> the Next CMS visual builder documentation.',
      'visual builder'
    );
    assert.ok(!snippet.includes('<script>'));
    assert.ok(snippet.includes('&lt;script&gt;'));
    assert.ok(snippet.includes('<mark>visual</mark>'));
    assert.ok(snippet.includes('<mark>builder</mark>'));
  });

  it('normalizes search query logs without storing personal data (R592 / QRY-22)', () => {
    assert.equal(normalizeSearchQueryLog('  Next   CMS  '), 'next cms');
    assert.equal(normalizeSearchQueryLog('   '), '');
  });
});

describe('Archive Routes & Listing SEO (R595–R597 / QRY-25–27)', () => {
  const site = {
    defaultLocale: 'en',
    locales: [{ code: 'en' }, { code: 'es' }, { code: 'fr' }],
  };

  it('resolves category, tag, author, and date archive routes across locales', () => {
    assert.deepEqual(
      resolveArchiveRoute(['blog', 'category', 'engineering'], site),
      {
        language: 'en',
        kind: 'category',
        slug: 'engineering',
      }
    );

    assert.deepEqual(
      resolveArchiveRoute(['es', 'blog', 'tag', 'release-notes'], site),
      {
        language: 'es',
        kind: 'tag',
        slug: 'release-notes',
      }
    );

    assert.deepEqual(
      resolveArchiveRoute(['blog', 'author', 'user_123'], site),
      {
        language: 'en',
        kind: 'author',
        authorId: 'user_123',
      }
    );

    const yearArchive = resolveArchiveRoute(['blog', 'archive', '2026'], site);
    assert.equal(yearArchive?.kind, 'date');
    assert.equal(yearArchive?.year, 2026);
    assert.equal(yearArchive?.month, undefined);

    const monthArchive = resolveArchiveRoute(
      ['fr', 'blog', 'archive', '2026', '11'],
      site
    );
    assert.equal(monthArchive?.kind, 'date');
    assert.equal(monthArchive?.language, 'fr');
    assert.equal(monthArchive?.year, 2026);
    assert.equal(monthArchive?.month, 11);
  });

  it('computes self-canonical pagination URLs and noindex on filtered combinations (R597 / QRY-27)', () => {
    // Base unfiltered page 1
    const baseSeo = buildListingSeoMetadata({
      baseCanonicalUrl: 'https://example.com/blog',
      searchParams: {},
    });
    assert.equal(baseSeo.canonicalUrl, 'https://example.com/blog');
    assert.equal(baseSeo.noIndex, false);
    assert.equal(baseSeo.isFiltered, false);

    // Paginated page 2 is self-canonical and indexable
    const page2Seo = buildListingSeoMetadata({
      baseCanonicalUrl: 'https://example.com/blog',
      searchParams: { page: '2' },
    });
    assert.equal(page2Seo.canonicalUrl, 'https://example.com/blog?page=2');
    assert.equal(page2Seo.noIndex, false);
    assert.equal(page2Seo.pageNumber, 2);

    // Filtered combination is marked noIndex
    const filteredSeo = buildListingSeoMetadata({
      baseCanonicalUrl: 'https://example.com/blog',
      searchParams: { blog_category: 'engineering', blog_q: 'perf' },
    });
    assert.equal(filteredSeo.noIndex, true);
    assert.equal(filteredSeo.isFiltered, true);
  });
});
