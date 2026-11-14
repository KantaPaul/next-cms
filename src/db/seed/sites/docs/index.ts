import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { block, page } from '../../builder-nodes';
import { createDemoSiteShell, type DemoUserRefs } from '../../lib/site';
import { insertLocalizedPages } from '../../lib/translate';

export const DOCS_SITE_ID = 'site_docs';

const CONTENT_DIR = path.resolve(
  process.cwd(),
  'src/db/seed/sites/docs/content/en'
);

export async function seedDocsSite(users: DemoUserRefs) {
  const { contactFormId } = await createDemoSiteShell({
    id: DOCS_SITE_ID,
    slug: 'docs',
    name: 'Meridian Docs',
    description: 'Official documentation for Meridian CMS & Visual Builder.',
    themeTokens: {
      colors: {
        primary: '#3B3FD8',
        secondary: '#0F172A',
        background: '#FFFFFF',
        foreground: '#0F172A',
        muted: '#F1F5F9',
      } as never,
    },
    users,
    navLabels: {
      en: [
        { label: 'Docs', href: '/' },
        { label: 'Builder Guide', href: '/builder-blocks' },
        { label: 'Admin Guide', href: '/admin-guide' },
        { label: 'Developers', href: '/developers-api' },
        { label: 'Contact', href: '/contact' },
      ],
      es: [
        { label: 'Documentación', href: '/' },
        { label: 'Constructor', href: '/builder-blocks' },
        { label: 'Administración', href: '/admin-guide' },
        { label: 'Desarrolladores', href: '/developers-api' },
        { label: 'Contacto', href: '/contact' },
      ],
      ar: [
        { label: 'التوثيق', href: '/' },
        { label: 'دليل المحرر', href: '/builder-blocks' },
        { label: 'دليل الإدارة', href: '/admin-guide' },
        { label: 'المطورون', href: '/developers-api' },
        { label: 'تواصل', href: '/contact' },
      ],
    },
  });

  const mdFiles = existsSync(CONTENT_DIR)
    ? readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort()
    : [];

  const sidebarItems = mdFiles.map((file, idx) => {
    const slug = file.replace(/\.md$/, '');
    const title = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      id: `doc-${idx + 1}`,
      title,
      href: `/docs/${slug}`,
    };
  });

  await insertLocalizedPages({
    siteId: DOCS_SITE_ID,
    authorId: users.adminId,
    isHome: true,
    translations: {
      en: {
        title: 'Meridian Documentation',
        slug: 'home',
        content: page([
          block('ReadingProgress', { color: '#3B3FD8', height: 3 }),
          block('Hero', {
            title: 'Meridian Documentation',
            subtitle: 'Everything you need to build, localize, and export multi-site experiences.',
            ctaLabel: 'Get started',
            ctaHref: '/docs/getting-started',
          }),
          block('DocSearch', { placeholder: 'Search Meridian docs...' }),
          block('Steps', {
            items: [
              { title: 'Create a site', body: 'Configure locales, domains, and theme tokens.' },
              { title: 'Design with blocks', body: 'Assemble responsive, RTL-ready pages visually.' },
              { title: 'Export or self-host', body: 'Deploy static exports with live CMS form endpoints.' },
            ],
          }),
          block('Callout', {
            variant: 'tip',
            title: 'Keyboard shortcut',
            body: 'Press <kbd>⌘K</kbd> anywhere in the docs to jump to any guide.',
          }),
        ]),
      },
      es: {
        title: 'Documentación de Meridian',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'Documentación de Meridian',
            subtitle: 'Todo lo que necesitas para crear, localizar y exportar sitios.',
            ctaLabel: 'Comenzar',
            ctaHref: '/docs/es/getting-started',
          }),
          block('DocSearch', { placeholder: 'Buscar en la documentación...' }),
        ]),
      },
      ar: {
        title: 'توثيق ميريديان',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'توثيق نظام ميريديان',
            subtitle: 'كل ما تحتاجه لبناء المواقع متعددة اللغات وتصديرها.',
            ctaLabel: 'ابدأ الآن',
            ctaHref: '/docs/ar/getting-started',
          }),
          block('DocSearch', { placeholder: 'ابحث في التوثيق...' }),
        ]),
      },
    },
  });

  // Create hierarchical `docs` and `changelog` post types
  const docsColId = createId();
  await db.insert(schema.collections).values({
    id: docsColId,
    siteId: DOCS_SITE_ID,
    name: 'Docs',
    singularName: 'Doc',
    slug: 'docs',
    description: 'Hierarchical product documentation.',
  });

  const changelogColId = createId();
  await db.insert(schema.collections).values({
    id: changelogColId,
    siteId: DOCS_SITE_ID,
    name: 'Changelog',
    singularName: 'Release',
    slug: 'changelog',
    description: 'Product release notes.',
  });

  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i];
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const title = raw.split('\n')[0]?.replace(/^#\s*/, '').trim() || slug;
    const prev = i > 0 ? sidebarItems[i - 1] : null;
    const next = i < sidebarItems.length - 1 ? sidebarItems[i + 1] : null;

    await insertLocalizedPages({
      siteId: DOCS_SITE_ID,
      authorId: users.adminId,
      translations: {
        en: {
          title,
          slug,
          content: page([
            block('Breadcrumbs', {}),
            block('DocsSidebar', { items: sidebarItems, currentHref: `/docs/${slug}` }),
            block('RichText', { html: `<pre style="white-space:pre-wrap">${raw}</pre>` }),
            block('DocsPager', { prev, next }),
          ]),
        },
        es: {
          title: `${title} (ES)`,
          slug,
          content: page([
            block('DocsSidebar', { items: sidebarItems, currentHref: `/docs/es/${slug}` }),
            block('RichText', { html: `<pre style="white-space:pre-wrap">${raw}</pre>` }),
          ]),
        },
        ar: {
          title: `${title} (AR)`,
          slug,
          content: page([
            block('DocsSidebar', { items: sidebarItems, currentHref: `/docs/ar/${slug}` }),
            block('RichText', { html: `<pre style="white-space:pre-wrap">${raw}</pre>` }),
          ]),
        },
      },
    });

    const groupId = createId();
    for (const loc of ['en', 'es', 'ar'] as const) {
      await db.insert(schema.collectionEntries).values({
        id: createId(),
        collectionId: docsColId,
        slug: loc === 'en' ? slug : `${slug}-${loc}`,
        language: loc,
        translationGroupId: groupId,
        status: 'published',
        authorId: users.adminId,
        data: { title, body: raw, menuOrder: i + 1 },
        publishedAt: new Date(),
      });
    }
  }

  await insertLocalizedPages({
    siteId: DOCS_SITE_ID,
    authorId: users.adminId,
    translations: {
      en: {
        title: 'Contact Docs Team',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'Documentation feedback', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      es: {
        title: 'Contacto',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'Comentarios sobre la documentación', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      ar: {
        title: 'تواصل',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'ملاحظات التوثيق', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
    },
  });

  console.info(`  [docs] Seeded Meridian Docs (${mdFiles.length} doc pages)`);
}
