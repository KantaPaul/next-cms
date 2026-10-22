import { Render, type Data } from '@measured/puck';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageRenderConfig, postRenderConfig } from '@/builder/render';
import { sanitizeRichText } from '@/builder/sanitize';
import {
  blogFilterOptions,
  filterCatalog,
  findPage,
  findPost,
  resolvePostRoute,
  resolveRoute,
  siteSettings,
  type BlogSort,
} from '@/lib/content';

type SearchParams = Record<string, string | string[] | undefined>;
type Params = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<SearchParams>;
};

const absolute = (base: string, path: string) =>
  `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

function one(params: SearchParams, key: string) {
  const v = params[key];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const postRoute = resolvePostRoute(slug);
  if (postRoute) {
    const post = findPost(postRoute.language, postRoute.slug);
    if (!post) return {};
    const title = post.seo?.title || post.view.title;
    return {
      title: `${title} | ${siteSettings.siteName}`,
      description: post.seo?.description || post.view.excerpt || undefined,
      openGraph: {
        images: post.seo?.ogImage || post.view.featuredImage
          ? [post.seo?.ogImage || post.view.featuredImage!]
          : undefined,
      },
      robots: post.seo?.noIndex ? { index: false } : undefined,
    };
  }
  const route = resolveRoute(slug);
  if (!route) return {};
  const page = findPage(route.language, route.slug);
  if (!page) return {};
  const title = page.seo?.title || page.title;
  const base = siteSettings.siteUrl?.replace(/\/$/, '') || '';
  const languages: Record<string, string> = {};
  for (const alt of page.alternates ?? []) {
    languages[alt.language] = `${base}${alt.path === '/' ? '' : alt.path}`;
  }
  return {
    title: `${title} | ${siteSettings.siteName}`,
    description: page.seo?.description || siteSettings.siteDescription || undefined,
    openGraph: {
      images: page.seo?.ogImage ? [page.seo.ogImage] : undefined,
    },
    robots: page.seo?.noIndex ? { index: false } : undefined,
    alternates: Object.keys(languages).length
      ? { languages, canonical: `${base}${page.path === '/' ? '' : page.path}` }
      : undefined,
  };
}

/** Attach request-time blog listing data from the local catalog (no DB). */
function hydrateBlogBlocks(data: Data, searchParams: SearchParams, language: string): Data {
  if (!data?.content || !Array.isArray(data.content)) return data;
  const content = data.content.map((item: any) => {
    if (item?.type !== 'BlogPosts') return item;
    const props = item.props ?? {};
    const sortRaw = one(searchParams, 'sort');
    const sort: BlogSort | undefined =
      sortRaw === 'newest' || sortRaw === 'oldest' || sortRaw === 'title'
        ? sortRaw
        : undefined;
    const page = Number(one(searchParams, 'page')) || 1;
    const active = {
      q: one(searchParams, 'q'),
      category: props.lockedCategory || one(searchParams, 'category'),
      tag: props.lockedTag || one(searchParams, 'tag'),
      sort,
      page,
    };
    const result = filterCatalog({
      language,
      q: active.q,
      category: active.category,
      tag: active.tag,
      sort,
      page,
      size: Number(props.pageSize) || 9,
    });
    return {
      ...item,
      props: {
        ...props,
        posts: result.posts,
        total: result.total,
        totalPages: result.totalPages,
        active,
        filterOptions: blogFilterOptions,
      },
    };
  });
  return { ...data, content };
}

export default async function SitePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;

  const postRoute = resolvePostRoute(slug);
  if (postRoute) {
    const post = findPost(postRoute.language, postRoute.slug);
    if (!post) notFound();
    const metadata = {
      themeTokens: siteSettings.themeTokens,
      post: post.view,
      language: post.view.language,
    };
    const data = (post.layout ?? { content: [], root: {} }) as Data;
    return (
      <Render config={postRenderConfig} data={data} metadata={metadata} />
    );
  }

  const route = resolveRoute(slug);
  if (!route) notFound();
  const page = findPage(route.language, route.slug);
  if (!page) notFound();

  if (page.editorType === 'builder') {
    const metadata = {
      themeTokens: siteSettings.themeTokens,
      searchParams: sp,
      language: page.language,
    };
    let data = page.content as Data;
    data = hydrateBlogBlocks(data, sp, page.language);
    return <Render config={pageRenderConfig} data={data} metadata={metadata} />;
  }

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20" lang={page.language}>
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{page.title}</h1>
      </header>
      <div
        className="s-prose prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(page.content) }}
      />
    </article>
  );
}
