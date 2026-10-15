'use client';

import { FileText, Film, Folder, Loader2, Search, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { listMedia } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.actions';
import type { MediaItem } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { cn } from '@/lib/utils/cn';
import { uploadMediaFile } from './upload';

export type MediaFilter = { search: string; folder: string; type: '' | 'image' | 'video' | 'document' };

export function MediaThumb({ item, className }: { item: Pick<MediaItem, 'url' | 'mime' | 'alt' | 'filename'>; className?: string }) {
  if (item.mime.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.alt ?? ''} loading="lazy" className={cn('size-full object-cover', className)} />;
  }
  const Icon = item.mime.startsWith('video/') ? Film : FileText;
  return (
    <div className={cn('flex size-full flex-col items-center justify-center gap-1 bg-steel-50 p-2 text-steel-500 dark:bg-dark-100', className)}>
      <Icon className="size-8" />
      <span className="line-clamp-1 text-[11px]">{item.filename}</span>
    </div>
  );
}

/**
 * Searchable grid of media with upload. Used by the media library page and the picker dialog.
 */
export function MediaBrowser({
  selectedId,
  onSelect,
  accept = 'image/*,video/mp4,video/webm,application/pdf',
  initialType = '',
  refreshKey = 0,
  className,
}: {
  selectedId?: string | null;
  onSelect: (item: MediaItem) => void;
  accept?: string;
  initialType?: MediaFilter['type'];
  refreshKey?: number;
  className?: string;
}) {
  const [filter, setFilter] = useState<MediaFilter>({ search: '', folder: '', type: initialType });
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<{ folder: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await listMedia({ ...filter, size: 100 });
    if (response && 'data' in response) {
      setItems(response.data);
      setFolders(response.folders);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(load, filter.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, filter.search, refreshKey]);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(n => n + list.length);

    const results = await Promise.allSettled(list.map(file => uploadMediaFile(file, filter.folder || undefined)));
    setUploading(n => n - list.length);

    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    failed.forEach(r => toast.error((r.reason as Error).message));
    const uploaded = results.filter(r => r.status === 'fulfilled');
    if (uploaded.length) toast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded`);

    await load();
    const first = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<MediaItem> | undefined;
    if (first && list.length === 1) onSelect({ ...first.value, uploadedBy: null, createdAt: new Date() } as MediaItem);
  };

  return (
    <div
      className={cn('flex min-h-0 flex-col gap-3', className)}
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        void uploadFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Search media</span>
          <Search className="absolute left-2.5 top-2.5 size-4 text-steel-400" />
          <input
            type="search"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Search by name or alt text"
            className="h-9 w-full rounded-md border border-steel-200 bg-white pl-8 pr-3 text-sm dark:border-dark-300 dark:bg-dark-100"
          />
        </label>
        <select
          aria-label="Folder"
          value={filter.folder}
          onChange={e => setFilter(f => ({ ...f, folder: e.target.value }))}
          className="h-9 rounded-md border border-steel-200 bg-white px-2 text-sm dark:border-dark-300 dark:bg-dark-100"
        >
          <option value="">All folders</option>
          {folders.map(f => (
            <option key={f.folder} value={f.folder}>
              {f.folder} ({f.total})
            </option>
          ))}
        </select>
        <select
          aria-label="File type"
          value={filter.type}
          onChange={e => setFilter(f => ({ ...f, type: e.target.value as MediaFilter['type'] }))}
          className="h-9 rounded-md border border-steel-200 bg-white px-2 text-sm dark:border-dark-300 dark:bg-dark-100"
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
        <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading > 0}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={e => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div
        className={cn(
          'relative min-h-48 flex-1 overflow-auto rounded-lg border border-dashed p-2 transition',
          dragOver ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-steel-200 dark:border-dark-300'
        )}
      >
        {loading && !items.length ? (
          <div className="flex h-48 items-center justify-center text-sm text-steel-500">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading media…
          </div>
        ) : !items.length ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-steel-500">
            <Folder className="size-8 text-steel-300" />
            {filter.search || filter.folder || filter.type
              ? 'No files match these filters.'
              : 'No files yet. Drop files here or use Upload.'}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={selectedId === item.id}
                  title={item.filename}
                  className={cn(
                    'group relative block aspect-square w-full overflow-hidden rounded-md border bg-steel-50 transition hover:border-steel-400 dark:bg-dark-100',
                    selectedId === item.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-steel-200 dark:border-dark-300'
                  )}
                >
                  <MediaThumb item={item} />
                  {!item.alt && item.mime.startsWith('image/') && (
                    <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">No alt</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-indigo-700">
            Drop to upload
          </div>
        )}
      </div>
    </div>
  );
}
