export const PAGES = {
  AUTH: {
    LOGIN: '/login',
  },
  DASHBOARD: {
    ROOT: '/dashboard',
    PAGES: {
      CREATE: '/dashboard/pages/create',
      BUiLDER: '/dashboard/pages/create/builder',
      INDEX: '/dashboard/pages',
      VIEW: (id: string) => `/dashboard/pages/${id}`,
      EDIT: (id: string) => `/dashboard/pages/${id}/edit`,
    },
  },
};
