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
  type BlockLoader as CoreBlockLoader,
  type BuilderDocument,
  createLoaderRegistry,
  documentToPuck,
  puckToDocument,
} from '@nextcms/builder-core';
import type { VideoLibraryVideoItem } from '@/components/video/video-library';
import type { BlogActiveFilters, BlogPostsProps } from './blocks/blog';
import type { PostView } from './post-template';

// Server actions are imported inside each loader, so importing this module
// (registry, tests) never loads the app's
// database or server-only code.

/* ---------- context ---------- */

export type LoaderContext = {
  /** Active site id when available (multisite). */
  siteId?: string;
  /** Page / post locale. */
  language?: string;
  /** Request search params (blog filters, pagination). */
  searchParams?: Record<string, string | string[] | undefined>;
  /** Current post when rendering a post template. */
  post?: PostView;
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
  const language =
    typeof ctx.language === 'string' ? ctx.language : undefined;

  const { getBlogFilterOptions, queryBlogPosts } = await import(
    '@/server/actions/blog.actions'
  );
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
  const [{ getRelatedPosts }, { SAMPLE_POST }] = await Promise.all([
    import('@/server/actions/blog.actions'),
    import('./post-template'),
  ]);
  const post = (ctx.post as PostView | undefined) ?? SAMPLE_POST;
  const limit = Number(props.limit) || 3;
  const posts = await getRelatedPosts({
    postId: post.id,
    categoryIds: post.categories.map(c => c.id),
    language: post.language,
    limit,
  });
  return { posts };
};

const loadGlobalRef: BlockLoader = async props => {
  const id =
    typeof props.globalBlockId === 'string' ? props.globalBlockId : '';
  if (!id) return { blocks: [], globalBlockName: '' };
  const { getGlobalBlockContent } = await import(
    '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions'
  );
  const result = await getGlobalBlockContent(id);
  return {
    blocks: result?.blocks ?? [],
    globalBlockName: result?.name ?? '',
  };
};

const loadVideoLibrary: BlockLoader = async props => {
  const playlistId =
    typeof props.playlistId === 'string' && props.playlistId
      ? props.playlistId
      : null;
  const pageSize =
    typeof props.pageSize === 'number' ? props.pageSize : undefined;
  const { queryVideos } = await import(
    '@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions'
  );
  const result = await queryVideos({ playlistId, pageSize });
  return {
    videos: result.videos as VideoLibraryVideoItem[],
    settings: {
      enabled: result.enabled,
      title: result.title,
      description: result.description,
      layout: result.layout,
      defaultPlaylistId: result.defaultPlaylistId,
      thumbnails: true,
      descriptions: true,
      pageSize: result.pageSize,
      providers: result.providers,
      progress: result.progress,
      resume: result.resume,
      completionPercent: result.completionPercent,
    },
  };
};

/**
 * Registry of block type → loader.
 * ContactForm stores fields inline today; query-loop blocks will register here
 * when QRY lands. Hosts / plugins can extend via `registerBlockLoader`.
 */
const registry = createLoaderRegistry<LoaderContext>(
  {
    BlogPosts: loadBlogPosts,
    RelatedPosts: loadRelatedPosts,
    GlobalRef: loadGlobalRef,
    VideoLibrary: loadVideoLibrary,
  },
  {
    onError: (err, node) =>
      console.error(`[builder/loaders] ${node.type} (${node.id}) failed:`, err),
  }
);

export const registerBlockLoader = registry.register;
export const getBlockLoader = registry.get;
export const listLoaderTypes = registry.types;
/** Each node's loaded data, for the editor to show without storing it. */
export const loadDocumentData = registry.load;

/**
 * Run loaders for every registered block type and return a new document with
 * resolved props. Failures are logged and the original props kept.
 */
export function resolveDocumentData(
  doc: BuilderDocument,
  ctx: LoaderContext = {}
): Promise<BuilderDocument> {
  return registry.resolve(doc, ctx);
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
