'use client';

import { useTranslations } from 'next-intl';
import { LayoutTemplate, Loader2, PanelsTopLeft, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import {
  setPostTemplate,
  switchPostLayout,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
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

/** Translator for the `content.layout` messages (see `useLayoutLabel`). */
export type LayoutLabelT = (
  key: 'customLayout' | 'template' | 'defaultNamed' | 'defaultTemplate',
  values?: { name: string }
) => string;

const ENGLISH_LAYOUT_LABELS: LayoutLabelT = (key, values) =>
  ({
    customLayout: 'Custom layout',
    template: 'Template',
    defaultNamed: `Default (${values?.name ?? ''})`,
    defaultTemplate: 'Default template',
  })[key];

/**
 * Label for where a post's layout comes from. Pass `t` (from
 * `useLayoutLabel`) for the admin UI language; without it the label is English.
 */
export function layoutLabel(
  post: Pick<TemplateTarget, 'layout' | 'templateId'> & {
    templateName?: string | null;
  },
  templates: Pick<PostTemplateListItem, 'id' | 'name' | 'isDefault'>[],
  t: LayoutLabelT = ENGLISH_LAYOUT_LABELS
) {
  if (post.layout === 'custom') return t('customLayout');
  if (post.templateId)
    return (
      post.templateName ??
      templates.find(tpl => tpl.id === post.templateId)?.name ??
      t('template')
    );
  const fallback = templates.find(tpl => tpl.isDefault)?.name;
  return fallback && fallback.toLowerCase() !== 'default'
    ? t('defaultNamed', { name: fallback })
    : t('defaultTemplate');
}

/** The `content.layout` translator to pass to `layoutLabel`. */
export function useLayoutLabel(): LayoutLabelT {
  return useTranslations('content.layout') as unknown as LayoutLabelT;
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
        'flex w-full items-start gap-3 rounded-md border p-3 text-start transition-colors',
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

export type DialogTemplateItem = Pick<
  PostTemplateListItem,
  'id' | 'name' | 'isDefault'
> & {
  description?: string | null;
  isPublished?: boolean;
  postCount?: number;
};

export function SetTemplateDialog({
  post,
  templates,
  open,
  onOpenChange,
  title,
  onSwitchLayout,
  onSetTemplate,
}: {
  post: TemplateTarget;
  templates: DialogTemplateItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onSwitchLayout?: (layout: 'custom' | 'template') => Promise<unknown>;
  onSetTemplate?: (templateId: string | null) => Promise<unknown>;
}) {
  const router = useRouter();
  const t = useTranslations('content.setTemplate');
  const tLayout = useTranslations('content.layout');
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
          ? onSwitchLayout
            ? await onSwitchLayout('custom')
            : await switchPostLayout({ id: post.id, layout: 'custom' })
          : onSetTemplate
            ? await onSetTemplate(choice === DEFAULT ? null : choice)
            : await setPostTemplate({
                id: post.id,
                templateId: choice === DEFAULT ? null : choice,
              });
      await handleActionResponse(result as any, () => {
        toast.success(
          choice === CUSTOM
            ? t('customCreated')
            : choice === DEFAULT
              ? t('nowUsesDefault', { title: post.title })
              : t('nowUses', {
                  title: post.title,
                  template: templates.find(tpl => tpl.id === choice)?.name ?? '',
                })
        );
        onOpenChange(false);
        router.refresh();
      });
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? t('title')}</DialogTitle>
          <DialogDescription>
            {t('intro', { title: post.title })}
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label={t('ariaLabel')}
          className="-mx-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-1"
        >
          <Option
            selected={choice === DEFAULT}
            onSelect={() => setChoice(DEFAULT)}
            icon={Star}
            title={t('useDefault')}
            description={
              defaultTemplate
                ? t('followsDefaultNamed', { name: defaultTemplate.name })
                : t('followsDefault')
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
                    <Badge variant="secondary">{t('default')}</Badge>
                  )}
                  {!template.isPublished && (
                    <Badge variant="outline">{t('notPublished')}</Badge>
                  )}
                  <span className="text-xs font-normal text-steel-400">
                    {t('postCount', { count: template.postCount ?? 0 })}
                  </span>
                </>
              }
            />
          ))}
          <Option
            selected={choice === CUSTOM}
            onSelect={() => setChoice(CUSTOM)}
            icon={PanelsTopLeft}
            title={tLayout('customLayout')}
            description={t('customLayoutDesc')}
          />
        </div>

        {post.layout === 'custom' && choice !== CUSTOM && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {t('customRemoved')}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={isPending || unchanged}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t('apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
