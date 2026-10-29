'use client';

import { type Data, useGetPuck } from '@measured/puck';
import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  FieldShell,
  inputClass,
  textareaClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import {
  generatePage,
  rewriteBlock,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/ai.actions';
import type { BuilderData } from '@/builder/data';
import { collectCopy, extractPlainText } from '@/builder/text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSiteLocales } from '@/providers/site-locales';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { BuilderTarget } from './builder-context';

type GeneratedResult = {
  title: string;
  slug: string;
  seo: { title: string; description: string };
  data: BuilderData;
};

const PAGE_TYPES = [
  { value: 'landing', label: 'Landing page' },
  { value: 'pricing', label: 'Pricing page' },
  { value: 'about', label: 'About / company' },
  { value: 'product', label: 'Product page' },
  { value: 'event', label: 'Event page' },
  { value: 'other', label: 'Other' },
];

export type GenerateMode = 'replace' | 'append';

/** The generate dialog without Puck; `onApply` puts the generated blocks in the editor. */
export function AiGenerateDialogView({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: BuilderData, mode: GenerateMode) => void;
}) {
  const { locales } = useSiteLocales();
  const [prompt, setPrompt] = useState('');
  const [pageType, setPageType] = useState('landing');
  const [tone, setTone] = useState('');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setResult(null);
  }, [open]);

  const generate = () =>
    startTransition(async () => {
      await handleActionResponse(
        await generatePage({
          prompt,
          pageType,
          tone: tone || undefined,
          language,
        }),
        value => setResult(value as GeneratedResult)
      );
    });

  const apply = (mode: GenerateMode) => {
    if (!result) return;
    onApply(result.data, mode);
    toast.success(
      mode === 'replace'
        ? 'Page replaced with generated blocks'
        : 'Generated blocks added'
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-theme="light"
        className="flex max-h-[85vh] flex-col text-foreground sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" /> Generate a page with
            AI
          </DialogTitle>
          <DialogDescription>
            Describe the page. You can review the blocks before they are added.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="grid gap-4">
            <FieldShell
              label="Brief"
              htmlFor="ai-prompt"
              hint="Audience, product, key messages, and calls to action."
            >
              <textarea
                id="ai-prompt"
                rows={5}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className={textareaClass}
                placeholder="A landing page for a privacy-first analytics tool aimed at indie SaaS founders. Highlight cookie-free tracking, a free tier, and a 2-minute setup."
              />
            </FieldShell>
            <div className="grid gap-3 sm:grid-cols-3">
              <FieldShell label="Page type" htmlFor="ai-type">
                <select
                  id="ai-type"
                  value={pageType}
                  onChange={e => setPageType(e.target.value)}
                  className={inputClass}
                >
                  {PAGE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Tone" htmlFor="ai-tone">
                <input
                  id="ai-tone"
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className={inputClass}
                  placeholder="Confident, friendly"
                />
              </FieldShell>
              <FieldShell label="Language" htmlFor="ai-lang">
                <select
                  id="ai-lang"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className={inputClass}
                >
                  {locales.map(l => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm">
              <span className="font-semibold">{result.title}</span> ·{' '}
              {result.data.content.length} blocks
            </p>
            <ol className="mt-3 space-y-2">
              {result.data.content.map(block => (
                <li
                  key={block.props.id}
                  className="rounded-md border border-border p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                    {block.type}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                    {extractPlainText({ root: {}, content: [block] }, 300)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!result ? (
            <Button
              type="button"
              onClick={generate}
              disabled={isPending || prompt.trim().length < 10}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}{' '}
              {isPending ? 'Generating…' : 'Generate'}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResult(null)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => apply('append')}
              >
                Append to page
              </Button>
              <Button type="button" onClick={() => apply('replace')}>
                Replace page content
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MODES = [
  { value: 'rewrite', label: 'Rewrite' },
  { value: 'shorten', label: 'Shorten' },
  { value: 'expand', label: 'Expand' },
  { value: 'translate', label: 'Translate' },
] as const;

/** The rewrite dialog without Puck; `onApply` returns false when the block is gone. */
export function AiRewriteDialogView({
  target,
  onClose,
  onApply,
}: {
  target: BuilderTarget | null;
  onClose: () => void;
  onApply: (target: BuilderTarget, props: Record<string, unknown>) => boolean;
}) {
  const { locales } = useSiteLocales();
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('rewrite');
  const [language, setLanguage] = useState('es');
  const [tone, setTone] = useState('');
  const [nextProps, setNextProps] = useState<Record<string, unknown> | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState(target);
  if (target && target !== view) setView(target);
  const instruction = view?.instruction;

  const before = view ? collectCopy(view.props) : {};
  const after = nextProps ? collectCopy(nextProps) : {};
  const changed = Object.keys(after).filter(key => after[key] !== before[key]);

  const generate = () =>
    startTransition(async () => {
      if (!target) return;
      await handleActionResponse(
        await rewriteBlock({
          props: target.props,
          mode: instruction ? 'rewrite' : mode,
          language: !instruction && mode === 'translate' ? language : undefined,
          tone: tone || undefined,
          instruction,
        }),
        value =>
          setNextProps((value as { props: Record<string, unknown> }).props)
      );
    });

  useEffect(() => {
    setNextProps(null);
    if (target?.instruction) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const apply = () => {
    if (!target || !nextProps) return;
    if (!onApply(target, nextProps)) {
      toast.error('That block is no longer on the page.');
      return;
    }
    toast.success('Block updated');
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={open => !open && onClose()}>
      <DialogContent
        data-theme="light"
        className="flex max-h-[85vh] flex-col text-foreground sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" />{' '}
            {instruction ? 'Change' : 'Rewrite'} {view?.type} with AI
          </DialogTitle>
          <DialogDescription>
            Only the text changes. Links, images, and layout settings stay the
            same.
          </DialogDescription>
        </DialogHeader>

        {instruction ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
              {instruction}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={generate}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}{' '}
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div
              role="radiogroup"
              aria-label="Rewrite mode"
              className="flex gap-1 rounded-md border border-border p-1"
            >
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={`rounded px-3 py-1 text-sm ${mode === m.value ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === 'translate' ? (
              <select
                aria-label="Target language"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className={`${inputClass} w-40`}
              >
                {locales.map(l => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Tone"
                value={tone}
                onChange={e => setTone(e.target.value)}
                className={`${inputClass} w-48`}
                placeholder="Tone (optional)"
              />
            )}
            <Button type="button" onClick={generate} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}{' '}
              {nextProps ? 'Try again' : 'Generate'}
            </Button>
          </div>
        )}

        {isPending && !nextProps && instruction && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Writing the change…
          </p>
        )}

        {nextProps && (
          <div className="flex-1 overflow-y-auto">
            {changed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The AI returned the same text.
              </p>
            ) : (
              <ul className="space-y-3">
                {changed.map(key => (
                  <li
                    key={key}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <p className="mb-1 font-mono text-[11px] text-muted-foreground">
                      {key}
                    </p>
                    <p className="text-muted-foreground line-through">
                      {before[key]}
                    </p>
                    <p className="mt-1">{after[key]}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!nextProps || changed.length === 0}
          >
            Apply changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The generate dialog in the Puck builder. */
export function AiGenerateDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const getPuck = useGetPuck();
  return (
    <AiGenerateDialogView
      {...props}
      onApply={(data, mode) =>
        getPuck().dispatch({
          type: 'setData',
          data: (previous: Data) =>
            mode === 'replace'
              ? {
                  ...previous,
                  root: {
                    ...previous.root,
                    props: { ...(previous.root?.props ?? {}), ...data.root.props },
                  },
                  content: data.content as Data['content'],
                }
              : {
                  ...previous,
                  content: [...previous.content, ...(data.content as Data['content'])],
                },
        })
      }
    />
  );
}

/** The rewrite dialog in the Puck builder. */
export function AiRewriteDialog(props: { target: BuilderTarget | null; onClose: () => void }) {
  const getPuck = useGetPuck();
  return (
    <AiRewriteDialogView
      {...props}
      onApply={(target, nextProps) => {
        const { dispatch, getSelectorForId } = getPuck();
        const selector = getSelectorForId(target.id);
        if (!selector) return false;
        dispatch({
          type: 'replace',
          destinationIndex: selector.index,
          destinationZone: selector.zone,
          data: { type: target.type, props: { ...nextProps, id: target.id } },
        });
        return true;
      }}
    />
  );
}
