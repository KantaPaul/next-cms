'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import { POST_TYPE_PRESETS } from '@/config/post-types';
import { createPostTypeFromPreset } from '../_modules/collections.actions';

/** One-click cards that install a ready-made post type with its fields. */
export function PresetPicker() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const install = async (presetId: string) => {
    setPending(presetId);
    const fd = new FormData();
    fd.append('presetId', presetId);
    const result = await createPostTypeFromPreset(fd);
    setPending(null);
    if (!result.ok || !result.id) {
      toast.error(result.error ?? 'Failed to add post type.');
      return;
    }
    toast.success('Post type added. Add your first entry.');
    router.push(PAGES.DASHBOARD.COLLECTION_ENTRIES(result.id));
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {POST_TYPE_PRESETS.map(preset => (
        <div
          key={preset.id}
          className="flex flex-col gap-3 rounded-lg border p-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <PostTypeIcon name={preset.icon} className="size-4" />
            </span>
            <p className="font-medium">{preset.name}</p>
          </div>
          <p className="flex-1 text-xs text-muted-foreground">
            {preset.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {preset.fields.map(f => f.label).join(' · ')}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => install(preset.id)}
          >
            {pending === preset.id ? 'Adding…' : `Add ${preset.name}`}
          </Button>
        </div>
      ))}
    </div>
  );
}
