'use client';

import { useGetPuck } from '@measured/puck';
import { Component, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BuilderItem } from '@/builder/data';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { saveGlobalBlock } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { FieldShell, inputClass } from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import type { BuilderTarget } from './builder-context';

export function SaveGlobalDialog({ target, onClose }: { target: BuilderTarget | null; onClose: () => void }) {
  const getPuck = useGetPuck();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [link, setLink] = useState(true);
  const [isPending, setPending] = useState(false);

  useEffect(() => {
    if (target) {
      const title = typeof target.props.title === 'string' ? target.props.title : '';
      setName(title ? `${target.type}: ${title}`.slice(0, 150) : target.type);
    }
  }, [target]);

  const save = async () => {
    if (!target) return;
    setPending(true);

    try {
      const { appState, dispatch, getSelectorForId } = getPuck();
      const allZones = (appState?.data?.zones ?? {}) as Record<string, BuilderItem[]>;

      // BFS to find all child block ids and their nested zones
      const collectedIds = new Set<string>([target.id]);
      let added = true;
      while (added) {
        added = false;
        for (const [zoneKey, items] of Object.entries(allZones)) {
          const colonIdx = zoneKey.indexOf(':');
          const ownerId = colonIdx !== -1 ? zoneKey.slice(0, colonIdx) : zoneKey;
          if (collectedIds.has(ownerId)) {
            for (const childItem of items ?? []) {
              if (childItem?.props?.id && !collectedIds.has(childItem.props.id)) {
                collectedIds.add(childItem.props.id);
                added = true;
              }
            }
          }
        }
      }

      // Collect all zones belonging to target or any child block
      const relevantZones: Record<string, BuilderItem[]> = {};
      for (const [zoneKey, items] of Object.entries(allZones)) {
        const colonIdx = zoneKey.indexOf(':');
        const ownerId = colonIdx !== -1 ? zoneKey.slice(0, colonIdx) : zoneKey;
        if (collectedIds.has(ownerId)) {
          relevantZones[zoneKey] = items;
        }
      }

      const item: BuilderItem = { type: target.type, props: target.props };
      await handleActionResponse(
        await saveGlobalBlock({
          name,
          category,
          content: { content: [item], zones: relevantZones },
        }),
        row => {
          const saved = row as { id: string; name: string };

          if (link) {
            const selector = getSelectorForId(target.id);
            if (selector) {
              dispatch({
                type: 'replace',
                destinationIndex: selector.index,
                destinationZone: selector.zone,
                data: {
                  type: 'GlobalRef',
                  // Puck's replace action requires the node to keep its id.
                  props: {
                    id: target.id,
                    globalBlockId: saved.id,
                    globalBlockName: saved.name,
                    blocks: [item],
                    zones: relevantZones,
                  },
                },
              });
            }
          }

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
            <Component className="size-5 text-violet-500" /> Save as global block
          </DialogTitle>
          <DialogDescription>Reuse this section on other pages. Editing the global block updates every page that uses it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FieldShell label="Name" htmlFor="global-name">
            <input id="global-name" value={name} onChange={e => setName(e.target.value)} className={inputClass} maxLength={150} />
          </FieldShell>
          <FieldShell label="Category" htmlFor="global-category">
            <input id="global-category" value={category} onChange={e => setCategory(e.target.value)} className={inputClass} maxLength={50} />
          </FieldShell>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={link} onChange={e => setLink(e.target.checked)} className="rounded" />
            Replace this section with a linked copy
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
