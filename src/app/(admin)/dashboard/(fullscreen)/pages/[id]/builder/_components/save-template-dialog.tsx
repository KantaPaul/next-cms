'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { handleActionResponse } from '@/lib/utils/handle-action-response';

const TEMPLATE_CATEGORIES = [
  'Custom',
  'Landing',
  'Sales',
  'Company',
  'Blog',
  'Header',
  'Footer',
  'General',
] as const;
const NEW_CATEGORY_VALUE = '__new_category__';

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
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isPending, startTransition] = useTransition();

  const resolvedCategory = isCustomCategory
    ? customCategory.trim() || 'Custom'
    : category;

  const save = () =>
    startTransition(async () => {
      await handleActionResponse(
        await saveTemplate({
          name,
          description,
          category: resolvedCategory,
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

  const handleCategoryChange = (val: string) => {
    if (val === NEW_CATEGORY_VALUE) {
      setIsCustomCategory(true);
    } else {
      setIsCustomCategory(false);
      setCategory(val);
    }
  };

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
            <Select
              value={isCustomCategory ? NEW_CATEGORY_VALUE : category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger id="template-category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>
                  + New category...
                </SelectItem>
              </SelectContent>
            </Select>
            {isCustomCategory && (
              <input
                className={`${inputClass} mt-1.5`}
                placeholder="Enter custom category name"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                maxLength={50}
                required
                autoFocus
              />
            )}
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
