'use client';

import { LayoutTemplate, Loader2, PanelsTopLeft, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  setPostTemplate,
  switchPostLayout,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';

const DEFAULT = 'default';
const CUSTOM = 'custom';

export type TemplateTarget = {
  id: string;
  title: string;
  layout: 'template' | 'custom';
  templateId: string | null;
};

/** `default`, `custom`, or a template id. */
export const currentChoice = (post: TemplateTarget) =>
  post.layout === 'custom' ? CUSTOM : (post.templateId ?? DEFAULT);

/** Label for where a post's layout comes from. */
export function layoutLabel(
  post: Pick<TemplateTarget, 'layout' | 'templateId'> & {
    templateName?: string | null;
  },
  templates: Pick<PostTemplateListItem, 'id' | 'name' | 'isDefault'>[]
) {
  if (post.layout === 'custom') return 'Custom layout';
  if (post.templateId)
    return (
      post.templateName ??
      templates.find(t => t.id === post.templateId)?.name ??
      'Template'
    );
  const fallback = templates.find(t => t.isDefault)?.name;
  return fallback && fallback.toLowerCase() !== 'default'
    ? `Default (${fallback})`
    : 'Default template';
}

function Option({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof LayoutTemplate;
  title: string;
  description?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
        selected
          ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
          : 'border-steel-200 hover:border-steel-300 dark:border-dark-300'
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          selected ? 'text-indigo-600' : 'text-steel-400'
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {title}
          {badge}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-steel-500">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function SetTemplateDialog({
  post,
  templates,
  open,
  onOpenChange,
}: {
  post: TemplateTarget;
  templates: PostTemplateListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(() => currentChoice(post));
  const [isPending, startTransition] = useTransition();
  const defaultTemplate = templates.find(t => t.isDefault);
  const unchanged = choice === currentChoice(post);

  const close = (next: boolean) => {
    if (!next) setChoice(currentChoice(post));
    onOpenChange(next);
  };

  const save = () =>
    startTransition(async () => {
      const result =
        choice === CUSTOM
          ? await switchPostLayout({ id: post.id, layout: 'custom' })
          : await setPostTemplate({
              id: post.id,
              templateId: choice === DEFAULT ? null : choice,
            });
      await handleActionResponse(result, () => {
        toast.success(
          choice === CUSTOM
            ? 'Custom layout created'
            : `"${post.title}" now uses ${
                choice === DEFAULT
                  ? 'the default template'
                  : templates.find(t => t.id === choice)?.name
              }`
        );
        onOpenChange(false);
        router.refresh();
      });
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set post template</DialogTitle>
          <DialogDescription>
            Choose the layout &ldquo;{post.title}&rdquo; renders through.
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label="Post template"
          className="-mx-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-1"
        >
          <Option
            selected={choice === DEFAULT}
            onSelect={() => setChoice(DEFAULT)}
            icon={Star}
            title="Use default template"
            description={
              defaultTemplate
                ? `Follows the default, currently "${defaultTemplate.name}". Changes when another template becomes the default.`
                : 'Follows whichever template is the default.'
            }
          />
          {templates.map(template => (
            <Option
              key={template.id}
              selected={choice === template.id}
              onSelect={() => setChoice(template.id)}
              icon={LayoutTemplate}
              title={template.name}
              description={template.description}
              badge={
                <>
                  {template.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                  {!template.isPublished && (
                    <Badge variant="outline">Not published</Badge>
                  )}
                  <span className="text-xs font-normal text-steel-400">
                    {template.postCount}{' '}
                    {template.postCount === 1 ? 'post' : 'posts'}
                  </span>
                </>
              }
            />
          ))}
          <Option
            selected={choice === CUSTOM}
            onSelect={() => setChoice(CUSTOM)}
            icon={PanelsTopLeft}
            title="Custom layout"
            description="Give this post its own canvas, starting from its current template."
          />
        </div>

        {post.layout === 'custom' && choice !== CUSTOM && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            This post&rsquo;s custom layout is removed from the draft. It stays
            in revision history.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isPending || unchanged}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
