'use client';

import { ChevronLeft, ChevronRight, ImageIcon, Plus, Star, X } from 'lucide-react';
import { useState } from 'react';
import type { MediaItem } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MediaBrowser } from './media-browser';

export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
  onPickMultiple,
  multiple = false,
  imagesOnly = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick?: (item: MediaItem) => void;
  onPickMultiple?: (items: MediaItem[]) => void;
  multiple?: boolean;
  imagesOnly?: boolean;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [selectedList, setSelectedList] = useState<MediaItem[]>([]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected(null);
      setSelectedList([]);
    }
    onOpenChange(nextOpen);
  };

  const toggleMulti = (item: MediaItem) => {
    setSelectedList(prev =>
      prev.some(existing => existing.id === item.id)
        ? prev.filter(existing => existing.id !== item.id)
        : [...prev, item]
    );
  };

  const addUploaded = (items: MediaItem[]) => {
    if (!multiple) {
      if (items[0]) setSelected(items[0]);
      return;
    }
    setSelectedList(prev => {
      const seen = new Set(prev.map(i => i.id));
      const merged = [...prev];
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
      return merged;
    });
  };

  const canConfirm = multiple ? selectedList.length > 0 : Boolean(selected);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            {multiple
              ? 'Select one or more files, or upload new ones.'
              : 'Pick a file or upload a new one.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <MediaBrowser
            className="min-h-[420px] flex-1"
            selectedId={multiple ? undefined : selected?.id}
            selectedIds={multiple ? selectedList.map(i => i.id) : undefined}
            onSelect={multiple ? toggleMulti : setSelected}
            onUploadMany={addUploaded}
            initialType={imagesOnly ? 'image' : ''}
            accept={imagesOnly ? 'image/*' : undefined}
          />
        )}
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="truncate text-xs text-steel-500">
            {multiple
              ? selectedList.length
                ? `${selectedList.length} file${selectedList.length > 1 ? 's' : ''} selected`
                : 'Nothing selected'
              : selected
                ? selected.filename
                : 'Nothing selected'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                if (multiple) {
                  if (!selectedList.length) return;
                  onPickMultiple?.(selectedList);
                } else {
                  if (!selected) return;
                  onPick?.(selected);
                }
                handleOpenChange(false);
              }}
            >
              {multiple
                ? `Use ${selectedList.length || ''} file${selectedList.length === 1 ? '' : 's'}`.replace(/\s+/, ' ')
                : 'Use file'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Image field with preview, a library picker, and a URL fallback. */
export function MediaField({
  value,
  onChange,
  onPickItem,
  placeholder = 'https://',
}: {
  value: string;
  onChange: (url: string) => void;
  onPickItem?: (item: MediaItem) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative overflow-hidden rounded-md border border-steel-200 dark:border-dark-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => onChange('')}
            className="absolute end-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-steel-300 text-xs text-steel-500 hover:border-steel-400 dark:border-dark-300"
        >
          <ImageIcon className="size-5" />
          Choose from library
        </button>
      )}
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Image URL"
          className="h-8 min-w-0 flex-1 rounded-md border border-steel-200 bg-white px-2 text-xs dark:border-dark-300 dark:bg-dark-100"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          Browse
        </Button>
      </div>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onPick={item => {
          onChange(item.url);
          onPickItem?.(item);
        }}
      />
    </div>
  );
}

/** Multi-image gallery field with upload/multi-pick, reorder, featured-first support, and URL add. */
export function MultiMediaField({
  value,
  onChange,
  isFeaturedField = false,
  placeholder = 'https://',
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  isFeaturedField?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const appendUrls = (nextUrls: string[]) => {
    const seen = new Set(value);
    const merged = [...value];
    for (const raw of nextUrls) {
      const trimmed = raw.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      merged.push(trimmed);
    }
    onChange(merged);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const copy = [...value];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  };

  const makeFirst = (index: number) => {
    if (index <= 0 || index >= value.length) return;
    const copy = [...value];
    const [item] = copy.splice(index, 1);
    copy.unshift(item);
    onChange(copy);
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    appendUrls([trimmed]);
    setUrlInput('');
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative aspect-square overflow-hidden rounded-md border border-steel-200 bg-steel-50 dark:border-dark-300 dark:bg-dark-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              {isFeaturedField && idx === 0 && (
                <span className="absolute start-1.5 top-1.5 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  Featured
                </span>
              )}
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className="absolute end-1.5 top-1.5 rounded-full bg-black/65 p-1 text-white hover:bg-black/85"
              >
                <X className="size-3" />
              </button>
              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 rounded bg-black/55 px-1 py-0.5 text-white opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Move left"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  className="rounded p-0.5 hover:bg-white/20 disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                {isFeaturedField && idx > 0 && (
                  <button
                    type="button"
                    aria-label="Set as featured image"
                    title="Move first (Featured)"
                    onClick={() => makeFirst(idx)}
                    className="rounded p-0.5 hover:bg-white/20"
                  >
                    <Star className="size-3" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Move right"
                  disabled={idx === value.length - 1}
                  onClick={() => move(idx, 1)}
                  className="rounded p-0.5 hover:bg-white/20 disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-steel-300 text-xs text-steel-500 hover:border-steel-400 dark:border-dark-300"
        >
          <ImageIcon className="size-5" />
          Choose or upload multiple images
        </button>
      )}
      <div className="flex gap-2">
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder={placeholder}
          aria-label="Add image URL"
          className="h-8 min-w-0 flex-1 rounded-md border border-steel-200 bg-white px-2 text-xs dark:border-dark-300 dark:bg-dark-100"
        />
        <Button type="button" size="sm" variant="outline" onClick={addUrl}>
          <Plus className="me-1 size-3.5" />
          Add URL
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          Add images
        </Button>
      </div>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        multiple
        onPickMultiple={items => appendUrls(items.map(i => i.url))}
      />
    </div>
  );
}
