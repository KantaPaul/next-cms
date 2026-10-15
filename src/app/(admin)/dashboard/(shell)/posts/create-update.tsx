import { notFound } from 'next/navigation';
import { QueryProvider } from '@/providers/query.provider';
import PostForm from '@/app/(admin)/dashboard/(shell)/posts/form';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { taxonomyService } from '@/app/(admin)/dashboard/(shell)/taxonomy/_modules/taxonomy.service';
import { previewService } from '@/server/services/preview.service';

export async function CreateOrUpdatePost({
  id,
  postId,
}: {
  id: string;
  postId?: string;
}) {
  const post = postId ? await postsService.getById({ id: postId }) : null;
  if (postId && !post) notFound();

  const taxonomy = Promise.all([
    taxonomyService.listCategories(),
    taxonomyService.listTags(),
  ]).then(([categories, tags]) => ({
    categories: categories.map(c => ({
      value: c.id,
      label: `${'— '.repeat(c.depth)}${c.name}`,
    })),
    tags: tags.map(t => ({ value: t.id, label: t.name })),
  }));

  return (
    <div className="-m-5 lg:h-[calc(100svh-4rem)] xl:-m-8">
      <QueryProvider
        promises={{
          initialValues: Promise.resolve(post),
          taxonomy,
          templates: postTemplatesService.list(),
          previewTokens: post
            ? previewService.listForPost(post.id)
            : Promise.resolve([]),
        }}
      >
        <PostForm id={id} />
      </QueryProvider>
    </div>
  );
}
