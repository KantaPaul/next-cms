export const PAGES = {
  AUTH: {
    LOGIN: '/login',
  },
  DASHBOARD: {
    ROOT: '/dashboard',
    ANALYTICS: '/dashboard/analytics',
    PAGES: {
      CREATE: '/dashboard/pages/create',
      INDEX: '/dashboard/pages',
      EDIT: (id: string) => `/dashboard/pages/${id}/edit`,
      BUILDER: (id: string) => `/dashboard/pages/${id}/builder`,
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
    SETTINGS: '/dashboard/settings',
    USERS: '/dashboard/users',
    API: '/dashboard/api',
  },
  SITE: {
    page: (slug: string, language = 'en', isHome = false) => {
      const prefix = language === 'en' ? '' : `/${language}`;
      return isHome ? prefix || '/' : `${prefix}/${slug}`;
    },
    post: (slug: string, language = 'en') =>
      `${language === 'en' ? '' : `/${language}`}/blog/${slug}`,
    PREVIEW: (pageId: string) =>
      `/api/preview?pageId=${encodeURIComponent(pageId)}`,
    PREVIEW_POST: (postId: string) =>
      `/api/preview?postId=${encodeURIComponent(postId)}`,
    PREVIEW_TOKEN: (token: string) =>
      `/api/preview?token=${encodeURIComponent(token)}`,
    EXIT_PREVIEW: '/api/preview/exit',
  },
};
