import { describe, expect, it } from 'vitest';
import { resolveRoute } from '@/server/services/public-site.service';
import { normalizeSitePath, offerForPublishedPath } from '@/server/services/redirects.service';
import { buildEntrySchema, RESERVED_COLLECTION_SLUGS } from '@/server/services/collections.service';
import { getBlockComponents } from '@/builder/blocks/registry';

describe('R076: Ship Basics Vitest Suite', () => {
  describe('Public Route Resolution', () => {
    const mockSite = {
      defaultLocale: 'en',
      locales: [{ code: 'en' }, { code: 'fr' }, { code: 'es' }],
    };

    it('resolves home page on empty segments with default locale', () => {
      const route = resolveRoute([], mockSite);
      expect(route).toEqual({ language: 'en', slug: null });
    });

    it('resolves standard slug with default locale', () => {
      const route = resolveRoute(['about'], mockSite);
      expect(route).toEqual({ language: 'en', slug: 'about' });
    });

    it('resolves localized home page when segment matches alternate locale code', () => {
      const route = resolveRoute(['fr'], mockSite);
      expect(route).toEqual({ language: 'fr', slug: null });
    });

    it('resolves localized page with locale code and slug', () => {
      const route = resolveRoute(['fr', 'a-propos'], mockSite);
      expect(route).toEqual({ language: 'fr', slug: 'a-propos' });
    });

    it('returns null for deeper unsupported path combinations', () => {
      const route = resolveRoute(['fr', 'a-propos', 'extra-depth'], mockSite);
      expect(route).toBeNull();
    });
  });

  describe('Redirects and Path Normalization', () => {
    it('normalizes single leading slash and trims whitespace', () => {
      expect(normalizeSitePath('  /old-page  ')).toBe('/old-page');
    });

    it('strips trailing slashes from multi-character paths', () => {
      expect(normalizeSitePath('/news/article/')).toBe('/news/article');
      expect(normalizeSitePath('/')).toBe('/');
    });

    it('throws error on invalid paths without leading slash or with protocol', () => {
      expect(() => normalizeSitePath('old-page')).toThrow('Paths must start with a single /.');
      expect(() => normalizeSitePath('https://external.com')).toThrow();
      expect(() => normalizeSitePath('//double-slash')).toThrow();
    });

    it('offers redirect on slug change for published items', () => {
      const before = { status: 'published', slug: 'old-slug', language: 'en', isHome: false };
      const after = { status: 'published', slug: 'new-slug', language: 'en', isHome: false };

      const offer = offerForPublishedPath('page', before, after);
      expect(offer).toEqual({
        from: '/old-slug',
        to: '/new-slug',
      });
    });

    it('does not offer redirect when status is not published or path is unchanged', () => {
      const draft = { status: 'draft', slug: 'old-slug', language: 'en', isHome: false };
      const published = { status: 'published', slug: 'new-slug', language: 'en', isHome: false };
      expect(offerForPublishedPath('page', draft, published)).toBeNull();

      const same = { status: 'published', slug: 'same', language: 'en', isHome: false };
      expect(offerForPublishedPath('page', same, same)).toBeNull();
    });
  });

  describe('Collection Validation', () => {
    it('validates collection entry against dynamically built schema', () => {
      const fields = [
        {
          id: '1',
          collectionId: 'c1',
          key: 'title',
          label: 'Title',
          type: 'text' as const,
          required: true,
          position: 0,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: '2',
          collectionId: 'c1',
          key: 'price',
          label: 'Price',
          type: 'number' as const,
          required: false,
          position: 1,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: '3',
          collectionId: 'c1',
          key: 'featured',
          label: 'Featured',
          type: 'boolean' as const,
          required: false,
          position: 2,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const schema = buildEntrySchema(fields);

      const validData = {
        title: 'Product Alpha',
        price: 99.99,
        featured: true,
      };
      const parsed = schema.safeParse(validData);
      expect(parsed.success).toBe(true);

      const invalidData = {
        price: 'not-a-number', // invalid type
      };
      const failed = schema.safeParse(invalidData);
      expect(failed.success).toBe(false);
    });

    it('protects reserved collection slugs', () => {
      expect(RESERVED_COLLECTION_SLUGS).toContain('api');
      expect(RESERVED_COLLECTION_SLUGS).toContain('dashboard');
      expect(RESERVED_COLLECTION_SLUGS).toContain('blog');
      expect(RESERVED_COLLECTION_SLUGS).toContain('sitemap.xml');
    });
  });

  describe('Block Registry', () => {
    it('registers essential interactive, layout, marketing and container blocks', () => {
      const components = getBlockComponents();

      // Check interactive components (R001 / R002)
      expect(components.Slider).toBeDefined();
      expect(components.Tabs).toBeDefined();
      expect(components.Accordion).toBeDefined();

      // Check structural & layout components
      expect(components.Container).toBeDefined();
      expect(components.Columns).toBeDefined();
      expect(components.Hero).toBeDefined();
      expect(components.Features).toBeDefined();
      expect(components.ContactForm).toBeDefined();
      expect(components.Newsletter).toBeDefined();
    });

    it('exports all component render definitions as callable functions or components', () => {
      const components = getBlockComponents();
      for (const [key, comp] of Object.entries(components)) {
        expect(typeof comp).toBe('function');
      }
    });
  });
});
