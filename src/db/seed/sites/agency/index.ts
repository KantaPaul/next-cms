import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { block, page } from '../../builder-nodes';
import { SEED_IMAGES } from '../../sections/pages';
import { createDemoSiteShell, type DemoUserRefs } from '../../lib/site';
import { insertLocalizedPages } from '../../lib/translate';

export const AGENCY_SITE_ID = 'site_agency';

export async function seedAgencySite(users: DemoUserRefs) {
  const { contactFormId } = await createDemoSiteShell({
    id: AGENCY_SITE_ID,
    slug: 'agency',
    name: 'Northwind Studio',
    description: 'A bold digital product & brand engineering agency.',
    themeTokens: {
      colors: {
        primary: '#C6F432',
        secondary: '#0E0F12',
        background: '#FFFFFF',
        foreground: '#0E0F12',
        muted: '#F4F4F5',
      } as never,
    },
    users,
    navLabels: {
      en: [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/services' },
        { label: 'Work', href: '/work' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      es: [
        { label: 'Inicio', href: '/' },
        { label: 'Servicios', href: '/services' },
        { label: 'Proyectos', href: '/work' },
        { label: 'Nosotros', href: '/about' },
        { label: 'Contacto', href: '/contact' },
      ],
      ar: [
        { label: 'الرئيسية', href: '/' },
        { label: 'الخدمات', href: '/services' },
        { label: 'الأعمال', href: '/work' },
        { label: 'من نحن', href: '/about' },
        { label: 'تواصل', href: '/contact' },
      ],
    },
  });

  await insertLocalizedPages({
    siteId: AGENCY_SITE_ID,
    authorId: users.adminId,
    isHome: true,
    translations: {
      en: {
        title: 'Northwind Studio',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'Digital products built for global scale.',
            subtitle: 'Strategy, design systems, and full-stack engineering for ambitious teams.',
            ctaLabel: 'Start a project',
            ctaHref: '/agency/contact',
          }),
          block('LogoCloud', { title: 'Trusted by product teams worldwide' }),
          block('Stats', {
            items: [
              { value: '120+', label: 'Launches' },
              { value: '14', label: 'Countries' },
              { value: '9 yrs', label: 'In business' },
            ],
          }),
          block('BeforeAfter', {
            beforeImage: SEED_IMAGES.office,
            afterImage: SEED_IMAGES.office,
            beforeLabel: 'Legacy UI',
            afterLabel: 'Redesigned',
          }),
          block('Testimonials', { title: 'What clients say' }),
          block('CTA', {
            title: 'Ready to ship your next release?',
            ctaLabel: 'Book a discovery call',
            ctaHref: '/agency/contact',
          }),
        ]),
      },
      es: {
        title: 'Northwind Studio — Inicio',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'Productos digitales creados a escala global.',
            subtitle: 'Estrategia, sistemas de diseño e ingeniería full-stack para equipos ambiciosos.',
            ctaLabel: 'Iniciar proyecto',
            ctaHref: '/agency/es/contact',
          }),
          block('Stats', {
            items: [
              { value: '120+', label: 'Lanzamientos' },
              { value: '14', label: 'Países' },
              { value: '9 años', label: 'Experiencia' },
            ],
          }),
          block('CTA', {
            title: '¿Listo para lanzar tu próximo producto?',
            ctaLabel: 'Hablemos',
            ctaHref: '/agency/es/contact',
          }),
        ]),
      },
      ar: {
        title: 'استوديو نورث ويند',
        slug: 'home',
        content: page([
          block('Hero', {
            title: 'منتجات رقمية مصممة للتوسع العالمي.',
            subtitle: 'استراتيجية، أنظمة تصميم، وهندسة برمجية متكاملة للفرق الطموحة.',
            ctaLabel: 'ابدأ مشروعك',
            ctaHref: '/agency/ar/contact',
          }),
          block('Stats', {
            items: [
              { value: '120+', label: 'إطلاقاً' },
              { value: '14', label: 'دولة' },
              { value: '9', label: 'سنوات خبرة' },
            ],
          }),
          block('CTA', {
            title: 'هل أنت مستعد لإطلاق منتجك القادم؟',
            ctaLabel: 'تواصل معنا',
            ctaHref: '/agency/ar/contact',
          }),
        ]),
      },
    },
  });

  const innerPages: Array<{ slug: string; en: string; es: string; ar: string }> = [
    { slug: 'about', en: 'About Northwind', es: 'Sobre Northwind', ar: 'عن الاستوديو' },
    { slug: 'services', en: 'Services', es: 'Servicios', ar: 'الخدمات' },
    { slug: 'work', en: 'Selected Work', es: 'Trabajo Destacado', ar: 'أعمالنا' },
    { slug: 'team', en: 'Our Team', es: 'Nuestro Equipo', ar: 'فريق العمل' },
    { slug: 'careers', en: 'Careers', es: 'Carreras', ar: 'الوظائف' },
  ];

  for (const p of innerPages) {
    await insertLocalizedPages({
      siteId: AGENCY_SITE_ID,
      authorId: users.adminId,
      translations: {
        en: {
          title: p.en,
          slug: p.slug,
          content: page([
            block('Heading', { text: p.en, level: 'h1' }),
            block('RichText', { html: `<p>Explore ${p.en.toLowerCase()} at Northwind Studio.</p>` }),
          ]),
        },
        es: {
          title: p.es,
          slug: p.slug,
          content: page([
            block('Heading', { text: p.es, level: 'h1' }),
            block('RichText', { html: `<p>Descubre ${p.es.toLowerCase()} en Northwind Studio.</p>` }),
          ]),
        },
        ar: {
          title: p.ar,
          slug: p.slug,
          content: page([
            block('Heading', { text: p.ar, level: 'h1' }),
            block('RichText', { html: `<p>تعرف على ${p.ar} في استوديو نورث ويند.</p>` }),
          ]),
        },
      },
    });
  }

  await insertLocalizedPages({
    siteId: AGENCY_SITE_ID,
    authorId: users.adminId,
    translations: {
      en: {
        title: 'Contact Northwind',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'Start a conversation', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      es: {
        title: 'Contacto',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'Hablemos de tu proyecto', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
      ar: {
        title: 'تواصل معنا',
        slug: 'contact',
        content: page([
          block('Heading', { text: 'ابدأ محادثة معنا', level: 'h1' }),
          block('GlobalRef', { globalId: contactFormId }),
        ]),
      },
    },
  });

  // Post types: services, case-studies, team, testimonials
  const collections = [
    { slug: 'services', name: 'Services', singular: 'Service', items: ['Product Strategy', 'Design Systems', 'Web Engineering', 'Localization & RTL'] },
    { slug: 'case-studies', name: 'Case Studies', singular: 'Case Study', items: ['Fintech Core', 'Atlas Commerce', 'Pulse Health', 'Kinetix Cloud', 'Verve Media', 'Orbit Analytics'] },
    { slug: 'team', name: 'Team', singular: 'Member', items: ['Elena Rostova', 'Marco Silva', 'Tariq Mansour', 'Hannah Cho'] },
    { slug: 'testimonials', name: 'Testimonials', singular: 'Testimonial', items: ['Stripe Partner', 'Linear Ops', 'Vercel Studio', 'Figma Enterprise'] },
  ];

  for (const col of collections) {
    const colId = createId();
    await db.insert(schema.collections).values({
      id: colId,
      siteId: AGENCY_SITE_ID,
      name: col.name,
      singularName: col.singular,
      slug: col.slug,
      description: `${col.name} for Northwind Studio.`,
    });

    for (const itemName of col.items) {
      const groupId = createId();
      const baseSlug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (const loc of ['en', 'es', 'ar'] as const) {
        await db.insert(schema.collectionEntries).values({
          id: createId(),
          collectionId: colId,
          slug: loc === 'en' ? baseSlug : `${baseSlug}-${loc}`,
          language: loc,
          translationGroupId: groupId,
          status: 'published',
          authorId: users.adminId,
          data: {
            title: loc === 'en' ? itemName : `${itemName} (${loc.toUpperCase()})`,
            summary: `${itemName} — Northwind Studio (${loc})`,
          },
          publishedAt: new Date(),
        });
      }
    }
  }

  console.info('  [agency] Seeded Northwind Studio');
}
