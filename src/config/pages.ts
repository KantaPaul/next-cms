export const PAGES = {
  AUTH: {
    LOGIN: "/login",
  },
  DASHBOARD: {
    ROOT: "/dashboard/welcome",
    CATEGORIES: {
      CREATE: "/dashboard/categories/create",
      INDEX: "/dashboard/categories",
      VIEW: (id: string) => `/dashboard/categories/${id}`,
      EDIT: (id: string) => `/dashboard/categories/${id}/edit`,
    },
  },
};
