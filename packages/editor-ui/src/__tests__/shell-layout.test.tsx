import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DockZone,
  EditorPanel,
  FloatingLayersWindow,
  PanelHeader,
  PanelResizeDivider,
  PanelStack,
  PanelTabs,
  PinnedBlockStrip,
  ToolRail,
} from '../shell';

describe('Shell Layout & Single Panel Components (Phase 5)', () => {
  describe('PanelTabs', () => {
    it('renders tabs with role="tablist", aria-selected, and badges', () => {
      const tabs = [
        { id: 'elements', label: 'Elements', badge: 12 },
        { id: 'layers', label: 'Layers' },
        { id: 'settings', label: 'Settings' },
      ];
      const html = renderToStaticMarkup(
        <PanelTabs
          tabs={tabs}
          activeTab="elements"
          onChange={() => {}}
        />
      );

      assert.match(html, /role="tablist"/);
      assert.match(html, /aria-selected="true"/);
      assert.match(html, /Elements/);
      assert.match(html, /Layers/);
      assert.match(html, /Settings/);
      assert.match(html, /12/);
    });

    it('renders segmented variant', () => {
      const html = renderToStaticMarkup(
        <PanelTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'changed', label: 'Changed' },
          ]}
          activeTab="all"
          onChange={() => {}}
          variant="segmented"
        />
      );

      assert.match(html, /All/);
      assert.match(html, /Changed/);
    });
  });

  describe('PanelHeader', () => {
    it('renders title, back button, and actions', () => {
      const html = renderToStaticMarkup(
        <PanelHeader
          title="Block Settings"
          subtitle="Heading 1"
          onBack={() => {}}
          actions={<button type="button">Action</button>}
        />
      );

      assert.match(html, /Block Settings/);
      assert.match(html, /Heading 1/);
      assert.match(html, /aria-label="Back"/);
      assert.match(html, /Action/);
    });
  });

  describe('PanelStack', () => {
    it('renders the top item and breadcrumb trail for ancestor items', () => {
      const items = [
        { id: 'root', title: 'Inspector', content: <div>Root Content</div> },
        { id: 'card', title: 'Card Block', content: <div>Card Content</div> },
        { id: 'button', title: 'Button Settings', content: <div>Button Content</div> },
      ];
      const html = renderToStaticMarkup(
        <PanelStack
          items={items}
          onPop={() => {}}
        />
      );

      assert.match(html, /Button Content/);
      assert.match(html, /aria-label="Panel hierarchy"/);
      assert.match(html, /Inspector/);
      assert.match(html, /Card Block/);
      assert.match(html, /Button Settings/);
    });
  });

  describe('PanelResizeDivider', () => {
    it('renders separator with vertical orientation and ARIA value attributes', () => {
      const html = renderToStaticMarkup(
        <PanelResizeDivider
          orientation="vertical"
          value={300}
          min={200}
          max={500}
        />
      );

      assert.match(html, /role="separator"/);
      assert.match(html, /aria-orientation="vertical"/);
      assert.match(html, /aria-valuenow="300"/);
      assert.match(html, /aria-valuemin="200"/);
      assert.match(html, /aria-valuemax="500"/);
    });
  });

  describe('DockZone', () => {
    it('renders with data-dock-position attribute', () => {
      const html = renderToStaticMarkup(
        <DockZone position="left">
          <div>Docked Panel</div>
        </DockZone>
      );

      assert.match(html, /data-dock-position="left"/);
      assert.match(html, /Docked Panel/);
    });
  });

  describe('ToolRail', () => {
    it('renders toolbar with icons, active indicator, and badges', () => {
      const items = [
        {
          id: 'layers',
          label: 'Layers Panel',
          icon: <span>LayerIcon</span>,
          badge: 3,
          shortcut: 'Alt+1',
          onClick: () => {},
        },
        {
          id: 'elements',
          label: 'Add Elements',
          icon: <span>AddIcon</span>,
          shortcut: 'Alt+2',
          onClick: () => {},
        },
      ];
      const html = renderToStaticMarkup(
        <ToolRail
          items={items}
          activeId="layers"
        />
      );

      assert.match(html, /role="toolbar"/);
      assert.match(html, /aria-label="Layers Panel"/);
      assert.match(html, /aria-pressed="true"/);
      assert.match(html, /3/);
      assert.match(html, /LayerIcon/);
    });
  });

  describe('ToolRail (horizontal footer)', () => {
    it('renders leading and trailing slots around the routes', () => {
      const html = renderToStaticMarkup(
        <ToolRail
          orientation="horizontal"
          items={[{ id: 'layers', label: 'Layers', icon: <span>L</span>, onClick: () => {} }]}
          activeId="layers"
          leading={<button type="button">UndoSlot</button>}
          trailing={<span>3 changes</span>}
        />
      );

      assert.match(html, /aria-orientation="horizontal"/);
      assert.match(html, /UndoSlot[\s\S]*aria-label="Layers"[\s\S]*3 changes/);
      assert.match(html, /aria-pressed="true"/);
    });
  });

  describe('FloatingLayersWindow', () => {
    it('renders dialog with title, drag handle, dock buttons, and close', () => {
      const html = renderToStaticMarkup(
        <FloatingLayersWindow
          title="Floating Layers"
          onClose={() => {}}
          onDock={() => {}}
        >
          <div>Tree Content</div>
        </FloatingLayersWindow>
      );

      assert.match(html, /role="dialog"/);
      assert.match(html, /Floating Layers/);
      assert.match(html, /aria-label="Dock to left"/);
      assert.match(html, /aria-label="Dock to right"/);
      assert.match(html, /aria-label="Close"/);
      assert.match(html, /Tree Content/);
    });
  });

  describe('PinnedBlockStrip', () => {
    it('renders block identity, parent selector, lock, hide, duplicate, delete actions', () => {
      const html = renderToStaticMarkup(
        <PinnedBlockStrip
          blockName="Hero Title"
          blockType="Heading"
          parentName="Hero Section"
          onSelectParent={() => {}}
          onToggleLock={() => {}}
          onToggleHide={() => {}}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />
      );

      assert.match(html, /Hero Title/);
      assert.match(html, /Heading/);
      assert.match(html, /Hero Section/);
      assert.match(html, /aria-label="Lock block"/);
      assert.match(html, /aria-label="Hide block"/);
      assert.match(html, /aria-label="Duplicate block"/);
      assert.match(html, /aria-label="Delete block"/);
    });
  });

  describe('EditorPanel', () => {
    it('renders full unified panel with header, tabs, and resize handle', () => {
      const html = renderToStaticMarkup(
        <EditorPanel
          side="right"
          title="Single Panel Editor"
          tabs={[
            { id: 'settings', label: 'Settings' },
            { id: 'layers', label: 'Layers' },
          ]}
          activeTab="settings"
          onTabChange={() => {}}
          onSideChange={() => {}}
        >
          <div>Inspector Panel Content</div>
        </EditorPanel>
      );

      assert.match(html, /Single Panel Editor/);
      assert.match(html, /Settings/);
      assert.match(html, /Layers/);
      assert.match(html, /Inspector Panel Content/);
      assert.match(html, /role="separator"/);
      assert.match(html, /aria-label="Dock to left"/);
    });
  });
});
