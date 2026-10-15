'use client';

import { createUsePuck, Puck } from '@measured/puck';
import { ArrowUp, Copy, Sparkles, Trash2, X } from 'lucide-react';
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils/cn';
import { InspectorTabContext, useInspectorTab, type InspectorTab } from '@/builder/controls/inspector-tab';
import { useBuilder } from './builder-context';

const usePuck = createUsePuck();

const GAP = 12;

/**
 * `overrides.fields` for the builder. Inside the floating card it keeps only the fields for the active tab:
 * Content is every field except `section`; Style and Layout are the `section` field, which renders its own half.
 */
export function InspectorFields({ children }: { children: ReactNode }) {
  const tab = useInspectorTab();
  if (!tab) return <>{children}</>;
  const items = Children.toArray(children).filter(isValidElement);
  const isSection = (key: unknown) => String(key).replace(/^\.\$/, '') === 'section';
  const visible = items.filter(el => (tab === 'content' ? !isSection(el.key) : isSection(el.key)));
  if (!visible.length) return <p className="py-6 text-center text-xs text-steel-400">This block has no {tab} settings.</p>;
  return <>{visible}</>;
}

/** Positions the card beside the selected node, which lives inside the canvas iframe. */
function useCardPosition(canvasRef: RefObject<HTMLElement | null>, cardRef: RefObject<HTMLElement | null>, id: string | undefined, deps: unknown[]) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!id) {
      setPos(null);
      return;
    }

    const canvas = canvasRef.current;
    const iframe = canvas?.querySelector<HTMLIFrameElement>('#preview-frame');
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!canvas || !iframe || !doc) return;

    const find = () => doc.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`);
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = find();
        const card = cardRef.current;
        if (!el || !card) return;
        const c = canvas.getBoundingClientRect();
        const f = iframe.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const { width, height } = card.getBoundingClientRect();
        const elLeft = f.left - c.left + r.left;
        const elRight = f.left - c.left + r.right;
        const elTop = f.top - c.top + r.top;

        let left = elRight + GAP;
        if (left + width > c.width - GAP) left = elLeft - width - GAP;
        if (left < GAP) left = c.width - width - GAP;
        const top = Math.min(Math.max(elTop, GAP), Math.max(GAP, c.height - height - GAP));
        setPos({ left: Math.max(GAP, left), top });
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    if (cardRef.current) observer.observe(cardRef.current);
    const el = find();
    if (el) observer.observe(el);
    win?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      win?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
     
  }, [id, ...deps]);

  return pos;
}

function DescribeChange() {
  const b = useBuilder();
  const selected = usePuck(s => s.selectedItem);
  const [text, setText] = useState('');
  if (!b.aiEnabled || !selected || selected.type === 'GlobalRef') return null;

  const submit = () => {
    const instruction = text.trim();
    if (!instruction) return;
    b.setRewriteTarget({
      id: selected.props.id as string,
      type: selected.type as string,
      props: selected.props as Record<string, unknown> & { id: string },
      instruction,
    });
    setText('');
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 border-b border-steel-100 px-3 py-2"
    >
      <Sparkles className="size-4 shrink-0 text-violet-500" aria-hidden />
      <input
        value={text}
        maxLength={300}
        onChange={e => setText(e.target.value)}
        placeholder="Describe a change"
        aria-label="Describe a change"
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm placeholder:text-steel-400 focus:ring-0"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label="Apply with AI"
        className="rounded-md bg-violet-600 p-1.5 text-white transition-opacity disabled:opacity-30"
      >
        <ArrowUp className="size-3.5" />
      </button>
    </form>
  );
}

const TABS: { value: InspectorTab; label: string }[] = [
  { value: 'content', label: 'Content' },
  { value: 'style', label: 'Style' },
  { value: 'layout', label: 'Layout' },
];

/** Floating inspector for the selected block. It sits in the parent page, so the canvas iframe never clips it. */
export function SelectionCard({ canvasRef }: { canvasRef: RefObject<HTMLElement | null> }) {
  const selected = usePuck(s => s.selectedItem);
  const config = usePuck(s => s.config);
  const dispatch = usePuck(s => s.dispatch);
  const data = usePuck(s => s.appState.data);
  const viewportWidth = usePuck(s => s.appState.ui.viewports.current.width);
  const itemSelector = usePuck(s => s.appState.ui.itemSelector);
  const [tab, setTab] = useState<InspectorTab>('content');
  const cardRef = useRef<HTMLDivElement>(null);

  const id = selected?.props.id as string | undefined;
  const component = selected ? config.components[selected.type] : undefined;
  const hasSection = !!component?.fields && 'section' in component.fields;
  const activeTab = hasSection ? tab : 'content';
  const pos = useCardPosition(canvasRef, cardRef, id, [data, viewportWidth, activeTab]);

  if (!selected || !id) return null;

  const close = () => {
    dispatch({ type: 'setUi', ui: { itemSelector: null } });
    canvasRef.current?.focus();
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Edit ${component?.label ?? selected.type}`}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
      className={cn(
        'absolute z-30 flex max-h-[calc(100%-24px)] w-[340px] flex-col overflow-hidden rounded-xl border border-steel-200 bg-white text-steel-800 shadow-2xl shadow-steel-900/15 transition-[left,top] duration-150',
        !pos && 'invisible'
      )}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-steel-100 px-3 pb-2 pt-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Selected block</p>
          <p className="truncate text-sm font-semibold">{component?.label ?? selected.type}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {itemSelector?.zone && (
            <>
              <button
                type="button"
                onClick={() => dispatch({ type: 'duplicate', sourceIndex: itemSelector.index, sourceZone: itemSelector.zone! })}
                aria-label="Duplicate block"
                title="Duplicate"
                className="rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-steel-700"
              >
                <Copy className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'remove', index: itemSelector.index, zone: itemSelector.zone! })}
                aria-label="Delete block"
                title="Delete"
                className="rounded p-1 text-steel-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
          <button type="button" onClick={close} aria-label="Close inspector" className="rounded p-1 text-steel-400 hover:bg-steel-100 hover:text-steel-700">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <DescribeChange />

      {hasSection && (
        <div role="tablist" aria-label="Inspector sections" className="flex gap-4 border-b border-steel-100 px-3">
          {TABS.map(t => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={activeTab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                '-mb-px border-b-2 py-2 text-sm transition-colors',
                activeTab === t.value ? 'border-steel-800 font-medium text-steel-900' : 'border-transparent text-steel-500 hover:text-steel-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [&_[class*=PuckFields-field]+[class*=PuckFields-field]]:mt-4"
        role="tabpanel"
      >
        <InspectorTabContext.Provider value={activeTab}>
          <Puck.Fields wrapFields={false} />
        </InspectorTabContext.Provider>
      </div>
    </div>
  );
}
