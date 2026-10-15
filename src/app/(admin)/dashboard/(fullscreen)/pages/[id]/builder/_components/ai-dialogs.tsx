'use client';

import { useGetPuck, type Data } from '@measured/puck';
import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { collectCopy, extractPlainText } from '@/builder/text';
import type { BuilderData } from '@/builder/data';
import { SUPPORTED_LANGUAGES } from '@/db/schemas/shared.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { generatePage, rewriteBlock } from '@/app/(admin)/dashboard/(shell)/pages/_modules/ai.actions';
import { inputClass, textareaClass, FieldShell } from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import type { BuilderTarget } from './builder-context';

type GeneratedResult = { title: string; slug: string; seo: { title: string; description: string }; data: BuilderData };

const PAGE_TYPES = [
  { value: 'landing', label: 'Landing page' },
  { value: 'pricing', label: 'Pricing page' },
  { value: 'about', label: 'About / company' },
  { value: 'product', label: 'Product page' },
  { value: 'event', label: 'Event page' },
  { value: 'other', label: 'Other' },
];

export function AiGenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const getPuck = useGetPuck();
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
        await generatePage({ prompt, pageType, tone: tone || undefined, language }),
        value => setResult(value as GeneratedResult)
      );
    });

  const apply = (mode: 'replace' | 'append') => {
    if (!result) return;
    const { dispatch } = getPuck();
    dispatch({
      type: 'setData',
      data: (previous: Data) =>
        mode === 'replace'
          ? { ...previous, root: { ...previous.root, props: { ...(previous.root?.props ?? {}), ...result.data.root.props } }, content: result.data.content as Data['content'] }
          : { ...previous, content: [...previous.content, ...(result.data.content as Data['content'])] },
    });
    toast.success(mode === 'replace' ? 'Page replaced with generated blocks' : 'Generated blocks added');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" /> Generate a page with AI
          </DialogTitle>
          <DialogDescription>Describe the page. You can review the blocks before they are added.</DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="grid gap-4">
            <FieldShell label="Brief" htmlFor="ai-prompt" hint="Audience, product, key messages, and calls to action.">
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
                <select id="ai-type" value={pageType} onChange={e => setPageType(e.target.value)} className={inputClass}>
                  {PAGE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Tone" htmlFor="ai-tone">
                <input id="ai-tone" value={tone} onChange={e => setTone(e.target.value)} className={inputClass} placeholder="Confident, friendly" />
              </FieldShell>
              <FieldShell label="Language" htmlFor="ai-lang">
                <select id="ai-lang" value={language} onChange={e => setLanguage(e.target.value)} className={inputClass}>
                  {SUPPORTED_LANGUAGES.map(l => (
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
              <span className="font-semibold">{result.title}</span> · {result.data.content.length} blocks
            </p>
            <ol className="mt-3 space-y-2">
              {result.data.content.map(block => (
                <li key={block.props.id} className="rounded-md border border-steel-200 p-3 dark:border-dark-300">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{block.type}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-steel-600 dark:text-steel-300">
                    {extractPlainText({ root: {}, content: [block] }, 300)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!result ? (
            <Button type="button" onClick={generate} disabled={isPending || prompt.trim().length < 10}>
              {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {isPending ? 'Generating…' : 'Generate'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setResult(null)}>
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => apply('append')}>
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

export function AiRewriteDialog({ target, onClose }: { target: BuilderTarget | null; onClose: () => void }) {
  const getPuck = useGetPuck();
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('rewrite');
  const [language, setLanguage] = useState('es');
  const [tone, setTone] = useState('');
  const [nextProps, setNextProps] = useState<Record<string, unknown> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNextProps(null);
  }, [target]);

  const before = target ? collectCopy(target.props) : {};
  const after = nextProps ? collectCopy(nextProps) : {};
  const changed = Object.keys(after).filter(key => after[key] !== before[key]);

  const generate = () =>
    startTransition(async () => {
      if (!target) return;
      await handleActionResponse(
        await rewriteBlock({ props: target.props, mode, language: mode === 'translate' ? language : undefined, tone: tone || undefined }),
        value => setNextProps((value as { props: Record<string, unknown> }).props)
      );
    });

  const apply = () => {
    if (!target || !nextProps) return;
    const { dispatch, getSelectorForId } = getPuck();
    const selector = getSelectorForId(target.id);

    if (!selector) {
      toast.error('That block is no longer on the page.');
      return;
    }

    dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { type: target.type, props: { ...nextProps, id: target.id } },
    });
    toast.success('Block updated');
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-500" /> Rewrite {target?.type} with AI
          </DialogTitle>
          <DialogDescription>Only the text changes. Links, images, and layout settings stay the same.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div role="radiogroup" aria-label="Rewrite mode" className="flex gap-1 rounded-md border border-steel-200 p-1 dark:border-dark-300">
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => setMode(m.value)}
                className={`rounded px-3 py-1 text-sm ${mode === m.value ? 'bg-violet-600 text-white' : 'text-steel-600 hover:bg-steel-100 dark:text-steel-300'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'translate' ? (
            <select aria-label="Target language" value={language} onChange={e => setLanguage(e.target.value)} className={`${inputClass} w-40`}>
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          ) : (
            <input aria-label="Tone" value={tone} onChange={e => setTone(e.target.value)} className={`${inputClass} w-48`} placeholder="Tone (optional)" />
          )}
          <Button type="button" onClick={generate} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} {nextProps ? 'Try again' : 'Generate'}
          </Button>
        </div>

        {nextProps && (
          <div className="flex-1 overflow-y-auto">
            {changed.length === 0 ? (
              <p className="text-sm text-steel-500">The AI returned the same text.</p>
            ) : (
              <ul className="space-y-3">
                {changed.map(key => (
                  <li key={key} className="rounded-md border border-steel-200 p-3 text-sm dark:border-dark-300">
                    <p className="mb-1 font-mono text-[11px] text-steel-400">{key}</p>
                    <p className="text-steel-400 line-through">{before[key]}</p>
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
          <Button type="button" onClick={apply} disabled={!nextProps || changed.length === 0}>
            Apply changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
