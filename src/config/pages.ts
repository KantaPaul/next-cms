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
      `/dashboard/analytics/boards/${id}/edit`,
    PAGES: {
      CREATE: '/dashboard/pages/create',
      INDEX: '/dashboard/pages',
      EDIT: (id: string) => `/dashboard/pages/${id}/edit`,
      BUILDER: (id: string) => `/dashboard/pages/${id}/builder`,
      /** Preview of the new editor (B3); replaces BUILDER after Gate 35. */
      EDITOR: (id: string) => `/dashboard/pages/${id}/editor`,
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
    CONTACT_FORMS: '/dashboard/contact-forms',
    CONTACT_FORM: (id: string) => `/dashboard/contact-forms/${id}`,
    CONTACT_FORMS_INBOX: '/dashboard/contact-forms/inbox',
    CONTACT_FORM_SUBMISSION: (id: string) =>
      `/dashboard/contact-forms/inbox/${id}`,
    COLLECTIONS: '/dashboard/collections',
    COLLECTION: (id: string) => `/dashboard/collections/${id}`,
    COLLECTION_ENTRIES: (id: string) => `/dashboard/collections/${id}/entries`,
    COLLECTION_ENTRY: (id: string, entryId: string) =>
      `/dashboard/collections/${id}/entries/${entryId}`,
    WEBHOOKS: '/dashboard/webhooks',
    REDIRECTS: '/dashboard/redirects',
    REVIEW: '/dashboard/review',
    ACCOUNT: '/dashboard/account',
    SETTINGS: '/dashboard/settings',
    SITES: '/dashboard/sites',
    USERS: '/dashboard/users',
    API: '/dashboard/api',
    VIDEOS: '/dashboard/videos',
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
    PREVIEW: (pageId: string) =>
      `/api/preview?pageId=${encodeURIComponent(pageId)}`,
    PREVIEW_POST: (postId: string) =>
      `/api/preview?postId=${encodeURIComponent(postId)}`,
    PREVIEW_TOKEN: (token: string) =>
      `/api/preview?token=${encodeURIComponent(token)}`,
    EXIT_PREVIEW: '/api/preview/exit',
  },
};
