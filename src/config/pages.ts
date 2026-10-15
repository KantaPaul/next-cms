export const PAGES = {
  AUTH: {
    LOGIN: '/login',
  },
  DASHBOARD: {
    ROOT: '/dashboard',
    PAGES: {
      CREATE: '/dashboard/pages/create',
      INDEX: '/dashboard/pages',
      EDIT: (id: string) => `/dashboard/pages/${id}/edit`,
      BUILDER: (id: string) => `/dashboard/pages/${id}/builder`,
    },
    MEDIA: '/dashboard/media',
    TAXONOMY: '/dashboard/taxonomy',
    MENUS: '/dashboard/menus',
    TEMPLATES: '/dashboard/templates',
    GLOBAL_BLOCK: (id: string) => `/dashboard/templates/globals/${id}`,
    SETTINGS: '/dashboard/settings',
    USERS: '/dashboard/users',
    API: '/dashboard/api',
  },
  SITE: {
    page: (slug: string, language = 'en', isHome = false) => {
      const prefix = language === 'en' ? '' : `/${language}`;
      return isHome ? prefix || '/' : `${prefix}/${slug}`;
    },
    PREVIEW: (pageId: string) => `/api/preview?pageId=${encodeURIComponent(pageId)}`,
    PREVIEW_TOKEN: (token: string) => `/api/preview?token=${encodeURIComponent(token)}`,
    EXIT_PREVIEW: '/api/preview/exit',
  },
};
