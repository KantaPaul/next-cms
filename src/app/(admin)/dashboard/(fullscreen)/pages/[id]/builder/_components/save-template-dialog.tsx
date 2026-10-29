'use client';

import { useGetPuck } from '@measured/puck';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  FieldShell,
  inputClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import { saveTemplate } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
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

/** The save-as-template dialog without Puck; `getContent` returns the page as Puck data. */
export function SaveTemplateDialogView({
  open,
  onOpenChange,
  pageTitle,
  getContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTitle: string;
  getContent: () => unknown;
}) {
  const [name, setName] = useState(pageTitle);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom');
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      await handleActionResponse(
        await saveTemplate({
          name,
          description,
          category,
          editorType: 'builder',
          content: getContent(),
        }),
        row => {
          toast.success(
            `Saved "${(row as { name: string }).name}" as a template`
          );
          onOpenChange(false);
        }
      );
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-theme="light" className="text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-muted-foreground" /> Save as
            template
          </DialogTitle>
          <DialogDescription>
            New pages can start from this layout. The template is a copy, so
            later edits to this page do not change it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FieldShell label="Name" htmlFor="template-name">
            <input
              id="template-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputClass}
              maxLength={150}
            />
          </FieldShell>
          <FieldShell label="Category" htmlFor="template-category">
            <input
              id="template-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputClass}
              maxLength={50}
            />
          </FieldShell>
          <FieldShell label="Description" htmlFor="template-description">
            <textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${inputClass} h-auto py-2`}
              rows={2}
              maxLength={500}
            />
          </FieldShell>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isPending || !name.trim()}
          >
            {isPending && <Loader2 className="animate-spin" />} Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The save-as-template dialog in the Puck builder. */
export function SaveTemplateDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTitle: string;
}) {
  const getPuck = useGetPuck();
  return <SaveTemplateDialogView {...props} getContent={() => getPuck().appState.data} />;
}
