'use client';

import { formatDistanceToNow } from 'date-fns';
import { Eye, History, Loader2, RotateCcw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isBuilderData } from '@/builder/data';
import { extractPlainText } from '@/builder/text';
import { sanitizeRichText } from '@/builder/sanitize';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { cn } from '@/lib/utils/cn';
import {
  createRevision,
  getRevision,
  listRevisions,
  restoreRevision,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';

type RevisionRow = {
  id: string;
  kind: 'manual' | 'autosave' | 'published';
  label: string | null;
  title: string;
  editorType: 'builder' | 'richtext';
  createdAt: Date;
  authorName: string | null;
};

type RevisionDetail = Omit<RevisionRow, 'authorName'> & { content: unknown };

const KIND_STYLES = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  manual: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  autosave: 'bg-steel-100 text-steel-600 dark:bg-dark-200 dark:text-steel-300',
};

export function RevisionsDrawer({
  open,
  onOpenChange,
  pageId,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  onRestored?: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RevisionRow[] | null>(null);
  const [preview, setPreview] = useState<RevisionDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await listRevisions({ id: pageId });
    setRows(Array.isArray(response) ? (response as RevisionRow[]) : []);
  }, [pageId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const openPreview = async (id: string) => {
    setBusyId(id);
    await handleActionResponse(await getRevision({ revisionId: id }), revision => setPreview(revision as RevisionDetail));
    setBusyId(null);
  };

  const restore = (id: string) =>
    startTransition(async () => {
      await handleActionResponse(await restoreRevision({ revisionId: id }), () => {
        toast.success('Revision restored to the draft');
        setPreview(null);
        onOpenChange(false);
        onRestored?.();
        router.refresh();
      });
    });

  const snapshot = () =>
    startTransition(async () => {
      await handleActionResponse(await createRevision({ id: pageId, label: 'Manual snapshot' }), () => {
        toast.success('Snapshot saved');
        void load();
      });
    });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-steel-200 p-5 dark:border-dark-300">
            <SheetTitle className="flex items-center gap-2">
              <History className="size-5" /> Revision history
            </SheetTitle>
            <SheetDescription>Autosaves are kept every few minutes. Restoring replaces the current draft.</SheetDescription>
            <Button type="button" size="sm" variant="outline" className="mt-2 self-start" onClick={snapshot} disabled={isPending}>
              <Save /> Save snapshot of current draft
            </Button>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {rows === null ? (
              <p className="flex items-center gap-2 p-5 text-sm text-steel-500">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </p>
            ) : rows.length === 0 ? (
              <p className="p-5 text-sm text-steel-500">No revisions yet. They appear after you save or publish.</p>
            ) : (
              <ol className="divide-y divide-steel-100 dark:divide-dark-300">
                {rows.map(row => (
                  <li key={row.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium capitalize', KIND_STYLES[row.kind])}>
                          {row.kind}
                        </span>
                        <span className="truncate text-sm font-medium">{row.label ?? row.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-steel-500">
                        {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                        {row.authorName ? ` · ${row.authorName}` : ''} · {row.editorType === 'builder' ? 'Builder' : 'Rich text'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Preview revision from ${new Date(row.createdAt).toLocaleString()}`}
                      onClick={() => openPreview(row.id)}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id ? <Loader2 className="animate-spin" /> : <Eye />}
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!preview} onOpenChange={value => !value && setPreview(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.label ?? 'Revision'} · {preview && new Date(preview.createdAt).toLocaleString()}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-md border border-steel-200 p-5 dark:border-dark-300">
            <h2 className="mb-4 text-2xl font-bold">{preview?.title}</h2>
            {preview && <RevisionBody content={preview.content} />}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button type="button" onClick={() => preview && restore(preview.id)} disabled={isPending}>
              <RotateCcw /> Restore this version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RevisionBody({ content }: { content: unknown }) {
  if (typeof content === 'string') {
    return <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }} />;
  }

  if (isBuilderData(content)) {
    return (
      <ol className="space-y-3">
        {content.content.map((block, i) => (
          <li key={block.props.id ?? i} className="rounded-md border border-steel-200 p-3 dark:border-dark-300">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{block.type}</p>
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-steel-600 dark:text-steel-300">
              {extractPlainText({ root: {}, content: [block] }, 400) || '—'}
            </p>
          </li>
        ))}
        {!content.content.length && <li className="text-sm text-steel-500">Empty page</li>}
      </ol>
    );
  }

  return <p className="text-sm text-steel-500">Empty draft</p>;
}
