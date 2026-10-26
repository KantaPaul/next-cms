'use server';
import { revalidatePath } from 'next/cache';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import { PAGES } from '@/config/pages';
import {
  createRevisionSchema,
  idSchema,
  restoreRevisionSchema,
} from '@/db/validations/pages.validation';
import {
  createPostSchema,
  createPostTemplateSchema,
  savePostDraftSchema,
  saveTemplateSchema,
  setPostTemplateSchema,
  switchPostLayoutSchema,
  updatePostSchema,
  updatePostTemplateSchema,
} from '@/db/validations/posts.validation';
import { accessProcedure } from '@/server/procedures/permission.procedure';

const revalidateAdmin = (id?: string) => {
  revalidatePath(PAGES.DASHBOARD.POSTS.INDEX);
  if (id) revalidatePath(PAGES.DASHBOARD.POSTS.EDIT(id));
};

const revalidateTemplates = (id?: string) => {
  revalidatePath(PAGES.DASHBOARD.POSTS.TEMPLATES);
  revalidatePath(PAGES.DASHBOARD.POSTS.INDEX);
  if (id) revalidatePath(PAGES.DASHBOARD.POSTS.TEMPLATE_BUILDER(id));
};

export const createPost = accessProcedure
  .input(createPostSchema)
  .action(async ({ input, ctx }) => {
    const created = await postsService.create(input, ctx.access);
    revalidateAdmin();
    return created;
  });

export const updatePost = accessProcedure
  .input(updatePostSchema)
  .action(async ({ input, ctx }) => {
    const updated = await postsService.update(input, ctx.access);
    revalidateAdmin(updated.id);
    return updated;
  });

export const savePostDraft = accessProcedure
  .input(savePostDraftSchema)
  .action(async ({ input, ctx }) => postsService.saveDraft(input, ctx.access));

export const switchPostLayout = accessProcedure
  .input(switchPostLayoutSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.switchLayout(input, ctx.access);
    revalidateAdmin(post.id);
    return post;
  });

export const setPostTemplate = accessProcedure
  .input(setPostTemplateSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.setTemplate(input, ctx.access);
    revalidateAdmin(post.id);
    revalidatePath(PAGES.DASHBOARD.POSTS.TEMPLATES);
    return post;
  });

export const publishPost = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.publish(input, ctx.access);
    revalidateAdmin(post.id);
    return post;
  });

export const unpublishPost = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.unpublish(input, ctx.access);
    revalidateAdmin(post.id);
    return post;
  });

export const duplicatePost = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.duplicate(input, ctx.access);
    revalidateAdmin();
    return post;
  });

export const deletePost = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.softDelete(input, ctx.access);
    revalidateAdmin();
    return post;
  });

export const listPostRevisions = accessProcedure
  .input(idSchema)
  .action(async ({ input }) => postsService.listRevisions(input));

export const getPostRevision = accessProcedure
  .input(restoreRevisionSchema)
  .action(async ({ input }) => {
    const { body, canvas, layout, ...rest } =
      await postsService.getRevision(input);
    return {
      ...rest,
      content: layout === 'custom' && canvas ? canvas : (body ?? ''),
    };
  });

export const createPostRevision = accessProcedure
  .input(createRevisionSchema)
  .action(async ({ input, ctx }) =>
    postsService.createRevision(input, ctx.access)
  );

export const restorePostRevision = accessProcedure
  .input(restoreRevisionSchema)
  .action(async ({ input, ctx }) => {
    const post = await postsService.restoreRevision(input, ctx.access);
    revalidateAdmin(post.id);
    return post;
  });

export const createPostTemplate = accessProcedure
  .input(createPostTemplateSchema)
  .action(async ({ input, ctx }) => {
    const template = await postTemplatesService.create(input, ctx.access);
    revalidateTemplates();
    return template;
  });

export const updatePostTemplate = accessProcedure
  .input(updatePostTemplateSchema)
  .action(async ({ input, ctx }) => {
    const template = await postTemplatesService.update(input, ctx.access);
    revalidateTemplates(template.id);
    return template;
  });

export const duplicatePostTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const template = await postTemplatesService.duplicate(input, ctx.access);
    revalidateTemplates();
    return template;
  });

export const setDefaultPostTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const template = await postTemplatesService.setDefault(input, ctx.access);
    revalidateTemplates(template.id);
    return template;
  });

export const deletePostTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const template = await postTemplatesService.delete(input, ctx.access);
    revalidateTemplates();
    return template;
  });

export const savePostTemplateDraft = accessProcedure
  .input(saveTemplateSchema)
  .action(async ({ input, ctx }) =>
    postTemplatesService.saveDraft(input, ctx.access)
  );

export const publishPostTemplate = accessProcedure
  .input(idSchema)
  .action(async ({ input, ctx }) => {
    const result = await postTemplatesService.publish(input, ctx.access);
    revalidateTemplates(input.id);
    return result;
  });
