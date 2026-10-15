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
        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        onClick={history.forward}
        disabled={!history.hasFuture}
        aria-label="Redo"
        title="Redo"
        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
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
          : 'border-border text-muted-foreground hover:text-foreground'
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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      <div className="min-w-28 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {b.label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {b.pageTitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1">
          <DeviceRow className="[&_svg]:size-4" />
          <span className="hidden w-12 text-right text-xs tabular-nums text-muted-foreground xl:inline">
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
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search blocks"
          aria-label="Search blocks"
          className="h-8 w-full rounded-md border border-input bg-transparent pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>
      {sections}
      {!shown && (
        <p className="py-6 text-center text-xs text-muted-foreground">
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
      <div className="space-y-3 py-4 text-center text-sm text-muted-foreground">
        <p>A block is selected. Page settings show when nothing is selected.</p>
        <button
          type="button"
          onClick={() =>
            dispatch({ type: 'setUi', ui: { itemSelector: null } })
          }
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
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
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-background">
      <div
        role="tablist"
        aria-label="Builder panels"
        className="grid grid-cols-3 gap-1 border-b border-border p-2"
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
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
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
      className="relative min-w-0 flex-1 overflow-hidden bg-muted p-4 outline-none"
    >
      <div
        className="mx-auto h-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border transition-[width] duration-300"
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
