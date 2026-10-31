/**
 * Dashboard builder on the shared editor-ui package (B15 E7, E8): the
 * shell, library, inspector and states come from `@nextcms/editor-ui`;
 * loading, saving and widget data go through the host's adapters
 * (dashboard-adapters.ts). Features an interactive 12/6/1 column grid with
 * drag-and-drop reordering, right-edge resize handles, keyboard move mode,
 * and numeric X/Y/W/H layout inputs in the inspector.
 */

import {
  closestCenter,
  DndContext,
  type DraggableAttributes,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Breadcrumb,
  type BreadcrumbItem,
  Button,
  Chip,
  CommandPalette,
  type CommandPaletteItem,
  ConflictDialog,
  type DeviceType,
  EditorShell,
  EmptyState,
  ErrorState,
  FieldGroup,
  FieldRow,
  IconButton,
  Input,
  InspectorField,
  type LibraryItemDef,
  LibraryPanel,
  LoadingSkeleton,
  NumberInput,
  Panel,
  type SaveState,
  Select,
  StatusBar,
  Switch,
  TopBar,
  useLiveAnnouncer,
} from '@nextcms/editor-ui';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Copy,
  Gauge,
  GripVertical,
  Move,
  Table2,
  Trash2,
} from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  checkDashboardQuery,
  type DashboardAdapters,
  type DashboardLayout,
  type DashboardQuery,
  type DashboardRecord,
  type DashboardSource,
  type DashboardWidget,
  type DashboardWidgetType,
  defaultQueryFor,
  sourceOptionsFor,
} from './dashboard-adapters';
import {
  applyWidgetResponses,
  failWidgetRequests,
  planWidgetRequests,
  type WidgetDataStates,
} from './dashboard-data';
import { DashboardWidgetBody } from './dashboard-widgets';

export type DashboardBuilderProps = {
  dashboardId: string;
  adapters: DashboardAdapters;
  /** Loaded on the server; skips the first `storage.load`. */
  initial?: DashboardRecord;
  /** Column spans the host can store (12-column grid). */
  spanOptions?: number[];
  maxWidgets?: number;
  /** Items before the dashboard name, e.g. a link back to the list. */
  breadcrumb?: BreadcrumbItem[];
  onSaved?: (record: DashboardRecord) => void;
  className?: string;
};

const widgetLibraryItems: LibraryItemDef[] = [
  {
    type: 'stat',
    label: 'KPI Card',
    category: 'Summary',
    description: 'Single metric with change indicator',
    icon: <Gauge className="h-4 w-4" />,
  },
  {
    type: 'chart',
    label: 'Chart',
    category: 'Charts',
    description: 'A measure over days, pages, paths or referrers',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    type: 'table',
    label: 'Table',
    category: 'Tables',
    description: 'Top rows for a measure',
    icon: <Table2 className="h-4 w-4" />,
  },
];

const TYPE_LABEL: Record<DashboardWidgetType, string> = {
  stat: 'KPI',
  chart: 'Chart',
  table: 'Table',
};

const STALE_TICK_MS = 30_000;
const DATA_DEBOUNCE_MS = 300;

type SavePhase = 'idle' | 'saving' | 'failed' | 'conflict';

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function snapshot(name: string, layout: DashboardLayout) {
  return JSON.stringify({ name, layout });
}

function newWidgetId() {
  return `w-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function DashboardBuilder({
  dashboardId,
  adapters,
  initial,
  spanOptions = [4, 6, 12],
  maxWidgets = 12,
  breadcrumb = [],
  onSaved,
  className,
}: DashboardBuilderProps) {
  const [record, setRecord] = useState<DashboardRecord | null>(initial ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? '');
  const [layout, setLayout] = useState<DashboardLayout>(
    initial?.layout ?? { range: 30, widgets: [] }
  );
  const [version, setVersion] = useState(initial?.version ?? 0);
  const [saved, setSaved] = useState(
    initial ? snapshot(initial.name, initial.layout) : ''
  );
  const [lastSavedAt, setLastSavedAt] = useState(
    initial?.updatedAt ?? undefined
  );
  const [phase, setPhase] = useState<SavePhase>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DashboardRecord | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  const [sources, setSources] = useState<DashboardSource[] | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [data, setData] = useState<WidgetDataStates>({});
  const dataRef = useRef<WidgetDataStates>({});
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isMoveMode, setIsMoveMode] = useState(false);

  const commitData = useCallback(
    (update: (states: WidgetDataStates) => WidgetDataStates) => {
      dataRef.current = update(dataRef.current);
      setData(dataRef.current);
    },
    []
  );

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await adapters.storage.load(dashboardId);
      setRecord(loaded);
      setName(loaded.name);
      setLayout(loaded.layout);
      setVersion(loaded.version);
      setSaved(snapshot(loaded.name, loaded.layout));
      setLastSavedAt(loaded.updatedAt ?? undefined);
    } catch (error) {
      setLoadError(message(error, 'The dashboard could not be loaded.'));
    }
  }, [adapters, dashboardId]);

  const loadSources = useCallback(async () => {
    setSourcesError(null);
    try {
      setSources(await adapters.data.listSources());
    } catch (error) {
      setSourcesError(message(error, 'Data sources could not be loaded.'));
    }
  }, [adapters]);

  useEffect(() => {
    if (!initial) void load();
  }, [initial, load]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), STALE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // ── Widget data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (force: string[] = []) => {
      if (!sources) return;
      const current = layoutRef.current;
      const { requests, next } = planWidgetRequests(
        current,
        dataRef.current,
        sources,
        force
      );
      commitData(() => next);
      if (requests.length === 0) return;
      try {
        const responses = await adapters.data.query(requests);
        commitData(s =>
          applyWidgetResponses(s, requests, responses, current.range)
        );
      } catch (error) {
        commitData(s =>
          failWidgetRequests(
            s,
            requests,
            current.range,
            message(error, 'Data could not be loaded.')
          )
        );
      }
      setNow(Date.now());
    },
    [adapters, sources, commitData]
  );

  useEffect(() => {
    if (!record || !sources) return;
    const timer = setTimeout(() => void fetchData(), DATA_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [record, sources, layout, fetchData]);

  // ── Editing ────────────────────────────────────────────────────────────────
  const updateWidget = useCallback(
    (id: string, patch: (w: DashboardWidget) => DashboardWidget) => {
      setLayout(prev => ({
        ...prev,
        widgets: prev.widgets.map(w => (w.id === id ? patch(w) : w)),
      }));
    },
    []
  );

  const updateQuery = useCallback(
    (id: string, patch: Partial<DashboardQuery>) =>
      updateWidget(id, w => ({ ...w, query: { ...w.query, ...patch } })),
    [updateWidget]
  );

  const addWidget = useCallback(
    (type: DashboardWidgetType) => {
      const source = sources?.[0];
      const query = source ? defaultQueryFor(source, type) : null;
      if (!query) {
        setNotice('No data source can feed this widget yet.');
        return;
      }
      if (layoutRef.current.widgets.length >= maxWidgets) {
        setNotice(`A dashboard holds at most ${maxWidgets} widgets.`);
        return;
      }
      const widget: DashboardWidget = {
        id: newWidgetId(),
        type,
        span:
          type === 'stat' ? (spanOptions[0] ?? 4) : (spanOptions.at(-1) ?? 12),
        query,
      };
      setLayout(prev => ({ ...prev, widgets: [...prev.widgets, widget] }));
      setSelectedId(widget.id);
      setNotice(null);
    },
    [sources, maxWidgets, spanOptions]
  );

  const removeWidget = useCallback((id: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== id),
    }));
    setSelectedId(current => (current === id ? null : current));
  }, []);

  const moveWidget = useCallback((id: string, delta: number) => {
    setLayout(prev => {
      const idx = prev.widgets.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const target = Math.max(0, Math.min(prev.widgets.length - 1, idx + delta));
      if (target === idx) return prev;
      return { ...prev, widgets: arrayMove(prev.widgets, idx, target) };
    });
  }, []);

  const duplicateWidget = useCallback(
    (id: string) => {
      if (layoutRef.current.widgets.length >= maxWidgets) {
        setNotice(`A dashboard holds at most ${maxWidgets} widgets.`);
        return;
      }
      const original = layoutRef.current.widgets.find(w => w.id === id);
      if (!original) return;
      const copy: DashboardWidget = {
        ...original,
        id: newWidgetId(),
        title: original.title ? `${original.title} (copy)` : undefined,
      };
      const index = layoutRef.current.widgets.findIndex(w => w.id === id);
      setLayout(prev => {
        const next = [...prev.widgets];
        next.splice(index + 1, 0, copy);
        return { ...prev, widgets: next };
      });
      setSelectedId(copy.id);
    },
    [maxWidgets]
  );

  // ── Saving ─────────────────────────────────────────────────────────────────
  const save = useCallback(
    async (expectedVersion = version) => {
      if (!record) return;
      const sent = { name: name.trim() || record.name, layout };
      setPhase('saving');
      setSaveError(null);
      try {
        const result = await adapters.storage.save(
          dashboardId,
          sent,
          expectedVersion
        );
        if (result.status === 'conflict') {
          setConflict(result.current);
          setConflictOpen(true);
          setPhase('conflict');
          return;
        }
        setVersion(result.version);
        setSaved(snapshot(sent.name, sent.layout));
        setLastSavedAt(result.updatedAt ?? new Date().toISOString());
        setConflict(null);
        setPhase('idle');
        onSaved?.({
          ...record,
          ...sent,
          version: result.version,
          updatedAt: result.updatedAt,
        });
      } catch (error) {
        setSaveError(message(error, 'The dashboard could not be saved.'));
        setPhase('failed');
      }
    },
    [adapters, dashboardId, layout, name, onSaved, record, version]
  );

  const useSavedVersion = useCallback(() => {
    if (!conflict) return;
    setRecord(conflict);
    setName(conflict.name);
    setLayout(conflict.layout);
    setVersion(conflict.version);
    setSaved(snapshot(conflict.name, conflict.layout));
    setLastSavedAt(conflict.updatedAt ?? undefined);
    setConflict(null);
    setConflictOpen(false);
    setPhase('idle');
  }, [conflict]);

  const keepMine = useCallback(() => {
    if (!conflict) return;
    setConflictOpen(false);
    void save(conflict.version);
  }, [conflict, save]);

  const dirty = record !== null && snapshot(name, layout) !== saved;
  const saveStatus: SaveState =
    phase === 'saving'
      ? 'saving'
      : phase === 'conflict'
        ? 'conflict'
        : phase === 'failed'
          ? 'failed'
          : dirty
            ? 'unsaved'
            : 'saved';

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void save();
      } else if (key === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selected = layout.widgets.find(w => w.id === selectedId) ?? null;
  const selectedIndex = selected ? layout.widgets.indexOf(selected) : -1;
  const rangeOptions = useMemo(() => {
    const days = new Set(sources?.flatMap(s => s.ranges) ?? []);
    days.add(layout.range);
    return [...days]
      .sort((a, b) => a - b)
      .map(d => ({ value: String(d), label: `Last ${d} days` }));
  }, [sources, layout.range]);

  const paletteItems: CommandPaletteItem[] = [
    ...widgetLibraryItems.map(item => ({
      id: `add-${item.type}`,
      label: `Add ${item.label}`,
      group: 'Insert',
      onSelect: () => addWidget(item.type as DashboardWidgetType),
    })),
    {
      id: 'refresh',
      label: 'Refresh all widgets',
      group: 'Data',
      onSelect: () => void fetchData(layout.widgets.map(w => w.id)),
    },
    {
      id: 'save',
      label: 'Save',
      shortcut: '⌘S',
      group: 'File',
      onSelect: () => void save(),
    },
  ];

  if (!record) {
    return (
      <div className={className} style={{ padding: 24 }}>
        {loadError ? (
          <ErrorState
            title="Couldn't open this dashboard"
            message={loadError}
            onRetry={() => void load()}
          />
        ) : (
          <div aria-busy="true" aria-label="Loading dashboard">
            <LoadingSkeleton lines={4} />
          </div>
        )}
      </div>
    );
  }

  const title = name.trim() || record.name;

  return (
    <div className={className} style={{ height: '100%' }}>
      <EditorShell
        topBar={
          <TopBar
            title={title}
            device={device}
            onDeviceChange={setDevice}
            onRenameDocument={setName}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt ? new Date(lastSavedAt) : undefined}
            onRetrySave={() => void save()}
            onResolveConflict={() => setConflictOpen(true)}
            onOpenCommandPalette={() => setPaletteOpen(true)}
          />
        }
        library={
          <Panel
            side="left"
            title="Widget Library"
            defaultWidth={260}
            storageKey="dashboard-builder-left"
          >
            <LibraryPanel
              items={widgetLibraryItems}
              onSelectItem={item => addWidget(item.type as DashboardWidgetType)}
            />
          </Panel>
        }
        canvas={
          <DashboardGridCanvas
            layout={layout}
            data={data}
            now={now}
            device={device}
            title={title}
            breadcrumb={breadcrumb}
            rangeOptions={rangeOptions}
            sourcesError={sourcesError}
            selectedId={selectedId}
            isMoveMode={isMoveMode}
            onSetLayout={setLayout}
            onSelectId={setSelectedId}
            onSetMoveMode={setIsMoveMode}
            onUpdateWidget={updateWidget}
            onRemoveWidget={removeWidget}
            onAddWidget={addWidget}
            onLoadSources={loadSources}
            onFetchData={fetchData}
          />
        }
        inspector={
          <Panel
            side="right"
            title="Widget Settings"
            defaultWidth={300}
            storageKey="dashboard-builder-right"
          >
            <div style={{ padding: 16 }}>
              {selected ? (
                <WidgetInspector
                  widget={selected}
                  sources={sources ?? []}
                  spanOptions={spanOptions}
                  totalWidgets={layout.widgets.length}
                  widgetIndex={selectedIndex}
                  device={device}
                  isMoveMode={isMoveMode}
                  onToggleMoveMode={() => setIsMoveMode(v => !v)}
                  onMoveWidget={delta => moveWidget(selected.id, delta)}
                  onDuplicateWidget={() => duplicateWidget(selected.id)}
                  onTitle={value =>
                    updateWidget(selected.id, w => ({
                      ...w,
                      title: value || undefined,
                    }))
                  }
                  onSpan={span =>
                    updateWidget(selected.id, w => ({ ...w, span }))
                  }
                  onHeight={height =>
                    updateWidget(selected.id, w => ({ ...w, height }))
                  }
                  onQuery={patch => updateQuery(selected.id, patch)}
                />
              ) : (
                <EmptyState
                  title="No widget selected"
                  description="Click a widget on the canvas to edit its settings"
                />
              )}
            </div>
          </Panel>
        }
        statusBar={
          <StatusBar
            left={
              <span>
                {layout.widgets.length} / {maxWidgets} widgets
              </span>
            }
            center={
              <span role="status">
                {isMoveMode
                  ? 'Keyboard move mode active · Arrows move, Shift+Arrows resize, Enter/Esc to finish'
                  : (saveError ?? notice ?? '')}
              </span>
            }
            right={
              <Button
                variant="primary"
                size="sm"
                onClick={() => void save()}
                disabled={phase === 'saving'}
              >
                Save
              </Button>
            }
          />
        }
        commandPalette={
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            items={paletteItems}
          />
        }
      />
      <ConflictDialog
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        remoteTimestamp={
          conflict?.updatedAt
            ? `Saved ${new Date(conflict.updatedAt).toLocaleString()}`
            : undefined
        }
        onKeepMine={keepMine}
        onUseSaved={useSavedVersion}
        conflictDetails="Someone saved this dashboard after you opened it."
      />
    </div>
  );
}

// ─── Dashboard Canvas Component ──────────────────────────────────────────────

function DashboardGridCanvas({
  layout,
  data,
  now,
  device,
  title,
  breadcrumb,
  rangeOptions,
  sourcesError,
  selectedId,
  isMoveMode,
  onSetLayout,
  onSelectId,
  onSetMoveMode,
  onUpdateWidget,
  onRemoveWidget,
  onAddWidget,
  onLoadSources,
  onFetchData,
}: {
  layout: DashboardLayout;
  data: WidgetDataStates;
  now: number;
  device: DeviceType;
  title: string;
  breadcrumb: BreadcrumbItem[];
  rangeOptions: { value: string; label: string }[];
  sourcesError: string | null;
  selectedId: string | null;
  isMoveMode: boolean;
  onSetLayout: React.Dispatch<React.SetStateAction<DashboardLayout>>;
  onSelectId: (id: string | null) => void;
  onSetMoveMode: React.Dispatch<React.SetStateAction<boolean>>;
  onUpdateWidget: (id: string, patch: (w: DashboardWidget) => DashboardWidget) => void;
  onRemoveWidget: (id: string) => void;
  onAddWidget: (type: DashboardWidgetType) => void;
  onLoadSources: () => Promise<void>;
  onFetchData: (ids?: string[]) => Promise<void>;
}) {
  const { announce } = useLiveAnnouncer();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const totalCols = device === 'desktop' ? 12 : device === 'tablet' ? 6 : 1;
  const maxWidth = device === 'desktop' ? 1200 : device === 'tablet' ? 768 : 375;

  const onDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.widgets.findIndex(w => w.id === active.id);
    const newIndex = layout.widgets.findIndex(w => w.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      onSetLayout(prev => ({
        ...prev,
        widgets: arrayMove(prev.widgets, oldIndex, newIndex),
      }));
      const moved = layout.widgets[oldIndex];
      announce(`Moved ${moved?.title || 'widget'} to position ${newIndex + 1} of ${layout.widgets.length}`);
    }
  };

  // Keyboard navigation & move mode
  useEffect(() => {
    if (!selectedId) {
      if (isMoveMode) onSetMoveMode(false);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Toggle move mode with 'm'
      if (e.key === 'm' && !isMoveMode && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        onSetMoveMode(true);
        announce('Keyboard move mode active. Use arrow keys to reorder, Shift+Arrows to resize.');
        return;
      }

      if (!isMoveMode) return;

      const widget = layout.widgets.find(w => w.id === selectedId);
      if (!widget) return;
      const idx = layout.widgets.indexOf(widget);

      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onSetMoveMode(false);
        announce('Exited keyboard move mode');
      } else if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const maxCols = device === 'desktop' ? 12 : device === 'tablet' ? 6 : 1;
        const next = Math.min(maxCols, widget.span + 1);
        if (next !== widget.span) {
          onUpdateWidget(selectedId, w => ({ ...w, span: next }));
          announce(`Resized to ${next} columns`);
        }
      } else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const next = Math.max(1, widget.span - 1);
        if (next !== widget.span) {
          onUpdateWidget(selectedId, w => ({ ...w, span: next }));
          announce(`Resized to ${next} columns`);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < layout.widgets.length - 1) {
          onSetLayout(prev => ({
            ...prev,
            widgets: arrayMove(prev.widgets, idx, idx + 1),
          }));
          announce(`Moved to position ${idx + 2} of ${layout.widgets.length}`);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) {
          onSetLayout(prev => ({
            ...prev,
            widgets: arrayMove(prev.widgets, idx, idx - 1),
          }));
          announce(`Moved to position ${idx} of ${layout.widgets.length}`);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, isMoveMode, layout.widgets, device, onSetLayout, onSetMoveMode, onUpdateWidget, announce]);

  const activeWidget = activeDragId
    ? layout.widgets.find(w => w.id === activeDragId)
    : null;

  return (
    <div
      style={{ display: 'flex', height: '100%', flexDirection: 'column' }}
      onClick={() => onSelectId(null)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <Breadcrumb items={[...breadcrumb, { label: title }]} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 160 }}>
            <Select
              aria-label="Dashboard range"
              options={rangeOptions}
              value={String(layout.range)}
              onValueChange={value =>
                onSetLayout(prev => ({ ...prev, range: Number(value) }))
              }
            />
          </div>
        </div>
      </div>
      {sourcesError && (
        <div style={{ padding: '0 16px' }} onClick={e => e.stopPropagation()}>
          <ErrorState
            title="Data sources unavailable"
            message={sourcesError}
            onRetry={() => void onLoadSources()}
          />
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div
          style={{
            maxWidth,
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            minHeight: 500,
            transition: 'max-width 150ms ease-out',
          }}
        >
          {/* Visual grid background lines when moving/dragging/selected */}
          {(isMoveMode || activeDragId || selectedId) && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
                gap: 16,
                pointerEvents: 'none',
                opacity: 0.15,
                zIndex: 0,
              }}
            >
              {Array.from({ length: totalCols * 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px dashed var(--ne-primary)',
                    borderRadius: 'var(--ne-radius-md)',
                    minHeight: 140,
                  }}
                />
              ))}
            </div>
          )}

          {layout.widgets.length === 0 ? (
            <div onClick={e => e.stopPropagation()}>
              <EmptyState
                title="No widgets yet"
                description="Add a widget from the library to start this dashboard"
                addLabel="Add KPI Card"
                onAdd={() => onAddWidget('stat')}
              />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={layout.widgets.map(w => w.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
                    gap: 16,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {layout.widgets.map(widget => (
                    <SortableWidgetCard
                      key={widget.id}
                      widget={widget}
                      device={device}
                      totalCols={totalCols}
                      selected={widget.id === selectedId}
                      isMoveMode={isMoveMode && widget.id === selectedId}
                      onSelect={() => onSelectId(widget.id)}
                      onRemove={() => onRemoveWidget(widget.id)}
                      onResizeSpan={span =>
                        onUpdateWidget(widget.id, w => ({ ...w, span }))
                      }
                      onAnnounce={announce}
                    >
                      <DashboardWidgetBody
                        widget={widget}
                        state={data[widget.id]}
                        now={now}
                        onRefresh={() => void onFetchData([widget.id])}
                      />
                    </SortableWidgetCard>
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeWidget ? (
                  <WidgetCardView
                    widget={activeWidget}
                    device={device}
                    totalCols={totalCols}
                    selected={true}
                    isDraggingOverlay={true}
                    onSelect={() => {}}
                    onRemove={() => {}}
                  >
                    <DashboardWidgetBody
                      widget={activeWidget}
                      state={data[activeWidget.id]}
                      now={now}
                      onRefresh={() => {}}
                    />
                  </WidgetCardView>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Widget Card ────────────────────────────────────────────────────

function SortableWidgetCard({
  widget,
  device,
  totalCols,
  selected,
  isMoveMode,
  onSelect,
  onRemove,
  onResizeSpan,
  onAnnounce,
  children,
}: {
  widget: DashboardWidget;
  device: DeviceType;
  totalCols: number;
  selected: boolean;
  isMoveMode?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onResizeSpan: (span: number) => void;
  onAnnounce: (msg: string) => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startSpan: number; colWidth: number }>({
    startX: 0,
    startSpan: widget.span,
    colWidth: 100,
  });

  const onPointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const card = (e.currentTarget as HTMLElement).closest('section');
    const parent = card?.parentElement;
    if (!card || !parent) return;
    const gridWidth = parent.getBoundingClientRect().width;
    const colWidth = gridWidth / totalCols;
    resizeRef.current = {
      startX: e.clientX,
      startSpan: widget.span,
      colWidth: colWidth > 0 ? colWidth : 80,
    };
    setIsResizing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    e.stopPropagation();
    const deltaX = e.clientX - resizeRef.current.startX;
    const deltaCols = Math.round(deltaX / resizeRef.current.colWidth);
    const maxCols = totalCols;
    const nextSpan = Math.min(maxCols, Math.max(1, resizeRef.current.startSpan + deltaCols));
    if (nextSpan !== widget.span) {
      onResizeSpan(nextSpan);
    }
  };

  const onPointerUpResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    onAnnounce(`Resized to ${widget.span} columns`);
  };

  const onKeyDownResize = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(totalCols, widget.span + 1);
      onResizeSpan(next);
      onAnnounce(`Resized to ${next} columns`);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(1, widget.span - 1);
      onResizeSpan(next);
      onAnnounce(`Resized to ${next} columns`);
    }
  };

  return (
    <WidgetCardView
      ref={setNodeRef}
      widget={widget}
      device={device}
      totalCols={totalCols}
      selected={selected}
      isMoveMode={isMoveMode}
      isDragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
      transform={transform}
      transition={transition}
      onSelect={onSelect}
      onRemove={onRemove}
      resizeHandle={
        selected && device !== 'mobile' ? (
          <button
            type="button"
            role="slider"
            aria-label={`Resize width for ${widget.title || TYPE_LABEL[widget.type]}`}
            aria-valuemin={1}
            aria-valuemax={totalCols}
            aria-valuenow={widget.span}
            aria-valuetext={`${widget.span} columns`}
            tabIndex={0}
            onPointerDown={onPointerDownResize}
            onPointerMove={onPointerMoveResize}
            onPointerUp={onPointerUpResize}
            onKeyDown={onKeyDownResize}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 12,
              cursor: 'ew-resize',
              background: isResizing ? 'var(--ne-primary)' : 'transparent',
              borderRadius: '0 var(--ne-radius-md) var(--ne-radius-md) 0',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
              zIndex: 10,
            }}
            title="Drag to resize width (or use Arrow keys)"
          >
            <div
              style={{
                width: 3,
                height: 24,
                borderRadius: 2,
                background: isResizing ? '#fff' : 'var(--ne-border-strong)',
              }}
            />
          </button>
        ) : null
      }
    >
      {children}
    </WidgetCardView>
  );
}

// ─── Pure Widget Card View ───────────────────────────────────────────────────

import { forwardRef } from 'react';

const WidgetCardView = forwardRef<
  HTMLElement,
  {
    widget: DashboardWidget;
    device: DeviceType;
    totalCols: number;
    selected: boolean;
    isMoveMode?: boolean;
    isDragging?: boolean;
    isDraggingOverlay?: boolean;
    dragAttributes?: DraggableAttributes;
    dragListeners?: Record<string, unknown>;
    transform?: { x: number; y: number; scaleX?: number; scaleY?: number } | null;
    transition?: string;
    onSelect: () => void;
    onRemove: () => void;
    resizeHandle?: ReactNode;
    children: ReactNode;
  }
>(function WidgetCardView(
  {
    widget,
    device,
    totalCols,
    selected,
    isMoveMode,
    isDragging,
    isDraggingOverlay,
    dragAttributes,
    dragListeners,
    transform,
    transition,
    onSelect,
    onRemove,
    resizeHandle,
    children,
  },
  ref
) {
  const colSpan =
    device === 'desktop'
      ? Math.min(12, Math.max(1, widget.span))
      : device === 'tablet'
        ? Math.min(6, Math.max(1, Math.round(widget.span / 2) || 1))
        : 1;

  const heightUnits = widget.height ?? 1;
  const minHeight = heightUnits * 150 + (heightUnits - 1) * 16;

  const style: CSSProperties = {
    gridColumn: `span ${colSpan} / span ${colSpan}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 16,
    borderRadius: 'var(--ne-radius-md)',
    border: '1px solid var(--ne-border)',
    background: 'var(--ne-surface)',
    boxShadow: isMoveMode
      ? '0 0 0 2px var(--ne-warning), 0 4px 12px rgba(0, 0, 0, 0.08)'
      : selected
        ? '0 0 0 2px var(--ne-primary), 0 2px 8px rgba(0, 0, 0, 0.05)'
        : undefined,
    cursor: 'pointer',
    minWidth: 0,
    minHeight,
    position: 'relative',
    opacity: isDragging ? 0.35 : 1,
    transform: transform ? CSS.Transform.toString(transform as never) : undefined,
    transition,
    ...(isDraggingOverlay && {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      borderColor: 'var(--ne-primary)',
      zIndex: 1000,
    }),
  };

  return (
    <section
      ref={ref}
      aria-label={widget.title || TYPE_LABEL[widget.type]}
      aria-current={selected || undefined}
      style={style}
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={event => {
        if (
          event.target === event.currentTarget &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {dragListeners && (
            <button
              type="button"
              aria-label={`Drag to reorder ${widget.title || TYPE_LABEL[widget.type]}`}
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                cursor: 'grab',
                color: 'var(--ne-text-muted)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--ne-radius-sm)',
              }}
              {...dragAttributes}
              {...dragListeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <span
            style={{
              color: 'var(--ne-text)',
              fontSize: 13,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {widget.title || TYPE_LABEL[widget.type]}
          </span>
          {isMoveMode && (
            <Chip active style={{ borderColor: 'var(--ne-warning)', color: 'var(--ne-warning)' }}>
              Move mode
            </Chip>
          )}
        </div>
        <IconButton
          tooltip="Remove widget"
          aria-label="Remove widget"
          size="sm"
          onClick={event => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      {resizeHandle}
    </section>
  );
});

// ─── Enhanced Widget Inspector ───────────────────────────────────────────────

function WidgetInspector({
  widget,
  sources,
  spanOptions,
  totalWidgets,
  widgetIndex,
  device,
  isMoveMode,
  onToggleMoveMode,
  onMoveWidget,
  onDuplicateWidget,
  onTitle,
  onSpan,
  onHeight,
  onQuery,
}: {
  widget: DashboardWidget;
  sources: DashboardSource[];
  spanOptions: number[];
  totalWidgets: number;
  widgetIndex: number;
  device: DeviceType;
  isMoveMode: boolean;
  onToggleMoveMode: () => void;
  onMoveWidget: (delta: number) => void;
  onDuplicateWidget: () => void;
  onTitle: (value: string) => void;
  onSpan: (span: number) => void;
  onHeight: (height: number) => void;
  onQuery: (patch: Partial<DashboardQuery>) => void;
}) {
  const source = sources.find(s => s.id === widget.query.source);
  const problem = sources.length
    ? checkDashboardQuery(sources, widget.query, widget.type)
    : null;
  const options = source
    ? sourceOptionsFor(source, widget.type)
    : { measures: [], dimensions: [] };

  const totalCols = device === 'desktop' ? 12 : device === 'tablet' ? 6 : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Widget Header & Title */}
      <InspectorField label="Title">
        <Input
          value={widget.title ?? ''}
          placeholder={TYPE_LABEL[widget.type]}
          onChange={e => onTitle(e.target.value)}
        />
      </InspectorField>

      {/* Grid Placement (12/6/1 columns and numeric X/Y/W/H inputs) */}
      <FieldGroup title={`Grid Placement (${device})`}>
        <FieldRow label="Col Span (W)" device={device}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <NumberInput
              value={widget.span}
              onChange={onSpan}
              min={1}
              max={totalCols}
              unit="cols"
              size="sm"
            />
            {spanOptions.length > 0 && device === 'desktop' && (
              <div style={{ display: 'flex', gap: 4 }}>
                {spanOptions.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={widget.span === s ? 'primary' : 'secondary'}
                    onClick={() => onSpan(s)}
                  >
                    {s} cols
                  </Button>
                ))}
              </div>
            )}
          </div>
        </FieldRow>

        <FieldRow label="Row Height (H)" device={device}>
          <NumberInput
            value={widget.height ?? 1}
            onChange={onHeight}
            min={1}
            max={6}
            unit="units"
            size="sm"
          />
        </FieldRow>

        <FieldRow label="Order / Position">
          <NumberInput
            value={widgetIndex + 1}
            onChange={val => onMoveWidget(val - 1 - widgetIndex)}
            min={1}
            max={totalWidgets}
            step={1}
            unit={`of ${totalWidgets}`}
            size="sm"
          />
        </FieldRow>

        {/* Quick layout & move actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <Button
            size="sm"
            variant="secondary"
            disabled={widgetIndex === 0}
            onClick={() => onMoveWidget(-1)}
            leftIcon={<ArrowLeft className="h-3 w-3" />}
          >
            Earlier
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={widgetIndex === totalWidgets - 1}
            onClick={() => onMoveWidget(1)}
            rightIcon={<ArrowRight className="h-3 w-3" />}
          >
            Later
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onDuplicateWidget}
            leftIcon={<Copy className="h-3 w-3" />}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            variant={isMoveMode ? 'primary' : 'secondary'}
            onClick={onToggleMoveMode}
            leftIcon={<Move className="h-3 w-3" />}
          >
            {isMoveMode ? 'Done' : 'Move'}
          </Button>
        </div>
      </FieldGroup>

      {/* Data Source & Query Binding */}
      <FieldGroup title="Data Source & Query">
        {sources.length > 1 && (
          <InspectorField label="Data source">
            <Select
              options={sources.map(s => ({ value: s.id, label: s.label }))}
              value={widget.query.source}
              onValueChange={id => {
                const next = sources.find(s => s.id === id);
                const query = next && defaultQueryFor(next, widget.type);
                if (query) onQuery(query);
              }}
            />
          </InspectorField>
        )}
        {source && (
          <>
            <InspectorField label="Measure">
              <Select
                options={options.measures.map(m => ({
                  value: m.id,
                  label: m.label,
                }))}
                value={widget.query.measure}
                onValueChange={measure => onQuery({ measure })}
              />
            </InspectorField>
            {options.dimensions.length > 1 && (
              <InspectorField label="Group by">
                <Select
                  options={options.dimensions.map(d => ({
                    value: d.id,
                    label: d.label,
                  }))}
                  value={widget.query.dimension}
                  onValueChange={dimension => onQuery({ dimension })}
                />
              </InspectorField>
            )}
            <InspectorField label="Range">
              <Select
                options={[
                  { value: 'inherit', label: 'Dashboard range' },
                  ...source.ranges.map(d => ({
                    value: String(d),
                    label: `Last ${d} days`,
                  })),
                ]}
                value={String(widget.query.range)}
                onValueChange={value =>
                  onQuery({
                    range: value === 'inherit' ? 'inherit' : Number(value),
                  })
                }
              />
            </InspectorField>
            <Switch
              label="Compare with previous period"
              checked={widget.query.compare}
              onChange={compare => onQuery({ compare })}
            />
            {widget.type === 'table' && source.limits.length > 0 && (
              <InspectorField label="Rows">
                <Select
                  options={source.limits.map(l => ({
                    value: String(l),
                    label: String(l),
                  }))}
                  value={String(widget.query.limit ?? source.limits[0])}
                  onValueChange={value => onQuery({ limit: Number(value) })}
                />
              </InspectorField>
            )}
            {source.filters.map(filter => (
              <InspectorField key={filter.id} label={filter.label}>
                <Select
                  options={[{ value: '', label: 'Any' }, ...filter.options]}
                  value={widget.query.filters[filter.id] ?? ''}
                  onValueChange={value => {
                    const filters = { ...widget.query.filters };
                    if (value) filters[filter.id] = value;
                    else delete filters[filter.id];
                    onQuery({ filters });
                  }}
                />
              </InspectorField>
            ))}
          </>
        )}
      </FieldGroup>

      {problem && (
        <p
          role="alert"
          style={{ margin: 0, color: 'var(--ne-danger)', fontSize: 12 }}
        >
          {problem}
        </p>
      )}
    </div>
  );
}
