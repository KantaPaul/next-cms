export const PAGES = {
  AUTH: {
    LOGIN: '/login',
  },
  DASHBOARD: {
    ROOT: '/dashboard',
    ANALYTICS: '/dashboard/analytics',
    ANALYTICS_BOARDS: '/dashboard/analytics/boards',
    ANALYTICS_BOARD: (id: string) => `/dashboard/analytics/boards/${id}`,
    ANALYTICS_BOARD_EDIT: (id: string) =>
      `/dashboard/analytics/boards/${id}/builder`,
    /** Board editor on the shared editor-ui shell (B15 E7/E8). */
    ANALYTICS_BOARD_BUILDER: (id: string) =>
      `/dashboard/analytics/boards/${id}/builder`,
    PAGES: {
      CREATE: '/dashboard/pages/create',
      INDEX: '/dashboard/pages',
      EDIT: (id: string) => `/dashboard/pages/${id}/edit`,
      BUILDER: (id: string) => `/dashboard/pages/${id}/builder`,
      /** The new editor; replaces BUILDER after Gate 35. Other builder kinds add `?editor=new` to their builder link. */
      EDITOR: (id: string) => `/dashboard/pages/${id}/builder?editor=new`,
    },
    POSTS: {
      INDEX: '/dashboard/posts',
      CREATE: '/dashboard/posts/create',
      EDIT: (id: string) => `/dashboard/posts/${id}/edit`,
      BUILDER: (id: string) => `/dashboard/posts/${id}/builder`,
      TEMPLATES: '/dashboard/posts/templates',
      TEMPLATE_BUILDER: (id: string) =>
        `/dashboard/posts/templates/${id}/builder`,
    },
    MEDIA: '/dashboard/media',
    TAXONOMY: '/dashboard/taxonomy',
    MENUS: '/dashboard/menus',
    TEMPLATES: '/dashboard/templates',
    TEMPLATE: (id: string) => `/dashboard/templates/${id}`,
    GLOBAL_BLOCK: (id: string) => `/dashboard/templates/globals/${id}`,
    LOOP_TEMPLATES: '/dashboard/templates/loop',
    LOOP_TEMPLATE: (id: string) => `/dashboard/templates/loop/${id}`,
    HEADER_FOOTER: '/dashboard/site-templates',
    HEADER_FOOTER_EDIT: (id: string) => `/dashboard/site-templates/${id}`,
    CONTACT_FORMS: '/dashboard/contact-forms',
    CONTACT_FORM: (id: string) => `/dashboard/contact-forms/${id}`,
    CONTACT_FORMS_INBOX: '/dashboard/contact-forms/inbox',
    CONTACT_FORM_SUBMISSION: (id: string) =>
      `/dashboard/contact-forms/inbox/${id}`,
    COLLECTIONS: '/dashboard/collections',
    /** One post type's entries, by its slug (like Pages: index, create, edit). */
    COLLECTION: (slug: string) => `/dashboard/collections/${slug}`,
    COLLECTION_CREATE: (slug: string) => `/dashboard/collections/${slug}/create`,
    COLLECTION_ENTRY_EDIT: (slug: string, entryId: string) =>
      `/dashboard/collections/${slug}/${entryId}/edit`,
    COLLECTION_ENTRY_BUILDER: (slug: string, entryId: string) =>
      `/dashboard/collections/${slug}/${entryId}/builder`,
    COLLECTION_TAXONOMY: (slug: string, key: string) =>
      `/dashboard/collections/${slug}/taxonomies/${key}`,
    COLLECTION_TEMPLATES: (slug: string) =>
      `/dashboard/collections/${slug}/templates`,
    COLLECTION_TEMPLATE_BUILDER: (slug: string, id: string) =>
      `/dashboard/collections/${slug}/templates/${id}/builder`,
    COLLECTION_BLOCKS: (slug: string) =>
      `/dashboard/collections/${slug}/blocks`,
    COLLECTION_BLOCK_BUILDER: (slug: string, id: string) =>
      `/dashboard/collections/${slug}/blocks/${id}/builder`,
    /** The post type's fields and settings. */
    COLLECTION_SETTINGS: (slug: string) =>
      `/dashboard/collections/${slug}/settings`,
    WEBHOOKS: '/dashboard/webhooks',
    REDIRECTS: '/dashboard/redirects',
    TOOLS_IMPORT: '/dashboard/tools/import',
    TOOLS_PRIVACY: '/dashboard/tools/privacy',
    TOOLS_BACKUPS: '/dashboard/tools/backups',
    REVIEW: '/dashboard/review',
    COMMENTS: '/dashboard/comments',
    ACCOUNT: '/dashboard/account',
    SETTINGS: '/dashboard/settings',
    SETTINGS_CONSENT: '/dashboard/settings/consent',
    SETTINGS_CUSTOM_CODE: '/dashboard/settings/custom-code',
    SETTINGS_INTEGRATIONS: '/dashboard/settings/integrations',
    SETTINGS_LICENSE: '/dashboard/settings/license',
    SETTINGS_BLOCKS: '/dashboard/settings/blocks',
    THEME: '/dashboard/theme',
    SITES: '/dashboard/sites',
    USERS: '/dashboard/users',
    API: '/dashboard/api',
    VIDEOS: '/dashboard/videos',
    LICENSES: '/dashboard/licenses',
    LICENSE: (id: string) => `/dashboard/licenses/${id}`,
  },
  SITE: {
    page: (
      slug: string,
      language = 'en',
      isHome = false,
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = isHome ? (langPrefix || '/') : `${langPrefix}/${slug}`;
      return siteSlug ? `/${siteSlug}${base === '/' ? '' : base}` : base;
    },
    post: (
      slug: string,
      language = 'en',
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = `${langPrefix}/blog/${slug}`;
      return siteSlug ? `/${siteSlug}${base}` : base;
    },
    /** A collection entry: `/{lang?}/collections/{type}/{entry}`. */
    entry: (
      collectionSlug: string,
      entrySlug: string,
      language = 'en',
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = `${langPrefix}/collections/${collectionSlug}/${entrySlug}`;
      return siteSlug ? `/${siteSlug}${base}` : base;
    },
    /** Collection archive/index URLs. */
    collectionArchive: (
      collectionSlug: string,
      language = 'en',
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = `${langPrefix}/collections/${collectionSlug}`;
      return siteSlug ? `/${siteSlug}${base}` : base;
    },
    collectionsIndex: (
      language = 'en',
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = `${langPrefix}/collections`;
      return siteSlug ? `/${siteSlug}${base}` : base;
    },
    collectionAuthor: (
      collectionSlug: string,
      authorId: string,
      language = 'en',
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = `${langPrefix}/collections/${collectionSlug}/author/${authorId}`;
      return siteSlug ? `/${siteSlug}${base}` : base;
    },
    collectionTerm: (
      collectionSlug: string,
      taxonomyKey: string,
      termSlug: string,
      language = 'en',
      defaultLocale = 'en',
      siteSlug?: string
    ) => {
      const langPrefix = language === defaultLocale ? '' : `/${language}`;
      const base = `${langPrefix}/collections/${collectionSlug}/${taxonomyKey}/${termSlug}`;
      return siteSlug ? `/${siteSlug}${base}` : base;
    },
    PREVIEW: (pageId: string) =>
      `/api/preview?pageId=${encodeURIComponent(pageId)}`,
    PREVIEW_POST: (postId: string) =>
      `/api/preview?postId=${encodeURIComponent(postId)}`,
    PREVIEW_TOKEN: (token: string) =>
      `/api/preview?token=${encodeURIComponent(token)}`,
    EXIT_PREVIEW: '/api/preview/exit',
  },
};
