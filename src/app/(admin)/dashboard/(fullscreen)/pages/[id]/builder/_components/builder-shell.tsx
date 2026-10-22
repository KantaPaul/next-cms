'use client';

import { createUsePuck, Drawer, Puck } from '@measured/puck';
import {
  BarChart3,
  Blocks,
  BookOpen,
  ChevronRight,
  Columns3,
  CreditCard,
  FileText,
  FolderKanban,
  GalleryHorizontal,
  Globe,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  Images,
  Layers,
  LayoutGrid,
  ListCollapse,
  Mail,
  Megaphone,
  MessageSquareQuote,
  Redo2,
  Search,
  Sparkles,
  Type,
  Undo2,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { DeviceRow } from '@/builder/controls';
import { useBuilder } from './builder-context';
import { BuilderHeaderActions } from './builder-chrome';
import { LayersPanel } from './layers-panel';
import { SelectionCard } from './selection-card';

const usePuck = createUsePuck();

export function getBlockIcon(name: string) {
  switch (name) {
    case 'Hero':
      return Sparkles;
    case 'CTA':
      return Megaphone;
    case 'Features':
      return Sparkles;
    case 'Stats':
      return BarChart3;
    case 'Pricing':
      return CreditCard;
    case 'Testimonials':
      return MessageSquareQuote;
    case 'FAQ':
      return HelpCircle;
    case 'RichText':
      return Type;
    case 'Image':
      return ImageIcon;
    case 'Gallery':
      return Images;
    case 'ContactForm':
      return Mail;
    case 'Columns':
      return Columns3;
    case 'Slider':
      return GalleryHorizontal;
    case 'Tabs':
      return FolderKanban;
    case 'Accordion':
      return ListCollapse;
    case 'GlobalRef':
      return Globe;
    case 'BlogPosts':
      return BookOpen;
    default:
      return LayoutGrid;
  }
}

export function getCategoryTint(key: string) {
  switch (key) {
    case 'heroes':
      return 'bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-900/40';
    case 'marketing':
      return 'bg-sky-50 text-sky-600 border border-sky-200/60 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-900/40';
    case 'content':
      return 'bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/40';
    case 'layout':
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'global':
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/40';
    case 'blog':
      return 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/40';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
}

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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const toggleCategory = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

    const isOpen = q.length > 0 || !collapsed[group.key];

    return (
      <section key={group.key} className="space-y-1.5">
        <button
          type="button"
          onClick={() => toggleCategory(group.key)}
          className="flex w-full items-center justify-between py-1 text-left select-none hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                'size-3 text-muted-foreground transition-transform duration-150',
                isOpen && 'rotate-90'
              )}
            />
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.title}
            </h3>
          </div>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {names.length}
          </span>
        </button>

        {isOpen && (
          <div className="space-y-1.5 pt-0.5">
            <Drawer>
              {names.map(name => {
                const Icon = getBlockIcon(name);
                const tint = getCategoryTint(group.key);
                return (
                  <Drawer.Item key={name} name={name}>
                    {() => (
                      <div className="group flex w-full items-center justify-between rounded-lg border border-border/70 bg-background p-2 text-xs font-medium text-foreground transition-all hover:border-border hover:shadow-xs cursor-grab active:cursor-grabbing">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-md',
                              tint
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <span className="truncate">{labelOf(name)}</span>
                        </div>
                        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    )}
                  </Drawer.Item>
                );
              })}
            </Drawer>
          </div>
        )}
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
          className="h-8 w-full rounded-md border border-input bg-background/50 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>
      <div className="space-y-3.5">{sections}</div>
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
  const b = useBuilder();
  const [tab, setTab] = useState<RailTab>('blocks');
  const tabs =
    b.kind === 'global'
      ? RAIL_TABS.filter(t => t.value !== 'page')
      : RAIL_TABS;
  const activeTab = tabs.some(t => t.value === tab) ? tab : 'blocks';
  let panel: ReactNode;
  if (activeTab === 'blocks') panel = <BlocksPanel />;
  else if (activeTab === 'layers') panel = <LayersPanel />;
  else panel = <PagePanel />;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border p-2.5">
        <div
          role="tablist"
          aria-label="Builder panels"
          className={cn(
            'grid gap-1 rounded-lg bg-muted/70 p-1',
            tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          )}
        >
          {tabs.map(t => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={activeTab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-all',
                activeTab === t.value
                  ? 'bg-background font-semibold text-foreground shadow-xs'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
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
