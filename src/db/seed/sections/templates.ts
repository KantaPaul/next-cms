/**
 * Site templates (header, footer, search, archive), the contact form, and the
 * post templates. The first starter of each category becomes the site default.
 */
import { eq } from 'drizzle-orm';
import type { BuilderData } from '@/builder/data';
import { defaultPostTemplate } from '@/builder/post-template';
import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  ARCHIVE_STARTER_GRID,
  ARCHIVE_STARTER_LIST_FILTERS,
  FOOTER_STARTER_COLUMNS_4,
  FOOTER_STARTER_DARK_NEWSLETTER,
  HEADER_STARTER_CLASSIC,
  HEADER_STARTER_WITH_TOPBAR,
  SEARCH_STARTER_COMPACT,
  SEARCH_STARTER_SIMPLE,
  type StarterTemplate,
} from '../header-footer-starters';
import { assertValid, block, page } from '../builder-nodes';

type Ctx = { siteId: string; adminId: string; settingsId: string };

/** Starter placeholder links → pages that exist on the seeded site. */
const SEEDED_LINK_TARGETS: Record<string, string> = {
  '/careers': '/about',
  '/press': '/about',
  '/cookies': '/privacy',
  '/docs': '/user-guide',
};

function retargetLinks(value: unknown): unknown {
  if (typeof value === 'string') return SEEDED_LINK_TARGETS[value] ?? value;
  if (Array.isArray(value)) return value.map(retargetLinks);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, retargetLinks(child)]));
  }
  return value;
}

async function insertTemplate(ctx: Ctx, starter: StarterTemplate, name = starter.name) {
  assertValid(name, starter.content);
  const content = retargetLinks(starter.content) as typeof starter.content;
  const [row] = await db
    .insert(schema.globalBlocks)
    .values({
      siteId: ctx.siteId,
      name,
      category: starter.category,
      content,
      publishedContent: content,
      publishedAt: new Date(),
      createdBy: ctx.adminId,
    })
    .returning();
  return row.id;
}

function contactFormContent(): BuilderData {
  return page([
    block('ContactForm', {
      title: 'Send us a message',
      subtitle: 'We reply within one business day.',
      submitText: 'Send message',
      successMessage: 'Thanks! Your message is in our inbox.',
      fields: [
        { id: 'field-name', label: 'Name', name: 'name', type: 'text', required: true },
        { id: 'field-email', label: 'Email', name: 'email', type: 'email', required: true },
        { id: 'field-topic', label: 'Topic', name: 'topic', type: 'text', required: false },
        { id: 'field-message', label: 'Message', name: 'message', type: 'textarea', required: true },
      ],
    }),
  ]);
}

/** A wider post layout used by the "Featured post layout" template. */
function featuredPostTemplate(): BuilderData {
  return page([
    block('PostFeaturedImage', { aspect: '21/9' }),
    block('PostTitle', { showBackLink: true, showExcerpt: true, alignment: 'center' }),
    block('PostMeta', { showAuthor: true, showDate: true, showCategories: true, showTags: true }),
    block('PostContent', { width: 'wide' }),
    block('CTA', {
      title: 'Enjoyed this post?',
      description: 'Read the rest of the user guide.',
      primaryButtonText: 'Open the guide',
      primaryButtonLink: '/user-guide',
      secondaryButtonText: '',
      secondaryButtonLink: '',
      variant: 'subtle',
    }),
    block('RelatedPosts', { title: 'Keep reading', limit: 3, columns: 3 }),
  ]);
}

export async function seedSiteTemplates(ctx: Ctx) {
  const header = await insertTemplate(ctx, HEADER_STARTER_CLASSIC, 'Site header');
  const headerAlt = await insertTemplate(ctx, HEADER_STARTER_WITH_TOPBAR, 'Guide header (with top bar)');
  const footer = await insertTemplate(ctx, FOOTER_STARTER_COLUMNS_4, 'Site footer');
  await insertTemplate(ctx, FOOTER_STARTER_DARK_NEWSLETTER, 'Dark footer with newsletter');
  const search = await insertTemplate(ctx, SEARCH_STARTER_SIMPLE, 'Search page');
  await insertTemplate(ctx, SEARCH_STARTER_COMPACT, 'Compact search page');
  const archive = await insertTemplate(ctx, ARCHIVE_STARTER_GRID, 'Blog archive');
  await insertTemplate(ctx, ARCHIVE_STARTER_LIST_FILTERS, 'Archive with filters');

  const formContent = assertValid('Contact form', contactFormContent());
  const [form] = await db
    .insert(schema.globalBlocks)
    .values({
      siteId: ctx.siteId,
      name: 'Contact form',
      category: 'contact-form',
      content: formContent,
      publishedContent: formContent,
      publishedAt: new Date(),
      createdBy: ctx.adminId,
    })
    .returning();

  await db
    .update(schema.siteSettings)
    .set({
      headerTemplateId: header,
      footerTemplateId: footer,
      searchTemplateId: search,
      archiveTemplateId: archive,
    })
    .where(eq(schema.siteSettings.id, ctx.settingsId));

  const defaultLayout = assertValid('Default post layout', defaultPostTemplate());
  const featuredLayout = assertValid('Featured post layout', featuredPostTemplate());
  const [defaultPostLayout] = await db
    .insert(schema.postTemplates)
    .values({
      siteId: ctx.siteId,
      name: 'Default post layout',
      description: 'Single column article layout',
      content: defaultLayout,
      draftContent: defaultLayout,
      isDefault: true,
      createdBy: ctx.adminId,
    })
    .returning();
  const [featuredPostLayout] = await db
    .insert(schema.postTemplates)
    .values({
      siteId: ctx.siteId,
      name: 'Featured post layout',
      description: 'Wide layout with featured image and a call to action',
      content: featuredLayout,
      draftContent: featuredLayout,
      isDefault: false,
      createdBy: ctx.adminId,
    })
    .returning();

  return {
    headerAlt,
    contactFormId: form.id,
    defaultPostLayoutId: defaultPostLayout.id,
    featuredPostLayoutId: featuredPostLayout.id,
  };
}
