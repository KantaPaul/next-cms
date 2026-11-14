'use server';

import {
  type ListingQueryResult,
  type NormalizedListingItem,
  listingQuerySchema,
} from '@nextcms/builder-core';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { collections } from '@/db/schema';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import {
  externalApisService,
  presetToApiConfig,
} from '@/server/services/external-apis.service';
import { siteContext } from '@/server/services/site-context';
import { listingQueryService } from '@/server/services/listing-query.service';
import {
  type PaginatedSearchResponse,
  type SearchQueryInput,
  searchIndex,
} from '@/server/services/search.service';

const publicListingInputSchema = z.object({
  source: z.enum([
    'posts',
    'pages',
    'collection-entries',
    'videos',
    'external-api',
  ]),
  collectionId: z.string().optional(),
  presetId: z.string().min(1).optional(),
  filters: z.array(z.any()).optional(),
  fieldFilters: z.array(z.any()).optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  page: z.number().int().min(1).optional(),
  excludeCurrent: z.boolean().optional(),
  currentId: z.string().optional(),
  language: z.string().optional(),
  includeFacets: z.boolean().optional(),
});

export type PublicListingQueryInput = z.infer<typeof publicListingInputSchema>;

/**
 * Public listing query action.
 * Never accepts inline `apiConfig`, caller-supplied `site`, or `skipCache`.
 * External API queries must reference a saved `presetId` belonging to the
 * server-resolved public site.
 */
export async function resolveListingQuery(
  rawInput: PublicListingQueryInput
): Promise<ListingQueryResult> {
  const input = publicListingInputSchema.parse(rawInput);
  const pageSize = input.limit ?? 12;
  const page = input.page ?? 1;
  // Public and callable by anyone: cap calls per visitor IP.
  const { clientIp } = await import('@/server/lib/client-ip');
  const { allowVisitorListingCall, EXTERNAL_API_RATE_LIMITED } = await import(
    '@/server/lib/external-api-rate-limit'
  );
  if (!(await allowVisitorListingCall(clientIp(await headers())))) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      hasMore: false,
      error: EXTERNAL_API_RATE_LIMITED,
    };
  }
  const site = await siteContext.publicSite();

  if (input.source === 'external-api') {
    if (!input.presetId) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        hasMore: false,
        error: 'External API presetId is required.',
      };
    }
    const preset = await externalApisService.getByIdForRuntime(
      input.presetId,
      site.id
    );
    if (!preset) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        hasMore: false,
        error: 'External API preset not found.',
      };
    }
    return listingQueryService.resolve(
      {
        source: 'external-api',
        filters: input.filters,
        sortField: input.sortField,
        sortOrder: input.sortOrder,
        limit: input.limit,
        offset: input.offset,
        page: input.page,
        excludeCurrent: input.excludeCurrent,
        currentId: input.currentId,
        apiConfig: presetToApiConfig(preset),
      },
      {
        site,
        language: input.language,
        currentId: input.currentId,
        includeFacets: input.includeFacets,
        skipCache: false,
        secrets: preset.secrets ?? {},
        // Headers here come only from the saved, Admin-managed preset.
        allowEnvPlaceholders: true,
      }
    );
  }

  return listingQueryService.resolve(
    {
      source: input.source,
      ...(input.collectionId ? { collectionId: input.collectionId } : {}),
      filters: input.filters,
      ...(input.fieldFilters ? { fieldFilters: input.fieldFilters } : {}),
      sortField: input.sortField,
      sortOrder: input.sortOrder,
      limit: input.limit,
      offset: input.offset,
      page: input.page,
      excludeCurrent: input.excludeCurrent,
      currentId: input.currentId,
    },
    {
      site,
      language: input.language,
      currentId: input.currentId,
      includeFacets: input.includeFacets,
      skipCache: false,
    }
  );
}

/**
 * Authenticated editor/preview listing query action.
 * Inline `apiConfig` is permitted only for users with `EXTERNAL_API_MANAGE`.
 */
export const resolveEditorListingQuery = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
)
  .input(
    z.object({
      config: z.unknown(),
      language: z.string().optional(),
      currentId: z.string().optional(),
      includeFacets: z.boolean().optional(),
      skipCache: z.boolean().optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const parsed = listingQuerySchema.parse(input.config);
    if (
      parsed.source === 'external-api' &&
      parsed.apiConfig &&
      !ctx.access.permissions.includes(PERMISSIONS.EXTERNAL_API_MANAGE)
    ) {
      throw new Error(
        'Missing permission to execute inline external API configurations.'
      );
    }
    const site = await siteContext.adminSite(ctx.user.userId);
    return listingQueryService.resolve(parsed, {
      site,
      language: input.language,
      currentId: input.currentId,
      includeFacets: input.includeFacets,
      skipCache: Boolean(input.skipCache),
      // Env placeholders only for users who manage External API connections.
      allowEnvPlaceholders: ctx.access.permissions.includes(
        PERMISSIONS.EXTERNAL_API_MANAGE
      ),
    });
  });

export async function resolvePaginatedSearch(
  input: SearchQueryInput
): Promise<PaginatedSearchResponse> {
  return searchIndex.searchPaginated(input);
}

/**
 * Published entries for the Post type entries block. Resolves the post type
 * by id, or by slug for block presets: presets install as `team`, `team-2`…,
 * so the newest matching type wins.
 */
export async function resolvePostTypeEntries(input: {
  collectionId?: string;
  postTypeSlug?: string;
  limit?: number;
  newestFirst?: boolean;
  language?: string;
}): Promise<{ items: NormalizedListingItem[]; resolvedCollectionId: string }> {
  const site = await siteContext.publicSite();
  let collectionId = input.collectionId ?? '';
  const slug = (input.postTypeSlug ?? '').trim().replace(/[^a-z0-9-]/g, '');

  if (!collectionId && slug) {
    const [row] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          or(
            eq(collections.slug, slug),
            sql`${collections.slug} ~ ${`^${slug}-[0-9]+$`}`
          ),
          eq(collections.siteId, site.id),
          eq(collections.status, 'active'),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(desc(collections.createdAt))
      .limit(1);
    collectionId = row?.id ?? '';
  }
  if (!collectionId) return { items: [], resolvedCollectionId: '' };

  const result = await listingQueryService.resolve(
    {
      source: 'collection-entries',
      collectionId,
      sortField: 'createdAt',
      sortOrder: input.newestFirst ? 'desc' : 'asc',
      limit: Math.min(Math.max(input.limit ?? 12, 1), 100),
    },
    { site, language: input.language }
  );
  return { items: result.items, resolvedCollectionId: collectionId };
}

/** Related published collection entries from the same collection/archive. */
export async function resolveRelatedCollectionEntries(input: {
  collectionId: string;
  entryId?: string;
  language?: string;
  limit?: number;
  siteSlug?: string;
}): Promise<import('@/builder/post-template').PostCard[]> {
  const site = await siteContext.publicSite();
  if (!input.collectionId) return [];
  const prefix = input.siteSlug ? `/${input.siteSlug}` : '';

  const result = await listingQueryService.resolve(
    {
      source: 'collection-entries',
      collectionId: input.collectionId,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      limit: Math.min(Math.max(input.limit ?? 3, 1), 12),
      page: 1,
      ...(input.entryId ? { currentId: input.entryId } : {}),
    },
    { site, language: input.language, currentId: input.entryId }
  );

  return result.items.map(item => {
    const raw = (item.raw && typeof item.raw === 'object' ? item.raw : {}) as any;
    const url = prefix
      ? item.url.startsWith(prefix)
        ? item.url
        : `${prefix}${item.url.startsWith('/') ? '' : '/'}${item.url}`
      : item.url;
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      language: raw.language ?? input.language ?? 'en',
      excerpt: item.excerpt ?? raw.excerpt ?? null,
      featuredImage: item.image ?? raw.featuredImage ?? null,
      publishedAt: item.publishedAt ?? null,
      authorName: item.author?.name ?? raw.authorName ?? null,
      authorUrl: raw.authorId
        ? `${prefix}/collections/${raw.collection?.slug ?? raw.collectionSlug ?? ''}/author/${raw.authorId}`
        : null,
      categories: [],
      tags: [],
      url,
    };
  });
}

const inspectExternalApiSchema = z.object({
  presetId: z.string().optional(),
  endpointUrl: z.string().trim().default(''),
  method: z.enum(['GET', 'POST']).optional(),
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  itemsPath: z.string().optional(),
  idKey: z.string().optional(),
  titleKey: z.string().optional(),
  timeoutMs: z.number().optional(),
});

/**
 * Fetches an External API endpoint from the builder inspector, returning:
 * - `postOptions`: selectable posts/items from the response
 * - `keys`: all discovered keys (top-level, nested dot-notation like `address.street`, and array keys with `subKeys`)
 * - `detectedItemsPath`: auto-detected items array path if root was an object wrapper
 */
export const inspectExternalApiAction = permissionProcedure(
  PERMISSIONS.EXTERNAL_API_MANAGE
)
  .input(inspectExternalApiSchema)
  .action(
    async ({
      input,
      ctx,
    }): Promise<{
      ok: boolean;
      error?: string;
      postOptions: import('@/lib/external-api-schema').ExternalApiPreviewPostOption[];
      keys: import('@/lib/external-api-schema').DiscoveredApiKey[];
      detectedItemsPath: string;
      totalItems: number;
    }> => {
      const endpointUrl = (input.endpointUrl ?? '').trim();
      if (!endpointUrl) {
        return {
          ok: false,
          error: 'Enter an External API Endpoint URL to fetch keys and posts.',
          postOptions: [],
          keys: [],
          detectedItemsPath: '',
          totalItems: 0,
        };
      }

      const { allowExternalApiHostCall, allowInspectCall, EXTERNAL_API_RATE_LIMITED } =
        await import('@/server/lib/external-api-rate-limit');
      if (
        !(await allowInspectCall(ctx.user.userId)) ||
        !(await allowExternalApiHostCall(endpointUrl))
      ) {
        return {
          ok: false,
          error: EXTERNAL_API_RATE_LIMITED,
          postOptions: [],
          keys: [],
          detectedItemsPath: '',
          totalItems: 0,
        };
      }

      try {
        const { fetchJsonCapped, safeFetch } = await import(
          '@/server/lib/safe-fetch'
        );
        const {
          interpolateExternalApiHeaders,
          isMaskedSecret,
          isSameOriginUrl,
        } = await import('@/server/lib/external-api-secrets');
        const {
          applyExternalApiQueryParams,
          discoverExternalApiSchema,
          extractExternalApiPostsList,
        } = await import('@/lib/external-api-schema');

        let secrets: Record<string, string> = {};
        let rawHeaders: Record<string, string> = { ...(input.headers ?? {}) };
        // Env placeholders resolve only when inspecting a preset on its own host.
        let allowEnv = false;

        if (input.presetId) {
          const preset = await externalApisService.getByIdForRuntime(
            input.presetId
          );
          // Stored credentials only go to the preset's own origin, never to a
          // different URL typed into the inspector.
          if (preset && isSameOriginUrl(preset.endpointUrl, endpointUrl)) {
            secrets = preset.secrets ?? {};
            allowEnv = true;
            const storedHeaders = preset.headers ?? {};
            const merged: Record<string, string> = {};
            for (const [k, v] of Object.entries(rawHeaders)) {
              merged[k] =
                isMaskedSecret(v) && storedHeaders[k] !== undefined
                  ? storedHeaders[k]
                  : v;
            }
            rawHeaders = merged;
          }
        }

        const method = input.method === 'POST' ? 'POST' : 'GET';
        const headers = interpolateExternalApiHeaders(rawHeaders, secrets, {
          allowEnv,
        });
        if (
          method === 'POST' &&
          input.body &&
          !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')
        ) {
          headers['Content-Type'] = 'application/json';
        }

        const timeoutMs = Math.min(
          Math.max(input.timeoutMs ?? 5000, 500),
          10000
        );
        const targetUrl = applyExternalApiQueryParams(
          endpointUrl,
          input.queryParams
        );
        const response = await safeFetch(targetUrl, {
          method,
          headers,
          ...(method === 'POST' && input.body ? { body: input.body } : {}),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          return {
            ok: false,
            error: `External API responded with status ${response.status}`,
            postOptions: [],
            keys: [],
            detectedItemsPath: '',
            totalItems: 0,
          };
        }

        const payload: unknown = await fetchJsonCapped(response);
        const { rawItems, postOptions, detectedItemsPath } =
          extractExternalApiPostsList(
            payload,
            input.itemsPath ?? '',
            input.idKey ?? 'id',
            input.titleKey ?? 'title'
          );

        if (rawItems.length === 0) {
          return {
            ok: false,
            error:
              'External API response did not contain any object records at the specified path.',
            postOptions: [],
            keys: [],
            detectedItemsPath,
            totalItems: 0,
          };
        }

        const keys = discoverExternalApiSchema(rawItems, 4);

        return {
          ok: true,
          postOptions: postOptions.slice(0, 100),
          keys,
          detectedItemsPath,
          totalItems: rawItems.length,
        };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error ? err.message : 'External API request failed.',
          postOptions: [],
          keys: [],
          detectedItemsPath: '',
          totalItems: 0,
        };
      }
    }
  );

