/**
 * What differs per builder kind (page, post, templates, global blocks,
 * contact forms): labels, links, and the save and publish actions. Shared by
 * the Puck builder and the new editor so both behave the same.
 */

import type { Config, Data } from '@measured/puck';
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
  saveGlobalBlock,
  updateTemplate,
} from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { builderConfig, postBuilderConfig } from '@/builder/config';
import type { BuilderItem } from '@/builder/data';
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
  };
  themeTokens: ThemeTokens;
  /** Defaults to `page`. Post kinds use the post blocks and post actions. */
  kind?: BuilderKind;
  /** Post rendered by post-bound blocks; the template builder falls back to sample content. */
  post?: PostView;
  /** Global block category; only used when kind is `global` or `contact-form`. */
  category?: string;
};

/** Config for global blocks: no GlobalRef and no Global category so a global cannot nest another. */
function globalBuilderConfig(): Config {
  const { GlobalRef: _globalRef, ...components } = builderConfig.components;
  const { global: _global, ...categories } = builderConfig.categories ?? {};
  return {
    ...builderConfig,
    components,
    categories,
    // Global blocks do not store page root fields (width, theme, padding, transition).
    // Keep the site-root canvas wrapper so inputs pick up site.css (.s-input, PhoneInput).
    root: { fields: {}, render: builderConfig.root?.render },
  } as Config;
}

export type Adapter = {
  config: Config;
  label: string;
  backHref: string;
  backLabel: string;
  headerPath: string;
  previewHref: string | null;
  liveLabel: string;
  saveDraft: (content: Data, autosave: boolean) => Promise<unknown>;
  publish: () => Promise<unknown>;
  submitForReview: (() => Promise<unknown>) | null;
};

export function adapterFor(
  kind: BuilderKind,
  page: BuilderPageProps['page'],
  category?: string
): Adapter {
  if (kind === 'global' || kind === 'contact-form') {
    const isContactForm = kind === 'contact-form';
    return {
      config: globalBuilderConfig(),
      label: isContactForm ? 'Contact form' : 'Global block',
      backHref: isContactForm
        ? PAGES.DASHBOARD.CONTACT_FORMS
        : PAGES.DASHBOARD.TEMPLATES,
      backLabel: isContactForm ? 'Contact forms' : 'Templates & Globals',
      headerPath: '',
      previewHref: null,
      liveLabel: 'Save',
      saveDraft: async content => {
        const blocks = (content.content ?? []) as BuilderItem[];
        const zones = (content.zones ?? {}) as Record<string, BuilderItem[]>;
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
          content: { content: blocks, zones },
        });
      },
      publish: async () => null,
      submitForReview: null,
    };
  }

  if (kind === 'post') {
    return {
      config: postBuilderConfig as Config,
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
      config: postBuilderConfig as Config,
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

  if (kind === 'page-template') {
    return {
      config: builderConfig as Config,
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
    config: builderConfig as Config,
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

