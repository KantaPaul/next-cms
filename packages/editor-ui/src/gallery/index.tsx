import { Languages, Maximize2, Minimize2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  CommandPalette,
  ContextMenu,
  type EditorDirection,
  EditorShell,
  type EditorTheme,
  EditorUIProvider,
  FieldGroup,
  Input,
  IconButton,
  Kbd,
  type LayerNode,
  LayersTree,
  Panel,
  type SaveState,
  SaveStatus,
  Switch,
  StatusBar,
  ToastProvider,
  TopBar,
  useToast,
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

  return (
    <div className="h-[560px] overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)]">
      <EditorShell
        theme={theme}
        dir={dir}
        focusMode={focusMode}
        className="h-full"
        topBar={
          <TopBar
            title="Shell demo"
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
          <Panel
            side="left"
            title="Layers"
            defaultWidth={260}
            storageKey="ne-gallery-left"
          >
            <LayersTree
              nodes={DEMO_TREE}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRename={() => {}}
            />
          </Panel>
        }
        canvas={
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="flex h-64 w-full max-w-xl flex-col items-center justify-center gap-2 rounded-[var(--ne-radius-lg)] border border-dashed border-[var(--ne-border-strong)] bg-[var(--ne-surface)] text-xs text-[var(--ne-text-muted)]">
              <span>Dummy canvas</span>
              <span>
                Selected:{' '}
                <strong className="text-[var(--ne-text)]">{selectedId}</strong>
              </span>
              {lastCommand && <span>Last action: {lastCommand}</span>}
            </div>
          </div>
        }
        inspector={
          <Panel
            side="right"
            title="Inspector"
            defaultWidth={300}
            storageKey="ne-gallery-right"
          >
            <div className="flex flex-col gap-2 p-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--ne-text-muted)]">
                Save state
              </span>
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
          </Panel>
        }
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
                Resize panel: focus its edge, then <Kbd>←</Kbd> <Kbd>→</Kbd> ·
                Palette: <Kbd>⌘K</Kbd>
              </>
            }
            right={<span>100%</span>}
          />
        }
        commandPalette={
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            items={[
              {
                id: 'undo',
                label: 'Undo',
                group: 'Edit',
                shortcut: '⌘Z',
                onSelect: () => setLastCommand('Undo'),
              },
              {
                id: 'redo',
                label: 'Redo',
                group: 'Edit',
                shortcut: '⌘⇧Z',
                onSelect: () => setLastCommand('Redo'),
              },
              {
                id: 'focus',
                label: 'Toggle focus mode',
                group: 'View',
                onSelect: () => setFocusMode(on => !on),
              },
              ...SAVE_STATES.map(state => ({
                id: `save-${state}`,
                label: `Show save state: ${state}`,
                group: 'Simulate',
                onSelect: () => setSaveState(state),
              })),
            ]}
          />
        }
      />
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
