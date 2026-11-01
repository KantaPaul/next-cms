import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Boxes,
  Eye,
  History,
  Layers,
  Layout,
  Languages,
  Maximize2,
  Minimize2,
  Settings,
  Sparkles,
} from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  ChooseField,
  ColorField,
  CommandPalette,
  ContextMenu,
  ControlRow,
  DimensionsField,
  type DimensionsValue,
  DockZone,
  DropZone,
  type EditorDirection,
  EditorPanel,
  EditorShell,
  type EditorTheme,
  EditorUIProvider,
  FieldGroup,
  FloatingLayersWindow,
  FloatingToolbar,
  GroupControl,
  type ControlState,
  HoverBox,
  Input,
  IconButton,
  Kbd,
  type LayerNode,
  LayersTree,
  NumberField,
  OverlayNotice,
  Panel,
  PanelStack,
  PanelTabs,
  PinnedBlockStrip,
  ResizeHandle,
  SelectionBox,
  SelectField,
  SliderField,
  type SaveState,
  SaveStatus,
  Switch,
  StatusBar,
  ToastProvider,
  TokenChip,
  ToolRail,
  TopBar,
  UnitSelect,
  useToast,
  TypographyGroup,
  type TypographyValue,
  BorderGroup,
  type BorderValue,
  BackgroundGroup,
  type BackgroundValue,
  FlexContainerGroup,
  type FlexContainerValue,
  ShadowEditor,
  type ShadowItem,
  GradientEditor,
  type GradientConfig,
  AlignmentPad,
  type AlignmentValue,
} from '../index';
import { DesignSystemGallery } from './DesignSystemGallery';

/**
 * Dev-only gallery (B15 E1 step 5, E2 step 4, E3 step 5): every component and
 * state in light/dark and LTR/RTL, plus a shell demo with a dummy canvas.
 * Exported from `@nextcms/editor-ui/gallery`, never from the main entry.
 */

const SAVE_STATES: SaveState[] = [
  'saved',
  'saving',
  'unsaved',
  'offline',
  'conflict',
  'failed',
];

const DEMO_TREE: LayerNode[] = [
  {
    id: 'page',
    name: 'Page',
    type: 'root',
    children: [
      {
        id: 'hero',
        name: 'Hero section',
        type: 'section',
        children: [
          { id: 'heading', name: 'Heading', type: 'text' },
          { id: 'cta', name: 'Call to action', type: 'button', locked: true },
        ],
      },
      { id: 'features', name: 'Features', type: 'section', hidden: true },
      { id: 'footer', name: 'Footer', type: 'section' },
    ],
  },
];

function ShellDemo({
  theme,
  dir,
}: {
  theme: EditorTheme;
  dir: EditorDirection;
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [selectedId, setSelectedId] = useState('heading');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [activeTab, setActiveTab] = useState('settings');
  const [showFloating, setShowFloating] = useState(false);
  const [stackDepth, setStackDepth] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toolRailItems = [
    {
      id: 'settings',
      label: 'Settings / Inspector',
      icon: <Settings size={16} />,
      shortcut: 'Alt+1',
      active: activeTab === 'settings',
      onClick: () => setActiveTab('settings'),
    },
    {
      id: 'layers',
      label: 'Layers View',
      icon: <Layers size={16} />,
      shortcut: 'Alt+2',
      badge: 4,
      active: activeTab === 'layers',
      onClick: () => setActiveTab('layers'),
    },
    {
      id: 'elements',
      label: 'Elements Library',
      icon: <Boxes size={16} />,
      shortcut: 'Alt+3',
      active: activeTab === 'elements',
      onClick: () => setActiveTab('elements'),
    },
  ];

  const toolRailBottomItems = [
    {
      id: 'floating',
      label: showFloating ? 'Hide Floating Window' : 'Open Floating Window',
      icon: <Sparkles size={16} />,
      active: showFloating,
      onClick: () => setShowFloating(on => !on),
    },
  ];

  const panelTabs = [
    { id: 'settings', label: 'Settings', icon: <Settings size={13} /> },
    { id: 'layers', label: 'Layers', icon: <Layers size={13} />, badge: 4 },
    { id: 'elements', label: 'Elements', icon: <Boxes size={13} /> },
  ];

  const stackItems = [
    {
      id: 'root-settings',
      title: 'Inspector',
      subtitle: `Selected: ${selectedId}`,
      content: (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
              Block Properties
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStackDepth(1)}
            >
              Drill-down: Edit Typography Details →
            </Button>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--ne-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
              Save state
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SAVE_STATES.map(state => (
                <Button
                  key={state}
                  size="sm"
                  variant={state === saveState ? 'primary' : 'secondary'}
                  onClick={() => setSaveState(state)}
                >
                  {state}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sub-typography',
      title: 'Typography Details',
      subtitle: 'Font Metrics & Kerning',
      content: (
        <div className="flex flex-col gap-3 p-3 text-xs text-[var(--ne-text)]">
          <p className="text-[var(--ne-text-muted)]">
            Demonstrating deep navigation in <code>PanelStack</code> with breadcrumbs and back button.
          </p>
          <div className="p-2.5 rounded bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)]">
            <span className="font-semibold">Sub-panel content</span>
            <div className="mt-1 text-[11px] text-[var(--ne-text-muted)]">
              Click &quot;Back to Inspector&quot; in the header to return.
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStack = stackItems.slice(0, stackDepth + 1);

  const mainPanelContent = (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {activeTab === 'settings' && (
        <PanelStack
          items={currentStack}
          onPop={() => setStackDepth(0)}
          showHeader={false}
        />
      )}
      {activeTab === 'layers' && (
        <LayersTree
          nodes={DEMO_TREE}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRename={() => {}}
        />
      )}
      {activeTab === 'elements' && (
        <div className="p-4 flex flex-col gap-2 text-xs text-[var(--ne-text-muted)]">
          <span className="font-semibold text-[var(--ne-text)]">Add Elements</span>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {['Section', 'Container', 'Heading', 'Text', 'Button', 'Card'].map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setLastCommand(`Added ${name}`)}
                className="p-3 rounded-lg border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text)] font-medium text-left transition-colors"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const singlePanel = (
    <EditorPanel
      side={dockSide}
      onSideChange={setDockSide}
      title={activeTab === 'settings' && stackDepth > 0 ? 'Typography Details' : 'Editor Panel'}
      onBack={activeTab === 'settings' && stackDepth > 0 ? () => setStackDepth(0) : undefined}
      tabs={activeTab === 'settings' && stackDepth > 0 ? undefined : panelTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      defaultWidth={300}
      storageKey="ne-gallery-single-panel"
    >
      {mainPanelContent}
    </EditorPanel>
  );

  return (
    <div className="h-[580px] overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] relative">
      <EditorShell
        theme={theme}
        dir={dir}
        focusMode={focusMode}
        className="h-full"
        topBar={
          <TopBar
            title="Single Panel Layout Demo"
            saveStatus={saveState}
            canUndo
            onUndo={() => setLastCommand('Undo')}
            onRedo={() => setLastCommand('Redo')}
            device="desktop"
            onDeviceChange={device => setLastCommand(`Device: ${device}`)}
            zoom={100}
            onZoomChange={zoom => setLastCommand(`Zoom: ${zoom}%`)}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode(on => !on)}
            onOpenCommandPalette={() => setPaletteOpen(true)}
            onPublish={() => setLastCommand('Publish')}
          />
        }
        library={
          <div className="flex h-full">
            <ToolRail
              items={toolRailItems}
              bottomItems={toolRailBottomItems}
              activeId={activeTab}
            />
            {dockSide === 'left' && singlePanel}
          </div>
        }
        canvas={
          <div className="flex flex-col h-full flex-1">
            <PinnedBlockStrip
              blockName={selectedId}
              blockType={selectedId === 'heading' ? 'Heading 1' : 'Block'}
              parentName="Hero Section"
              onSelectParent={() => setSelectedId('hero')}
              isLocked={isLocked}
              onToggleLock={() => setIsLocked(l => !l)}
              isHidden={isHidden}
              onToggleHide={() => setIsHidden(h => !h)}
              onDuplicate={() => setLastCommand(`Duplicated ${selectedId}`)}
              onDelete={() => setLastCommand(`Deleted ${selectedId}`)}
            />

            <div className="flex flex-1 items-center justify-center p-8 bg-[var(--ne-bg)]">
              <div className="flex h-64 w-full max-w-xl flex-col items-center justify-center gap-2 rounded-[var(--ne-radius-lg)] border border-dashed border-[var(--ne-border-strong)] bg-[var(--ne-surface)] text-xs text-[var(--ne-text-muted)] shadow-sm">
                <span className="font-semibold text-sm text-[var(--ne-text)]">
                  Canvas Area
                </span>
                <span>
                  Active Block:{' '}
                  <strong className="text-[var(--ne-primary)]">{selectedId}</strong>
                  {isLocked && ' (Locked)'}
                  {isHidden && ' (Hidden)'}
                </span>
                <span>
                  Dock Position: <strong className="text-[var(--ne-text)]">{dockSide}</strong> (toggle in panel header)
                </span>
                {lastCommand && (
                  <span className="rounded bg-[var(--ne-surface-subtle)] px-2 py-1 text-[11px] font-mono text-[var(--ne-text)]">
                    {lastCommand}
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        inspector={dockSide === 'right' ? singlePanel : undefined}
        statusBar={
          <StatusBar
            left={
              <Breadcrumb
                items={[
                  { id: 'page', label: 'Page' },
                  { id: 'hero', label: 'Hero section' },
                  { id: selectedId, label: selectedId },
                ]}
                onSelect={setSelectedId}
              />
            }
            center={
              <>
                ToolRail switches views · Toggle Left/Right dock in header · <Kbd>⌘K</Kbd>
              </>
            }
          />
        }
        commandPalette={
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            items={[
              {
                id: 'pub',
                label: 'Publish changes',
                group: 'Actions',
                onSelect: () => {
                  setLastCommand('Publish');
                  setPaletteOpen(false);
                },
              },
              {
                id: 'undo',
                label: 'Undo',
                group: 'History',
                shortcut: '⌘Z',
                onSelect: () => {
                  setLastCommand('Undo');
                  setPaletteOpen(false);
                },
              },
              {
                id: 'redo',
                label: 'Redo',
                group: 'History',
                shortcut: '⌘⇧Z',
                onSelect: () => {
                  setLastCommand('Redo');
                  setPaletteOpen(false);
                },
              },
              {
                id: 'elem',
                label: 'Add element',
                group: 'Navigation',
                onSelect: () => {
                  setActiveTab('elements');
                  setPaletteOpen(false);
                },
              },
              {
                id: 'layers',
                label: 'Show layers',
                group: 'Navigation',
                onSelect: () => {
                  setActiveTab('layers');
                  setPaletteOpen(false);
                },
              },
              {
                id: 'settings',
                label: 'Show settings',
                group: 'Navigation',
                onSelect: () => {
                  setActiveTab('settings');
                  setPaletteOpen(false);
                },
              },
            ]}
          />
        }
      />

      {/* Floating Layers Window */}
      {showFloating && (
        <FloatingLayersWindow
          title="Floating Layers Tree"
          open={showFloating}
          onClose={() => setShowFloating(false)}
          onDock={side => {
            setDockSide(side);
            setActiveTab('layers');
            setShowFloating(false);
          }}
          defaultPosition={{ x: 70, y: 55 }}
        >
          <LayersTree
            nodes={DEMO_TREE}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRename={() => {}}
          />
        </FloatingLayersWindow>
      )}
    </div>
  );
}

/** E5: canvas overlays as the page builder draws them, on a dummy canvas. */
function CanvasOverlayDemo() {
  const [width, setWidth] = useState(60);
  const [notice, setNotice] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const block = {
    top: 70,
    left: 24,
    width: Math.round(4.2 * width),
    height: 70,
  };
  return (
    <div className="relative h-60 overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-white">
      <DropZone bounds={{ top: 16, left: 12, width: 440, height: 210 }} />
      <HoverBox
        bounds={{ top: 156, left: 24, width: 260, height: 50 }}
        label="Stats"
      />
      <SelectionBox bounds={block} showHandles={false} />
      <FloatingToolbar
        top={block.top}
        left={block.left}
        label="Hero"
        dragHandle={{
          label: 'Drag Hero',
          onPointerDown: () => setLast('Drag'),
        }}
        actions={['Move up', 'Duplicate', 'Delete'].map(label => ({
          id: label,
          label,
          icon: <span className="text-[11px]">{label[0]}</span>,
          danger: label === 'Delete',
          onClick: () => setLast(label),
        }))}
      />
      <ResizeHandle
        edge="right"
        rect={block}
        label="Width"
        value={width}
        min={20}
        max={100}
        valueText={`${width}%`}
        onKeyDown={event => {
          const step =
            event.key === 'ArrowRight' ? 5 : event.key === 'ArrowLeft' ? -5 : 0;
          if (!step) return;
          event.preventDefault();
          setWidth(w => Math.min(100, Math.max(20, w + step)));
        }}
      />
      <div className="absolute end-3 top-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setNotice(n => !n)}
        >
          {notice ? 'Hide' : 'Show'} blocked drop
        </Button>
      </div>
      {last && (
        <span className="absolute bottom-3 end-3 text-xs text-[var(--ne-text-muted)]">
          Last: {last}
        </span>
      )}
      {notice && (
        <OverlayNotice tone="danger">
          A Hero can’t go inside a Column
        </OverlayNotice>
      )}
    </div>
  );
}

/** E2b: overlays opened from code, collapsible groups, and toasts. */
function MotionDemo() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const { toast } = useToast();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div
        role="presentation"
        onContextMenu={event => {
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
        className="flex h-40 select-none flex-col items-center justify-center gap-1 rounded-[var(--ne-radius-lg)] border border-dashed border-[var(--ne-border-strong)] bg-[var(--ne-surface)] text-xs text-[var(--ne-text-muted)]"
      >
        <span>Right-click here for the context menu</span>
        {last && (
          <span className="ne-motion-enter text-[var(--ne-text)]">
            Chose: {last}
          </span>
        )}
        <ContextMenu
          open={!!menu}
          x={menu?.x ?? 0}
          y={menu?.y ?? 0}
          onClose={() => setMenu(null)}
          actions={['Duplicate', 'Copy style', 'Move up', 'Delete'].map(
            label => ({
              id: label,
              label,
              danger: label === 'Delete',
              onClick: () => setLast(label),
            })
          )}
        />
      </div>
      <div className="rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-3">
        <FieldGroup title="Spacing">
          <Input aria-label="Padding" placeholder="Padding" />
          <Input aria-label="Margin" placeholder="Margin" />
        </FieldGroup>
        <FieldGroup title="Behavior" defaultExpanded={false}>
          <Switch checked={snap} onChange={setSnap} label="Snap to grid" />
        </FieldGroup>
        <div className="py-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              toast({
                type: 'success',
                title: 'Saved',
                message: 'Your changes are live.',
              })
            }
          >
            Show a toast
          </Button>
        </div>
      </div>
    </div>
  );
}

/** E12b-c: Base inspector controls. */
function ControlsDemo() {
  const [fontSize, setFontSize] = useState(16);
  const [fontUnit, setFontUnit] = useState('px');
  const [opacity, setOpacity] = useState(85);
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [fontFamily, setFontFamily] = useState('inter');
  const [unit, setUnit] = useState('rem');
  const [tokenName, setTokenName] = useState<string | undefined>('spacing-md');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [padding, setPadding] = useState<DimensionsValue>({
    top: 16,
    right: 24,
    bottom: 16,
    left: 24,
    unit: 'px',
  });
  const [textColor, setTextColor] = useState('#2563EB');
  const [colorToken, setColorToken] = useState<string | undefined>('Primary');
  const [controlState, setControlState] = useState<ControlState>('normal');
  const [selectedPreset, setSelectedPreset] = useState('card');
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState('#2563EB');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-5">
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
          Numeric & Slider Controls
        </h3>
        <NumberField
          label="Font Size"
          value={fontSize}
          onChange={setFontSize}
          min={8}
          max={96}
          step={1}
          unit={fontUnit}
          units={['px', 'rem', '%']}
          onUnitChange={setFontUnit}
          info="Drag label to scrub. Shift is 10x, Alt is 0.1x."
          changed={fontSize !== 16}
          onReset={() => setFontSize(16)}
          tokenName={tokenName}
          onClearToken={() => setTokenName(undefined)}
          helperText="Affects heading and body scaling."
        />
        <SliderField
          label="Opacity"
          value={opacity}
          onChange={setOpacity}
          min={0}
          max={100}
          step={5}
          defaultValue={100}
          ticks={[0, 25, 50, 75, 100]}
          unit="%"
          changed={opacity !== 100}
          onReset={() => setOpacity(100)}
          helperText="Double-click slider to reset to 100%."
        />
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--ne-border)]">
          <span className="text-xs font-medium text-[var(--ne-text)]">
            Unit & Token Chips
          </span>
          <div className="flex items-center gap-2">
            <UnitSelect value={unit} onChange={setUnit} />
            <TokenChip
              tokenName={tokenName ?? 'spacing-sm'}
              onClear={() => setTokenName(t => (t ? undefined : 'spacing-md'))}
            />
          </div>
        </div>
        <DimensionsField
          label="Box Padding"
          value={padding}
          onChange={setPadding}
          info="Box padding with 3 link modes (all, axial, independent)"
          changed={padding.top !== 16 || padding.right !== 24}
          onReset={() =>
            setPadding({ top: 16, right: 24, bottom: 16, left: 24, unit: 'px' })
          }
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
          Choice & State Controls
        </h3>
        <ColorField
          label="Accent Color"
          value={textColor}
          onChange={(val, token) => {
            setTextColor(val);
            setColorToken(token);
          }}
          tokenName={colorToken}
          onClearToken={() => setColorToken(undefined)}
          info="Theme tokens & custom picker with WCAG contrast rating"
          changed={textColor !== '#2563EB'}
          onReset={() => {
            setTextColor('#2563EB');
            setColorToken('Primary');
          }}
        />
        <ChooseField
          label="Text Alignment"
          value={align}
          onChange={setAlign}
          options={[
            {
              value: 'left',
              label: 'Left',
              icon: <AlignLeft className="h-3.5 w-3.5" />,
            },
            {
              value: 'center',
              label: 'Center',
              icon: <AlignCenter className="h-3.5 w-3.5" />,
            },
            {
              value: 'right',
              label: 'Right',
              icon: <AlignRight className="h-3.5 w-3.5" />,
            },
            {
              value: 'justify',
              label: 'Justify',
              icon: <AlignJustify className="h-3.5 w-3.5" />,
            },
          ]}
          info="Horizontal text alignment."
          changed={align !== 'left'}
          onReset={() => setAlign('left')}
        />
        <SelectField
          label="Font Family"
          value={fontFamily}
          onChange={setFontFamily}
          options={[
            { value: 'inter', label: 'Inter (Sans-serif)' },
            { value: 'roboto', label: 'Roboto (Sans-serif)' },
            { value: 'mono', label: 'JetBrains Mono (Monospace)' },
            { value: 'serif', label: 'Merriweather (Serif)' },
          ]}
        />
        <ControlRow
          label="Responsive Padding"
          deviceState={{
            device,
            overridden: device !== 'desktop',
            inheritedFrom: device === 'mobile' ? 'tablet' : undefined,
            onCycle: () => {
              setDevice(d =>
                d === 'desktop' ? 'tablet' : d === 'tablet' ? 'mobile' : 'desktop'
              );
            },
          }}
          info="Cycle device override by clicking the device badge."
          helperText={`Current device: ${device} (click badge to toggle)`}
        >
          <div className="text-xs font-mono text-[var(--ne-text-muted)] py-1">
            {device === 'desktop'
              ? '32px (Base)'
              : device === 'tablet'
                ? '24px (Override)'
                : '16px (Inherited)'}
          </div>
        </ControlRow>

        <GroupControl
          title="Border & Outline"
          summary={`${borderWidth}px · ${borderColor}`}
          state={controlState}
          onStateChange={setControlState}
          changedCount={borderWidth !== 1 ? 1 : 0}
          onReset={() => setBorderWidth(1)}
          onCopy={() => {}}
          onPaste={() => {}}
          presets={[
            { id: 'none', label: 'None', active: selectedPreset === 'none' },
            { id: 'subtle', label: 'Subtle', active: selectedPreset === 'subtle' },
            { id: 'card', label: 'Card', active: selectedPreset === 'card' },
            { id: 'elevated', label: 'Elevated', active: selectedPreset === 'elevated' },
          ]}
          onSelectPreset={p => setSelectedPreset(p.id)}
        >
          <NumberField
            label="Border Width"
            value={borderWidth}
            onChange={setBorderWidth}
            min={0}
            max={20}
            unit="px"
          />
          <ColorField
            label="Border Color"
            value={borderColor}
            onChange={setBorderColor}
          />
        </GroupControl>
      </div>
    </div>
  );
}

function GroupControlsDemo() {
  const [typography, setTypography] = useState<TypographyValue>({
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 1.4,
    letterSpacing: 0,
    textAlign: 'left',
    color: '#0f172a',
  });

  const [border, setBorder] = useState<BorderValue>({
    style: 'solid',
    width: 2,
    color: '#3b82f6',
    radius: 8,
  });

  const [background, setBackground] = useState<BackgroundValue>({
    type: 'gradient',
    gradient: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#06b6d4', offset: 0 },
        { color: '#3b82f6', offset: 100 },
      ],
    },
  });

  const [shadows, setShadows] = useState<ShadowItem[]>([
    {
      x: 0,
      y: 10,
      blur: 20,
      spread: -4,
      color: 'rgba(0, 0, 0, 0.12)',
      inset: false,
    },
  ]);

  const [flex, setFlex] = useState<FlexContainerValue>({
    display: 'flex',
    direction: 'row',
    wrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex flex-col gap-4">
        <TypographyGroup
          value={typography}
          onChange={setTypography}
          defaultOpen={true}
        />
        <BorderGroup
          value={border}
          onChange={setBorder}
          defaultOpen={false}
        />
        <BackgroundGroup
          value={background}
          onChange={setBackground}
          defaultOpen={false}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-4 rounded-lg border border-[var(--ne-border)] bg-[var(--ne-surface)] flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            Shadow Editor & Preview
          </h3>
          <ShadowEditor
            type="box"
            value={shadows}
            onChange={setShadows}
          />
        </div>

        <FlexContainerGroup
          value={flex}
          onChange={setFlex}
          defaultOpen={true}
        />
      </div>
    </div>
  );
}

export const EditorUIGallery: React.FC = () => {
  const [theme, setTheme] = useState<EditorTheme>('light');
  const [dir, setDir] = useState<EditorDirection>('ltr');
  const [showShell, setShowShell] = useState(true);

  return (
    <EditorUIProvider
      theme={theme}
      dir={dir}
      className="ne-editor-root min-h-screen"
    >
      <ToastProvider>
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--ne-border)] bg-[var(--ne-surface)] px-4 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            editor-ui gallery
            <SaveStatus status="saved" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? 'Dark' : 'Light'} theme
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Languages className="h-3.5 w-3.5" />}
              onClick={() => setDir(d => (d === 'ltr' ? 'rtl' : 'ltr'))}
            >
              {dir === 'ltr' ? 'RTL' : 'LTR'}
            </Button>
            <IconButton
              size="sm"
              tooltip={showShell ? 'Hide shell demo' : 'Show shell demo'}
              onClick={() => setShowShell(on => !on)}
            >
              {showShell ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </IconButton>
          </div>
        </div>

        {showShell && (
          <section className="mx-auto w-full max-w-6xl space-y-3 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
              0. Editor shell (E3)
            </h2>
            <ShellDemo theme={theme} dir={dir} />
          </section>
        )}

        <section className="mx-auto w-full max-w-6xl space-y-3 px-6 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            0b. Motion and overlays (E2b)
          </h2>
          <MotionDemo />
        </section>

        <section className="mx-auto w-full max-w-6xl space-y-3 px-6 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            0c. Canvas overlays (E5)
          </h2>
          <p className="text-xs text-[var(--ne-text-muted)]">
            Focus the Width handle and use ← → to resize.
          </p>
          <CanvasOverlayDemo />
        </section>

        <section className="mx-auto w-full max-w-6xl space-y-3 px-6 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            0d. Base Controls (E12b–c)
          </h2>
          <p className="text-xs text-[var(--ne-text-muted)]">
            Generic inspector fields: scrubbable numeric inputs, range slider with ticks, segmented choice, and select.
          </p>
          <ControlsDemo />
        </section>

        <section className="mx-auto w-full max-w-6xl space-y-3 px-6 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            0e. Group Controls & Editors (E12f/g)
          </h2>
          <p className="text-xs text-[var(--ne-text-muted)]">
            Specialized group controls: Typography, Border, Background with GradientEditor, Box & Text Shadow, and Flex Container with AlignmentPad.
          </p>
          <GroupControlsDemo />
        </section>

        <DesignSystemGallery
          isDark={theme === 'dark'}
          onToggleTheme={() =>
            setTheme(t => (t === 'light' ? 'dark' : 'light'))
          }
        />
      </ToastProvider>
    </EditorUIProvider>
  );
};
