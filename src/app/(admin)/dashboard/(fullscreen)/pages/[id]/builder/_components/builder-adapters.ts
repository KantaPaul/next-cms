/**
 * What differs per builder kind (page, post, templates, global blocks,
 * contact forms): labels, links, and the save and publish actions. Shared by
 * the Puck builder and the new editor so both behave the same.
 */

import { siteTemplatesHref } from '@/app/(admin)/dashboard/(shell)/site-templates/_modules/site-template-href';
import { toast } from 'sonner';
import {
  publishPage,
  saveDraft,
  updatePage,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import {
  publishPost,
  publishPostTemplate,
  savePostDraft,
  savePostTemplateDraft,
  updatePost,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import {
  publishGlobalBlock,
  saveGlobalBlock,
  updateTemplate,
} from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';

import {
  publishLoopTemplate,
  saveLoopTemplate,
} from '@/app/(admin)/dashboard/(shell)/templates/loop/_modules/loop-templates.actions';
import {
  saveCollectionTemplateDraftAction,
  publishCollectionTemplateAction,
} from '@/app/(admin)/dashboard/(shell)/collections/_modules/collection-templates.actions';
import {
  saveCollectionBlockDraftAction,
  publishCollectionBlockAction,
} from '@/app/(admin)/dashboard/(shell)/collections/_modules/collection-blocks.actions';
import {
  saveEntryDraftAction,
  publishEntryAction,
  saveEntryAction,
} from '@/app/(admin)/dashboard/(shell)/collections/_modules/collections.actions';
import type { NormalizedListingItem } from '@nextcms/builder-core';
import type { BuilderData, BuilderItem } from '@/builder/data';
import type { PostView } from '@/builder/post-template';
import { PAGES } from '@/config/pages';
import type { ThemeTokens } from '@/db/schemas/pages.schema';
import type { BuilderKind } from './builder-context';

export type BuilderPageProps = {
  page: {
    id: string;
    title: string;
    slug: string;
    language: string;
    isHome: boolean;
    status: string;
    hasUnpublishedChanges: boolean;
    content: unknown;
    collectionSlug?: string;
  };
  themeTokens: ThemeTokens;
  /** Defaults to `page`. Post kinds use the post blocks and post actions. */
  kind?: BuilderKind;
  /** Post rendered by post-bound blocks; the template builder falls back to sample content. */
  post?: PostView;
  /** Global block category; only used when kind is `global` or `contact-form`. */
  category?: string;
  /** Collection entry rendered by collection-bound blocks in template pages. */
  collectionEntry?: any;
  /** Loop Item templates: posts or entries the canvas can preview. */
  previewItems?: NormalizedListingItem[];
  /** Loop Item templates: fields offered by the `loopItem` dynamic source. */
  loopItemFields?: { path: string; label: string; type?: string }[];
};

/** Config for global blocks: no GlobalRef and no Global category so a global cannot nest another. */
function globalBuilderConfig(): any {
  return {};
}

export type Adapter = {
  label: string;
  backHref: string;
  backLabel: string;
  headerPath: string;
  previewHref: string | null;
  liveLabel: string;
  saveDraft: (content: BuilderData, autosave: boolean) => Promise<unknown>;
  publish: () => Promise<unknown>;
  submitForReview: (() => Promise<unknown>) | null;
};

export function adapterFor(
  kind: BuilderKind,
  page: BuilderPageProps['page'],
  category?: string
): Adapter {
  if (
    kind === 'header' ||
    kind === 'footer' ||
    kind === 'mega-menu' ||
    kind === 'popup' ||
    kind === 'drawer'
  ) {
    const isHeader = kind === 'header';
    const isMega = kind === 'mega-menu';
    const isPopup = kind === 'popup';
    const isDrawer = kind === 'drawer';
    const category = isMega
      ? 'MegaMenu'
      : isPopup
        ? 'Popup'
        : isDrawer
          ? 'Drawer'
          : isHeader
            ? 'Header'
            : 'Footer';
    const label = isMega
      ? 'Mega menu'
      : isPopup
        ? 'Popup'
        : isDrawer
          ? 'Drawer'
          : isHeader
            ? 'Header'
            : 'Footer';
    return {
      label,
      backHref: siteTemplatesHref(isMega ? 'megamenu' : kind),
      backLabel: 'Site templates',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Publish',
      saveDraft: async content => {
        const blocks = (content.content ?? []) as BuilderItem[];
        const zones = (content.zones ?? {}) as Record<string, BuilderItem[]>;
        const root = (content.root ?? { props: {} }) as {
          props?: Record<string, unknown>;
        };
        if (!blocks.length) {
          toast.error(
            isMega
              ? 'A mega menu needs at least one block.'
              : isPopup
                ? 'A popup needs at least one block.'
                : isDrawer
                  ? 'A drawer needs at least one block.'
                  : isHeader
                    ? 'A header needs at least one block.'
                    : 'A footer needs at least one block.'
          );
          return { error: 'empty' };
        }
        return saveGlobalBlock({
          id: page.id,
          name: page.title,
          category,
          content: { root, content: blocks, zones },
        });
      },
      publish: () => publishGlobalBlock({ id: page.id }),
      submitForReview: null,
    };
  }

  if (kind === 'global' || kind === 'contact-form') {
    const isContactForm = kind === 'contact-form';
    // Search and archive templates are listed on the Site templates screen.
    const isSiteTemplate = category === 'Search' || category === 'Archive';
    return {
      label: isContactForm
        ? 'Contact form'
        : isSiteTemplate
          ? `${category} template`
          : 'Global block',
      backHref: isContactForm
        ? PAGES.DASHBOARD.CONTACT_FORMS
        : isSiteTemplate
          ? siteTemplatesHref(category)
          : PAGES.DASHBOARD.TEMPLATES,
      backLabel: isContactForm
        ? 'Contact forms'
        : isSiteTemplate
          ? 'Site templates'
          : 'Templates & Globals',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Save',
      saveDraft: async content => {
        const blocks = (content.content ?? []) as BuilderItem[];
        const zones = (content.zones ?? {}) as Record<string, BuilderItem[]>;
        const root = (content.root ?? { props: {} }) as {
          props?: Record<string, unknown>;
        };
        if (!blocks.length) {
          toast.error(
            isContactForm
              ? 'A contact form needs at least one section.'
              : 'A global block needs at least one section.'
          );
          return { error: 'empty' };
        }
        return saveGlobalBlock({
          id: page.id,
          name: page.title,
          category: category ?? (isContactForm ? 'contact-form' : 'general'),
          content: { root, content: blocks, zones },
        });
      },
      publish: async () => null,
      submitForReview: null,
    };
  }

  if (kind === 'loop-item') {
    return {
      label: `Loop item: ${page.title}`,
      backHref: PAGES.DASHBOARD.LOOP_TEMPLATES,
      backLabel: 'Loop items',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Publish template',
      saveDraft: async content =>
        saveLoopTemplate({
          id: page.id,
          content: {
            root: (content.root ?? { props: {} }) as {
              props?: Record<string, unknown>;
            },
            content: (content.content ?? []) as BuilderItem[],
            zones: (content.zones ?? {}) as Record<string, BuilderItem[]>,
          },
        }),
      publish: () => publishLoopTemplate({ id: page.id }),
      submitForReview: null,
    };
  }

  if (kind === 'post') {
    return {
      label: 'Post layout',
      backHref: PAGES.DASHBOARD.POSTS.EDIT(page.id),
      backLabel: 'Post settings',
      headerPath: PAGES.SITE.post(page.slug, page.language),
      previewHref: PAGES.SITE.PREVIEW_POST(page.id),
      liveLabel: 'Update live post',
      saveDraft: (content, autosave) =>
        savePostDraft({ id: page.id, canvas: content, autosave }),
      publish: () => publishPost({ id: page.id }),
      submitForReview: () => updatePost({ id: page.id, status: 'review' }),
    };
  }

  if (kind === 'post-template') {
    return {
      label: `Post template: ${page.title}`,
      backHref: PAGES.DASHBOARD.POSTS.TEMPLATES,
      backLabel: 'Post templates',
      headerPath: PAGES.SITE.post('…', 'en'),
      previewHref: null,
      liveLabel: 'Update live template',
      saveDraft: content => savePostTemplateDraft({ id: page.id, content }),
      publish: () => publishPostTemplate({ id: page.id }),
      submitForReview: null,
    };
  }

  if (kind === 'entry') {
    const slug = page.collectionSlug ?? '';
    return {
      label: `Entry layout: ${page.title}`,
      backHref: PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(slug, page.id),
      backLabel: 'Entry settings',
      headerPath: `/collections/${slug}/${page.slug}`,
      previewHref: `/collections/${slug}/${page.slug}`,
      liveLabel: 'Update live entry',
      saveDraft: (content, autosave) =>
        saveEntryDraftAction({ id: page.id, canvas: content, autosave }),
      publish: () => publishEntryAction({ id: page.id }),
      submitForReview: () =>
        saveEntryAction({
          id: page.id,
          collectionId: 'ignored',
          status: 'review',
        }),
    };
  }

  if (kind === 'entry-template') {
    const slug = page.collectionSlug ?? '';
    return {
      label: `Template: ${page.title}`,
      backHref: PAGES.DASHBOARD.COLLECTION_TEMPLATES(slug),
      backLabel: 'Single templates',
      headerPath: `/${slug}/…`,
      previewHref: null,
      liveLabel: 'Update live template',
      saveDraft: content =>
        saveCollectionTemplateDraftAction({ id: page.id, content }),
      publish: () => publishCollectionTemplateAction({ id: page.id }),
      submitForReview: null,
    };
  }

  if (kind === 'collection-block') {
    const slug = page.collectionSlug ?? '';
    return {
      label: `Block: ${page.title}`,
      backHref: PAGES.DASHBOARD.COLLECTION_BLOCKS(slug),
      backLabel: 'Blocks',
      headerPath: `/${slug}/…`,
      previewHref: null,
      liveLabel: 'Update live block',
      saveDraft: content =>
        saveCollectionBlockDraftAction({ id: page.id, content }),
      publish: () => publishCollectionBlockAction({ id: page.id }),
      submitForReview: null,
    };
  }

  if (kind === 'page-template') {
    return {
      label: `Page template: ${page.title}`,
      backHref: PAGES.DASHBOARD.TEMPLATES,
      backLabel: 'Templates & Globals',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Save template',
      saveDraft: content => updateTemplate({ id: page.id, content }),
      publish: async () => null,
      submitForReview: null,
    };
  }

  return {
    label: 'Page builder',
    backHref: PAGES.DASHBOARD.PAGES.EDIT(page.id),
    backLabel: 'Page settings',
    headerPath: PAGES.SITE.page(page.slug, page.language, page.isHome),
    previewHref: PAGES.SITE.PREVIEW(page.id),
    liveLabel: 'Update live page',
    saveDraft: (content, autosave) =>
      saveDraft({ id: page.id, content, autosave }),
    publish: () => publishPage({ id: page.id }),
    submitForReview: () => updatePage({ id: page.id, status: 'review' }),
  };
}

