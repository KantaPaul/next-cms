import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { block, page } from '../../builder-nodes';
import { POST_IMAGES } from '../../sections/builder-posts';
import { SEED_IMAGES } from '../../sections/pages';
import { createDemoSiteShell, type DemoUserRefs } from '../../lib/site';
import { insertLocalizedPages } from '../../lib/translate';

export const PORTFOLIO_SITE_ID = 'site_portfolio';

const PORT_IMG = Object.values(POST_IMAGES);
const PROJECTS = [
  { title: 'Kanso Identity', discipline: 'Branding', year: '2026', client: 'Kanso Labs', img: SEED_IMAGES.office },
  { title: 'Vespera OS', discipline: 'Product', year: '2026', client: 'Vespera', img: SEED_IMAGES.laptop },
  { title: 'Solstice Monograph', discipline: 'Editorial', year: '2025', client: 'Solstice Press', img: SEED_IMAGES.office },
  { title: 'Kinetic Reel', discipline: 'Motion', year: '2025', client: 'Kinetic', img: SEED_IMAGES.team },
  { title: 'Forma Design System', discipline: 'Product', year: '2025', client: 'Forma', img: PORT_IMG[0] ?? SEED_IMAGES.office },
  { title: 'Atelier Nord', discipline: 'Branding', year: '2025', client: 'Atelier Nord', img: PORT_IMG[1] ?? SEED_IMAGES.office },
  { title: 'Chronicle Issue 04', discipline: 'Editorial', year: '2024', client: 'Chronicle', img: PORT_IMG[2] ?? SEED_IMAGES.laptop },
  { title: 'Pulse Audio UI', discipline: 'Product', year: '2024', client: 'Pulse', img: PORT_IMG[3] ?? SEED_IMAGES.team },
  { title: 'Mirage Type Specimen', discipline: 'Editorial', year: '2024', client: 'Mirage Foundry', img: SEED_IMAGES.office },
  { title: 'Sora Titles', discipline: 'Motion', year: '2024', client: 'Sora Film', img: SEED_IMAGES.laptop },
  { title: 'Lumen Architecture', discipline: 'Branding', year: '2023', client: 'Lumen', img: SEED_IMAGES.office },
  { title: 'Harbor Mobile', discipline: 'Product', year: '2023', client: 'Harbor', img: SEED_IMAGES.team },
];

export async function seedPortfolioSite(users: DemoUserRefs) {
  const { contactFormId } = await createDemoSiteShell({
    id: PORTFOLIO_SITE_ID,
    slug: 'portfolio',
    name: 'Ava Lin',
    description: 'Product designer & art director crafting calm digital systems.',
    themeTokens: {
      colors: {
        primary: '#18181B',
        secondary: '#71717A',
        background: '#FFFFFF',
        foreground: '#18181B',
        muted: '#F4F4F5',
      } as never,
    },
    users,
    navLabels: {
      en: [
        { label: 'Home', href: '/' },
        { label: 'Work', href: '/work' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      es: [
        { label: 'Inicio', href: '/' },
        { label: 'Proyectos', href: '/work' },
        { label: 'Sobre mí', href: '/about' },
        { label: 'Contacto', href: '/contact' },
      ],
      ar: [
        { label: 'الرئيسية', href: '/' },
        { label: 'الأعمال', href: '/work' },
        { label: 'نبذة عني', href: '/about' },
        { label: 'تواصل', href: '/contact' },
      ],
    },
  });

  const gridItems = PROJECTS.map((p, i) => ({
    id: `proj-${i + 1}`,
    title: p.title,
    href: `/portfolio/projects/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    image: p.img,
    discipline: p.discipline,
    year: p.year,
  }));

  await insertLocalizedPages({
    siteId: PORTFOLIO_SITE_ID,
    authorId: users.adminId,
    isHome: true,
    translations: {
      en: {
        title: 'Ava Lin — Product Designer & Art Director',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'Ava Lin — Product Designer & Art Director',
            subtitle: 'Designing calm, typographic products and brand systems from Taipei and Lisbon.',
            ctaLabel: 'View all work',
            ctaHref: '/portfolio/work',
          }),
          block('PortfolioGrid', { columns: 3, projects: gridItems.slice(0, 6) }),
        ]),
      },
      es: {
        title: 'Ava Lin — Diseñadora de Producto',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'Ava Lin — Diseñadora de Producto y Directora de Arte',
            subtitle: 'Creando productos tipográficos y sistemas de marca serenos.',
            ctaLabel: 'Ver proyectos',
            ctaHref: '/portfolio/es/work',
          }),
          block('PortfolioGrid', { columns: 3, projects: gridItems.slice(0, 6) }),
        ]),
      },
      ar: {
        title: 'آفا لين — مصممة منتجات ومديرة فنية',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'آفا لين — مصممة منتجات ومديرة فنية',
            subtitle: 'تصميم منتجات رقمية هادئة وأنظمة هوية بصرية.',
            ctaLabel: 'عرض الأعمال',
            ctaHref: '/portfolio/ar/work',
          }),
          block('PortfolioGrid', { columns: 3, projects: gridItems.slice(0, 6) }),
        ]),
      },
    },
  });

  await insertLocalizedPages({
    siteId: PORTFOLIO_SITE_ID,
    authorId: users.adminId,
    translations: {
      en: {
        title: 'Work',
        slug: 'work',
        content: page([
          block('Heading', { text: 'Selected Work', level: 'h1' }),
          block('PortfolioGrid', { columns: 3, projects: gridItems }),
        ]),
      },
      es: {
        title: 'Proyectos',
        slug: 'work',
        content: page([
          block('Heading', { text: 'Proyectos seleccionados', level: 'h1' }),
          block('PortfolioGrid', { columns: 3, projects: gridItems }),
        ]),
      },
      ar: {
        title: 'الأعمال',
        slug: 'work',
        content: page([
          block('Heading', { text: 'أعمال مختارة', level: 'h1' }),
          block('PortfolioGrid', { columns: 3, projects: gridItems }),
        ]),
      },
    },
  });

  await insertLocalizedPages({
    siteId: PORTFOLIO_SITE_ID,
    authorId: users.adminId,
    translations: {
      en: {
        title: 'About Ava Lin',
        slug: 'about',
        content: page([
          block('Heading', { text: 'About', level: 'h1' }),
          block('RichText', {
            html: '<p>Ava Lin is an independent product designer and art director with 10+ years partnering with studios and founders.</p>',
          }),
        ]),
      },
      es: {
        title: 'Sobre mí',
        slug: 'about',
        content: page([
          block('Heading', { text: 'Sobre mí', level: 'h1' }),
          block('RichText', {
            html: '<p>Ava Lin es diseñadora de producto independiente con más de 10 años de experiencia.</p>',
          }),
        ]),
      },
      ar: {
        title: 'نبذة عني',
        slug: 'about',
        content: page([
          block('Heading', { text: 'نبذة عني', level: 'h1' }),
          block('RichText', {
            html: '<p>آفا لين مصممة منتجات مستقلة ومديرة فنية بخبرة تتجاوز 10 سنوات.</p>',
          }),
        ]),
      },
    },
  });

  await insertLocalizedPages({
    siteId: PORTFOLIO_SITE_ID,
    authorId: users.adminId,
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
          block('Heading', { text: 'Contacto', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      ar: {
        title: 'تواصل',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'تواصل معي', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
    },
  });

  const projectsColId = createId();
  await db.insert(schema.collections).values({
    id: projectsColId,
    siteId: PORTFOLIO_SITE_ID,
    name: 'Projects',
    singularName: 'Project',
    slug: 'projects',
    description: 'Portfolio case studies.',
  });

  const taxId = createId();
  await db.insert(schema.collectionTaxonomies).values({
    id: taxId,
    collectionId: projectsColId,
    name: 'Discipline',
    key: 'discipline',
  });

  const termIds: Record<string, string> = {};
  for (const d of ['Branding', 'Product', 'Motion', 'Editorial']) {
    const tid = createId();
    termIds[d] = tid;
    await db.insert(schema.collectionTerms).values({
      id: tid,
      taxonomyId: taxId,
      name: d,
      slug: d.toLowerCase(),
    });
  }

  for (const proj of PROJECTS) {
    const groupId = createId();
    const baseSlug = proj.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    for (const loc of ['en', 'es', 'ar'] as const) {
      const entryId = createId();
      await db.insert(schema.collectionEntries).values({
        id: entryId,
        collectionId: projectsColId,
        slug: loc === 'en' ? baseSlug : `${baseSlug}-${loc}`,
        language: loc,
        translationGroupId: groupId,
        status: 'published',
        authorId: users.adminId,
        data: {
          title: proj.title,
          client: proj.client,
          year: proj.year,
          discipline: proj.discipline,
          image: proj.img,
        },
        publishedAt: new Date(),
      });
      await db.insert(schema.collectionEntryTerms).values({
        entryId,
        termId: termIds[proj.discipline],
      });
    }
  }

  console.info(`  [portfolio] Seeded Ava Lin Portfolio (${PROJECTS.length} projects)`);
}
