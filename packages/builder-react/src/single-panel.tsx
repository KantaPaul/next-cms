/**
 * SinglePanel (E12): unified single-panel editor layout combining ToolRail,
 * EditorPanel, PanelTabs, and PanelStack, hosting ElementsView, LayersView,
 * SettingsView, PageSettingsView, and HistoryView wired to the editor store.
 */

import {
  EditorPanel,
  type PanelDockSide,
  type PanelTabItem,
  ToolRail,
  type ToolRailItem,
} from '@nextcms/editor-ui';
import {
  Boxes,
  Clock,
  FileText,
  Layers,
  LayoutTemplate,
  Settings,
} from 'lucide-react';
import React, { useState } from 'react';
import { useEditor } from './context';
import type { DragController } from './drag';
import { type BlockCategory, ElementsView } from './elements-view';
import { HistoryView } from './history-view';
import type { InspectorBlock } from './inspector';
import { LayersView } from './layers-view';
import { PageSettingsView } from './page-settings-view';
import type { SaveQueue } from './save';
import { SettingsView } from './settings-view';
import {
  TemplateLibraryView,
  type TemplateItem,
} from './template-library-view';

export { type TemplateItem };

export type SinglePanelViewMode =
  | 'elements'
  | 'layers'
  | 'templates'
  | 'settings'
  | 'page'
  | 'history';

export interface SinglePanelProps {
  blocks: Record<string, InspectorBlock>;
  categories?: BlockCategory[];
  templates?: TemplateItem[];
  onApplyTemplate?: (template: TemplateItem) => void;
  onSaveTemplate?: (template: Omit<TemplateItem, 'id'>) => Promise<void> | void;
  onDeleteTemplate?: (id: string) => Promise<void> | void;
  drag?: DragController;
  queue?: SaveQueue;
  defaultMode?: SinglePanelViewMode;
  dockSide?: PanelDockSide;
  onDockSideChange?: (side: PanelDockSide) => void;
  showToolRail?: boolean;
  className?: string;
}

export function SinglePanel({
  blocks,
  categories,
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  drag,
  queue,
  defaultMode = 'settings',
  dockSide = 'right',
  onDockSideChange,
  showToolRail = true,
  className,
}: SinglePanelProps) {
  const [activeMode, setActiveMode] = useState<SinglePanelViewMode>(defaultMode);
  const selectionCount = useEditor(state => state.selection.length);
  const selectedNode = useEditor(state =>
    state.selection.length === 1 ? state.doc.nodes[state.selection[0]] : null
  );

  const tabs: PanelTabItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings size={13} /> },
    { id: 'layers', label: 'Layers', icon: <Layers size={13} /> },
    { id: 'elements', label: 'Elements', icon: <Boxes size={13} /> },
    { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={13} /> },
    { id: 'page', label: 'Page', icon: <FileText size={13} /> },
    { id: 'history', label: 'History', icon: <Clock size={13} /> },
  ];

  const toolRailItems: ToolRailItem[] = [
    {
      id: 'settings',
      label: 'Inspector / Settings',
      icon: <Settings size={16} />,
      active: activeMode === 'settings',
      onClick: () => setActiveMode('settings'),
    },
    {
      id: 'layers',
      label: 'Document Layers',
      icon: <Layers size={16} />,
      active: activeMode === 'layers',
      onClick: () => setActiveMode('layers'),
    },
    {
      id: 'elements',
      label: 'Add Elements',
      icon: <Boxes size={16} />,
      active: activeMode === 'elements',
      onClick: () => setActiveMode('elements'),
    },
    {
      id: 'templates',
      label: 'Template Library',
      icon: <LayoutTemplate size={16} />,
      active: activeMode === 'templates',
      onClick: () => setActiveMode('templates'),
    },
    {
      id: 'page',
      label: 'Page Settings',
      icon: <FileText size={16} />,
      active: activeMode === 'page',
      onClick: () => setActiveMode('page'),
    },
    {
      id: 'history',
      label: 'History & Timeline',
      icon: <Clock size={16} />,
      active: activeMode === 'history',
      onClick: () => setActiveMode('history'),
    },
  ];

  const getTitle = () => {
    switch (activeMode) {
      case 'elements':
        return 'Elements Library';
      case 'layers':
        return 'Layers Tree';
      case 'templates':
        return 'Template Library';
      case 'settings':
        return selectedNode
          ? (blocks[selectedNode.type]?.label ?? selectedNode.type)
          : selectionCount > 1
            ? `${selectionCount} Blocks Selected`
            : 'Block Settings';
      case 'page':
        return 'Page Settings';
      case 'history':
        return 'History Timeline';
    }
  };

  return (
    <div className={className} style={{ display: 'flex', height: '100%' }}>
      {showToolRail && dockSide === 'left' && (
        <ToolRail items={toolRailItems} activeId={activeMode} />
      )}

      <EditorPanel
        side={dockSide}
        onSideChange={onDockSideChange}
        title={getTitle()}
        tabs={tabs}
        activeTab={activeMode}
        onTabChange={id => setActiveMode(id as SinglePanelViewMode)}
        defaultWidth={320}
        storageKey="ne-builder-single-panel"
      >
        {activeMode === 'elements' && (
          <ElementsView categories={categories} drag={drag} />
        )}
        {activeMode === 'layers' && <LayersView />}
        {activeMode === 'templates' && (
          <TemplateLibraryView
            templates={templates}
            onApplyTemplate={onApplyTemplate}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
          />
        )}
        {activeMode === 'settings' && <SettingsView blocks={blocks} />}
        {activeMode === 'page' && <PageSettingsView />}
        {activeMode === 'history' && <HistoryView queue={queue} />}
      </EditorPanel>

      {showToolRail && dockSide === 'right' && (
        <ToolRail items={toolRailItems} activeId={activeMode} />
      )}
    </div>
  );
}
