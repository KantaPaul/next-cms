/**
 * Server data loaders for builder blocks (R685 / ENG-06).
 *
 * Replaces Puck `resolveAllData` / per-component `resolveData` for the new
 * document format. Each loader receives the node's props and a site-scoped
 * context, and returns a prop patch to merge before render.
 *
 * Loaders are cache-safe when the host passes stable context (language, site)
 * and the underlying queries use React `cache` / Next cache tags (DAT-12/16).
 */

import {
  ALLOWED_SORT_FIELDS,
  type BuilderDocument,
  type BlockLoader as CoreBlockLoader,
  collectDynamicRefs,
  createLoaderRegistry,
  documentToPuck,
  encodeNamespacedParams,
  type FieldFilter,
  fieldFilterSchema,
  fieldSortKey,
  formatNamespacedParam,
  LISTING_SOURCES,
  type ListingSource,
  MAX_PAGE_SIZE,
  parseNamespacedParams,
  puckToDocument,
  type QueryFilter,
  resolveDynamicDocument,
} from '@nextcms/builder-core';
import type { VideoLibraryVideoItem } from '@/components/video/video-library';
import type { BlogActiveFilters, BlogPostsProps } from './blocks/blog';
import type { BuilderItem } from './data';
import type { PostView } from './post-template';

// Server actions are imported inside each loader, so importing this module
// (registry, tests) never loads the app's
// database or server-only code.

/* ---------- context ---------- */

export type ArchiveLoaderContext = {
  kind: 'category' | 'tag' | 'author' | 'date' | 'term';
  slug?: string;
  id?: string;
  title?: string;
  description?: string | null;
  year?: number;
  month?: number;
};

export type LoaderContext = {
  /** Active site id when available (multisite). */
  siteId?: string;
  /** Page / post locale. */
  language?: string;
  /** Request search params (blog filters, pagination). */
  searchParams?: Record<string, string | string[] | undefined>;
  /** Current post when rendering a post template. */
  post?: PostView;
  /** Current page id when rendering a page. */
  pageId?: string;
  /** Collection entry context for entry/template rendering. */
  collectionEntry?: unknown;
  /** Archive route context when rendering a category, tag, author, or date archive (R595). */
  archive?: ArchiveLoaderContext;
  /** Preview / draft mode. */
  preview?: boolean;
  /** Theme tokens and other pass-through metadata. */
  [key: string]: unknown;
};

/** Returns a shallow prop patch merged onto the node's existing props. */
export type BlockLoader = CoreBlockLoader<LoaderContext>;

/* ---------- helpers ---------- */

function oneParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  if (!params) return undefined;
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) || undefined;
}

/* ---------- loaders ---------- */

const loadBlogPosts: BlockLoader = async (props, ctx) => {
  const p = props as BlogPostsProps;
  const params = ctx.searchParams ?? {};
  const sortRaw = oneParam(params, 'sort');
  const sort =
    sortRaw === 'newest' || sortRaw === 'oldest' || sortRaw === 'title'
      ? sortRaw
      : undefined;
  const page = Number(oneParam(params, 'page')) || 1;
  const active: BlogActiveFilters = {
    q: oneParam(params, 'q'),
    category: p.lockedCategory || oneParam(params, 'category'),
    tag: p.lockedTag || oneParam(params, 'tag'),
    sort,
    page,
  };
  const language = typeof ctx.language === 'string' ? ctx.language : undefined;

  const { getBlogFilterOptions, queryBlogPosts } =
    await import('@/server/actions/blog.actions');
  const [result, options] = await Promise.all([
    queryBlogPosts({
      language,
      q: active.q,
      category: active.category,
      tag: active.tag,
      sort,
      page,
      size: Number(p.pageSize) || 9,
    }),
    getBlogFilterOptions(language),
  ]);

  return {
    posts: result.posts,
    total: result.total,
    totalPages: result.totalPages,
    active,
    filterOptions: options,
  };
};

const loadRelatedPosts: BlockLoader = async (props, ctx) => {
  const limit = Number(props.limit) || 3;
  const current =
    (ctx.post as PostView | undefined) ??
    (ctx.collectionEntry
      ? {
          id: String((ctx.collectionEntry as any).id ?? ''),
          language: String(
            (ctx.collectionEntry as any).language ?? ctx.language ?? 'en'
          ),
          categories: [],
          tags: [],
        }
      : null);

  if (current && (ctx.collectionEntry as any)?.collectionId) {
    const { resolveRelatedCollectionEntries } =
      await import('@/server/actions/listing.actions');
    const posts = await resolveRelatedCollectionEntries({
      collectionId: String((ctx.collectionEntry as any).collectionId),
      entryId: current.id,
      language: current.language,
      limit,
      siteSlug: typeof ctx.siteSlug === 'string' ? ctx.siteSlug : '',
    });
    return { posts };
  }

  const [{ getRelatedPosts }, { SAMPLE_POST }] = await Promise.all([
    import('@/server/actions/blog.actions'),
    import('./post-template'),
  ]);
  const post = (ctx.post as PostView | undefined) ?? SAMPLE_POST;
  const posts = await getRelatedPosts({
    postId: post.id,
    categoryIds: post.categories.map((c: { id: string }) => c.id),
    language: post.language,
    limit,
  });
  return { posts };
};

/** Approved comments for the Comments block (blog posts and collection entries). */
const loadComments: BlockLoader = async (props, ctx) => {
  const post = ctx.post as PostView | undefined;
  if (!post?.id || post.id === 'sample-post') {
    return ctx.editor ? {} : { comments: [], total: 0, open: false };
  }
  const { getPostComments } = await import('@/server/actions/blog.actions');
  const targetKind =
    post.targetKind ?? (ctx.collectionEntry ? 'entry' : 'post');
  const result = await getPostComments({
    postId: post.id,
    targetKind,
    sort: props.sort === 'newest' ? 'newest' : 'oldest',
  });
  return {
    comments: result.items,
    total: result.total,
    open: result.open && post.allowComments !== false,
  };
};

const loadAuthorCard: BlockLoader = async (props, ctx) => {
  const post = ctx.post as PostView | undefined;
  if (
    props.showLatestPosts === false ||
    !post?.authorId ||
    ctx.collectionEntry
  ) {
    return { latestPosts: [] };
  }
  const { getAuthorPosts } = await import('@/server/actions/blog.actions');
  return {
    latestPosts: await getAuthorPosts({
      authorId: post.authorId,
      excludeId: post.id,
      language: post.language,
      limit: Number(props.latestCount) || 3,
    }),
  };
};

const loadPostNavigation: BlockLoader = async (props, ctx) => {
  const sameTerm = props.scope === 'same-term';
  const entry = ctx.collectionEntry as
    { id?: string; collection?: { slug?: string } } | undefined;
  if (entry?.id && entry.collection?.slug) {
    const { getAdjacentEntries } =
      await import('@/server/actions/entry-nav.actions');
    return getAdjacentEntries({
      entry,
      sameTerm,
      defaultLocale:
        typeof ctx.defaultLocale === 'string' ? ctx.defaultLocale : undefined,
      siteSlug: typeof ctx.siteSlug === 'string' ? ctx.siteSlug : undefined,
    });
  }
  const post = ctx.post as PostView | undefined;
  if (!post?.publishedAt || !post.id) return { previous: null, next: null };
  const { getAdjacentPosts } = await import('@/server/actions/blog.actions');
  return getAdjacentPosts({
    postId: post.id,
    language: post.language,
    publishedAt: post.publishedAt,
    ...(sameTerm && post.categories[0]?.id
      ? { categoryId: post.categories[0].id }
      : {}),
  });
};

/**
 * Loads every GlobalRef node in one pass (R752 / DAT-16): a page can embed
 * the same global block many times (e.g. a footer CTA repeated per section),
 * so this fetches each distinct `globalBlockId` once and fans the result out
 * to every node that referenced it, instead of one query per node.
 */
const loadGlobalRefs: import('@nextcms/builder-core').BatchBlockLoader<
  LoaderContext
> = async nodes => {
  const ids = [
    ...new Set(
      nodes
        .map(n => n.props.globalBlockId)
        .filter((id): id is string => typeof id === 'string' && !!id)
    ),
  ];
  if (ids.length === 0) return {};

  const { getGlobalBlockContent } =
    await import('@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions');
  const byId = Object.fromEntries(
    await Promise.all(
      ids.map(async id => [id, await getGlobalBlockContent(id)] as const)
    )
  );

  const patches: Record<string, Record<string, unknown>> = {};
  for (const node of nodes) {
    const id =
      typeof node.props.globalBlockId === 'string'
        ? node.props.globalBlockId
        : '';
    const result = id ? byId[id] : null;
    patches[node.id] = {
      blocks: result?.blocks ?? [],
      globalBlockName: result?.name ?? '',
    };
  }
  return patches;
};

const POST_BLOCK_TYPES = new Set([
  'PostTitle',
  'PostFeaturedImage',
  'PostMeta',
  'PostContent',
  'RelatedPosts',
  'AuthorBio',
  'AuthorCard',
  'Comments',
  'ShareButtons',
  'PostNavigation',
  'BookmarkButton',
]);

/**
 * Gives every post block in stored items (slots included) the current post,
 * like `cmsTransformProps` does for top-level post content.
 */
export function injectPost<T>(value: T, post: PostView | undefined): T {
  if (!post) return value;
  if (Array.isArray(value)) {
    return value.map(item => injectPost(item, post)) as T;
  }
  if (!value || typeof value !== 'object') return value;
  const item = value as { type?: unknown; props?: Record<string, unknown> };
  if (
    typeof item.type === 'string' &&
    item.props &&
    typeof item.props === 'object'
  ) {
    const props: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(item.props)) {
      props[key] = Array.isArray(child) ? injectPost(child, post) : child;
    }
    if (POST_BLOCK_TYPES.has(item.type)) props.post = post;
    return { ...item, props } as T;
  }
  return value;
}

/** Publish state of a collection block, shown on the canvas. */
export type CollectionBlockStatus = 'published' | 'draft-only' | 'changes';

const loadCollectionBlockRefs: import('@nextcms/builder-core').BatchBlockLoader<
  LoaderContext
> = async (nodes, ctx) => {
  const ids = [
    ...new Set(
      nodes
        .map(n => n.props.collectionBlockId)
        .filter((id): id is string => typeof id === 'string' && !!id)
    ),
  ];
  if (ids.length === 0) return {};

  const { getCollectionBlockContentAction } =
    await import('@/app/(admin)/dashboard/(shell)/collections/_modules/collection-blocks.actions');
  const draft = Boolean(ctx.editor || ctx.preview);
  const byId = await getCollectionBlockContentAction(ids, {
    draft,
    siteId: typeof ctx.siteId === 'string' ? ctx.siteId : undefined,
  });

  const entry = ctx.collectionEntry as
    | {
        collection?: { id?: string; slug?: string };
        collectionId?: string;
        data?: unknown;
      }
    | undefined;
  const entryCollectionId = entry?.collection?.id ?? entry?.collectionId;
  // Nested blocks see the same entry/post as the page they sit on.
  const nestedCtx: LoaderContext = {
    ...ctx,
    ...(ctx.custom === undefined &&
    entry?.data &&
    typeof entry.data === 'object'
      ? { custom: entry.data as Record<string, unknown> }
      : {}),
  };

  // Resolve each block once (loaders + dynamic bindings), then share it.
  const resolvedById: Record<
    string,
    { blocks: BuilderItem[]; zones: Record<string, BuilderItem[]> }
  > = {};
  await Promise.all(
    Object.entries(byId).map(async ([id, result]) => {
      if (!result?.content) return;
      if (entryCollectionId && result.collectionId !== entryCollectionId)
        return;
      try {
        const data = await resolvePuckData(result.content, nestedCtx);
        const zones = (data.zones ?? {}) as Record<string, BuilderItem[]>;
        resolvedById[id] = {
          blocks: injectPost((data.content ?? []) as BuilderItem[], ctx.post),
          zones: Object.fromEntries(
            Object.entries(zones).map(([key, items]) => [
              key,
              injectPost(items, ctx.post),
            ])
          ),
        };
      } catch (err) {
        console.error(`[builder/loaders] CollectionBlock ${id} failed:`, err);
        resolvedById[id] = {
          blocks: (result.content.content ?? []) as BuilderItem[],
          zones: (result.content.zones ?? {}) as Record<string, BuilderItem[]>,
        };
      }
    })
  );

  const patches: Record<string, Record<string, unknown>> = {};
  for (const node of nodes) {
    const id =
      typeof node.props.collectionBlockId === 'string'
        ? node.props.collectionBlockId
        : '';
    const result = id ? byId[id] : null;
    const resolved = id ? resolvedById[id] : undefined;
    patches[node.id] = {
      blocks: resolved?.blocks ?? [],
      zones: resolved?.zones ?? {},
      collectionBlockName: result?.name ?? '',
      collectionBlockStatus: result?.status ?? null,
      collectionBlockMissing: !result,
      collectionSlug: entry?.collection?.slug ?? '',
    };
  }
  return patches;
};

const loadVideoLibrary: BlockLoader = async props => {
  const playlistId =
    typeof props.playlistId === 'string' && props.playlistId
      ? props.playlistId
      : null;
  const pageSize =
    typeof props.pageSize === 'number' ? props.pageSize : undefined;

  let providers: ('youtube' | 'vimeo' | 'direct')[] | undefined;
  if (Array.isArray(props.sources)) {
    providers = props.sources.filter(
      (s: string): s is 'youtube' | 'vimeo' | 'direct' =>
        s === 'youtube' || s === 'vimeo' || s === 'direct'
    );
  } else if (Array.isArray(props.source)) {
    providers = props.source.filter(
      (s: string): s is 'youtube' | 'vimeo' | 'direct' =>
        s === 'youtube' || s === 'vimeo' || s === 'direct'
    );
  } else if (typeof props.source === 'string' && props.source !== 'all') {
    providers = [props.source as 'youtube' | 'vimeo' | 'direct'];
  } else if (typeof props.provider === 'string' && props.provider !== 'all') {
    providers = [props.provider as 'youtube' | 'vimeo' | 'direct'];
  }

  const { queryVideos } =
    await import('@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions');
  const result = await queryVideos({ playlistId, pageSize, providers });
  const activeSources =
    providers && providers.length > 0
      ? providers
      : (['youtube', 'vimeo', 'direct'] as const);

  return {
    videos: result.videos as VideoLibraryVideoItem[],
    settings: {
      enabled: result.enabled,
      title: (props.title as string) || result.title,
      description: (props.description as string) || result.description,
      layout: (props.layout as 'sidebar' | 'stacked') || result.layout,
      defaultPlaylistId: result.defaultPlaylistId,
      thumbnails: true,
      descriptions: true,
      pageSize: result.pageSize,
      providers: result.providers,
      progress: result.progress,
      resume: result.resume,
      completionPercent: result.completionPercent,
      sources: [...activeSources],
      source: activeSources.length === 1 ? activeSources[0] : 'all',
      showSearch: props.showSearch ?? true,
      searchPlaceholder: (props.searchPlaceholder as string) || undefined,
    },
  };
};

const loadNavMenu: BlockLoader = async (props, ctx) => {
  const location = (props.location === 'footer' ? 'footer' : 'header') as
    'header' | 'footer';
  try {
    const { getSiteMenu } =
      await import('@/server/actions/site-chrome.actions');
    const menu = await getSiteMenu({ location, language: ctx.language });
    // Mega menus only open from a horizontal header menu.
    const siteSlug = ctx.siteSlug as string | undefined;
    if (location !== 'header' || props.orientation === 'vertical')
      return { menu, siteSlug };
    const { getMegaMenuPanels } =
      await import('@/server/actions/mega-menu.actions');
    const megaMenus = await getMegaMenuPanels(menu, {
      siteId: ctx.siteId,
      language: ctx.language,
      siteSlug: ctx.siteSlug as string | undefined,
      draft: !!ctx.preview,
    }).catch(() => ({}));
    return { menu, siteSlug, megaMenus };
  } catch {
    return {};
  }
};

const loadMobileMenu: BlockLoader = async (props, ctx) => {
  const location = (props.menuLocation === 'footer' ? 'footer' : 'header') as
    'header' | 'footer';
  try {
    const { getSiteMenu } =
      await import('@/server/actions/site-chrome.actions');
    const menu = await getSiteMenu({ location, language: ctx.language });
    return {
      menu,
      siteSlug: ctx.siteSlug as string | undefined,
    };
  } catch {
    return {
      siteSlug: ctx.siteSlug as string | undefined,
    };
  }
};

const loadSearchBox: BlockLoader = async (_props, ctx) => {
  return {
    siteSlug: ctx.siteSlug as string | undefined,
    language: ctx.language as string | undefined,
  };
};

const loadFooterLinks: BlockLoader = async (props, ctx) => {
  if (props.source !== 'menu') return {};
  const location = (props.menuLocation === 'header' ? 'header' : 'footer') as
    'header' | 'footer';
  try {
    const { getSiteMenu } =
      await import('@/server/actions/site-chrome.actions');
    const menu = await getSiteMenu({ location, language: ctx.language });
    return { menu };
  } catch {
    return {};
  }
};

const loadLogo: BlockLoader = async (_props, _ctx) => {
  try {
    const { getSiteBranding } =
      await import('@/server/actions/site-chrome.actions');
    return await getSiteBranding();
  } catch {
    return {};
  }
};

const loadCopyright: BlockLoader = async (_props, _ctx) => {
  try {
    const { getSiteBranding } =
      await import('@/server/actions/site-chrome.actions');
    const { siteName } = await getSiteBranding();
    return { siteName };
  } catch {
    return {};
  }
};

function buildFiltersFromPropsAndParams(
  props: Record<string, unknown>,
  ctx: LoaderContext,
  loopId: string
): {
  source: ListingSource;
  filters: QueryFilter[];
  activeParams: ReturnType<typeof parseNamespacedParams>;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
  page: number;
} {
  const rawSource = typeof props.source === 'string' ? props.source : 'posts';
  const source: ListingSource = (LISTING_SOURCES as readonly string[]).includes(
    rawSource
  )
    ? (rawSource as ListingSource)
    : 'posts';

  const activeParams = parseNamespacedParams(ctx.searchParams ?? {}, loopId);
  const filters: QueryFilter[] = [];

  if (source === 'posts' || source === 'pages') {
    const lockedCat =
      (typeof props.lockedCategory === 'string' &&
        props.lockedCategory.trim()) ||
      (ctx.archive?.kind === 'category' ? ctx.archive.slug : undefined);
    const cats = lockedCat
      ? [lockedCat]
      : (activeParams.categories ??
        (activeParams.category ? [activeParams.category] : []));
    if (cats.length > 0) {
      filters.push({ field: 'categories', operator: 'in', value: cats });
    }

    const lockedTag =
      (typeof props.lockedTag === 'string' && props.lockedTag.trim()) ||
      (ctx.archive?.kind === 'tag' ? ctx.archive.slug : undefined);
    const tagList = lockedTag
      ? [lockedTag]
      : (activeParams.tags ?? (activeParams.tag ? [activeParams.tag] : []));
    if (tagList.length > 0) {
      filters.push({ field: 'tags', operator: 'in', value: tagList });
    }

    const authorId =
      (typeof props.lockedAuthorId === 'string' &&
        props.lockedAuthorId.trim()) ||
      (ctx.archive?.kind === 'author' ? ctx.archive.id : undefined) ||
      activeParams.author;
    if (authorId) {
      filters.push({ field: 'authorId', operator: 'eq', value: authorId });
    }
  }

  if (source === 'collection-entries') {
    const lockedTerm =
      (typeof props.lockedTerm === 'string' && props.lockedTerm.trim()) ||
      (typeof props.lockedCategory === 'string' &&
        props.lockedCategory.trim()) ||
      (typeof props.lockedTag === 'string' && props.lockedTag.trim()) ||
      (ctx.archive?.kind === 'term' ? ctx.archive.slug : undefined);
    const terms = lockedTerm
      ? [lockedTerm]
      : (activeParams.terms ?? (activeParams.term ? [activeParams.term] : []));
    if (terms.length > 0) {
      filters.push({ field: 'terms', operator: 'in', value: terms });
    }
    // A Query Filter writes `categories` / `tags` (hierarchical / flat terms).
    const cats =
      activeParams.categories ??
      (activeParams.category ? [activeParams.category] : []);
    if (cats.length > 0) {
      filters.push({ field: 'categories', operator: 'in', value: cats });
    }
    const tagList =
      activeParams.tags ?? (activeParams.tag ? [activeParams.tag] : []);
    if (tagList.length > 0) {
      filters.push({ field: 'tags', operator: 'in', value: tagList });
    }
    if (activeParams.author) {
      filters.push({
        field: 'authorId',
        operator: 'eq',
        value: activeParams.author,
      });
    }
  }

  if (
    source === 'videos' &&
    typeof props.playlistId === 'string' &&
    props.playlistId.trim()
  ) {
    filters.push({
      field: 'playlistId',
      operator: 'eq',
      value: props.playlistId.trim(),
    });
  }

  if (activeParams.search) {
    filters.push({
      field: 'search',
      operator: 'contains',
      value: activeParams.search,
    });
  }

  // Date archive or date-range filter
  if (ctx.archive?.kind === 'date' && ctx.archive.year) {
    const y = ctx.archive.year;
    const m = ctx.archive.month;
    const start = m
      ? new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
      : new Date(Date.UTC(y, 0, 1, 0, 0, 0));
    const end = m
      ? new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
      : new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    filters.push({
      field: 'publishedAfter',
      operator: 'gte',
      value: start.toISOString(),
    });
    filters.push({
      field: 'publishedBefore',
      operator: 'lte',
      value: end.toISOString(),
    });
  } else {
    if (activeParams.from) {
      filters.push({
        field: 'publishedAfter',
        operator: 'gte',
        value: activeParams.from,
      });
    }
    if (activeParams.to) {
      filters.push({
        field: 'publishedBefore',
        operator: 'lte',
        value: activeParams.to,
      });
    }
  }

  if (activeParams.min !== undefined) {
    filters.push({
      field: 'minNumber',
      operator: 'gte',
      value: activeParams.min,
    });
  }
  if (activeParams.max !== undefined) {
    filters.push({
      field: 'maxNumber',
      operator: 'lte',
      value: activeParams.max,
    });
  }
  if (activeParams.toggle !== undefined) {
    filters.push({
      field: 'hasImage',
      operator: 'eq',
      value: activeParams.toggle,
    });
  }

  const allowedSorts = ALLOWED_SORT_FIELDS[source] ?? ['publishedAt'];
  const requestedSort =
    activeParams.sort ??
    (typeof props.sortField === 'string' ? props.sortField : 'publishedAt');
  const isFieldSort =
    source === 'collection-entries' && fieldSortKey(requestedSort) !== null;
  const sortField =
    allowedSorts.includes(requestedSort) || isFieldSort
      ? requestedSort
      : allowedSorts[0]!;
  const sortOrder: 'asc' | 'desc' =
    activeParams.order ?? (props.sortOrder === 'asc' ? 'asc' : 'desc');

  const limit = Math.min(
    Math.max(Number(props.pageSize) || 9, 1),
    MAX_PAGE_SIZE
  );
  const offset = Math.max(Number(props.offset) || 0, 0);
  const page = activeParams.page ?? 1;

  return {
    source,
    filters,
    activeParams,
    sortField,
    sortOrder,
    limit,
    offset,
    page,
  };
}

function buildPreservedParams(
  rawParams: Record<string, string | string[] | undefined> | undefined,
  loopId: string
): Record<string, string> {
  if (!rawParams) return {};
  const ownKeys = new Set(
    [
      'page',
      'q',
      'search',
      'category',
      'tag',
      'author',
      'from',
      'to',
      'min',
      'max',
      'toggle',
      'sort',
      'order',
    ].map(k => formatNamespacedParam(k, loopId))
  );
  const preserved: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (ownKeys.has(k) || v === undefined) continue;
    preserved[k] = Array.isArray(v) ? (v[0] ?? '') : v;
  }
  return preserved;
}

const loadQueryLoop: BlockLoader = async (props, ctx) => {
  const loopId = typeof props.loopId === 'string' ? props.loopId.trim() : '';
  const {
    source,
    filters,
    activeParams,
    sortField,
    sortOrder,
    limit,
    offset,
    page,
  } = buildFiltersFromPropsAndParams(props, ctx, loopId);

  if (
    source === 'collection-entries' &&
    (!props.collectionId || typeof props.collectionId !== 'string')
  ) {
    return {
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
      activeParams,
      language: ctx.language ?? 'en',
    };
  }

  const currentId =
    (ctx.post?.id as string | undefined) ?? (ctx.pageId as string | undefined);

  const { resolveListingQuery } =
    await import('@/server/actions/listing.actions');
  const result = await resolveListingQuery(
    {
      source,
      ...(typeof props.collectionId === 'string' && props.collectionId
        ? { collectionId: props.collectionId }
        : {}),
      filters,
      ...(source === 'collection-entries'
        ? { fieldFilters: sanitizeFieldFilters(props.fieldFilters) }
        : {}),
      sortField,
      sortOrder,
      limit,
      offset,
      page,
      excludeCurrent: Boolean(props.excludeCurrent),
      ...(currentId ? { currentId } : {}),
    },
    {
      language: typeof ctx.language === 'string' ? ctx.language : undefined,
      currentId,
      includeFacets: true,
    }
  );

  // Build crawlable page hrefs preserving other namespaces' params (R577 / QRY-07)
  const preserved = buildPreservedParams(ctx.searchParams, loopId);
  const pageHrefs: Record<number, string> = {};
  for (let p = 1; p <= result.totalPages; p++) {
    const encoded = encodeNamespacedParams(
      { ...activeParams, page: p },
      loopId
    );
    const sp = new URLSearchParams({ ...preserved, ...encoded });
    const qs = sp.toString();
    pageHrefs[p] = qs ? `?${qs}` : '?';
  }
  const clearSp = new URLSearchParams(preserved);
  const clearQs = clearSp.toString();

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    facets: result.facets,
    activeParams,
    pageHrefs,
    ...(props.filterPosition && props.filterPosition !== 'none'
      ? { preservedHiddenParams: preserved }
      : {}),
    clearFiltersHref: clearQs ? `?${clearQs}` : '?',
    language: typeof ctx.language === 'string' ? ctx.language : 'en',
    ...archiveTokenPatch(props, ctx),
  };
};

/** Drops malformed or half-filled custom-field filters from block props. */
export function sanitizeFieldFilters(value: unknown): FieldFilter[] {
  if (!Array.isArray(value)) return [];
  const out: FieldFilter[] = [];
  for (const raw of value.slice(0, 20)) {
    const parsed = fieldFilterSchema.safeParse(raw);
    if (!parsed.success) continue;
    const f = parsed.data;
    if (f.operator !== 'exists' && (f.value === undefined || f.value === '')) {
      continue;
    }
    out.push(f);
  }
  return out;
}

/**
 * Loop Grid: the Query Loop listing plus the chosen Loop Item template. The
 * editor (and preview) render the template's draft; the site its published
 * version.
 */
const loadLoopGrid: BlockLoader = async (props, ctx) => {
  const templateId =
    typeof props.templateId === 'string' ? props.templateId : '';
  const draft = Boolean(ctx.editor || ctx.preview);
  const [listing, template] = await Promise.all([
    loadQueryLoop(props, ctx),
    templateId
      ? import('@/server/actions/loop-template.actions')
          .then(m => m.getLoopTemplateDocument(templateId, draft))
          .catch(err => {
            console.error('[builder/loaders] loop template failed:', err);
            return null;
          })
      : null,
  ]);
  if (!template) return { ...listing, template: null, templateName: '' };
  // Run loaders inside the template (menus, global blocks…) once; per-item
  // `loopItem` bindings stay for the grid to fill in.
  const document = await resolveDocumentData(template.document, ctx);
  return { ...listing, template: document, templateName: template.name };
};

/** Published entries of one post type, by id or (for block presets) by slug. */
const loadPostTypeEntries: BlockLoader = async (props, ctx) => {
  const { resolvePostTypeEntries } =
    await import('@/server/actions/listing.actions');
  return resolvePostTypeEntries({
    collectionId:
      typeof props.collectionId === 'string' ? props.collectionId : '',
    postTypeSlug:
      typeof props.postTypeSlug === 'string' ? props.postTypeSlug : '',
    limit: Number(props.limit) || 12,
    newestFirst: props.sortOrder === 'newest',
    language: typeof ctx.language === 'string' ? ctx.language : undefined,
  });
};

/**
 * Replaces `{archive_title}` / `{archive_description}` in a Query Loop's
 * heading props with the current archive term, so one archive template
 * can title every category, tag, author, and date page.
 */
function archiveTokenPatch(
  props: Record<string, unknown>,
  ctx: LoaderContext
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const key of ['eyebrow', 'title', 'subtitle'] as const) {
    const value = props[key];
    if (typeof value !== 'string' || !value.includes('{archive_')) continue;
    patch[key] = value
      .replace(/\{archive_title\}/g, ctx.archive?.title ?? '')
      .replace(/\{archive_description\}/g, ctx.archive?.description ?? '')
      .trim();
  }
  return patch;
}

const loadQueryFilter: BlockLoader = async (props, ctx) => {
  const targetLoopId =
    typeof props.targetLoopId === 'string' ? props.targetLoopId.trim() : '';
  const { source, filters, activeParams, sortField, sortOrder } =
    buildFiltersFromPropsAndParams(props, ctx, targetLoopId);
  const preservedHiddenParams = buildPreservedParams(
    ctx.searchParams,
    targetLoopId
  );

  const { resolveListingQuery } =
    await import('@/server/actions/listing.actions');
  const collectionId =
    source === 'collection-entries' && typeof props.collectionId === 'string'
      ? props.collectionId.trim()
      : '';
  if (source === 'collection-entries' && !collectionId) {
    // No post type picked yet: placeholder options in the editor.
    return { activeParams, totalResults: 0, preservedHiddenParams };
  }
  const result = await resolveListingQuery(
    {
      source,
      ...(collectionId ? { collectionId } : {}),
      filters,
      sortField,
      sortOrder,
      limit: 1,
      page: 1,
    },
    {
      language: typeof ctx.language === 'string' ? ctx.language : undefined,
      includeFacets: true,
    }
  );

  return {
    activeParams,
    facets: result.facets,
    totalResults: result.total,
    preservedHiddenParams,
  };
};

const loadSearchResults: BlockLoader = async (props, ctx) => {
  const params = ctx.searchParams ?? {};
  const q = (oneParam(params, 'q') ?? '').trim();
  const rawKind = oneParam(params, 'kind');
  const activeKind =
    rawKind === 'page' ||
    rawKind === 'post' ||
    rawKind === 'collection' ||
    rawKind === 'video'
      ? rawKind
      : 'all';
  const page = Math.max(Number(oneParam(params, 'page')) || 1, 1);
  const limit = Math.min(Math.max(Number(props.pageSize) || 20, 1), 100);

  if (!q) {
    return {
      query: '',
      activeKind,
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    };
  }

  const { resolvePaginatedSearch } =
    await import('@/server/actions/listing.actions');
  const res = await resolvePaginatedSearch({
    q,
    language: typeof ctx.language === 'string' ? ctx.language : undefined,
    kind: activeKind,
    page,
    limit,
  });

  return {
    query: q,
    activeKind,
    items: res.items,
    total: res.total,
    page: res.page,
    totalPages: res.totalPages,
    countsByKind: res.countsByKind,
  };
};

/**
 * Registry of block type → loader.
 * ContactForm stores fields inline today; query-loop blocks register here.
 * Hosts / plugins can extend via `registerBlockLoader`.
 */
const registry = createLoaderRegistry<LoaderContext>(
  {
    BlogPosts: loadBlogPosts,
    RelatedPosts: loadRelatedPosts,
    PostNavigation: loadPostNavigation,
    AuthorCard: loadAuthorCard,
    Comments: loadComments,
    QueryLoop: loadQueryLoop,
    LoopGrid: loadLoopGrid,
    PostTypeEntries: loadPostTypeEntries,
    QueryFilter: loadQueryFilter,
    SearchResults: loadSearchResults,
    VideoLibrary: loadVideoLibrary,
    NavMenu: loadNavMenu,
    MobileMenu: loadMobileMenu,
    SearchBox: loadSearchBox,
    FooterLinks: loadFooterLinks,
    LegalLinks: loadFooterLinks,
    Logo: loadLogo,
    Copyright: loadCopyright,
  },
  {
    onError: (err, node) =>
      console.error(`[builder/loaders] ${node.type} (${node.id}) failed:`, err),
  }
);
registry.registerBatch('GlobalRef', loadGlobalRefs);
registry.registerBatch('CollectionBlock', loadCollectionBlockRefs);

export const registerBlockLoader = registry.register;
export const getBlockLoader = registry.get;
export const getBatchBlockLoader = registry.getBatch;
export const listLoaderTypes = registry.types;
/** Each node's loaded data, for the editor to show without storing it. */
export const loadDocumentData = registry.load;

/**
 * Run loaders for every registered block type and return a new document with
 * resolved props. Failures are logged and the original props kept.
 */
export async function resolveDocumentData(
  doc: BuilderDocument,
  ctx: LoaderContext = {}
): Promise<BuilderDocument> {
  const refs = collectDynamicRefs(doc);
  const [resolved, picked] = await Promise.all([
    registry.resolve(doc, ctx),
    Object.keys(refs).length
      ? import('@/server/actions/dynamic-refs.actions').then(m =>
          m.loadDynamicRefs(refs)
        )
      : undefined,
  ]);
  return resolveDynamicDocument(resolved, {
    ...ctx,
    ...picked,
    preserveLoopBindings: true,
  });
}

/**
 * Resolve data for a Puck-shaped payload by converting through the document
 * format. Used during dual-engine rollout (R686 / R702).
 */
export async function resolvePuckData(
  data: import('./data').BuilderData,
  ctx: LoaderContext = {}
): Promise<import('./data').BuilderData> {
  const doc = puckToDocument(data);
  const resolved = await resolveDocumentData(doc, ctx);
  return documentToPuck(resolved);
}
