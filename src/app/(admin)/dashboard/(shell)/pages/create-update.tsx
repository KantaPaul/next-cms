import { notFound } from 'next/navigation';
import { QueryProvider } from '@/providers/query.provider';
import CreateOrUpdateForm from '@/app/(admin)/dashboard/(shell)/pages/form';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { taxonomyService } from '@/app/(admin)/dashboard/(shell)/taxonomy/_modules/taxonomy.service';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { previewService } from '@/server/services/preview.service';

export async function CreateOrUpdate({ id, pageId }: { id: string; pageId?: string }) {
  const page = pageId ? await pagesServices.getById({ id: pageId }) : null;
  if (pageId && !page) notFound();

  const taxonomy = Promise.all([taxonomyService.listCategories(), taxonomyService.listTags()]).then(
    ([categories, tags]) => ({
      categories: categories.map(c => ({ value: c.id, label: `${'— '.repeat(c.depth)}${c.name}` })),
      tags: tags.map(t => ({ value: t.id, label: t.name })),
    })
  );

  return (
    <div className="-m-5 lg:h-[calc(100svh-4rem)] xl:-m-8">
      <QueryProvider
        promises={{
          initialValues: Promise.resolve(page),
          taxonomy,
          templates: page ? Promise.resolve([]) : templatesService.listTemplates(),
          previewTokens: page ? previewService.listForPage(page.id) : Promise.resolve([]),
          translations: page
            ? pagesServices.getTranslations(page.translationGroupId, page.id)
            : Promise.resolve([]),
        }}
      >
        <CreateOrUpdateForm id={id} />
      </QueryProvider>
    </div>
  );
}
