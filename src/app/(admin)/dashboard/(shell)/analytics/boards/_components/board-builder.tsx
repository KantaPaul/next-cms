'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart3,
  GripVertical,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  Table2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import {
  defaultWidgetTitle,
  type BoardLayout,
  type DashboardWidget,
  type WidgetDimension,
  type WidgetMetric,
  type WidgetQuery,
  type WidgetSpan,
  type WidgetType,
} from '@/db/schemas/analytics.schema';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  previewWidget,
  updateBoard,
} from '../_modules/boards.actions';
import type { WidgetResult } from '@/server/services/analytics.service';
import { DualBars } from '../../_components/dual-bars';
import { TrendCard } from '../../_components/trend-card';

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

let seed = 0;
const newId = () => `w-${Date.now().toString(36)}-${seed++}`;

function defaultQuery(type: WidgetType): WidgetQuery {
  if (type === 'stat') {
    return {
      metric: 'views',
      dimension: 'none',
      compare: true,
      range: 'inherit',
      pageId: null,
    };
  }
  if (type === 'chart') {
    return {
      metric: 'views',
      dimension: 'day',
      compare: true,
      range: 'inherit',
      pageId: null,
    };
  }
  return {
    metric: 'views',
    dimension: 'page',
    compare: true,
    range: 'inherit',
    pageId: null,
    limit: 10,
  };
}

function trafficOverviewWidgets(): DashboardWidget[] {
  return [
    {
      id: newId(),
      type: 'stat',
      span: 4,
      query: {
        metric: 'views',
        dimension: 'none',
        compare: true,
        range: 'inherit',
        pageId: null,
      },
    },
    {
      id: newId(),
      type: 'stat',
      span: 4,
      query: {
        metric: 'uniqueVisitors',
        dimension: 'none',
        compare: true,
        range: 'inherit',
        pageId: null,
      },
    },
    {
      id: newId(),
      type: 'stat',
      span: 4,
      query: {
        metric: 'viewsPerVisitor',
        dimension: 'none',
        compare: true,
        range: 'inherit',
        pageId: null,
      },
    },
    {
      id: newId(),
      type: 'chart',
      span: 12,
      query: {
        metric: 'views',
        dimension: 'day',
        compare: true,
        range: 'inherit',
        pageId: null,
      },
    },
    {
      id: newId(),
      type: 'table',
      span: 12,
      query: {
        metric: 'views',
        dimension: 'page',
        compare: true,
        range: 'inherit',
        pageId: null,
        limit: 10,
      },
    },
  ];
}

function changeLabel(current: number, previous: number | null): string | null {
  if (previous == null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0 && current > 0) return 'New';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export function BoardBuilder({
  boardId,
  initialName,
  initialLayout,
  publishedPages,
}: {
  boardId: string;
  initialName: string;
  initialLayout: BoardLayout;
  publishedPages: { id: string; title: string }[];
}) {
  const router = useRouter();
  const dndId = useId();
  const [name, setName] = useState(initialName);
  const [layout, setLayout] = useState<BoardLayout>(initialLayout);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, WidgetResult>>({});
  const [saving, startSave] = useTransition();
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify({ name: initialName, layout: initialLayout })
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dirty = useMemo(
    () => JSON.stringify({ name, layout }) !== baseline,
    [name, layout, baseline]
  );

  const selected = layout.widgets.find(w => w.id === selectedId) ?? null;

  const refreshPreview = useCallback(
    async (widget: DashboardWidget) => {
      try {
        const res = await previewWidget({
          query: widget.query,
          boardRange: layout.range,
        });
        // next-safe-action style: data may be nested
        const data =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data: WidgetResult }).data
            : (res as WidgetResult);
        if (data && typeof data === 'object' && 'kind' in data) {
          setPreviews(p => ({ ...p, [widget.id]: data }));
        }
      } catch {
        // ignore preview errors in editor
      }
    },
    [layout.range]
  );

  // Live preview when selection or range changes
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => refreshPreview(selected), 250);
    return () => clearTimeout(t);
  }, [selected, refreshPreview]);

  // Initial previews for existing widgets
  useEffect(() => {
    layout.widgets.forEach(w => {
      if (!previews[w.id]) refreshPreview(w);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addWidget = (type: WidgetType) => {
    if (layout.widgets.length >= 12) {
      toast.error('Maximum 12 widgets per board');
      return;
    }
    const w: DashboardWidget = {
      id: newId(),
      type,
      span: type === 'stat' ? 4 : 12,
      query: defaultQuery(type),
    };
    setLayout(l => ({ ...l, widgets: [...l.widgets, w] }));
    setSelectedId(w.id);
    refreshPreview(w);
  };

  const insertTrafficOverview = () => {
    if (layout.widgets.length > 0) return;
    const widgets = trafficOverviewWidgets();
    setLayout(l => ({ ...l, widgets }));
    widgets.forEach(refreshPreview);
  };

  const updateWidget = (id: string, patch: Partial<DashboardWidget>) => {
    setLayout(l => ({
      ...l,
      widgets: l.widgets.map(w => {
        if (w.id !== id) return w;
        const next = { ...w, ...patch };
        if (patch.query) next.query = { ...w.query, ...patch.query };
        // Keep query legal for type
        if (next.type === 'stat') next.query.dimension = 'none';
        if (next.type === 'chart' && next.query.dimension === 'none')
          next.query.dimension = 'day';
        if (
          next.type === 'table' &&
          (next.query.dimension === 'none' || next.query.dimension === 'day')
        )
          next.query.dimension = 'page';
        if (next.type !== 'stat' && next.query.metric === 'viewsPerVisitor')
          next.query.metric = 'views';
        return next;
      }),
    }));
  };

  const removeWidget = (id: string) => {
    setLayout(l => ({ ...l, widgets: l.widgets.filter(w => w.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveDrag(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Palette drop
    if (activeId.startsWith('palette:')) {
      const type = activeId.replace('palette:', '') as WidgetType;
      if (layout.widgets.length >= 12) {
        toast.error('Maximum 12 widgets per board');
        return;
      }
      const w: DashboardWidget = {
        id: newId(),
        type,
        span: type === 'stat' ? 4 : 12,
        query: defaultQuery(type),
      };
      setLayout(l => {
        const idx = l.widgets.findIndex(x => x.id === overId);
        if (idx < 0) return { ...l, widgets: [...l.widgets, w] };
        const next = [...l.widgets];
        next.splice(idx, 0, w);
        return { ...l, widgets: next };
      });
      setSelectedId(w.id);
      refreshPreview(w);
      return;
    }

    // Reorder
    if (activeId !== overId) {
      setLayout(l => {
        const from = l.widgets.findIndex(w => w.id === activeId);
        const to = l.widgets.findIndex(w => w.id === overId);
        if (from < 0 || to < 0) return l;
        return { ...l, widgets: arrayMove(l.widgets, from, to) };
      });
    }
  };

  const save = () =>
    startSave(async () => {
      await handleActionResponse(
        updateBoard({ id: boardId, name, layout }),
        () => {
          setBaseline(JSON.stringify({ name, layout }));
          toast.success('Dashboard saved');
          router.refresh();
        }
      );
    });

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-steel-100 pb-3 dark:border-dark-300">
        <input
          className={cn(inputClass, 'max-w-xs font-medium')}
          value={name}
          maxLength={120}
          onChange={e => setName(e.target.value)}
          aria-label="Dashboard name"
        />
        <div className="flex gap-1 rounded-lg border border-steel-200 p-0.5 dark:border-dark-300">
          {([7, 30] as const).map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setLayout(l => ({ ...l, range: days }))}
              className={`rounded-md px-3 py-1.5 text-sm ${
                layout.range === days
                  ? 'bg-steel-100 font-medium dark:bg-dark-200'
                  : 'text-steel-500 hover:text-steel-800 dark:hover:text-steel-200'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
          <Link
            href={PAGES.DASHBOARD.ANALYTICS_BOARD(boardId)}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-sm hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
          >
            View
          </Link>
          <Link
            href={PAGES.DASHBOARD.ANALYTICS_BOARDS}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-sm text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
          >
            Boards
          </Link>
        </div>
      </div>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[11rem_1fr_16rem]">
          {/* Palette */}
          <aside className="flex flex-col gap-2 rounded-lg border border-steel-200 p-3 dark:border-dark-300">
            <div className="text-xs font-semibold uppercase tracking-wide text-steel-400">
              Widgets
            </div>
            {(['stat', 'chart', 'table'] as const).map(type => (
              <PaletteItem
                key={type}
                type={type}
                onClick={() => addWidget(type)}
              />
            ))}
            {layout.widgets.length === 0 && (
              <button
                type="button"
                onClick={insertTrafficOverview}
                className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-indigo-300 px-2 py-2 text-left text-xs text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
              >
                <LayoutDashboard className="size-4 shrink-0" />
                Traffic overview
              </button>
            )}
          </aside>

          {/* Canvas */}
          <div className="min-h-0 overflow-auto rounded-lg border border-steel-200 p-3 dark:border-dark-300">
            {layout.widgets.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-steel-500">
                  Drag widgets here or click the palette. Or start from a preset.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={insertTrafficOverview}>
                  <LayoutDashboard /> Traffic overview
                </Button>
              </div>
            ) : (
              <SortableContext
                items={layout.widgets.map(w => w.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-12 gap-3">
                  {layout.widgets.map(w => (
                    <SortableWidgetCard
                      key={w.id}
                      widget={w}
                      selected={selectedId === w.id}
                      preview={previews[w.id]}
                      onSelect={() => setSelectedId(w.id)}
                      onRemove={() => removeWidget(w.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>

          {/* Inspector */}
          <aside className="overflow-auto rounded-lg border border-steel-200 p-3 dark:border-dark-300">
            {selected ? (
              <Inspector
                widget={selected}
                pages={publishedPages}
                onChange={patch => updateWidget(selected.id, patch)}
                onRemove={() => removeWidget(selected.id)}
              />
            ) : (
              <p className="text-sm text-steel-500">
                Select a widget to configure metric, dimension, range, and width.
              </p>
            )}
          </aside>
        </div>

        <DragOverlay>
          {activeDrag?.startsWith('palette:') ? (
            <div className="rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm shadow-lg dark:bg-dark-100">
              {activeDrag.replace('palette:', '')}
            </div>
          ) : activeDrag ? (
            <div className="rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm opacity-80 shadow-lg dark:bg-dark-100">
              Moving widget
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function PaletteItem({ type, onClick }: { type: WidgetType; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
  });
  const Icon = type === 'stat' ? Plus : type === 'chart' ? BarChart3 : Table2;
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 rounded-md border border-steel-200 px-2 py-2 text-left text-sm capitalize hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200',
        isDragging && 'opacity-40'
      )}
    >
      <Icon className="size-4 text-steel-500" />
      {type}
    </button>
  );
}

function SortableWidgetCard({
  widget,
  selected,
  preview,
  onSelect,
  onRemove,
}: {
  widget: DashboardWidget;
  selected: boolean;
  preview?: WidgetResult;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id });
  const spanClass =
    widget.span === 4
      ? 'col-span-12 md:col-span-4'
      : widget.span === 6
        ? 'col-span-12 md:col-span-6'
        : 'col-span-12';
  const title = defaultWidgetTitle(widget);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        spanClass,
        'relative rounded-lg border bg-white dark:bg-dark-100',
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900'
          : 'border-steel-200 dark:border-dark-300',
        isDragging && 'z-10 opacity-70'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-1 border-b border-steel-100 px-2 py-1 dark:border-dark-300">
        <button
          type="button"
          className="cursor-grab rounded p-0.5 text-steel-400 hover:bg-steel-100 active:cursor-grabbing dark:hover:bg-dark-300"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-steel-600">
          {title}
        </span>
        <button
          type="button"
          className="rounded p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="p-2">
        {!preview ? (
          <div className="flex h-16 items-center justify-center text-xs text-steel-400">
            Loading…
          </div>
        ) : preview.kind === 'stat' ? (
          <TrendCard
            label={title}
            value={preview.value}
            change={changeLabel(preview.value, preview.previous)}
            previous={preview.previous ?? 0}
            hidePrevious={preview.previous == null}
          />
        ) : preview.kind === 'series' ? (
          <DualBars
            daily={preview.points.map(p => ({
              day: p.label,
              views: p.value,
              previousViews: p.previous ?? 0,
            }))}
            rangeDays={preview.points.length}
            showPrevious={preview.points.some(p => p.previous != null)}
          />
        ) : (
          <ul className="max-h-40 space-y-1 overflow-auto text-xs">
            {preview.rows.slice(0, 5).map(r => (
              <li key={r.key} className="flex justify-between gap-2">
                <span className="truncate">{r.label}</span>
                <span className="font-medium">{r.value}</span>
              </li>
            ))}
            {preview.rows.length === 0 && (
              <li className="text-steel-400">No data</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Inspector({
  widget,
  pages,
  onChange,
  onRemove,
}: {
  widget: DashboardWidget;
  pages: { id: string; title: string }[];
  onChange: (patch: Partial<DashboardWidget>) => void;
  onRemove: () => void;
}) {
  const dims: WidgetDimension[] =
    widget.type === 'stat'
      ? ['none']
      : widget.type === 'chart'
        ? ['day', 'page', 'path', 'referrer']
        : ['page', 'path', 'referrer'];

  const metrics: WidgetMetric[] =
    widget.type === 'stat'
      ? ['views', 'uniqueVisitors', 'viewsPerVisitor']
      : ['views', 'uniqueVisitors'];

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-steel-400">
        Inspector
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Title
        <input
          className={inputClass}
          value={widget.title ?? ''}
          maxLength={80}
          placeholder={defaultWidgetTitle(widget)}
          onChange={e =>
            onChange({ title: e.target.value || undefined })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Metric
        <select
          className={inputClass}
          value={widget.query.metric}
          onChange={e =>
            onChange({
              query: {
                ...widget.query,
                metric: e.target.value as WidgetMetric,
              },
            })
          }
        >
          {metrics.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Dimension
        <select
          className={inputClass}
          value={widget.query.dimension}
          onChange={e =>
            onChange({
              query: {
                ...widget.query,
                dimension: e.target.value as WidgetDimension,
              },
            })
          }
        >
          {dims.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={widget.query.compare}
          onChange={e =>
            onChange({
              query: { ...widget.query, compare: e.target.checked },
            })
          }
        />
        Compare previous window
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Range
        <select
          className={inputClass}
          value={String(widget.query.range)}
          onChange={e => {
            const v = e.target.value;
            onChange({
              query: {
                ...widget.query,
                range: v === 'inherit' ? 'inherit' : (Number(v) as 7 | 30),
              },
            });
          }}
        >
          <option value="inherit">Board default</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
        </select>
      </label>
      {(widget.query.dimension === 'page' ||
        widget.query.dimension === 'none') && (
        <label className="flex flex-col gap-1 text-xs font-medium">
          Page
          <select
            className={inputClass}
            value={widget.query.pageId ?? ''}
            onChange={e =>
              onChange({
                query: {
                  ...widget.query,
                  pageId: e.target.value || null,
                },
              })
            }
          >
            <option value="">All pages</option>
            {pages.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {(widget.type === 'chart' || widget.type === 'table') &&
        widget.query.dimension !== 'day' && (
          <label className="flex flex-col gap-1 text-xs font-medium">
            Limit
            <select
              className={inputClass}
              value={widget.query.limit ?? 10}
              onChange={e =>
                onChange({
                  query: {
                    ...widget.query,
                    limit: Number(e.target.value) as 5 | 10 | 20,
                  },
                })
              }
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        )}
      <label className="flex flex-col gap-1 text-xs font-medium">
        Width
        <select
          className={inputClass}
          value={widget.span}
          onChange={e =>
            onChange({ span: Number(e.target.value) as WidgetSpan })
          }
        >
          <option value={4}>1/3</option>
          <option value={6}>1/2</option>
          <option value={12}>Full</option>
        </select>
      </label>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-2 text-red-600"
        onClick={onRemove}
      >
        <Trash2 /> Remove widget
      </Button>
    </div>
  );
}
