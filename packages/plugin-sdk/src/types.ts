import type { BlockDefinition, FieldDef } from '@nextcms/builder-core';
import type { ComponentType } from 'react';
import type { z } from 'zod';

/** Consent categories enforced for visitor-facing head scripts. */
export type PluginConsentCategory =
  | 'necessary'
  | 'functional'
  | 'analytics'
  | 'marketing';

/** Role names supported by the CMS permission matrix. */
export type PluginRoleName = 'Admin' | 'Editor' | 'Author' | 'Viewer';

/** Permission declaration contributed by a plugin. */
export type PluginPermissionDef = {
  /** Dot-separated permission key, e.g. `mailchimp.manage`. */
  key: string;
  /** Human-readable label shown in the role matrix. */
  label: string;
  /** Default role grants; defaults to `{ Admin: true, Editor: false, Author: false, Viewer: false }`. */
  roles?: Partial<Record<PluginRoleName, boolean>>;
};

/** Metadata for rendering one plugin setting field in Dashboard -> Plugins -> Settings. */
export type PluginSettingField = {
  label: string;
  description?: string;
  type?: 'text' | 'password' | 'textarea' | 'number' | 'boolean' | 'select' | 'url';
  /** Secret fields are encrypted in the database and masked when sent to the browser. */
  secret?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
};

export type PluginSettingsDef<
  S extends z.ZodObject<any> = z.ZodObject<any>,
> = {
  schema: S;
  fields: Record<string, PluginSettingField>;
};

export type PluginLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

export type PluginKvStore = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: <T = unknown>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (prefix?: string) => Promise<Array<{ key: string; value: unknown }>>;
};

export type PluginMailFn = (input: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}) => Promise<{ sent: boolean; reason?: string }>;

export type PluginStorageDriver = {
  put: (
    key: string,
    body: Buffer,
    contentType: string
  ) => Promise<{ url: string }>;
  remove: (key: string) => Promise<void>;
  read: (key: string) => Promise<Buffer | null>;
};

export type PluginSiteInfo = {
  id: string;
  name: string;
  slug: string | null;
  url: string | null;
  defaultLocale: string;
};

/** Runtime context passed to plugin hooks, filters, routes, cron jobs, and form actions. */
export type PluginContext<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = {
  pluginId: string;
  settings: TSettings;
  site: PluginSiteInfo;
  logger: PluginLogger;
  mail: PluginMailFn;
  storage: PluginStorageDriver;
  safeFetch: typeof fetch;
  db: any;
  kv: PluginKvStore;
};

/* ---------- Action Hooks ---------- */

export type ContentHookPayload = {
  id: string;
  type: 'page' | 'post' | 'entry';
  slug?: string | null;
  title?: string | null;
  siteId: string;
  actorId?: string | null;
  scheduled?: boolean;
};

export type EntryChangedPayload = {
  id: string;
  type: 'entry';
  collectionId?: string;
  slug?: string | null;
  action: 'created' | 'updated' | 'published' | 'unpublished' | 'deleted';
  siteId: string;
  actorId?: string | null;
};

export type FormSubmittedFileInfo = {
  field: string;
  name: string;
  size: number;
  mime: string;
};

export type FormSubmittedPayload = {
  submissionId: string;
  siteId: string;
  payload: Record<string, string>;
  files: FormSubmittedFileInfo[];
};

export type CommentCreatedPayload = {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  status: string;
  siteId: string;
};

export type MediaUploadedPayload = {
  id: string;
  key: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  siteId: string;
  actorId?: string | null;
};

export type UserSignedInPayload = {
  userId: string;
  method: string;
  siteId?: string;
};

/** Typed map of every CMS action hook and its payload. */
export type HookPayloadMap = {
  'content.published': ContentHookPayload;
  'content.unpublished': ContentHookPayload;
  'content.deleted': ContentHookPayload;
  'entry.changed': EntryChangedPayload;
  'form.submitted': FormSubmittedPayload;
  'comment.created': CommentCreatedPayload;
  'media.uploaded': MediaUploadedPayload;
  'user.signed_in': UserSignedInPayload;
};

export type HookName = keyof HookPayloadMap;

export type HookHandler<
  K extends HookName,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = (payload: HookPayloadMap[K], ctx: PluginContext<TSettings>) => Promise<void> | void;

export type HookRegistration<
  K extends HookName,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> =
  | HookHandler<K, TSettings>
  | {
      priority?: number;
      run: HookHandler<K, TSettings>;
    };

/* ---------- Filters ---------- */

/** Serializable inspector field definition for plugin-contributed form actions. */
export type FormActionInspectorField = {
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'custom';
  description?: string;
  placeholder?: string;
  /** Key of a custom field component registered in `plugin.client.tsx`'s `fields`. */
  fieldKey?: string;
  options?: Array<{ label: string; value: string | number | boolean }>;
};

export type FormActionRunInput = {
  submissionId: string;
  siteId: string;
  payload: Record<string, string>;
  files: FormSubmittedFileInfo[];
  config: Record<string, unknown>;
};

export type FormActionRunResult = {
  status: 'success' | 'skipped' | 'error';
  message?: string;
  error?: string;
};

export type PluginFormAction<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  label: string;
  /** Automatically populated by the CMS runtime when loaded from a plugin. */
  pluginId?: string;
  /** Inspector fields shown on ContactForm when this action is enabled. */
  fields?: Record<string, FormActionInspectorField>;
  run: (
    input: FormActionRunInput,
    ctx: PluginContext<TSettings>
  ) => Promise<FormActionRunResult | void>;
};

/** Head entries returned by the `site.head` filter. Scripts MUST declare `consentCategory`. */
export type SiteHeadItem =
  | {
      type: 'script';
      consentCategory: PluginConsentCategory;
      src?: string;
      inline?: string;
      async?: boolean;
      defer?: boolean;
      attrs?: Record<string, string>;
    }
  | {
      type: 'meta';
      attrs: Record<string, string>;
    }
  | {
      type: 'link';
      attrs: Record<string, string>;
    }
  | {
      type: 'html';
      html: string;
      /** Required if `html` contains a `<script` tag. */
      consentCategory?: PluginConsentCategory;
    };

export type ContentHtmlFilterMeta = {
  kind: 'page' | 'post' | 'collection-entry';
  id: string;
  slug?: string;
  title?: string;
  language?: string;
  siteId: string;
};

export type SiteHeadFilterMeta = {
  siteId: string;
};

export type FormActionsFilterMeta = {
  siteId: string;
};

/** Typed map of every CMS filter, its value type, and its extra filter context. */
export type FilterValueMap = {
  'form.actions': {
    value: PluginFormAction<any>[];
    meta: FormActionsFilterMeta;
  };
  'site.head': {
    value: SiteHeadItem[];
    meta: SiteHeadFilterMeta;
  };
  'content.html': {
    value: string;
    meta: ContentHtmlFilterMeta;
  };
};

export type FilterName = keyof FilterValueMap;

export type FilterHandler<
  K extends FilterName,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = (
  value: FilterValueMap[K]['value'],
  ctx: PluginContext<TSettings> & { meta: FilterValueMap[K]['meta'] }
) => Promise<FilterValueMap[K]['value']> | FilterValueMap[K]['value'];

export type FilterRegistration<
  K extends FilterName,
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> =
  | FilterHandler<K, TSettings>
  | {
      /** Lower numbers run first. Default: 10. */
      priority?: number;
      run: FilterHandler<K, TSettings>;
    };

/* ---------- Routes & Cron ---------- */

export type PluginRouteAuth = 'public' | string;

export type PluginRouteRequest = {
  request: Request;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  userId: string | null;
};

export type PluginRouteDef<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Route path relative to `/api/plugins/<id>`, e.g. `/lists` or `/items/:itemId`. */
  path: string;
  /** `'public'` or a CMS/plugin permission key. Defaults to the plugin's manage permission. */
  auth?: PluginRouteAuth;
  handler: (
    req: PluginRouteRequest,
    ctx: PluginContext<TSettings>
  ) => Promise<Response> | Response;
};

export type PluginCronDef<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = {
  id?: string;
  every: 'hourly' | 'daily';
  run: (ctx: PluginContext<TSettings>) => Promise<void> | void;
};

/* ---------- Server & Client Plugin Definitions ---------- */

export type ServerPluginInput<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  name: string;
  version: string;
  description?: string;
  /** Semver range of compatible Next CMS versions, e.g. `>=0.1.0`. */
  requires?: string;
  settings?: PluginSettingsDef<z.ZodObject<any>>;
  permissions?: PluginPermissionDef[];
  hooks?: {
    [K in HookName]?: HookRegistration<K, TSettings>;
  };
  filters?: {
    [K in FilterName]?: FilterRegistration<K, TSettings>;
  };
  routes?: PluginRouteDef<TSettings>[];
  cron?: PluginCronDef<TSettings>[];
  formActions?: PluginFormAction<TSettings>[];
};

export type ServerPluginDefinition<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> = ServerPluginInput<TSettings>;

export type PluginAdminPageProps = {
  pluginId: string;
  pluginName: string;
  pageSlug: string;
  settings: Record<string, unknown>;
};

export type PluginAdminPageDef = {
  slug: string;
  title: string;
  navLabel?: string;
  /** Required permission key; defaults to `settings.manage`. */
  permission?: string;
  component: ComponentType<PluginAdminPageProps>;
};

export type ClientPluginInput = {
  id: string;
  blocks?: BlockDefinition<any>[];
  /** Custom inspector field renderers keyed by `fieldKey` (e.g. `'mailchimp-audience'`). */
  fields?: Record<string, ComponentType<any>>;
  /** Optional client-side FieldDef overrides for form action inspector fields. */
  formActionFields?: Record<string, Record<string, FieldDef>>;
  adminPages?: PluginAdminPageDef[];
};

export type ClientPluginDefinition = ClientPluginInput;
