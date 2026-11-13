'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import type { BuilderSettings } from '@/config/builder-settings';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { updateBuilderSettings } from '../../_modules/settings.actions';

/** Site-level builder switches shown above the block manager. */
export function BuilderSwitches({ settings }: { settings: BuilderSettings }) {
  const router = useRouter();
  const [styleClasses, setStyleClasses] = useState(settings.styleClasses);
  const [saving, setSaving] = useState(false);

  const toggle = async (value: boolean) => {
    setSaving(true);
    setStyleClasses(value);
    const ok = await handleActionResponse(updateBuilderSettings({ styleClasses: value }) as never, () => {
      toast.success(value ? 'Style classes turned on' : 'Style classes turned off');
      router.refresh();
    });
    if (!ok) setStyleClasses(!value);
    setSaving(false);
  };

  return (
    <section
      aria-labelledby="builder-switches-title"
      className="mb-6 rounded-lg border border-steel-200 bg-white p-4 dark:border-dark-300 dark:bg-dark-100"
    >
      <h2 id="builder-switches-title" className="mb-3 text-sm font-semibold">
        Builder features
      </h2>
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor="builder-style-classes" className="text-sm font-medium">
            Style classes <span className="ml-1 rounded bg-steel-100 px-1.5 py-0.5 text-[11px] dark:bg-dark-200">Beta</span>
          </label>
          <p className="mt-1 max-w-prose text-xs text-steel-500">
            Reusable CSS classes for blocks, edited in the inspector and the Classes panel. Turning this off hides
            the class tools and renders pages without class styles; classes and their use on blocks are kept, so
            turning it back on restores them.
          </p>
        </div>
        <Switch
          id="builder-style-classes"
          checked={styleClasses}
          disabled={saving}
          onChange={value => void toggle(value)}
          aria-label="Style classes"
        />
      </div>
    </section>
  );
}
