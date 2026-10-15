'use client';

import { format } from 'date-fns';
import { Copy, ExternalLink, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAiEnabled } from '@/components/ai/use-ai-status';
import { MediaBrowser, MediaThumb } from '@/components/media/media-browser';
import { formatBytes } from '@/components/media/upload';
import { PERMISSIONS } from '@/config/permissions';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useCan } from '@/providers/access.provider';
import { deleteMedia, updateMedia } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.actions';
import type { MediaItem } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { generateAltText } from '@/app/(admin)/dashboard/(shell)/pages/_modules/ai.actions';

const fieldClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

export function MediaLibrary() {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <MediaBrowser
        className="h-[calc(100svh-14rem)] min-h-96"
        selectedId={selected?.id}
        onSelect={setSelected}
        refreshKey={refreshKey}
      />
      <aside className="rounded-lg border border-steel-200 p-4 dark:border-dark-300">
        {selected ? (
          <MediaDetails
            key={selected.id}
            item={selected}
            onChanged={item => {
              setSelected(item);
              setRefreshKey(k => k + 1);
            }}
            onDeleted={() => {
              setSelected(null);
              setRefreshKey(k => k + 1);
            }}
          />
        ) : (
          <p className="text-sm text-steel-500">Select a file to edit its details, or drop files on the grid to upload.</p>
        )}
      </aside>
    </div>
  );
}

function MediaDetails({
  item,
  onChanged,
  onDeleted,
}: {
  item: MediaItem;
  onChanged: (item: MediaItem) => void;
  onDeleted: () => void;
}) {
  const canEdit = useCan(PERMISSIONS.MEDIA_UPLOAD);
  const aiEnabled = useAiEnabled();
  const [form, setForm] = useState({ title: item.title ?? '', alt: item.alt ?? '', folder: item.folder });
  const [isSaving, startSaving] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [absoluteUrl, setAbsoluteUrl] = useState(item.url);

  useEffect(() => {
    setAbsoluteUrl(new URL(item.url, window.location.origin).toString());
  }, [item.url]);

  const isRaster = item.mime.startsWith('image/') && item.mime !== 'image/svg+xml';
  const dirty = form.title !== (item.title ?? '') || form.alt !== (item.alt ?? '') || form.folder !== item.folder;

  const save = () =>
    startSaving(async () => {
      await handleActionResponse(updateMedia({ id: item.id, ...form }), row => {
        toast.success('File details saved');
        onChanged({ ...item, ...(row as Partial<MediaItem>) });
      });
    });

  const remove = () => {
    if (!confirm(`Delete "${item.filename}"? Pages that use it will show a broken image.`)) return;
    startSaving(async () => {
      await handleActionResponse(deleteMedia({ id: item.id }), () => {
        toast.success('File deleted');
        onDeleted();
      });
    });
  };

  const suggestAlt = () =>
    startGenerating(async () => {
      await handleActionResponse(generateAltText({ mediaId: item.id }), result => {
        setForm(f => ({ ...f, alt: (result as { alt: string }).alt }));
      });
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-video overflow-hidden rounded-md border border-steel-200 dark:border-dark-300">
        <MediaThumb item={item} className="object-contain" />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-steel-500">
        <dt>File</dt>
        <dd className="truncate text-steel-700 dark:text-steel-200" title={item.filename}>
          {item.filename}
        </dd>
        <dt>Type</dt>
        <dd>{item.mime}</dd>
        <dt>Size</dt>
        <dd>{formatBytes(item.size)}</dd>
        {item.width && item.height && (
          <>
            <dt>Dimensions</dt>
            <dd>
              {item.width} × {item.height}
            </dd>
          </>
        )}
        <dt>Uploaded</dt>
        <dd>
          {format(new Date(item.createdAt), 'PP')}
          {item.uploadedBy ? ` by ${item.uploadedBy}` : ''}
        </dd>
      </dl>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => navigator.clipboard.writeText(absoluteUrl).then(() => toast.success('URL copied'))}
        >
          <Copy /> Copy URL
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <a href={item.url} target="_blank" rel="noreferrer">
            <ExternalLink /> Open
          </a>
        </Button>
      </div>

      <fieldset disabled={!canEdit || isSaving} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input className={fieldClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span className="flex items-center justify-between">
            Alt text
            {aiEnabled && isRaster && canEdit && (
              <button
                type="button"
                onClick={suggestAlt}
                disabled={isGenerating}
                className="inline-flex items-center gap-1 text-xs font-normal text-violet-600 hover:underline disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Generate
              </button>
            )}
          </span>
          <textarea
            rows={3}
            className={`${fieldClass} h-auto py-2`}
            value={form.alt}
            onChange={e => setForm(f => ({ ...f, alt: e.target.value }))}
            placeholder="Describe the image for screen-reader users"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Folder
          <input className={fieldClass} value={form.folder} onChange={e => setForm(f => ({ ...f, folder: e.target.value }))} />
        </label>

        {canEdit && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" size="sm" onClick={save} disabled={!dirty || isSaving}>
              {isSaving && <Loader2 className="animate-spin" />} Save details
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={remove}>
              <Trash2 /> Delete
            </Button>
          </div>
        )}
      </fieldset>
    </div>
  );
}
