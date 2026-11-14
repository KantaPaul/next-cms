import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { block, page } from '../../builder-nodes';
import { POST_IMAGES } from '../../sections/builder-posts';
import { SEED_IMAGES } from '../../sections/pages';
import { mulberry32, rngInt, rngPick, rngShuffle } from '../../lib/rng';
import { createDemoSiteShell, type DemoUserRefs } from '../../lib/site';
import { insertLocalizedPages } from '../../lib/translate';

export const BLOG_SITE_ID = 'site_blog';

const CATEGORIES = [
  { name: 'Architecture', slug: 'architecture' },
  { name: 'Design Systems', slug: 'design-systems' },
  { name: 'Performance', slug: 'performance' },
  { name: 'Localization', slug: 'localization' },
  { name: 'Field Notes', slug: 'field-notes' },
  { name: 'Tooling', slug: 'tooling' },
];

const TAGS = [
  'nextjs', 'typescript', 'rtl', 'css', 'postgres', 'drizzle', 'accessibility',
  'caching', 'react', 'typography', 'editorial', 'static-export', 'seo', 'dx', 'testing',
];

const TOPIC_NOUNS = [
  'Logical CSS', 'Multi-Tenant Routing', 'Static Exports', 'Design Tokens',
  'RTL Typography', 'Incremental Rebuilds', 'Content Modeling', 'Edge Caching',
  'Accessible Dialogs', 'Form Validation', 'Image Pipelines', 'Editorial Workflows',
  'Zero-Runtime Styles', 'Search Indexing', 'Translation Groups', 'Component APIs',
];

const TOPIC_VERBS = [
  'Designing', 'Shipping', 'Scaling', 'Rethinking', 'Simplifying', 'Auditing', 'Testing', 'Migrating',
];

const IMAGES = [
  SEED_IMAGES.office,
  SEED_IMAGES.office,
  SEED_IMAGES.team,
  SEED_IMAGES.laptop,
  ...Object.values(POST_IMAGES),
];

export async function seedBlogSite(users: DemoUserRefs) {
  const { contactFormId } = await createDemoSiteShell({
    id: BLOG_SITE_ID,
    slug: 'blog',
    name: 'Field Notes',
    description: 'A calm editorial blog about building on the web.',
    themeTokens: {
      colors: {
        primary: '#C8553D',
        secondary: '#1B1B1F',
        background: '#FAF8F5',
        foreground: '#1B1B1F',
        muted: '#F1EDE6',
      } as never,
    },
    users,
    navLabels: {
      en: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      es: [
        { label: 'Inicio', href: '/' },
        { label: 'Acerca de', href: '/about' },
        { label: 'Contacto', href: '/contact' },
      ],
      ar: [
        { label: 'الرئيسية', href: '/' },
        { label: 'عن المدونة', href: '/about' },
        { label: 'تواصل', href: '/contact' },
      ],
    },
  });

  await insertLocalizedPages({
    siteId: BLOG_SITE_ID,
    authorId: users.authorId,
    isHome: true,
    isBlogIndex: true,
    translations: {
      en: {
        title: 'Field Notes',
        slug: 'home',
        description: 'Essays and practical notes on web architecture, design systems, and localization.',
        content: page([
          block('ReadingProgress', { color: '#C8553D', height: 3 }),
          block('Hero', {
            title: 'Field Notes on Building for the Web',
            subtitle: 'Calm, practical essays on multi-language architecture, design systems, and static publishing.',
            ctaLabel: 'Browse articles',
            ctaHref: '#latest',
          }),
          block('BlogPosts', { title: 'Latest notes', limit: 9, showCategoryFilter: true }),
          block('Newsletter', { title: 'Subscribe to Field Notes', subtitle: 'One thoughtful essay every two weeks.' }),
        ]),
      },
      es: {
        title: 'Field Notes — Español',
        slug: 'home',
        description: 'Ensayos prácticos sobre arquitectura web, sistemas de diseño y localización.',
        content: page([
          block('ReadingProgress', { color: '#C8553D', height: 3 }),
          block('Hero', {
            title: 'Notas de campo sobre desarrollo web',
            subtitle: 'Ensayos prácticos sobre arquitectura multilingüe, sistemas de diseño y publicación estática.',
            ctaLabel: 'Explorar artículos',
            ctaHref: '#latest',
          }),
          block('BlogPosts', { title: 'Últimas notas', limit: 9, showCategoryFilter: true }),
          block('Newsletter', { title: 'Suscríbete a Field Notes', subtitle: 'Un ensayo cada dos semanas.' }),
        ]),
      },
      ar: {
        title: 'مذكرات ميدانية',
        slug: 'home',
        description: 'مقالات عملية حول هندسة الويب وأنظمة التصميم والتعريب.',
        content: page([
          block('ReadingProgress', { color: '#C8553D', height: 3 }),
          block('Hero', {
            title: 'مذكرات ميدانية في بناء الويب',
            subtitle: 'مقالات هادئة وعملية حول المواقع متعددة اللغات وأنظمة التصميم والنشر السريع.',
            ctaLabel: 'تصفح المقالات',
            ctaHref: '#latest',
          }),
          block('BlogPosts', { title: 'أحدث المقالات', limit: 9, showCategoryFilter: true }),
          block('Newsletter', { title: 'اشترك في النشرة', subtitle: 'مقال واحد متعمق كل أسبوعين.' }),
        ]),
      },
    },
  });

  await insertLocalizedPages({
    siteId: BLOG_SITE_ID,
    authorId: users.authorId,
    translations: {
      en: {
        title: 'About Field Notes',
        slug: 'about',
        content: page([
          block('Heading', { text: 'About Field Notes', level: 'h1' }),
          block('RichText', {
            html: '<p>Field Notes is an independent publication exploring how small teams build durable, multilingual websites without unnecessary complexity.</p>',
          }),
        ]),
      },
      es: {
        title: 'Acerca de Field Notes',
        slug: 'about',
        content: page([
          block('Heading', { text: 'Acerca de Field Notes', level: 'h1' }),
          block('RichText', {
            html: '<p>Field Notes es una publicación independiente sobre cómo equipos pequeños crean sitios multilingües duraderos.</p>',
          }),
        ]),
      },
      ar: {
        title: 'عن مذكرات ميدانية',
        slug: 'about',
        content: page([
          block('Heading', { text: 'عن مذكرات ميدانية', level: 'h1' }),
          block('RichText', {
            html: '<p>مذكرات ميدانية نشرة مستقلة تستكشف كيف تبني الفرق الصغيرة مواقع ويب متعددة اللغات بمتانة وبساطة.</p>',
          }),
        ]),
      },
    },
  });

  await insertLocalizedPages({
    siteId: BLOG_SITE_ID,
    authorId: users.authorId,
    translations: {
      en: {
        title: 'Contact',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'Get in touch', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      es: {
        title: 'Contacto',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'Ponte en contacto', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      ar: {
        title: 'تواصل معنا',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'تواصل معنا', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
    },
  });

  const catIds: string[] = [];
  for (const c of CATEGORIES) {
    const id = createId();
    catIds.push(id);
    await db.insert(schema.categories).values({
      id,
      siteId: BLOG_SITE_ID,
      name: c.name,
      slug: c.slug,
      createdBy: users.adminId,
    });
  }

  const tagIds: string[] = [];
  for (const t of TAGS) {
    const id = createId();
    tagIds.push(id);
    await db.insert(schema.tags).values({
      id,
      siteId: BLOG_SITE_ID,
      name: t,
      slug: t,
      createdBy: users.adminId,
    });
  }

  const rng = mulberry32(20261114);
  const authors = [users.adminId, users.editorId, users.authorId, users.viewerId];
  const now = Date.now();
  const eighteenMonthsMs = 18 * 30 * 24 * 60 * 60 * 1000;

  let postCount = 0;
  for (let i = 1; i <= 40; i++) {
    const verb = rngPick(rng, TOPIC_VERBS);
    const noun = rngPick(rng, TOPIC_NOUNS);
    const title = `${verb} ${noun} #${i}`;
    const slug = `field-note-${i}-${noun.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const groupId = createId();
    const publishedAt = new Date(now - Math.floor(rng() * eighteenMonthsMs));
    const authorId = rngPick(rng, authors);
    const featuredImage = rngPick(rng, IMAGES);
    const catId = rngPick(rng, catIds);
    const chosenTags = rngShuffle(rng, tagIds).slice(0, rngInt(rng, 2, 4));
    const hasTranslations = i <= 24; // 60% translated, 40% English-only

    const makeBody = (loc: 'en' | 'es' | 'ar') => {
      const lead =
        loc === 'es'
          ? `<p>Notas prácticas sobre <strong>${noun}</strong> en sistemas reales.</p>`
          : loc === 'ar'
            ? `<p>ملاحظات عملية حول <strong>${noun}</strong> في الأنظمة الإنتاجية.</p>`
            : `<p>Practical observations on <strong>${noun}</strong> in production web applications.</p>`;
      const blocks = rngShuffle(rng, [
        block('RichText', { html: lead }),
        block('Callout', {
          variant: rngPick(rng, ['info', 'tip', 'warning'] as const),
          title: loc === 'es' ? 'Punto clave' : loc === 'ar' ? 'نقطة رئيسية' : 'Key takeaway',
          body: '<p>Keep layout direction logical and content models explicit.</p>',
        }),
        block('Code', {
          language: 'ts',
          code: `export const note${i} = {\n  topic: ${JSON.stringify(noun)},\n  locale: ${JSON.stringify(loc)},\n};`,
        }),
      ]);
      return page(blocks);
    };

    const enId = createId();
    await db.insert(schema.posts).values({
      id: enId,
      siteId: BLOG_SITE_ID,
      title,
      slug,
      excerpt: `A concise field note exploring ${noun.toLowerCase()}.`,
      featuredImage,
      language: 'en',
      translationGroupId: groupId,
      status: 'published',
      createdBy: authorId,
      publishedAt,
    });
    await db.insert(schema.postContents).values({
      postId: enId,
      canvas: makeBody('en') as never,
    });
    await db.insert(schema.postCategories).values({ postId: enId, categoryId: catId });
    for (const tid of chosenTags) {
      await db.insert(schema.postTags).values({ postId: enId, tagId: tid });
    }
    postCount++;

    if (i % 3 === 0) {
      await db.insert(schema.comments).values({
        id: createId(),
        siteId: BLOG_SITE_ID,
        postId: enId,
        authorName: 'Samira Haddad',
        authorEmail: 'samira@example.com',
        body: `Really helpful breakdown on ${noun}!`,
        status: 'approved',
      });
    }

    if (hasTranslations) {
      for (const loc of ['es', 'ar'] as const) {
        const locId = createId();
        const locTitle = loc === 'es' ? `${title} (ES)` : `${title} (AR)`;
        await db.insert(schema.posts).values({
          id: locId,
          siteId: BLOG_SITE_ID,
          title: locTitle,
          slug: `${slug}-${loc}`,
          excerpt: loc === 'es' ? `Nota sobre ${noun}.` : `مذكرة حول ${noun}.`,
          featuredImage,
          language: loc,
          translationGroupId: groupId,
          status: 'published',
          createdBy: authorId,
          publishedAt,
        });
        await db.insert(schema.postContents).values({
          postId: locId,
          canvas: makeBody(loc) as never,
        });
        postCount++;
      }
    }
  }

  console.info(`  [blog] Seeded Field Notes: ${postCount} posts`);
}
