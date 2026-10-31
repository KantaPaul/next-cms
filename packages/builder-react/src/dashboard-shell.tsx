/**
 * Dashboard builder on the shared editor-ui package (B15 E7, E8): the
 * shell, library, inspector and states come from `@nextcms/editor-ui`;
 * loading, saving and widget data go through the host's adapters
 * (dashboard-adapters.ts). Nothing here holds mock data: every widget state
 * comes from a real `data.query` response, and saves carry the version
 * they started from so a concurrent save shows a conflict instead of
 * silently winning.
 */

import {
  Breadcrumb,
  type BreadcrumbItem,
  Button,
  CommandPalette,
  type CommandPaletteItem,
  ConflictDialog,
  EditorShell,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  InspectorField,
  type LibraryItemDef,
  LibraryPanel,
  LoadingSkeleton,
  Panel,
  type SaveState,
  Select,
  StatusBar,
  Switch,
  TopBar,
} from '@nextcms/editor-ui';
import { BarChart3, Gauge, Table2, Trash2 } from 'lucide-react';
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
    // `initial` only seeds the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

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
          <div
            style={{ display: 'flex', height: '100%', flexDirection: 'column' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 16px',
              }}
            >
              <Breadcrumb items={[...breadcrumb, { label: title }]} />
              <div style={{ width: 160 }}>
                <Select
                  aria-label="Dashboard range"
                  options={rangeOptions}
                  value={String(layout.range)}
                  onValueChange={value =>
                    setLayout(prev => ({ ...prev, range: Number(value) }))
                  }
                />
              </div>
            </div>
            {sourcesError && (
              <div style={{ padding: '0 16px' }}>
                <ErrorState
                  title="Data sources unavailable"
                  message={sourcesError}
                  onRetry={() => void loadSources()}
                />
              </div>
            )}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {layout.widgets.length === 0 ? (
                <EmptyState
                  title="No widgets yet"
                  description="Add a widget from the library to start this dashboard"
                  addLabel="Add KPI Card"
                  onAdd={() => addWidget('stat')}
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                    gap: 16,
                  }}
                >
                  {layout.widgets.map(widget => (
                    <WidgetCard
                      key={widget.id}
                      widget={widget}
                      selected={widget.id === selectedId}
                      onSelect={() => setSelectedId(widget.id)}
                      onRemove={() => removeWidget(widget.id)}
                    >
                      <DashboardWidgetBody
                        widget={widget}
                        state={data[widget.id]}
                        now={now}
                        onRefresh={() => void fetchData([widget.id])}
                      />
                    </WidgetCard>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                  onTitle={value =>
                    updateWidget(selected.id, w => ({
                      ...w,
                      title: value || undefined,
                    }))
                  }
                  onSpan={span =>
                    updateWidget(selected.id, w => ({ ...w, span }))
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
            center={<span role="status">{saveError ?? notice ?? ''}</span>}
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

function WidgetCard({
  widget,
  selected,
  onSelect,
  onRemove,
  children,
}: {
  widget: DashboardWidget;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    gridColumn: `span ${Math.min(12, Math.max(1, widget.span))} / span ${Math.min(12, Math.max(1, widget.span))}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 16,
    borderRadius: 'var(--ne-radius-md)',
    border: '1px solid var(--ne-border)',
    background: 'var(--ne-surface)',
    boxShadow: selected ? '0 0 0 2px var(--ne-primary)' : undefined,
    cursor: 'pointer',
    minWidth: 0,
  };
  return (
    <section
      aria-label={widget.title || TYPE_LABEL[widget.type]}
      aria-current={selected || undefined}
      style={style}
      onClick={onSelect}
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
        <span
          style={{ color: 'var(--ne-text)', fontSize: 13, fontWeight: 500 }}
        >
          {widget.title || TYPE_LABEL[widget.type]}
        </span>
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
      {children}
    </section>
  );
}

function WidgetInspector({
  widget,
  sources,
  spanOptions,
  onTitle,
  onSpan,
  onQuery,
}: {
  widget: DashboardWidget;
  sources: DashboardSource[];
  spanOptions: number[];
  onTitle: (value: string) => void;
  onSpan: (span: number) => void;
  onQuery: (patch: Partial<DashboardQuery>) => void;
}) {
  const source = sources.find(s => s.id === widget.query.source);
  const problem = sources.length
    ? checkDashboardQuery(sources, widget.query, widget.type)
    : null;
  const options = source
    ? sourceOptionsFor(source, widget.type)
    : { measures: [], dimensions: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <InspectorField label="Title">
        <Input
          value={widget.title ?? ''}
          placeholder={TYPE_LABEL[widget.type]}
          onChange={e => onTitle(e.target.value)}
        />
      </InspectorField>
      <InspectorField label="Width (columns of 12)">
        <Select
          options={spanOptions.map(s => ({
            value: String(s),
            label: String(s),
          }))}
          value={String(widget.span)}
          onValueChange={value => onSpan(Number(value))}
        />
      </InspectorField>
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
