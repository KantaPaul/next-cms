/**
 * Post types (collections) for the demo site, each using the features a
 * post type can have: fields, taxonomies with terms, a default single
 * template, a collection block, published/draft entries, Spanish
 * translations, and one entry with its own custom layout.
 */
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import type { BuilderData } from '@/builder/data';
import type { PostTypeSupports } from '@/config/post-types';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { assertValid, block, page } from '../builder-nodes';
import { POST_IMAGES } from './builder-posts';

const portrait = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70`;

const PORTRAITS = {
  ava: portrait('photo-1494790108377-be9c29b29330'),
  leo: portrait('photo-1500648767791-00dcc994a43e'),
  sara: portrait('photo-1438761681033-6461ffad8d80'),
  kenji: portrait('photo-1507003211169-0a1dd7228f2d'),
  maya: portrait('photo-1544005313-94ddf0286df2'),
  omar: portrait('photo-1506794778202-cad84cf45f1d'),
};

type FieldType = (typeof schema.collectionFieldTypeEnum.enumValues)[number];
type EntryStatus = (typeof schema.collectionEntryStatusEnum.enumValues)[number];

type TaxonomyDef = {
  key: string;
  name: string;
  singularName: string;
  hierarchical?: boolean;
  terms: { name: string; slug: string; description?: string }[];
};

type EntryDef = {
  slug: string;
  data: Record<string, unknown>;
  status?: EntryStatus;
  excerpt?: string;
  featuredImage?: string;
  /** Term slugs per taxonomy key. */
  terms?: Record<string, string[]>;
  /** Spanish translation of this entry. */
  es?: { slug: string; data: Record<string, unknown>; excerpt?: string };
  /** Uses its own canvas: the post type's collection block plus the body field. */
  customLayout?: boolean;
};

type PostTypeDef = {
  name: string;
  singularName: string;
  slug: string;
  icon: string;
  description: string;
  supports?: Partial<PostTypeSupports>;
  fields: { key: string; label: string; type: FieldType; required?: boolean; config?: Record<string, unknown> }[];
  taxonomies: TaxonomyDef[];
  /** Default single template. */
  template: () => BuilderData;
  /** The post type's collection block. */
  block: { name: string; description: string; content: () => BuilderData };
  entries: EntryDef[];
};

/** One row of a Collection Item block's "Fields to display". */
const field = (
  key: string,
  textSize: 'auto' | 'h1' | 'h2' | 'h3' | 'lead' | 'body' | 'small' = 'auto',
  showLabel = false
) => ({ field: key, textSize, showLabel, labelText: '', style: {}, labelStyle: {} });

const items = (
  rows: ReturnType<typeof field>[],
  props: Record<string, unknown> = {}
) => block('CollectionItem', { layout: 'clean', direction: 'stack', gap: 'sm', ...props, items: rows });

const templateRoot = { maxWidth: 'lg', theme: 'site', paddingY: 'md' };

const POST_TYPES: PostTypeDef[] = [
  // ─── Team members ─────────────────────────────────────────────────
  {
    name: 'Team members',
    singularName: 'Team member',
    slug: 'team',
    icon: 'users',
    description: 'The people who build Next CMS.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'photo', label: 'Photo', type: 'media' },
      { key: 'bio', label: 'Bio', type: 'richtext' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'linkedin', label: 'LinkedIn URL', type: 'url' },
    ],
    taxonomies: [
      {
        key: 'department',
        name: 'Departments',
        singularName: 'Department',
        terms: [
          { name: 'Engineering', slug: 'engineering', description: 'Builder engine, API and infrastructure.' },
          { name: 'Design', slug: 'design', description: 'Blocks, templates and the editor experience.' },
          { name: 'Product', slug: 'product', description: 'Roadmap and research.' },
          { name: 'Customer success', slug: 'customer-success', description: 'Onboarding and support.' },
        ],
      },
    ],
    template: () =>
      page(
        [
          block('Columns', {
            layout: '1-2',
            columns: [
              block('Column', {
                width: '1fr',
                content: [items([field('photo')])],
              }),
              block('Column', {
                width: '2fr',
                content: [
                  block('PostTitle', { showBackLink: true, showExcerpt: false, alignment: 'left' }),
                  items([field('role', 'lead'), field('location', 'small', true), field('bio', 'body'), field('linkedin', 'small', true)]),
                ],
              }),
            ],
          }),
        ],
        templateRoot
      ),
    block: {
      name: 'Member card',
      description: 'Photo, name and role in a card.',
      content: () =>
        page([items([field('photo'), field('name', 'h3'), field('role', 'small')], { layout: 'card', align: 'center' })], templateRoot),
    },
    entries: [
      {
        slug: 'ava-thompson',
        data: { name: 'Ava Thompson', role: 'Founder & CEO', photo: PORTRAITS.ava, location: 'Lisbon', linkedin: 'https://www.linkedin.com/', bio: '<p>Ava started Next CMS after years of building marketing sites for agencies. She still reviews every new block before it ships.</p>' },
        excerpt: 'Founder of Next CMS.',
        terms: { department: ['product'] },
        es: { slug: 'ava-thompson-es', data: { name: 'Ava Thompson', role: 'Fundadora y CEO', photo: PORTRAITS.ava, location: 'Lisboa', bio: '<p>Ava fundó Next CMS después de años creando sitios para agencias.</p>' }, excerpt: 'Fundadora de Next CMS.' },
      },
      {
        slug: 'leo-martins',
        data: { name: 'Leo Martins', role: 'Head of Engineering', photo: PORTRAITS.leo, location: 'São Paulo', linkedin: 'https://www.linkedin.com/', bio: '<p>Leo leads the builder engine, the loaders and the public API.</p>' },
        terms: { department: ['engineering'] },
        es: { slug: 'leo-martins-es', data: { name: 'Leo Martins', role: 'Jefe de Ingeniería', photo: PORTRAITS.leo, location: 'São Paulo', bio: '<p>Leo dirige el motor del constructor y la API pública.</p>' } },
        customLayout: true,
      },
      {
        slug: 'sara-ahmed',
        data: { name: 'Sara Ahmed', role: 'Design Lead', photo: PORTRAITS.sara, location: 'London', bio: '<p>Sara designs the blocks, templates and theme tokens.</p>' },
        terms: { department: ['design'] },
      },
      {
        slug: 'kenji-watanabe',
        data: { name: 'Kenji Watanabe', role: 'Frontend Engineer', photo: PORTRAITS.kenji, location: 'Osaka', bio: '<p>Kenji works on the canvas, drag and drop, and responsive controls.</p>' },
        terms: { department: ['engineering'] },
      },
      {
        slug: 'maya-fischer',
        data: { name: 'Maya Fischer', role: 'Customer Success', photo: PORTRAITS.maya, location: 'Berlin', bio: '<p>Maya helps new teams move their sites over and writes the user guide.</p>' },
        terms: { department: ['customer-success'] },
      },
      {
        slug: 'omar-haddad',
        data: { name: 'Omar Haddad', role: 'Product Designer', photo: PORTRAITS.omar, location: 'Amman', bio: '<p>Omar is joining in the spring to work on the template library.</p>' },
        status: 'draft',
        terms: { department: ['design', 'product'] },
      },
    ],
  },

  // ─── Showcase ─────────────────────────────────────────────────────
  {
    name: 'Showcase',
    singularName: 'Showcase site',
    slug: 'showcase',
    icon: 'star',
    description: 'Sites built with the Next CMS builder.',
    fields: [
      { key: 'title', label: 'Site name', type: 'text', required: true },
      { key: 'client', label: 'Client', type: 'text' },
      { key: 'screenshot', label: 'Screenshot', type: 'media' },
      { key: 'summary', label: 'Summary', type: 'richtext' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'launched', label: 'Launched', type: 'date' },
      { key: 'pages', label: 'Pages built', type: 'number' },
      { key: 'highlight', label: 'Builder highlight', type: 'select', config: { options: ['Loop Grid', 'Global blocks', 'Post types', 'Translations', 'Experiments'] } },
    ],
    taxonomies: [
      {
        key: 'industry',
        name: 'Industries',
        singularName: 'Industry',
        terms: [
          { name: 'SaaS', slug: 'saas' },
          { name: 'Agency', slug: 'agency' },
          { name: 'Education', slug: 'education' },
          { name: 'Non-profit', slug: 'non-profit' },
          { name: 'Retail', slug: 'retail' },
        ],
      },
      {
        key: 'feature',
        name: 'Features used',
        singularName: 'Feature',
        terms: [
          { name: 'Loop Grid', slug: 'loop-grid' },
          { name: 'Global blocks', slug: 'global-blocks' },
          { name: 'Post types', slug: 'post-types' },
          { name: 'Translations', slug: 'translations' },
          { name: 'Experiments', slug: 'experiments' },
        ],
      },
    ],
    template: () =>
      page(
        [
          block('PostTitle', { showBackLink: true, showExcerpt: true, alignment: 'left' }),
          items([field('screenshot')]),
          block('Columns', {
            layout: '2-1',
            columns: [
              block('Column', {
                width: '2fr',
                content: [items([field('summary', 'body')])],
              }),
              block('Column', {
                width: '1fr',
                content: [items([field('client', 'body', true), field('launched', 'small', true), field('pages', 'small', true), field('highlight', 'small', true), field('website', 'small', true)], { layout: 'card' })],
              }),
            ],
          }),
        ],
        templateRoot
      ),
    block: {
      name: 'Showcase card',
      description: 'Screenshot, name, client and highlight.',
      content: () =>
        page([items([field('screenshot'), field('title', 'h3'), field('client', 'small'), field('highlight', 'small', true)], { layout: 'card' })], templateRoot),
    },
    entries: [
      {
        slug: 'brightlane-analytics',
        data: { title: 'Brightlane Analytics', client: 'Brightlane', screenshot: POST_IMAGES.analytics, website: 'https://example.com/brightlane', launched: '2026-03-12', pages: 48, highlight: 'Experiments', summary: '<p>A SaaS marketing site with pricing pages tested through A/B experiments. The team ships a new landing page a week from page templates.</p>' },
        excerpt: 'SaaS marketing site with weekly landing pages.',
        featuredImage: POST_IMAGES.analytics,
        terms: { industry: ['saas'], feature: ['experiments', 'global-blocks'] },
        customLayout: true,
      },
      {
        slug: 'northwind-studio',
        data: { title: 'Northwind Studio', client: 'Northwind', screenshot: POST_IMAGES.design, website: 'https://example.com/northwind', launched: '2026-01-20', pages: 26, highlight: 'Post types', summary: '<p>An agency portfolio where every project is an entry with its own custom layout, listed by a Loop Grid with an industry filter.</p>' },
        excerpt: 'Agency portfolio built on post types.',
        featuredImage: POST_IMAGES.design,
        terms: { industry: ['agency'], feature: ['post-types', 'loop-grid'] },
      },
      {
        slug: 'open-classroom',
        data: { title: 'Open Classroom', client: 'Open Classroom Foundation', screenshot: POST_IMAGES.workspace, website: 'https://example.com/classroom', launched: '2025-11-02', pages: 120, highlight: 'Translations', summary: '<p>Course pages in four languages, translated side by side with the language switcher in the header.</p>' },
        excerpt: 'Course catalogue in four languages.',
        featuredImage: POST_IMAGES.workspace,
        terms: { industry: ['education', 'non-profit'], feature: ['translations'] },
      },
      {
        slug: 'greenhouse-goods',
        data: { title: 'Greenhouse Goods', client: 'Greenhouse', screenshot: POST_IMAGES.desk, website: 'https://example.com/greenhouse', launched: '2026-05-08', pages: 34, highlight: 'Loop Grid', summary: '<p>A shop front whose product listings are Loop Grids fed from a Products post type.</p>' },
        excerpt: 'Retail storefront with Loop Grid listings.',
        featuredImage: POST_IMAGES.desk,
        terms: { industry: ['retail'], feature: ['loop-grid', 'post-types'] },
      },
      {
        slug: 'harbor-relief',
        data: { title: 'Harbor Relief', client: 'Harbor Relief Network', screenshot: POST_IMAGES.team, website: 'https://example.com/harbor', launched: '2026-02-15', pages: 18, highlight: 'Global blocks', summary: '<p>A donation banner and contact form shared as global blocks across every campaign page.</p>' },
        excerpt: 'Campaign pages sharing global blocks.',
        featuredImage: POST_IMAGES.team,
        terms: { industry: ['non-profit'], feature: ['global-blocks'] },
      },
      {
        slug: 'atlas-docs',
        data: { title: 'Atlas Docs', client: 'Atlas', screenshot: POST_IMAGES.code, launched: '2026-07-01', pages: 64, highlight: 'Post types', summary: '<p>Developer docs in progress: guides as a post type with a Sections taxonomy.</p>' },
        status: 'review',
        excerpt: 'Developer documentation (in review).',
        featuredImage: POST_IMAGES.code,
        terms: { industry: ['saas'], feature: ['post-types'] },
      },
    ],
  },

  // ─── Changelog ────────────────────────────────────────────────────
  {
    name: 'Changelog',
    singularName: 'Release',
    slug: 'changelog',
    icon: 'package',
    description: 'What changed in each release of the builder.',
    supports: { author: false },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'version', label: 'Version', type: 'text', required: true },
      { key: 'released', label: 'Release date', type: 'date' },
      { key: 'kind', label: 'Release type', type: 'select', config: { options: ['Major', 'Minor', 'Patch'] } },
      { key: 'highlights', label: 'Highlights', type: 'richtext' },
      { key: 'breaking', label: 'Breaking changes', type: 'boolean' },
    ],
    taxonomies: [
      {
        key: 'area',
        name: 'Areas',
        singularName: 'Area',
        hierarchical: true,
        terms: [
          { name: 'Builder', slug: 'builder' },
          { name: 'Post types', slug: 'post-types' },
          { name: 'Templates', slug: 'templates' },
          { name: 'API', slug: 'api' },
          { name: 'Dashboard', slug: 'dashboard' },
        ],
      },
    ],
    template: () =>
      page(
        [
          block('PostTitle', { showBackLink: true, showExcerpt: true, alignment: 'left' }),
          items([field('version', 'lead', true), field('released', 'small', true), field('kind', 'small', true), field('breaking', 'small', true)], { direction: 'row', gap: 'lg' }),
          items([field('highlights', 'body')]),
        ],
        templateRoot
      ),
    block: {
      name: 'Release summary',
      description: 'Version, date and highlights.',
      content: () =>
        page([items([field('version', 'h3'), field('released', 'small'), field('highlights', 'body')], { layout: 'card' })], templateRoot),
    },
    entries: [
      { slug: 'v3-0', data: { title: 'Post types', version: '3.0.0', released: '2026-11-01', kind: 'Major', breaking: true, highlights: '<ul><li>Collections become post types with features</li><li>Taxonomies and term archives</li><li>Single templates and collection blocks</li></ul>' }, excerpt: 'Collections become full post types.', terms: { area: ['post-types', 'templates'] } },
      { slug: 'v2-8', data: { title: 'Loop Grid', version: '2.8.0', released: '2026-09-14', kind: 'Minor', breaking: false, highlights: '<ul><li>Loop Grid and Loop Item templates</li><li>Query Filter block</li></ul>' }, excerpt: 'Loop Grids with designable items.', terms: { area: ['builder'] } },
      { slug: 'v2-7', data: { title: 'Header and footer builder', version: '2.7.0', released: '2026-08-02', kind: 'Minor', breaking: false, highlights: '<ul><li>Header and footer templates</li><li>Display rules with priorities</li></ul>' }, excerpt: 'Build headers and footers with blocks.', terms: { area: ['templates'] } },
      { slug: 'v2-6-3', data: { title: 'Editor fixes', version: '2.6.3', released: '2026-07-10', kind: 'Patch', breaking: false, highlights: '<ul><li>Faster undo on large pages</li><li>Drag handles on nested containers</li></ul>' }, excerpt: 'Undo and drag fixes.', terms: { area: ['builder'] } },
      { slug: 'v2-6', data: { title: 'Webhooks', version: '2.6.0', released: '2026-06-01', kind: 'Minor', breaking: false, highlights: '<ul><li>Signed webhooks with delivery logs</li><li>API key scopes</li></ul>' }, excerpt: 'Webhooks and scoped API keys.', terms: { area: ['api', 'dashboard'] } },
      { slug: 'v3-1', data: { title: 'AI page drafts', version: '3.1.0', released: '2026-12-01', kind: 'Minor', breaking: false, highlights: '<ul><li>Describe a page and get a draft made of real blocks</li></ul>' }, status: 'draft', excerpt: 'Next up: AI page drafts.', terms: { area: ['builder'] } },
    ],
  },

  // ─── Testimonials ─────────────────────────────────────────────────
  {
    name: 'Testimonials',
    singularName: 'Testimonial',
    slug: 'testimonials',
    icon: 'message-square-quote',
    description: 'What teams say about building with Next CMS.',
    supports: { template: false, author: false, seo: false },
    fields: [
      { key: 'quote', label: 'Quote', type: 'richtext', required: true },
      { key: 'author', label: 'Author', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'avatar', label: 'Photo', type: 'media' },
      { key: 'rating', label: 'Rating (1–5)', type: 'number' },
    ],
    taxonomies: [
      { key: 'team-type', name: 'Team types', singularName: 'Team type', terms: [{ name: 'Marketing', slug: 'marketing' }, { name: 'Agency', slug: 'agency' }, { name: 'Developers', slug: 'developers' }] },
    ],
    template: () => page([items([field('quote', 'lead'), field('author', 'body'), field('company', 'small')])], templateRoot),
    block: {
      name: 'Quote card',
      description: 'Quote with author and company.',
      content: () => page([items([field('avatar'), field('quote', 'lead'), field('author', 'body'), field('company', 'small')], { layout: 'card' })], templateRoot),
    },
    entries: [
      { slug: 'priya-brightlane', data: { quote: '<p>We used to wait two sprints for a landing page. Now marketing builds them the same afternoon.</p>', author: 'Priya Nair', role: 'Head of Growth', company: 'Brightlane', avatar: PORTRAITS.maya, rating: 5 }, terms: { 'team-type': ['marketing'] } },
      { slug: 'tom-northwind', data: { quote: '<p>Post types and collection blocks replaced three plugins in our old stack.</p>', author: 'Tom Becker', role: 'Technical Director', company: 'Northwind Studio', avatar: PORTRAITS.leo, rating: 5 }, terms: { 'team-type': ['agency'] } },
      { slug: 'lucia-classroom', data: { quote: '<p>Translations live next to the original, so our editors finally keep four languages in sync.</p>', author: 'Lucía Romero', role: 'Content Lead', company: 'Open Classroom', avatar: PORTRAITS.sara, rating: 4 }, terms: { 'team-type': ['marketing'] } },
      { slug: 'dev-greenhouse', data: { quote: '<p>The content API and webhooks made it easy to feed our app from the same content.</p>', author: 'Dev Patel', role: 'Engineer', company: 'Greenhouse Goods', avatar: PORTRAITS.kenji, rating: 5 }, terms: { 'team-type': ['developers'] } },
      { slug: 'noor-harbor', data: { quote: '<p>Changing the donation banner once and seeing it everywhere is my favourite feature.</p>', author: 'Noor Saleh', role: 'Communications', company: 'Harbor Relief', avatar: PORTRAITS.ava, rating: 5 }, terms: { 'team-type': ['marketing'] } },
    ],
  },

  // ─── FAQs ─────────────────────────────────────────────────────────
  {
    name: 'FAQs',
    singularName: 'FAQ',
    slug: 'faq',
    icon: 'circle-help',
    description: 'Common questions about the builder.',
    supports: { template: false, author: false, excerpt: false },
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'richtext', required: true },
    ],
    taxonomies: [
      { key: 'topic', name: 'Topics', singularName: 'Topic', terms: [{ name: 'Builder', slug: 'builder' }, { name: 'Publishing', slug: 'publishing' }, { name: 'Billing', slug: 'billing' }] },
    ],
    template: () => page([items([field('question', 'h2'), field('answer', 'body')])], templateRoot),
    block: {
      name: 'Question and answer',
      description: 'Question as a heading, answer below.',
      content: () => page([items([field('question', 'h3'), field('answer', 'body')], { layout: 'card' })], templateRoot),
    },
    entries: [
      { slug: 'need-code', data: { question: 'Do I need to write code to build pages?', answer: '<p>No. Pages, templates, headers, footers and forms are all built visually. Developers can add custom blocks when needed.</p>' }, terms: { topic: ['builder'] } },
      { slug: 'mobile-editing', data: { question: 'Can I change the layout on mobile only?', answer: '<p>Yes. Responsive settings can differ per device, and any block can be hidden on desktop, tablet or mobile.</p>' }, terms: { topic: ['builder'] } },
      { slug: 'global-vs-pattern', data: { question: 'What is the difference between a global block and a pattern?', answer: '<p>A global block stays linked: edit it once and every page updates. A pattern is copied into the page and can be changed freely.</p>' }, terms: { topic: ['builder'] } },
      { slug: 'schedule', data: { question: 'Can I schedule content?', answer: '<p>Pages, posts and entries can be scheduled; they publish on their own at the chosen time.</p>' }, terms: { topic: ['publishing'] } },
      { slug: 'undo-publish', data: { question: 'How do I undo a publish?', answer: '<p>Open History, restore the previous revision and publish it again.</p>' }, terms: { topic: ['publishing'] } },
      { slug: 'nonprofit-discount', data: { question: 'Is there a discount for non-profits?', answer: '<p>Yes — non-profits get 50% off every plan. Contact us from the contact page.</p>' }, terms: { topic: ['billing'] } },
    ],
  },
];

type Ctx = { siteId: string; adminId: string; authorIds: string[] };

export async function seedPostTypes(ctx: Ctx) {
  const entryIds: string[] = [];
  const counts = { types: 0, fields: 0, taxonomies: 0, terms: 0, templates: 0, blocks: 0, entries: 0 };
  const now = Date.now();

  for (const def of POST_TYPES) {
    const [collection] = await db
      .insert(schema.collections)
      .values({
        siteId: ctx.siteId,
        name: def.name,
        singularName: def.singularName,
        slug: def.slug,
        icon: def.icon,
        description: def.description,
        status: 'active',
        supports: { template: true, taxonomies: true, excerpt: true, author: true, status: true, seo: true, ...def.supports },
      })
      .returning();
    counts.types++;

    for (const [position, f] of def.fields.entries()) {
      await db.insert(schema.collectionFields).values({
        collectionId: collection.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        position,
        config: f.config ?? {},
      });
      counts.fields++;
    }

    // Taxonomies and terms: termIds[taxonomyKey][termSlug]
    const termIds: Record<string, Record<string, string>> = {};
    for (const [position, tax] of def.taxonomies.entries()) {
      const [taxonomy] = await db
        .insert(schema.collectionTaxonomies)
        .values({
          siteId: ctx.siteId,
          collectionId: collection.id,
          key: tax.key,
          name: tax.name,
          singularName: tax.singularName,
          hierarchical: tax.hierarchical ?? false,
          position,
        })
        .returning();
      counts.taxonomies++;
      termIds[tax.key] = {};
      for (const [termPosition, term] of tax.terms.entries()) {
        const [row] = await db
          .insert(schema.collectionTerms)
          .values({
            siteId: ctx.siteId,
            taxonomyId: taxonomy.id,
            name: term.name,
            slug: term.slug,
            description: term.description ?? null,
            position: termPosition,
          })
          .returning();
        termIds[tax.key][term.slug] = row.id;
        counts.terms++;
      }
    }

    // Default single template
    const templateContent = assertValid(`${def.name} template`, def.template()) as object;
    const [template] = await db
      .insert(schema.collectionTemplates)
      .values({
        siteId: ctx.siteId,
        collectionId: collection.id,
        name: `${def.singularName} page`,
        description: `Default layout for every ${def.singularName.toLowerCase()}.`,
        content: templateContent,
        draftContent: templateContent,
        isDefault: true,
        createdBy: ctx.adminId,
      })
      .returning();
    counts.templates++;

    // Collection block (published)
    const blockContent = assertValid(def.block.name, def.block.content()) as object;
    const [collectionBlock] = await db
      .insert(schema.collectionBlocks)
      .values({
        siteId: ctx.siteId,
        collectionId: collection.id,
        name: def.block.name,
        description: def.block.description,
        content: blockContent,
        draftContent: blockContent,
        publishedAt: new Date(),
        createdBy: ctx.adminId,
      })
      .returning();
    counts.blocks++;

    for (const [index, entry] of def.entries.entries()) {
      const status = entry.status ?? 'published';
      const publishedAt = status === 'published' ? new Date(now - index * 24 * 60 * 60 * 1000) : null;
      const authorId = ctx.authorIds[index % ctx.authorIds.length];
      const canvas = entry.customLayout
        ? (assertValid(
            `${entry.slug} layout`,
            page(
              [
                block('PostTitle', { showBackLink: true, showExcerpt: true, alignment: 'center' }),
                block('CollectionBlock', { collectionBlockId: collectionBlock.id }),
                items([field(def.fields.find(f => f.type === 'richtext')?.key ?? def.fields[0].key, 'body')]),
              ],
              templateRoot
            )
          ) as object)
        : null;

      const insertEntry = async (
        values: { slug: string; data: Record<string, unknown>; excerpt?: string },
        language: string,
        translationGroupId: string | null
      ) => {
        const id = createId();
        await db.insert(schema.collectionEntries).values({
          id,
          siteId: ctx.siteId,
          collectionId: collection.id,
          slug: values.slug,
          status,
          data: values.data,
          excerpt: values.excerpt ?? entry.excerpt ?? null,
          featuredImage: entry.featuredImage ?? null,
          authorId,
          layout: canvas ? 'custom' : 'template',
          templateId: canvas ? null : template.id,
          canvas,
          draftCanvas: canvas,
          publishedAt,
          language,
          translationGroupId,
        });
        for (const [taxKey, slugs] of Object.entries(entry.terms ?? {})) {
          for (const slug of slugs) {
            const termId = termIds[taxKey]?.[slug];
            if (termId) await db.insert(schema.collectionEntryTerms).values({ entryId: id, termId });
          }
        }
        entryIds.push(id);
        counts.entries++;
        return id;
      };

      const sourceId = await insertEntry(entry, 'en', null);
      if (entry.es) {
        await db
          .update(schema.collectionEntries)
          .set({ translationGroupId: sourceId })
          .where(eq(schema.collectionEntries.id, sourceId));
        await insertEntry(entry.es, 'es', sourceId);
      }
    }
  }

  return { entryIds, counts };
}
