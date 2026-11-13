import { PLUGIN_PERMISSIONS } from '@/plugins/generated/permissions';

export const PERMISSIONS = {
  PAGES_CREATE: 'pages.create',
  PAGES_EDIT: 'pages.edit',
  PAGES_REVIEW: 'pages.review',
  PAGES_PUBLISH: 'pages.publish',
  PAGES_DELETE: 'pages.delete',
  MEDIA_UPLOAD: 'media.upload',
  SETTINGS_MANAGE: 'settings.manage',
  API_MANAGE: 'api.manage',
  VIDEOS_CREATE: 'videos.create',
  VIDEOS_EDIT: 'videos.edit',
  VIDEOS_PUBLISH: 'videos.publish',
  VIDEOS_DELETE: 'videos.delete',
  LICENSES_MANAGE: 'licenses.manage',
  POST_TYPES_MANAGE: 'post_types.manage',
  COMMENTS_MODERATE: 'comments.moderate',
  DESIGN_MANAGE: 'design.manage',
  EXTERNAL_API_MANAGE: 'external_api.manage',
} as const;

export type BuiltinPermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type PermissionKey = BuiltinPermissionKey | (string & {});

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
  {
    key: PERMISSIONS.VIDEOS_CREATE,
    label: 'Create and edit videos',
    roles: { Admin: true, Editor: true, Author: true, Viewer: false },
  },
  {
    key: PERMISSIONS.VIDEOS_EDIT,
    label: 'Edit any video',
    roles: { Admin: true, Editor: true, Author: true, Viewer: false },
  },
  {
    key: PERMISSIONS.VIDEOS_PUBLISH,
    label: 'Publish and unpublish videos',
    roles: { Admin: true, Editor: true, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.VIDEOS_DELETE,
    label: 'Delete and archive videos',
    roles: { Admin: true, Editor: true, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.LICENSES_MANAGE,
    label: 'Manage single-install licenses and bindings',
    roles: { Admin: true, Editor: false, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.POST_TYPES_MANAGE,
    label: 'Create post types and edit their fields',
    roles: { Admin: true, Editor: true, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.COMMENTS_MODERATE,
    label: 'Approve, reply to, and remove blog comments',
    roles: { Admin: true, Editor: true, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.DESIGN_MANAGE,
    label: 'Manage site design tokens, classes, and theme',
    roles: { Admin: true, Editor: false, Author: false, Viewer: false },
  },
  {
    key: PERMISSIONS.EXTERNAL_API_MANAGE,
    label: 'Manage external API connections and secrets',
    roles: { Admin: true, Editor: false, Author: false, Viewer: false },
  },
  ...PLUGIN_PERMISSIONS.map(perm => ({
    key: perm.key as PermissionKey,
    label: perm.label,
    roles: {
      Admin: perm.roles?.Admin ?? true,
      Editor: perm.roles?.Editor ?? false,
      Author: perm.roles?.Author ?? false,
      Viewer: perm.roles?.Viewer ?? false,
    },
  })),
];

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  Admin: 'Full access, including settings, users, and API keys',
  Editor: 'Edits and publishes any page',
  Author: 'Writes drafts and submits them for review',
  Viewer: 'Read-only access to the dashboard',
};
