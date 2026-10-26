'use client';

import { ImageIcon, X } from 'lucide-react';
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
  imagesOnly = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (item: MediaItem) => void;
  imagesOnly?: boolean;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Pick a file or upload a new one.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <MediaBrowser
            className="min-h-[420px] flex-1"
            selectedId={selected?.id}
            onSelect={setSelected}
            initialType={imagesOnly ? 'image' : ''}
            accept={imagesOnly ? 'image/*' : undefined}
          />
        )}
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="truncate text-xs text-steel-500">
            {selected ? selected.filename : 'Nothing selected'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onPick(selected);
                onOpenChange(false);
              }}
            >
              Use file
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
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
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
