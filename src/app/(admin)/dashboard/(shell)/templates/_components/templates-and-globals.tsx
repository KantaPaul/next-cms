'use client';

import { format } from 'date-fns';
import { Blocks, FileText, LayoutTemplate, Loader2, Lock, Pencil, PenSquare, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { deleteGlobalBlock, deleteTemplate, renameGlobalBlock } from '../_modules/templates.actions';
import type { TemplateListItem } from '../_modules/templates.service';

type GlobalRow = {
  id: string;
  name: string;
  category: string;
  updatedAt: Date | null;
  createdByName: string | null;
  sectionTypes: string[];
  pages: number;
};

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

const humanize = (type: string) => type.replace(/([a-z])([A-Z])/g, '$1 $2');

export function TemplatesAndGlobals({
  templates,
  globals,
  can,
}: {
  templates: TemplateListItem[];
  globals: GlobalRow[];
  can: { create: boolean; manage: boolean; deleteGlobals: boolean };
}) {
  return (
    <Tabs defaultValue="templates">
      <TabsList>
        <TabsTrigger value="templates">Page templates ({templates.length})</TabsTrigger>
        <TabsTrigger value="globals">Global blocks ({globals.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="templates" className="mt-4">
        <TemplatesGrid templates={templates} can={can} />
      </TabsContent>
      <TabsContent value="globals" className="mt-4">
        <GlobalsList globals={globals} can={can} />
      </TabsContent>
    </Tabs>
  );
}

function TemplatesGrid({ templates, can }: { templates: TemplateListItem[]; can: { create: boolean; manage: boolean } }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const remove = async (template: TemplateListItem) => {
    if (!confirm(`Delete the "${template.name}" template? Pages created from it are not affected.`)) return;
    setPendingId(template.id);
    await handleActionResponse(deleteTemplate({ id: template.id }), () => {
      toast.success('Template deleted');
      router.refresh();
    });
    setPendingId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-steel-500">
        Starter layouts offered when creating a page. Save any builder page as a template from its builder toolbar.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map(template => {
          const Icon = template.editorType === 'builder' ? LayoutTemplate : FileText;
          return (
            <li key={template.id} className="flex flex-col rounded-lg border border-steel-200 p-4 dark:border-dark-300">
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{template.name}</span>
                    {template.isSystem && (
                      <span className="inline-flex items-center gap-1 rounded bg-steel-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-steel-600 dark:bg-dark-300 dark:text-steel-300">
                        <Lock className="size-3" /> Starter
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-steel-500">
                    {template.category} · {template.editorType === 'builder' ? `${template.blockCount} sections` : 'Rich text'}
                  </p>
                </div>
              </div>
              {template.description && <p className="mt-3 line-clamp-2 text-sm text-steel-600 dark:text-steel-300">{template.description}</p>}
              {template.blockTypes.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1">
                  {template.blockTypes.map((type, i) => (
                    <li key={`${type}-${i}`} className="rounded bg-steel-50 px-1.5 py-0.5 text-[11px] text-steel-600 dark:bg-dark-100 dark:text-steel-300">
                      {humanize(type)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex items-center gap-2 pt-4">
                {can.create && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${PAGES.DASHBOARD.PAGES.CREATE}?template=${template.id}`}>
                      <Plus /> Use template
                    </Link>
                  </Button>
                )}
                {can.manage && !template.isSystem && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-red-600 hover:text-red-700"
                    disabled={pendingId === template.id}
                    onClick={() => remove(template)}
                    aria-label={`Delete ${template.name}`}
                  >
                    {pendingId === template.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GlobalsList({ globals, can }: { globals: GlobalRow[]; can: { deleteGlobals: boolean } }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const remove = async (block: GlobalRow) => {
    const warning = block.pages
      ? `"${block.name}" is used on ${block.pages} page${block.pages > 1 ? 's' : ''}. Those pages will show an empty placeholder. Delete anyway?`
      : `Delete the "${block.name}" global block?`;
    if (!confirm(warning)) return;
    setPendingId(block.id);
    await handleActionResponse(deleteGlobalBlock({ id: block.id }), () => {
      toast.success('Global block deleted');
      router.refresh();
    });
    setPendingId(null);
  };

  if (!globals.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-steel-200 px-6 py-12 text-center dark:border-dark-300">
        <Blocks className="size-8 text-steel-300" />
        <p className="font-medium">No global blocks yet</p>
        <p className="max-w-md text-sm text-steel-500">
          In the visual builder, select a section and choose <span className="font-medium">Save as global</span>. Every page that uses it
          updates when you edit it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-steel-500">Shared sections such as headers, CTAs, and footers. Editing one updates every page that uses it.</p>
      <ul className="divide-y divide-steel-100 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
        {globals.map(block => (
          <li key={block.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            {renaming === block.id ? (
              <RenameForm block={block} onDone={() => setRenaming(null)} />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{block.name}</p>
                  <p className="text-xs text-steel-500">
                    {block.category} · {block.sectionTypes.map(humanize).join(', ') || 'Empty'}{block.updatedAt && ` · Updated ${format(new Date(block.updatedAt), 'PP')}`}
                    {block.createdByName ? ` · by ${block.createdByName}` : ''}
                  </p>
                </div>
                <span className="self-start rounded-full bg-steel-100 px-2 py-0.5 text-xs text-steel-600 md:self-auto dark:bg-dark-300 dark:text-steel-300">
                  Used on {block.pages} page{block.pages === 1 ? '' : 's'}
                </span>
                <div className="flex gap-1">
                  <Button asChild size="sm" variant="outline">
                    <Link href={PAGES.DASHBOARD.GLOBAL_BLOCK(block.id)}>
                      <PenSquare /> Edit content
                    </Link>
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Rename ${block.name}`} onClick={() => setRenaming(block.id)}>
                    <Pencil />
                  </Button>
                  {can.deleteGlobals && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${block.name}`}
                      className="text-red-600 hover:text-red-700"
                      disabled={pendingId === block.id}
                      onClick={() => remove(block)}
                    >
                      {pendingId === block.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RenameForm({ block, onDone }: { block: GlobalRow; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(block.name);
  const [category, setCategory] = useState(block.category);
  const [isPending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(renameGlobalBlock({ id: block.id, name, category }), () => {
        toast.success('Global block updated');
        router.refresh();
        onDone();
      });
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-1 flex-wrap items-end gap-2">
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">
        Name
        <input className={inputClass} value={name} onChange={e => setName(e.target.value)} required maxLength={150} autoFocus />
      </label>
      <label className="flex w-40 flex-col gap-1 text-xs font-medium">
        Category
        <input className={inputClass} value={category} onChange={e => setCategory(e.target.value)} maxLength={50} />
      </label>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />} Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}
