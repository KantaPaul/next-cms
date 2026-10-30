'use client';

import { Component, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FieldShell,
  inputClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import { saveGlobalBlock } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import type { BuilderItem } from '@/builder/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { BuilderTarget } from './builder-context';

/** A block with everything inside it, as Puck data for a global block. */
export type GlobalSection = {
  item: BuilderItem;
  zones: Record<string, BuilderItem[]>;
};

/**
 * The save-as-global dialog without Puck: `getSection` returns the block with
 * its children, `linkGlobal` swaps it for a linked GlobalRef.
 */
export function SaveGlobalDialogView({
  target,
  onClose,
  getSection,
  linkGlobal,
}: {
  target: BuilderTarget | null;
  onClose: () => void;
  getSection: (target: BuilderTarget) => GlobalSection;
  linkGlobal: (
    target: BuilderTarget,
    saved: { id: string; name: string },
    section: GlobalSection
  ) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [link, setLink] = useState(true);
  const [isPending, setPending] = useState(false);

  useEffect(() => {
    if (target) {
      const title =
        typeof target.props.title === 'string' ? target.props.title : '';
      setName(title ? `${target.type}: ${title}`.slice(0, 150) : target.type);
    }
  }, [target]);

  const save = async () => {
    if (!target) return;
    setPending(true);

    try {
      const section = getSection(target);
      const { item, zones: relevantZones } = section;
      await handleActionResponse(
        await saveGlobalBlock({
          name,
          category,
          content: { content: [item], zones: relevantZones },
        }),
        row => {
          const saved = row as { id: string; name: string };

          if (link) linkGlobal(target, saved, section);

          toast.success(`Saved "${saved.name}" as a global block`);
          onClose();
        }
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={open => !open && onClose()}>
      <DialogContent data-theme="light" className="text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Component className="size-5 text-violet-500" /> Save as global
            block
          </DialogTitle>
          <DialogDescription>
            Reuse this section on other pages. Editing the global block updates
            every page that uses it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FieldShell label="Name" htmlFor="global-name">
            <input
              id="global-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputClass}
              maxLength={150}
            />
          </FieldShell>
          <FieldShell label="Category" htmlFor="global-category">
            <input
              id="global-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputClass}
              maxLength={50}
            />
          </FieldShell>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={link}
              onChange={e => setLink(e.target.checked)}
              className="rounded"
            />
            Replace this section with a linked copy
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isPending || !name.trim()}
          >
            {isPending && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
