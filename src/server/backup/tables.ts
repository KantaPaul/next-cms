import { inArray, eq } from 'drizzle-orm';
import type { AnyPgTable, PgColumn } from 'drizzle-orm/pg-core';
import { SERVER_PLUGINS_BY_ID } from '@/plugins/generated/server-registry';
import {
  analyticsDashboards,
  apiKeys,
  categories,
  collectionBlocks,
  collectionEntries,
  collectionEntryTerms,
  collectionFields,
  collections,
  collectionTaxonomies,
  collectionTemplates,
  collectionTerms,
  externalApis,
  commentReactions,
  comments,
  formSubmissions,
  globalBlocks,
  loopTemplates,
  media,
  menuItems,
  menus,
  overlayStats,
  pageCategories,
  pageContents,
  pageExperiments,
  pageRevisions,
  pages,
  pageTags,
  pageTemplates,
  pageViews,
  pluginKv,
  plugins,
  postCategories,
  postContents,
  postRevisions,
  postSeo,
  posts,
  postTags,
  postTemplates,
  redirects,
  roles,
  searchDocuments,
  searchQueries,
  seoMeta,
  siteMemberships,
  siteSettings,
  tags,
  templateRules,
  users,
  videoPlaylists,
  videoProgress,
  videos,
  webhookDeliveries,
  webhookSubscriptions,
} from '@/db/schema';

export const EXCLUDED_SECRETS = [
  'session (active staff sessions)',
  'login_tokens',
  'auth_attempts',
  'users.password_hash',
  'users.totp_secret',
  'api_keys.hashed_key',
  'site_settings.integrations.mailchimp.apiKey',
  'webhook_subscriptions.secret',
  'external_apis.secrets and credential headers',
  'plugins.settings (secret fields)',
] as const;

export type BackupTableSpec = {
  name: string;
  table: AnyPgTable;
  idCol?: PgColumn;
  /** How rows are scoped to `siteId`. */
  scope:
    | { kind: 'site'; siteCol: PgColumn }
    | { kind: 'parent'; fkCol: PgColumn; parentTable: AnyPgTable; parentIdCol: PgColumn; parentSiteCol: PgColumn }
    | { kind: 'global_ref' };
  /** Fields removed or redacted when writing JSON. */
  scrub?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Columns omitted on restore insert (e.g. generated tsvector columns). */
  omitOnRestore?: string[];
  /** Self-referential parent column (e.g. `parentId`) sorted parents-first on restore. */
  selfParentKey?: string;
  /** Date/timestamp columns to coerce back from ISO strings on restore. */
  dateColumns?: string[];
  /** Whether restore deletes existing site rows and replaces them (`true`) or only inserts missing rows (`false`). */
  replaceOnRestore: boolean;
};

const STANDARD_DATES = [
  'createdAt',
  'updatedAt',
  'deletedAt',
  'publishedAt',
  'scheduledAt',
  'lastUsedAt',
  'revokedAt',
  'approvedAt',
  'lockedUntil',
  'disabledAt',
  'lastAccessedAt',
  'expiresAt',
];

export function scrubUserRow(row: Record<string, unknown>): Record<string, unknown> {
  const { passwordHash: _p, totpSecret: _t, ...rest } = row;
  return rest;
}

export function scrubSiteSettingsRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const integrations =
    row.integrations && typeof row.integrations === 'object'
      ? { ...(row.integrations as Record<string, unknown>) }
      : {};
  if (integrations.mailchimp && typeof integrations.mailchimp === 'object') {
    const { apiKey: _k, ...mcRest } = integrations.mailchimp as Record<
      string,
      unknown
    >;
    integrations.mailchimp = mcRest;
  }
  return { ...row, integrations };
}

export function scrubApiKeyRow(row: Record<string, unknown>): Record<string, unknown> {
  const { hashedKey: _h, ...rest } = row;
  return rest;
}

export function scrubWebhookSubscriptionRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const { secret: _s, ...rest } = row;
  return rest;
}

const SENSITIVE_HEADER_RE =
  /^(authorization|proxy-authorization|cookie)$|secret|token|password|api[-_]?key/i;

/**
 * External API presets: drop the encrypted vault and any header that holds a
 * credential. `{{secret.*}}` / `{{env.*}}` placeholders are kept, since they
 * carry no value themselves.
 */
export function scrubExternalApiRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const headers =
    row.headers && typeof row.headers === 'object' && !Array.isArray(row.headers)
      ? (row.headers as Record<string, unknown>)
      : {};
  const kept: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(headers)) {
    const text = typeof val === 'string' ? val : '';
    const isPlaceholder = /^(?:Bearer\s+)?\{\{(?:secret|env)\.[A-Za-z0-9_.-]+\}\}$/i.test(
      text.trim()
    );
    if (text.startsWith('enc:v1:')) continue;
    if (SENSITIVE_HEADER_RE.test(key) && !isPlaceholder) continue;
    kept[key] = val;
  }
  return { ...row, headers: kept, secrets: {} };
}

export function scrubPluginBackupRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const settings =
    row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? { ...(row.settings as Record<string, unknown>) }
      : {};
  const pluginId = typeof row.pluginId === 'string' ? row.pluginId : '';
  const fieldDefs = SERVER_PLUGINS_BY_ID[pluginId]?.settings?.fields ?? {};
  for (const [key, val] of Object.entries(settings)) {
    if (
      fieldDefs[key]?.secret ||
      (typeof val === 'string' && val.startsWith('enc:v1:')) ||
      /secret|apikey|api_key|token|password/i.test(key)
    ) {
      delete settings[key];
    }
  }
  return { ...row, settings };
}

/**
 * Single authoritative list of tables included in site backups,
 * ordered in FK-safe restore order (parents before children).
 * Deleting on restore runs in reverse order.
 */
export const BACKUP_TABLES: BackupTableSpec[] = [
  {
    name: 'roles',
    table: roles,
    idCol: roles.id,
    scope: { kind: 'global_ref' },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: false,
  },
  {
    name: 'users',
    table: users,
    idCol: users.id,
    scope: { kind: 'global_ref' },
    scrub: scrubUserRow,
    dateColumns: STANDARD_DATES,
    replaceOnRestore: false,
  },
  {
    name: 'site_memberships',
    table: siteMemberships,
    idCol: siteMemberships.id,
    scope: { kind: 'site', siteCol: siteMemberships.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'menus',
    table: menus,
    idCol: menus.id,
    scope: { kind: 'site', siteCol: menus.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'site_settings',
    table: siteSettings,
    idCol: siteSettings.id,
    scope: { kind: 'site', siteCol: siteSettings.siteId },
    scrub: scrubSiteSettingsRow,
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'categories',
    table: categories,
    idCol: categories.id,
    scope: { kind: 'site', siteCol: categories.siteId },
    selfParentKey: 'parentId',
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'tags',
    table: tags,
    idCol: tags.id,
    scope: { kind: 'site', siteCol: tags.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'media',
    table: media,
    idCol: media.id,
    scope: { kind: 'site', siteCol: media.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'global_blocks',
    table: globalBlocks,
    idCol: globalBlocks.id,
    scope: { kind: 'site', siteCol: globalBlocks.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'menu_items',
    table: menuItems,
    idCol: menuItems.id,
    scope: {
      kind: 'parent',
      fkCol: menuItems.menuId,
      parentTable: menus,
      parentIdCol: menus.id,
      parentSiteCol: menus.siteId,
    },
    selfParentKey: 'parentId',
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'template_rules',
    table: templateRules,
    idCol: templateRules.id,
    scope: { kind: 'site', siteCol: templateRules.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'page_templates',
    table: pageTemplates,
    idCol: pageTemplates.id,
    scope: { kind: 'site', siteCol: pageTemplates.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'pages',
    table: pages,
    idCol: pages.id,
    scope: { kind: 'site', siteCol: pages.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'page_contents',
    table: pageContents,
    idCol: pageContents.id,
    scope: {
      kind: 'parent',
      fkCol: pageContents.pageId,
      parentTable: pages,
      parentIdCol: pages.id,
      parentSiteCol: pages.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'page_revisions',
    table: pageRevisions,
    idCol: pageRevisions.id,
    scope: {
      kind: 'parent',
      fkCol: pageRevisions.pageId,
      parentTable: pages,
      parentIdCol: pages.id,
      parentSiteCol: pages.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'seo_meta',
    table: seoMeta,
    idCol: seoMeta.id,
    scope: {
      kind: 'parent',
      fkCol: seoMeta.pageId,
      parentTable: pages,
      parentIdCol: pages.id,
      parentSiteCol: pages.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'page_categories',
    table: pageCategories,
    scope: {
      kind: 'parent',
      fkCol: pageCategories.pageId,
      parentTable: pages,
      parentIdCol: pages.id,
      parentSiteCol: pages.siteId,
    },
    replaceOnRestore: true,
  },
  {
    name: 'page_tags',
    table: pageTags,
    scope: {
      kind: 'parent',
      fkCol: pageTags.pageId,
      parentTable: pages,
      parentIdCol: pages.id,
      parentSiteCol: pages.siteId,
    },
    replaceOnRestore: true,
  },
  {
    name: 'post_templates',
    table: postTemplates,
    idCol: postTemplates.id,
    scope: { kind: 'site', siteCol: postTemplates.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'posts',
    table: posts,
    idCol: posts.id,
    scope: { kind: 'site', siteCol: posts.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'post_contents',
    table: postContents,
    idCol: postContents.id,
    scope: {
      kind: 'parent',
      fkCol: postContents.postId,
      parentTable: posts,
      parentIdCol: posts.id,
      parentSiteCol: posts.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'post_revisions',
    table: postRevisions,
    idCol: postRevisions.id,
    scope: {
      kind: 'parent',
      fkCol: postRevisions.postId,
      parentTable: posts,
      parentIdCol: posts.id,
      parentSiteCol: posts.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'post_seo',
    table: postSeo,
    idCol: postSeo.id,
    scope: {
      kind: 'parent',
      fkCol: postSeo.postId,
      parentTable: posts,
      parentIdCol: posts.id,
      parentSiteCol: posts.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'post_categories',
    table: postCategories,
    scope: {
      kind: 'parent',
      fkCol: postCategories.postId,
      parentTable: posts,
      parentIdCol: posts.id,
      parentSiteCol: posts.siteId,
    },
    replaceOnRestore: true,
  },
  {
    name: 'post_tags',
    table: postTags,
    scope: {
      kind: 'parent',
      fkCol: postTags.postId,
      parentTable: posts,
      parentIdCol: posts.id,
      parentSiteCol: posts.siteId,
    },
    replaceOnRestore: true,
  },
  {
    name: 'collections',
    table: collections,
    idCol: collections.id,
    scope: { kind: 'site', siteCol: collections.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_fields',
    table: collectionFields,
    idCol: collectionFields.id,
    scope: {
      kind: 'parent',
      fkCol: collectionFields.collectionId,
      parentTable: collections,
      parentIdCol: collections.id,
      parentSiteCol: collections.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_taxonomies',
    table: collectionTaxonomies,
    idCol: collectionTaxonomies.id,
    scope: { kind: 'site', siteCol: collectionTaxonomies.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_terms',
    table: collectionTerms,
    idCol: collectionTerms.id,
    scope: { kind: 'site', siteCol: collectionTerms.siteId },
    selfParentKey: 'parentId',
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_templates',
    table: collectionTemplates,
    idCol: collectionTemplates.id,
    scope: { kind: 'site', siteCol: collectionTemplates.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_blocks',
    table: collectionBlocks,
    idCol: collectionBlocks.id,
    scope: { kind: 'site', siteCol: collectionBlocks.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_entries',
    table: collectionEntries,
    idCol: collectionEntries.id,
    scope: { kind: 'site', siteCol: collectionEntries.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'collection_entry_terms',
    table: collectionEntryTerms,
    scope: {
      kind: 'parent',
      fkCol: collectionEntryTerms.entryId,
      parentTable: collectionEntries,
      parentIdCol: collectionEntries.id,
      parentSiteCol: collectionEntries.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'loop_templates',
    table: loopTemplates,
    idCol: loopTemplates.id,
    scope: { kind: 'site', siteCol: loopTemplates.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'external_apis',
    table: externalApis,
    idCol: externalApis.id,
    scope: { kind: 'site', siteCol: externalApis.siteId },
    scrub: scrubExternalApiRow,
    dateColumns: STANDARD_DATES,
    // Insert-only: replacing would wipe the secrets that backups never hold.
    replaceOnRestore: false,
  },
  {
    name: 'redirects',
    table: redirects,
    idCol: redirects.id,
    scope: { kind: 'site', siteCol: redirects.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'form_submissions',
    table: formSubmissions,
    idCol: formSubmissions.id,
    scope: { kind: 'site', siteCol: formSubmissions.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'comments',
    table: comments,
    idCol: comments.id,
    scope: { kind: 'site', siteCol: comments.siteId },
    selfParentKey: 'parentId',
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'comment_reactions',
    table: commentReactions,
    scope: {
      kind: 'parent',
      fkCol: commentReactions.commentId,
      parentTable: comments,
      parentIdCol: comments.id,
      parentSiteCol: comments.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'video_playlists',
    table: videoPlaylists,
    idCol: videoPlaylists.id,
    scope: { kind: 'site', siteCol: videoPlaylists.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'videos',
    table: videos,
    idCol: videos.id,
    scope: { kind: 'site', siteCol: videos.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'video_progress',
    table: videoProgress,
    idCol: videoProgress.id,
    scope: { kind: 'site', siteCol: videoProgress.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'search_documents',
    table: searchDocuments,
    idCol: searchDocuments.id,
    scope: { kind: 'site', siteCol: searchDocuments.siteId },
    omitOnRestore: ['searchVector'],
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'search_queries',
    table: searchQueries,
    idCol: searchQueries.id,
    scope: { kind: 'site', siteCol: searchQueries.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'analytics_dashboards',
    table: analyticsDashboards,
    idCol: analyticsDashboards.id,
    scope: { kind: 'site', siteCol: analyticsDashboards.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'page_experiments',
    table: pageExperiments,
    idCol: pageExperiments.id,
    scope: { kind: 'site', siteCol: pageExperiments.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'page_views',
    table: pageViews,
    idCol: pageViews.id,
    scope: { kind: 'site', siteCol: pageViews.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'overlay_stats',
    table: overlayStats,
    idCol: overlayStats.id,
    scope: { kind: 'site', siteCol: overlayStats.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'webhook_subscriptions',
    table: webhookSubscriptions,
    idCol: webhookSubscriptions.id,
    scope: { kind: 'site', siteCol: webhookSubscriptions.siteId },
    scrub: scrubWebhookSubscriptionRow,
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'webhook_deliveries',
    table: webhookDeliveries,
    idCol: webhookDeliveries.id,
    scope: {
      kind: 'parent',
      fkCol: webhookDeliveries.subscriptionId,
      parentTable: webhookSubscriptions,
      parentIdCol: webhookSubscriptions.id,
      parentSiteCol: webhookSubscriptions.siteId,
    },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
  {
    name: 'api_keys',
    table: apiKeys,
    idCol: apiKeys.id,
    scope: { kind: 'site', siteCol: apiKeys.siteId },
    scrub: scrubApiKeyRow,
    dateColumns: STANDARD_DATES,
    // API keys cannot be restored without their hashes; keep existing keys untouched.
    replaceOnRestore: false,
  },
  {
    name: 'plugins',
    table: plugins,
    idCol: plugins.id,
    scope: { kind: 'site', siteCol: plugins.siteId },
    scrub: scrubPluginBackupRow,
    dateColumns: [...STANDARD_DATES, 'installedAt', 'lastErrorAt'],
    replaceOnRestore: true,
  },
  {
    name: 'plugin_kv',
    table: pluginKv,
    idCol: pluginKv.id,
    scope: { kind: 'site', siteCol: pluginKv.siteId },
    dateColumns: STANDARD_DATES,
    replaceOnRestore: true,
  },
];

export function scopeConditionForBackupTable(
  spec: BackupTableSpec,
  dbRef: { select: any },
  siteId: string
) {
  if (spec.scope.kind === 'site') {
    return eq(spec.scope.siteCol, siteId);
  }
  if (spec.scope.kind === 'parent') {
    const parentSubquery = dbRef
      .select({ id: spec.scope.parentIdCol })
      .from(spec.scope.parentTable)
      .where(eq(spec.scope.parentSiteCol, siteId));
    return inArray(spec.scope.fkCol, parentSubquery);
  }
  return undefined;
}
