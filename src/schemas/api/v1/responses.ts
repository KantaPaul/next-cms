import { z } from 'zod';

export const metaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const pageListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  language: z.string(),
  isHome: z.boolean(),
  editorType: z.string(),
  translationGroupId: z.string().nullable(),
  publishedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  url: z.string(),
});

export const pagesListResponseSchema = z.object({
  data: z.array(pageListItemSchema),
  meta: metaSchema,
});

export const seoResponseSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    keywords: z.string().nullable(),
    canonicalUrl: z.string().nullable(),
    noIndex: z.boolean(),
    ogTitle: z.string().nullable(),
    ogDescription: z.string().nullable(),
    ogImage: z.string().nullable(),
    ogType: z.string().nullable(),
    twitterCard: z.string().nullable(),
    structuredDataType: z.string().nullable(),
  })
  .nullable();

export const pageDetailResponseSchema = z.object({
  data: pageListItemSchema
    .omit({ seoTitle: true, seoDescription: true })
    .extend({
      content: z.unknown(),
      seo: seoResponseSchema,
      alternates: z.array(
        z.object({ language: z.string(), slug: z.string(), url: z.string() })
      ),
    }),
});

export const postListItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    language: z.string(),
    url: z.string(),
  })
  .loose();

export const postsListResponseSchema = z.object({
  data: z.array(postListItemSchema),
  meta: metaSchema,
});

export const postDetailResponseSchema = z.object({
  data: postListItemSchema.extend({
    body: z.string(),
    layoutType: z.string(),
    layout: z.unknown(),
    blogUrl: z.string().nullable(),
    seo: seoResponseSchema,
  }),
});

export const menuItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  target: z.string(),
  badge: z.string().nullable(),
  order: z.number(),
});

export const menusResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      location: z.string(),
      items: z.array(
        menuItemSchema.extend({ children: z.array(menuItemSchema) })
      ),
    })
  ),
});

export const mediaItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  title: z.string().nullable(),
  alt: z.string().nullable(),
  mime: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

export const mediaListResponseSchema = z.object({
  data: z.array(mediaItemSchema),
  meta: metaSchema,
});

export const settingsResponseSchema = z.object({
  data: z.object({
    siteName: z.string(),
    siteDescription: z.string().nullable(),
    siteUrl: z.string(),
    logo: z.string().nullable(),
    favicon: z.string().nullable(),
    defaultOgImage: z.string().nullable(),
    headerMenuId: z.string().nullable(),
    footerMenuId: z.string().nullable(),
    headerTemplateId: z.string().nullable().optional(),
    footerTemplateId: z.string().nullable().optional(),
    themeTokens: z.unknown(),
    updatedAt: z.string().nullable(),
  }),
});

export const searchHitSchema = z.object({
  kind: z.enum(['page', 'post']),
  title: z.string(),
  path: z.string(),
  language: z.string(),
  snippet: z.string(),
  url: z.string(),
});

export const searchResponseSchema = z.object({
  data: z.array(searchHitSchema),
  meta: z.object({ q: z.string(), lang: z.string().nullable() }),
});

export const apiSchemas = {
  PagesList: pagesListResponseSchema,
  Page: pageDetailResponseSchema,
  PostsList: postsListResponseSchema,
  Post: postDetailResponseSchema,
  Menus: menusResponseSchema,
  MediaList: mediaListResponseSchema,
  Settings: settingsResponseSchema,
  Search: searchResponseSchema,
};
