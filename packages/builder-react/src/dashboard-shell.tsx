/**
 * Dashboard builder on the shared editor-ui package (B15 E7): wraps the
 * analytics dashboard builder in `@nextcms/editor-ui`'s EditorShell,
 * TopBar, Panel, Breadcrumb, and StatusBar. Uses the same adapter pattern
 * as the page builder's shared shell.
 */

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EditorShell,
  TopBar,
  Panel,
  Breadcrumb,
  StatusBar,
  CommandPalette,
  type CommandPaletteItem,
  LibraryPanel,
  type LibraryItem,
  EmptyState,
  LoadingSkeleton,
  InspectorField,
  Input,
  Select,
  Button,
} from '@nextcms/editor-ui';
import { cn } from '@nextcms/editor-ui';

export type DashboardWidgetType = 'stat' | 'chart' | 'table';

export type DashboardWidget = {
  id: string;
  type: DashboardWidgetType;
  span: number;
  title?: string;
  query?: Record<string, unknown>;
};

export type DashboardLayout = {
  widgets: DashboardWidget[];
};

export type DashboardBuilderProps = {
  initialLayout?: DashboardLayout;
  onChange?: (layout: DashboardLayout) => void;
  onSave?: (layout: DashboardLayout) => void;
  onPublish?: (layout: DashboardLayout) => void;
  title?: string;
  className?: string;
};

const widgetLibraryItems: LibraryItem[] = [
  { id: 'stat', label: 'KPI Card', category: 'Summary', description: 'Single metric with change indicator' },
  { id: 'chart', label: 'Chart', category: 'Charts', description: 'Line, bar, or area chart' },
  { id: 'table', label: 'Table', category: 'Tables', description: 'Sortable data table' },
];

export function DashboardBuilder({
  initialLayout,
  onChange,
  onSave,
  onPublish,
  title = 'Untitled Dashboard',
  className,
}: DashboardBuilderProps) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout ?? { widgets: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');

  useEffect(() => {
    onChange?.(layout);
  }, [layout, onChange]);

  const handleAddWidget = useCallback((type: DashboardWidgetType) => {
    const newWidget: DashboardWidget = {
      id: `w-${Date.now().toString(36)}`,
      type,
      span: type === 'stat' ? 4 : 12,
      title: type === 'stat' ? 'New KPI' : type === 'chart' ? 'New Chart' : 'New Table',
    };
    setLayout(prev => ({ widgets: [...prev.widgets, newWidget] }));
    setSelectedId(newWidget.id);
    setSaveStatus('unsaved');
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setLayout(prev => ({ widgets: prev.widgets.filter(w => w.id !== id) }));
    if (selectedId === id) setSelectedId(null);
    setSaveStatus('unsaved');
  }, [selectedId]);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    onSave?.(layout);
    setSaveStatus('saved');
  }, [layout, onSave]);

  const handlePublish = useCallback(() => {
    onPublish?.(layout);
  }, [layout, onPublish]);

  const paletteItems: CommandPaletteItem[] = [
    ...widgetLibraryItems.map(item => ({
      id: `add-${item.id}`,
      label: `Add ${item.label}`,
      group: 'Insert',
      onSelect: () => handleAddWidget(item.id as DashboardWidgetType),
    })),
    { id: 'save', label: 'Save', shortcut: '⌘S', group: 'File', onSelect: handleSave },
    { id: 'publish', label: 'Publish', shortcut: '⌘⇧P', group: 'File', onSelect: handlePublish },
  ];

  const breadcrumbItems = [
    { label: 'Dashboards' },
    { label: title },
  ];

  const selectedWidget = layout.widgets.find(w => w.id === selectedId);

  return (
    <>
      <EditorShell
      topBar={
        <TopBar
          title={title}
          saveStatus={saveStatus}
          canUndo={false}
          canRedo={false}
          device="desktop"
          onDeviceChange={() => {}}
          onPreview={() => {}}
          onPublish={handlePublish}
        />
      }
      library={
        <Panel side="left" title="Widget Library" defaultWidth={260} storageKey="dashboard-builder-left">
          <LibraryPanel
            items={widgetLibraryItems}
            categories={['Summary', 'Charts', 'Tables']}
            selectedCategory="Summary"
            onCategoryChange={() => {}}
          />
        </Panel>
      }
      canvas={
        <div className="flex h-full flex-col">
          <Breadcrumb items={breadcrumbItems} />
          <div className="flex-1 overflow-auto p-4">
            {layout.widgets.length === 0 ? (
              <EmptyState
                title="No widgets yet"
                description="Drag widgets from the library or click to add them"
                action={{ label: 'Add KPI Card', onClick: () => handleAddWidget('stat') }}
              />
            ) : (
              <div className="grid grid-cols-12 gap-4">
                {layout.widgets.map(widget => (
                  <div
                    key={widget.id}
                    className={cn(
                      'rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-4',
                      widget.span === 4 && 'col-span-4',
                      widget.span === 6 && 'col-span-6',
                      widget.span === 12 && 'col-span-12',
                      selectedId === widget.id && 'ring-2 ring-[var(--ne-primary)]'
                    )}
                    onClick={() => setSelectedId(widget.id)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--ne-text)]">
                        {widget.title ?? widget.type}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveWidget(widget.id);
                        }}
                        className="text-xs text-[var(--ne-text-muted)] hover:text-[var(--ne-danger)]"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-xs text-[var(--ne-text-muted)]">
                      {widget.type === 'stat' && 'KPI metric'}
                      {widget.type === 'chart' && 'Chart visualization'}
                      {widget.type === 'table' && 'Data table'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      }
      inspector={
        <Panel side="right" title="Widget Settings" defaultWidth={300} storageKey="dashboard-builder-right">
          <div className="p-4">
            {selectedWidget ? (
              <div className="flex flex-col gap-3">
                <InspectorField label="Title">
                  <Input
                    value={selectedWidget.title ?? ''}
                    onChange={e => {
                      setLayout(prev => ({
                        widgets: prev.widgets.map(w =>
                          w.id === selectedWidget.id ? { ...w, title: e.target.value } : w
                        ),
                      }));
                      setSaveStatus('unsaved');
                    }}
                  />
                </InspectorField>
                <InspectorField label="Span (columns)">
                  <Select
                    value={String(selectedWidget.span)}
                    onChange={e => {
                      setLayout(prev => ({
                        widgets: prev.widgets.map(w =>
                          w.id === selectedWidget.id ? { ...w, span: Number(e.target.value) } : w
                        ),
                      }));
                      setSaveStatus('unsaved');
                    }}
                  >
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="12">12</option>
                  </Select>
                </InspectorField>
                <InspectorField label="Type">
                  <span className="text-sm text-[var(--ne-text-muted)]">{selectedWidget.type}</span>
                </InspectorField>
              </div>
            ) : (
              <EmptyState title="No widget selected" description="Click a widget on the canvas to edit its settings" />
            )}
          </div>
        </Panel>
      }
      statusBar={
        <StatusBar
          left={<span>{layout.widgets.length} widgets</span>}
          center={<span>Dashboard builder</span>}
          right={
            <Button variant="default" size="sm" onClick={handleSave}>
              Save
            </Button>
          }
        />
      }
    />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={paletteItems} />
    </>
  );
}