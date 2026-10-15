'use client';

import { createUsePuck, Drawer, Puck } from '@measured/puck';
import {
  Blocks,
  FileText,
  Layers,
  Redo2,
  Search,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { DeviceRow } from '@/builder/controls';
import { useBuilder } from './builder-context';
import { BuilderHeaderActions } from './builder-chrome';
import { SelectionCard } from './selection-card';

const usePuck = createUsePuck();

function HistoryButtons() {
  const history = usePuck(s => s.history);
  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label="History"
    >
      <button
        type="button"
        onClick={history.back}
        disabled={!history.hasPast}
        aria-label="Undo"
        title="Undo"
        className="rounded p-1.5 text-steel-500 hover:bg-steel-100 disabled:opacity-30"
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        onClick={history.forward}
        disabled={!history.hasFuture}
        aria-label="Redo"
        title="Redo"
        className="rounded p-1.5 text-steel-500 hover:bg-steel-100 disabled:opacity-30"
      >
        <Redo2 className="size-4" />
      </button>
    </div>
  );
}

function MotionPreviewToggle() {
  const b = useBuilder();
  return (
    <button
      type="button"
      aria-pressed={b.motionPreview}
      aria-label="Motion preview"
      onClick={() => b.setMotionPreview(!b.motionPreview)}
      title="Play block animations in the canvas"
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
        b.motionPreview
          ? 'border-violet-200 bg-violet-50 text-violet-700'
          : 'border-steel-200 text-steel-500 hover:text-steel-800'
      )}
    >
      <Sparkles className="size-3.5" />{' '}
      <span className="hidden xl:inline">Motion preview</span>
    </button>
  );
}

function TopBar() {
  const b = useBuilder();
  const width = usePuck(s => s.appState.ui.viewports.current.width);
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-steel-200 bg-white px-4">
      <div className="min-w-28 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-steel-400">
          {b.label}
        </p>
        <p className="truncate text-sm font-semibold text-steel-800">
          {b.pageTitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-steel-50 px-2 py-1">
          <DeviceRow className="[&_svg]:size-4" />
          <span className="hidden w-12 text-right text-xs tabular-nums text-steel-400 xl:inline">
            {width}px
          </span>
        </div>
        <HistoryButtons />
        <MotionPreviewToggle />
      </div>
      <div className="flex flex-1 justify-end">
        <BuilderHeaderActions />
      </div>
    </header>
  );
}

function BlocksPanel() {
  const config = usePuck(s => s.config);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const categories = Object.entries(config.categories ?? {}) as [
    string,
    { title?: string; components?: string[] },
  ][];
  const listed = new Set(categories.flatMap(([, c]) => c.components ?? []));
  const others = Object.keys(config.components).filter(
    name => !listed.has(name)
  );
  const groups = [
    ...categories.map(([key, c]) => ({
      key,
      title: c.title ?? key,
      names: c.components ?? [],
    })),
    ...(others.length ? [{ key: 'other', title: 'Other', names: others }] : []),
  ];
  const labelOf = (name: string) => config.components[name]?.label ?? name;

  let shown = 0;
  const sections = groups.map(group => {
    const names = group.names.filter(
      name => config.components[name] && labelOf(name).toLowerCase().includes(q)
    );
    shown += names.length;
    if (!names.length) return null;
    return (
      <section key={group.key} className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-steel-400">
          {group.title}
        </h3>
        <Drawer>
          {names.map(name => (
            <Drawer.Item key={name} name={name} label={labelOf(name)} />
          ))}
        </Drawer>
      </section>
    );
  });

  return (
    <div className="space-y-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-steel-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search blocks"
          aria-label="Search blocks"
          className="h-8 w-full rounded-md border border-steel-200 pl-8 text-sm placeholder:text-steel-400"
        />
      </label>
      {sections}
      {!shown && (
        <p className="py-6 text-center text-xs text-steel-400">
          No blocks match “{query}”.
        </p>
      )}
    </div>
  );
}

function PagePanel() {
  const selected = usePuck(s => s.selectedItem);
  const dispatch = usePuck(s => s.dispatch);

  if (selected) {
    return (
      <div className="space-y-3 py-4 text-center text-sm text-steel-500">
        <p>A block is selected. Page settings show when nothing is selected.</p>
        <button
          type="button"
          onClick={() =>
            dispatch({ type: 'setUi', ui: { itemSelector: null } })
          }
          className="rounded-md border border-steel-200 px-3 py-1.5 text-xs font-medium text-steel-700 hover:bg-steel-50"
        >
          Deselect block
        </button>
      </div>
    );
  }

  return (
    <div className="[&_[class*=PuckFields-field]+[class*=PuckFields-field]]:mt-4">
      <Puck.Fields wrapFields={false} />
    </div>
  );
}

type RailTab = 'blocks' | 'layers' | 'page';

const RAIL_TABS: { value: RailTab; label: string; icon: typeof Blocks }[] = [
  { value: 'blocks', label: 'Blocks', icon: Blocks },
  { value: 'layers', label: 'Layers', icon: Layers },
  { value: 'page', label: 'Page', icon: FileText },
];

function LeftRail() {
  const [tab, setTab] = useState<RailTab>('blocks');
  let panel: ReactNode;
  if (tab === 'blocks') panel = <BlocksPanel />;
  else if (tab === 'layers') panel = <Puck.Outline />;
  else panel = <PagePanel />;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-steel-200 bg-white">
      <div
        role="tablist"
        aria-label="Builder panels"
        className="grid grid-cols-3 gap-1 border-b border-steel-100 p-2"
      >
        {RAIL_TABS.map(t => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
              tab === t.value
                ? 'bg-steel-100 text-steel-900'
                : 'text-steel-500 hover:text-steel-800'
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-3">
        {panel}
      </div>
    </aside>
  );
}

function Canvas() {
  const width = usePuck(s => s.appState.ui.viewports.current.width);
  const canvasRef = useRef<HTMLDivElement>(null);
  return (
    <main
      ref={canvasRef}
      tabIndex={-1}
      aria-label="Canvas"
      className="relative min-w-0 flex-1 overflow-hidden bg-steel-100 p-4 outline-none"
    >
      <div
        className="mx-auto h-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-steel-200 transition-[width] duration-300"
        style={{ width, maxWidth: '100%' }}
      >
        <Puck.Preview />
      </div>
      <SelectionCard canvasRef={canvasRef} />
    </main>
  );
}

/** Replaces Puck's three-column layout: a top bar, a Blocks/Layers/Page rail, and a full-width canvas. */
export function BuilderShell() {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftRail />
        <Canvas />
      </div>
    </div>
  );
}
