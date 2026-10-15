export const PERMISSIONS = {
  PAGES_CREATE: 'pages.create',
  PAGES_EDIT: 'pages.edit',
  PAGES_REVIEW: 'pages.review',
  PAGES_PUBLISH: 'pages.publish',
  PAGES_DELETE: 'pages.delete',
  MEDIA_UPLOAD: 'media.upload',
  SETTINGS_MANAGE: 'settings.manage',
  API_MANAGE: 'api.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_NAMES = ['Admin', 'Editor', 'Author', 'Viewer'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const PERMISSION_MATRIX: {
  key: PermissionKey;
  label: string;
  roles: Record<RoleName, boolean>;
}[] = [
  {
    key: PERMISSIONS.PAGES_CREATE,
    label: 'Create new pages and drafts',
    roles: { Admin: true, Editor: true, Author: true, Viewer: false },
  },
  {
    key: PERMISSIONS.PAGES_EDIT,
    label: 'Edit content and the visual canvas',
    roles: { Admin: true, Editor: true, Author: true, Viewer: false },
  },
  {
    key: PERMISSIONS.PAGES_REVIEW,
    label: 'Submit drafts for review',
    roles: { Admin: true, Editor: true, Author: true, Viewer: false },
  },
  {
    key: PERMISSIONS.PAGES_PUBLISH,
    label: 'Publish, schedule, and edit any page',
    roles: { Admin: true, Editor: true, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.PAGES_DELETE,
    label: 'Delete and archive pages',
    roles: { Admin: true, Editor: true, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.MEDIA_UPLOAD,
    label: 'Upload and delete media',
    roles: { Admin: true, Editor: true, Author: true, Viewer: false },
  },
  {
    key: PERMISSIONS.SETTINGS_MANAGE,
    label: 'Manage site settings, menus, taxonomy, and users',
    roles: { Admin: true, Editor: false, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.API_MANAGE,
    label: 'Manage REST API keys',
    roles: { Admin: true, Editor: false, Author: false, Viewer: false },
  },
];

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  Admin: 'Full access, including settings, users, and API keys',
  Editor: 'Edits and publishes any page',
  Author: 'Writes drafts and submits them for review',
  Viewer: 'Read-only access to the dashboard',
};
