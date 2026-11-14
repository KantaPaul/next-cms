'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('collections.presets');
  const presetName = (preset: { id: string; name: string }) =>
    t.has(`items.${preset.id}.name`) ? t(`items.${preset.id}.name` as never) : preset.name;
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const install = async (presetId: string) => {
    setPending(presetId);
    const fd = new FormData();
    fd.append('presetId', presetId);
    const result = await createPostTypeFromPreset(fd);
    setPending(null);
    if (!result.ok || !result.slug) {
      toast.error(result.error ?? t('failed'));
      return;
    }
    toast.success(t('added'));
    router.push(PAGES.DASHBOARD.COLLECTION(result.slug));
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
            <p className="font-medium">{presetName(preset)}</p>
          </div>
          <p className="flex-1 text-xs text-muted-foreground">
            {t.has(`items.${preset.id}.description`)
              ? t(`items.${preset.id}.description` as never)
              : preset.description}
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
            {pending === preset.id ? t('adding') : t('add', { name: presetName(preset) })}
          </Button>
        </div>
      ))}
    </div>
  );
}
