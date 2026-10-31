import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import {
  APPROVED_DYNAMIC_SOURCES,
  createDynamicBinding,
  dynamicBindingSchema,
  isDynamicBinding,
} from '../dynamic';
import {
  applyTransform,
  getPathValue,
  resolveDynamicDocument,
  resolveDynamicProps,
  resolveDynamicValue,
  sanitizeDynamicUrl,
  type DynamicContext,
} from '../dynamic-resolver';
import {
  DEFAULT_GLOBAL_COLORS,
  DEFAULT_THEME_TOKENS,
  DEFAULT_TYPOGRAPHY_PRESETS,
  resolveTokenValue,
  type ThemeTokens,
} from '../theme';
import { normalizeBuilderDocument, normalizeProps } from '../normalize';
import { DOCUMENT_VERSION, type BuilderDocument } from '../document';

describe('Dynamic Content & Global Styles (BLD-21–31, BLD-36–38)', () => {
  describe('Dynamic content schema & validation (R414 / BLD-22)', () => {
    it('validates safe dynamic binding shapes', () => {
      const valid = createDynamicBinding('page', 'title', 'Default Title');
      const parsed = dynamicBindingSchema.safeParse(valid);
      assert.equal(parsed.success, true);
      assert.equal(isDynamicBinding(valid), true);
    });

    it('rejects disallowed prototype pollution paths', () => {
      const dangerous = {
        $dynamic: 'page',
        path: '__proto__.polluted',
      };
      const parsed = dynamicBindingSchema.safeParse(dangerous);
      assert.equal(parsed.success, false);
    });

    it('exposes approved CMS dynamic sources with typed fields', () => {
      assert.ok(APPROVED_DYNAMIC_SOURCES.page);
      assert.ok(APPROVED_DYNAMIC_SOURCES.post);
      assert.ok(APPROVED_DYNAMIC_SOURCES.site);
      assert.ok(APPROVED_DYNAMIC_SOURCES.author);

      const pageFields = APPROVED_DYNAMIC_SOURCES.page.fields.map(f => f.key);
      assert.ok(pageFields.includes('title'));
      assert.ok(pageFields.includes('slug'));
      assert.ok(pageFields.includes('seoTitle'));

      const postFields = APPROVED_DYNAMIC_SOURCES.post.fields.map(f => f.key);
      assert.ok(postFields.includes('title'));
      assert.ok(postFields.includes('authorName'));
      assert.ok(postFields.includes('featuredImage'));
    });
  });

  describe('Dynamic content resolver & security (R416, R417 / BLD-24, BLD-25)', () => {
    const context: DynamicContext = {
      siteId: 'site-123',
      language: 'en',
      page: {
        title: 'Home Page',
        slug: 'home',
        seoTitle: 'Welcome to Antigravity CMS',
      },
      post: {
        title: 'Announcing v1.0',
        slug: 'announcing-v1',
        excerpt: 'We are thrilled to launch today.',
        authorName: 'Ada Lovelace',
        publishedAt: '2026-10-31T12:00:00Z',
      },
      site: {
        name: 'My Awesome Company',
        url: 'https://example.com',
      },
      author: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      },
      custom: {
        bannerText: 'Special Sale Today!',
      },
    };

    it('resolves page, post, site, author, and custom dynamic bindings', () => {
      assert.equal(
        resolveDynamicValue(createDynamicBinding('page', 'title'), context),
        'Home Page'
      );
      assert.equal(
        resolveDynamicValue(createDynamicBinding('post', 'authorName'), context),
        'Ada Lovelace'
      );
      assert.equal(
        resolveDynamicValue(createDynamicBinding('site', 'name'), context),
        'My Awesome Company'
      );
      assert.equal(
        resolveDynamicValue(createDynamicBinding('author', 'email'), context),
        'ada@example.com'
      );
      assert.equal(
        resolveDynamicValue(createDynamicBinding('custom', 'bannerText'), context),
        'Special Sale Today!'
      );
    });

    it('falls back to fallback value when source or path is missing', () => {
      const bindingWithFallback = createDynamicBinding(
        'page',
        'nonexistent',
        'Fallback Page Value'
      );
      assert.equal(
        resolveDynamicValue(bindingWithFallback, context),
        'Fallback Page Value'
      );

      const missingSource = createDynamicBinding(
        'unknownSource',
        'field',
        'Safe Default'
      );
      assert.equal(resolveDynamicValue(missingSource, context), 'Safe Default');
    });

    it('blocks prototype pollution lookups via getPathValue', () => {
      assert.equal(getPathValue(context, '__proto__.polluted'), undefined);
      assert.equal(getPathValue(context, 'constructor.prototype'), undefined);
    });

    it('sanitizes dangerous javascript: and data: URLs in dynamic bindings', () => {
      const dangerousCtx: DynamicContext = {
        site: {
          badLink: 'javascript:alert(1)',
          goodLink: 'https://example.com/about',
        },
      };

      const resolvedBad = resolveDynamicValue(
        createDynamicBinding('site', 'badLink', 'https://fallback.com'),
        dangerousCtx
      );
      assert.equal(resolvedBad, 'https://fallback.com');

      const resolvedGood = resolveDynamicValue(
        createDynamicBinding('site', 'goodLink'),
        dangerousCtx
      );
      assert.equal(resolvedGood, 'https://example.com/about');
    });

    it('applies text transforms (uppercase, lowercase, titlecase, slug, date)', () => {
      assert.equal(applyTransform('hello world', 'uppercase'), 'HELLO WORLD');
      assert.equal(applyTransform('HELLO WORLD', 'lowercase'), 'hello world');
      assert.equal(applyTransform('hello world', 'titlecase'), 'Hello World');
      assert.equal(applyTransform('Hello World! 2026', 'slug'), 'hello-world-2026');
      assert.equal(applyTransform('2026-10-31T12:00:00Z', 'date'), 'Oct 31, 2026');
    });

    it('breaks recursion loops within MAX_RESOLUTION_DEPTH', () => {
      const cyclicCtx: DynamicContext = {
        page: {
          loop: createDynamicBinding('page', 'loop', 'Fallback on loop'),
        },
      };
      const result = resolveDynamicValue(
        createDynamicBinding('page', 'loop', 'Fallback on loop'),
        cyclicCtx
      );
      assert.equal(result, 'Fallback on loop');
    });

    it('resolves dynamic bindings recursively throughout props and documents', () => {
      const props = {
        title: createDynamicBinding('page', 'title'),
        button: {
          label: createDynamicBinding('site', 'name'),
          link: '/contact',
        },
        items: [
          { text: createDynamicBinding('post', 'authorName') },
          { text: 'Static item' },
        ],
      };

      const resolvedProps = resolveDynamicProps(props, context);
      assert.equal(resolvedProps.title, 'Home Page');
      assert.deepEqual(resolvedProps.button, {
        label: 'My Awesome Company',
        link: '/contact',
      });
      assert.deepEqual(resolvedProps.items, [
        { text: 'Ada Lovelace' },
        { text: 'Static item' },
      ]);
    });

    it('resolves dynamic props on an entire BuilderDocument', () => {
      const doc: BuilderDocument = {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        nodes: {
          hero1: {
            id: 'hero1',
            type: 'Hero',
            props: {
              title: createDynamicBinding('page', 'title'),
              subtitle: 'Static subtitle',
            },
            slots: {},
          },
        },
        rootSlot: ['hero1'],
      };

      const resolvedDoc = resolveDynamicDocument(doc, context);
      assert.equal(resolvedDoc.nodes.hero1.props.title, 'Home Page');
      assert.equal(resolvedDoc.nodes.hero1.props.subtitle, 'Static subtitle');
    });
  });

  describe('Global Design Tokens & Typography (R419, R420, R421, R423 / BLD-27–31)', () => {
    it('defines default global color tokens and typography presets', () => {
      assert.equal(DEFAULT_GLOBAL_COLORS.primary, '#4f46e5');
      assert.equal(DEFAULT_GLOBAL_COLORS.accent, '#0ea5e9');
      assert.equal(DEFAULT_GLOBAL_COLORS.text, '#0f172a');
      assert.equal(DEFAULT_GLOBAL_COLORS.background, '#ffffff');

      assert.ok(DEFAULT_TYPOGRAPHY_PRESETS.length >= 5);
      const h1 = DEFAULT_TYPOGRAPHY_PRESETS.find(p => p.id === 'h1');
      assert.ok(h1);
      assert.equal(h1?.name, 'Heading 1');
    });

    it('resolves global token references to their defined values', () => {
      const tokens: ThemeTokens = {
        ...DEFAULT_THEME_TOKENS,
        primaryColor: '#2563eb',
        accentColor: '#10b981',
        colors: {
          ...DEFAULT_GLOBAL_COLORS,
          primary: '#2563eb',
          accent: '#10b981',
          custom: [
            { id: 'brand-gold', name: 'Brand Gold', value: '#f59e0b' },
          ],
        },
      };

      assert.equal(resolveTokenValue('token:primary', tokens), '#2563eb');
      assert.equal(resolveTokenValue('token:accent', tokens), '#10b981');
      assert.equal(resolveTokenValue('token:brand-gold', tokens), '#f59e0b');
      // Plain hex returns as-is
      assert.equal(resolveTokenValue('#ff0000', tokens), '#ff0000');
    });

    it('falls back gracefully when a referenced token is missing or deleted', () => {
      const tokens: ThemeTokens = {
        ...DEFAULT_THEME_TOKENS,
        colors: {
          ...DEFAULT_GLOBAL_COLORS,
          custom: [], // custom token deleted
        },
      };

      // Missing custom token falls back safely to provided fallback without crashing
      const resolved = resolveTokenValue('token:deleted-token', tokens, '#0f172a');
      assert.equal(resolved, '#0f172a');
    });
  });

  describe('Migration & normalization for legacy values (R428 / BLD-36)', () => {
    it('preserves legacy static documents unchanged', () => {
      const legacyDoc: BuilderDocument = {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        nodes: {
          box: {
            id: 'box',
            type: 'Hero',
            props: { title: 'Legacy Title', count: 42 },
            slots: {},
          },
        },
        rootSlot: ['box'],
      };

      const normalized = normalizeBuilderDocument(legacyDoc);
      assert.deepEqual(normalized, legacyDoc);
    });

    it('normalizes dynamic bindings and caches token fallbacks', () => {
      const props = {
        color: 'token:primary',
        title: { $dynamic: 'page', path: 'title' },
      };

      const normalized = normalizeProps(props, DEFAULT_THEME_TOKENS);
      assert.equal(normalized.color, 'token:primary');
      assert.equal(normalized._color_fallback, '#4f46e5');
      assert.deepEqual(normalized.title, { $dynamic: 'page', path: 'title' });
    });
  });
});
