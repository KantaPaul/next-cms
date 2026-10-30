import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  NumberInput,
  Select,
  Switch,
  Tabs,
  Tooltip,
  Popover,
  Dialog,
  Menu,
  Skeleton,
  Kbd,
  useToast,
  SaveStatus,
  SaveState,
  ConflictDialog,
  EmptyState,
  ErrorState,
  StaleNotice,
  BoxModelWidget,
  BoxSpacing,
  TokenPicker,
  FieldRow,
  ChangedDot,
  ResetButton,
  DeviceValueBadge,
  DropLine,
  SelectionBox,
  HoverBox,
  FloatingToolbar,
} from '../index';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Copy,
  LayoutTemplate,
  Layers,
  Settings,
  AlertTriangle,
  Lock,
  Columns3,
  Moon,
  Sun,
  ShieldAlert,
  ArrowRight,
  Check,
} from 'lucide-react';

export const DesignSystemGallery: React.FC<{ isDark: boolean; onToggleTheme: () => void }> = ({
  isDark,
  onToggleTheme,
}) => {
  const { toast } = useToast();

  // Primitive states
  const [inputValue, setInputValue] = useState('Standard Input text');
  const [numValue, setNumValue] = useState(24);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [activeTab, setActiveTab] = useState('one');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [colorToken, setColorToken] = useState('#2563EB');
  const [spacingToken, setSpacingToken] = useState('16px');

  // Box model state
  const [margin, setMargin] = useState<BoxSpacing>({ top: 12, right: 12, bottom: 12, left: 12 });
  const [padding, setPadding] = useState<BoxSpacing>({ top: 16, right: 24, bottom: 16, left: 24 });

  // Developer state simulator
  const [simulatedSaveState, setSimulatedSaveState] = useState<SaveState>('saved');
  const [simulatedMultiSelect, setSimulatedMultiSelect] = useState(['block_1', 'block_2']);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-10 font-sans pb-24">
      {/* Gallery Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--ne-border)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]">
              @nextcms/editor-ui v1.0
            </span>
            <span className="text-xs text-[var(--ne-text-muted)]">Design System Specification</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--ne-text)] mt-1.5 tracking-tight">
            Shared Editor Component Gallery
          </h1>
          <p className="text-xs md:text-sm text-[var(--ne-text-muted)] mt-1">
            Compact 28px density tokens, primitives, overlays, and complete feedback states in Light & Dark.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            onClick={onToggleTheme}
          >
            {isDark ? 'Switch to Light' : 'Switch to Dark'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => toast({ title: 'Design System', message: 'Gallery interactive tokens active.' })}
          >
            Trigger Toast
          </Button>
        </div>
      </div>

      {/* SECTION 1: DESIGN TOKENS (LIGHT & DARK SPEC) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            1. Core Design Tokens (--ne-*)
          </h2>
          <span className="text-xs text-[var(--ne-text-muted)]">Contrast ratio &ge; 4.5:1</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { token: '--ne-bg', label: 'Background', hex: isDark ? '#0B1220' : '#F8FAFC' },
            { token: '--ne-surface', label: 'Surface Card', hex: isDark ? '#111A2E' : '#FFFFFF' },
            { token: '--ne-border', label: 'Border Divider', hex: isDark ? '#24314D' : '#E2E8F0' },
            { token: '--ne-text', label: 'Primary Text', hex: isDark ? '#E5EAF3' : '#0F172A' },
            { token: '--ne-text-muted', label: 'Muted Text', hex: isDark ? '#94A3B8' : '#64748B' },
            { token: '--ne-primary', label: 'Primary Brand', hex: isDark ? '#60A5FA' : '#2563EB' },
            { token: '--ne-primary-soft', label: 'Primary Soft', hex: isDark ? '#1E2A4A' : '#DBEAFE' },
            { token: '--ne-success', label: 'Success State', hex: isDark ? '#34D399' : '#059669' },
            { token: '--ne-warning', label: 'Warning / Locked', hex: isDark ? '#FBBF24' : '#D97706' },
            { token: '--ne-danger', label: 'Error / Danger', hex: isDark ? '#F87171' : '#DC2626' },
          ].map((item) => (
            <div
              key={item.token}
              className="p-3 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] shadow-2xs space-y-2"
            >
              <div
                className="w-full h-8 rounded-[var(--ne-radius-sm)] border border-black/10 flex items-center justify-center font-mono text-[10px]"
                style={{ backgroundColor: `var(${item.token})` }}
              />
              <div>
                <div className="text-xs font-semibold text-[var(--ne-text)]">{item.label}</div>
                <div className="text-[10px] font-mono text-[var(--ne-text-muted)] truncate">{item.token}</div>
                <div className="text-[10px] font-mono text-[var(--ne-text-subtle)]">{item.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: COMPACT PRIMITIVES (28px standard) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
          2. Compact UI Primitives (28px Controls, 32px Rows)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buttons & Icon Buttons */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <h3 className="text-xs font-semibold text-[var(--ne-text)]">Buttons & Icon Buttons</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm">Primary SM (24px)</Button>
              <Button variant="primary" size="md">Primary MD (28px)</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="ghost" size="md">Ghost</Button>
              <Button variant="danger" size="md">Danger</Button>
              <Button variant="secondary" size="md" disabled>Disabled</Button>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--ne-border)]">
              <IconButton tooltip="Add block"><Plus className="w-3.5 h-3.5" /></IconButton>
              <IconButton variant="primary" active tooltip="Active state"><Settings className="w-3.5 h-3.5" /></IconButton>
              <IconButton variant="secondary" tooltip="Secondary icon"><Layers className="w-3.5 h-3.5" /></IconButton>
              <IconButton variant="danger" tooltip="Delete icon"><Trash2 className="w-3.5 h-3.5" /></IconButton>
              <IconButton disabled tooltip="Disabled"><Copy className="w-3.5 h-3.5" /></IconButton>
              <span className="text-xs text-[var(--ne-text-muted)] ml-2">Compact square 28px</span>
            </div>
          </div>

          {/* Inputs & Drag-Scrub NumberInput */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[var(--ne-text)]">Inputs & Scrubbable NumberInput</h3>
              <span className="text-[10px] text-[var(--ne-primary)] font-mono">Drag scrub label &harr;</span>
            </div>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Text input..."
              leftElement={<Search className="w-3.5 h-3.5" />}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="SIZE"
                value={numValue}
                onChange={setNumValue}
                min={8}
                max={96}
                unit="px"
              />
              <Select
                value="desktop"
                onChange={() => {}}
                options={[
                  { label: 'Desktop (1280px)', value: 'desktop' },
                  { label: 'Tablet (768px)', value: 'tablet' },
                  { label: 'Mobile (390px)', value: 'mobile' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[var(--ne-border)]">
              <Switch checked={switchChecked} onChange={setSwitchChecked} label="Auto-sync responsive values" />
              <div className="flex items-center gap-1">
                <Kbd>⌘</Kbd><Kbd>K</Kbd>
              </div>
            </div>
          </div>

          {/* Tabs & Tooltips & Popovers */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <h3 className="text-xs font-semibold text-[var(--ne-text)]">Tabs, Popover & Dropdown Menu</h3>
            <Tabs
              items={[
                { id: 'one', label: 'Layout', badge: 3 },
                { id: 'two', label: 'Typography' },
                { id: 'three', label: 'Actions' },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
              variant="segmented"
            />
            <div className="flex items-center gap-2 pt-1">
              <Tooltip content="Tooltip helper text" shortcut="Alt+T">
                <Button size="sm">Hover for Tooltip</Button>
              </Tooltip>

              <Popover
                trigger={<Button size="sm">Open Popover</Button>}
                content={
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-[var(--ne-text)]">Popover Container</div>
                    <p className="text-[11px] text-[var(--ne-text-muted)]">Arbitrary floating content with outside click dismissal.</p>
                  </div>
                }
              />

              <Menu
                trigger={<Button size="sm">Actions Menu &darr;</Button>}
                items={[
                  { id: 'dup', label: 'Duplicate Item', shortcut: '⌘D', icon: <Copy className="w-3 h-3" /> },
                  { id: 'lock', label: 'Lock Layer', icon: <Lock className="w-3 h-3" /> },
                  { id: 'div', label: '', divider: true },
                  { id: 'del', label: 'Delete Item', shortcut: 'Del', danger: true, icon: <Trash2 className="w-3 h-3" /> },
                ]}
              />

              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Open Dialog
              </Button>
            </div>
          </div>

          {/* Token Pickers & Box Model Widget */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <h3 className="text-xs font-semibold text-[var(--ne-text)]">Theme Token Pickers</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--ne-text-muted)] block mb-1">Color Token</label>
                <TokenPicker value={colorToken} onChange={setColorToken} type="color" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-[var(--ne-text-muted)] block mb-1">Spacing Token</label>
                <TokenPicker value={spacingToken} onChange={setSpacingToken} type="spacing" />
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--ne-border)]">
              <label className="text-[11px] text-[var(--ne-text-muted)] block mb-1">Interactive Box Model Widget</label>
              <BoxModelWidget
                margin={margin}
                padding={padding}
                onMarginChange={setMargin}
                onPaddingChange={setPadding}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ALL 10 MANDATORY STATES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ne-text-muted)]">
            3. Mandatory System States
          </h2>
          <span className="text-xs text-[var(--ne-text-muted)]">Interactive testing surface</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* State 1: Loading Skeleton */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-2">
            <div className="text-xs font-semibold text-[var(--ne-text)] flex items-center justify-between">
              <span>State 1: Loading Skeleton</span>
              <span className="text-[10px] text-slate-400 font-mono">No Spinners</span>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton height="20px" width="70%" />
              <Skeleton height="14px" width="100%" />
              <Skeleton height="14px" width="90%" />
              <div className="flex gap-2 pt-2">
                <Skeleton height="28px" width="80px" />
                <Skeleton height="28px" width="80px" />
              </div>
            </div>
          </div>

          {/* State 2: Empty Container */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-2">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 2: Empty State</div>
            <EmptyState
              title="No Blocks in Container"
              description="Drop blocks or pick a preset layout."
              presets={[
                { id: '1', label: '2-Col Split', onSelect: () => toast({ message: 'Applied 2-Col preset' }) },
                { id: '2', label: 'Hero Grid', onSelect: () => toast({ message: 'Applied Hero preset' }) },
              ]}
              onAdd={() => toast({ message: 'Add item requested' })}
            />
          </div>

          {/* State 3: Error State with Retry */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-2">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 3: Error with Retry</div>
            <ErrorState
              title="Widget Data Unavailable"
              message="The requested metrics failed to synchronize. Click below to reconnect."
              onRetry={() => toast({ title: 'Retrying', message: 'Reconnected successfully.' })}
            />
          </div>

          {/* State 4: Stale Notice */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 4: Stale Notice</div>
            <p className="text-xs text-[var(--ne-text-muted)]">Subtle timestamp indicating cached or out-of-date background calculations.</p>
            <div>
              <StaleNotice
                lastUpdatedText="Updated 12 min ago"
                onRefresh={() => toast({ message: 'Refreshed latest data' })}
              />
            </div>
          </div>

          {/* State 5: Save Status Variations */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 5: Save Status Cycle</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['saved', 'saving', 'unsaved', 'offline', 'conflict', 'failed'] as SaveState[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSimulatedSaveState(st)}
                  className={`px-2 py-0.5 rounded text-[11px] capitalize cursor-pointer border ${
                    simulatedSaveState === st
                      ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] border-[var(--ne-primary)]'
                      : 'border-[var(--ne-border)] text-[var(--ne-text-muted)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="p-2 border border-[var(--ne-border)] rounded-[var(--ne-radius-sm)] bg-[var(--ne-surface-subtle)]">
              <SaveStatus
                status={simulatedSaveState}
                lastSavedAt="10:14 PM"
                onRetry={() => toast({ message: 'Retrying save...' })}
                onResolveConflict={() => setConflictOpen(true)}
              />
            </div>
          </div>

          {/* State 6: Conflict Resolution Dialog */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 6: Conflict Resolution</div>
            <p className="text-xs text-[var(--ne-text-muted)]">Triggerable modal for multi-tab or server version concurrency collisions.</p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
              onClick={() => setConflictOpen(true)}
            >
              Open Conflict Dialog
            </Button>
          </div>

          {/* State 7: Blocked Drop Notice */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 7: Blocked Drop Line</div>
            <p className="text-xs text-[var(--ne-text-muted)]">Visual constraint feedback preventing invalid block nestings.</p>
            <div className="relative h-16 border border-dashed border-[var(--ne-border)] rounded flex items-center justify-center p-4">
              <DropLine
                position={{ top: 28, left: 20, length: 240 }}
                allowed={false}
                tooltip="Columns can't go inside Columns"
              />
            </div>
          </div>

          {/* State 8: Locked State */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 8: Locked Component</div>
            <div className="relative p-3 rounded border-2 border-[var(--ne-locked)] bg-amber-50/20 dark:bg-amber-950/20">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--ne-warning)]">
                <Lock className="w-3 h-3" />
                <span>Hero Template Block (Locked)</span>
              </div>
              <p className="text-[11px] text-[var(--ne-text-muted)] mt-1">
                Field controls and canvas dragging are disabled until unlocked by admin.
              </p>
            </div>
          </div>

          {/* State 9: Multi-Select Group Actions */}
          <div className="p-4 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] space-y-3">
            <div className="text-xs font-semibold text-[var(--ne-text)]">State 9: Multi-Select Group</div>
            <p className="text-xs text-[var(--ne-text-muted)]">2 blocks selected on canvas simultaneously:</p>
            <div className="flex items-center gap-1.5 p-1 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)]">
              <Button size="sm" leftIcon={<Copy className="w-3 h-3" />}>Duplicate Both</Button>
              <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-3 h-3" />}>Delete</Button>
              <Button size="sm" variant="ghost">Wrap in Section</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Dialog Modals for preview */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Interactive Dialog Primitive"
        description="A reusable modal accessible with Esc key handling and focus traps."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>Confirm Action</Button>
          </>
        }
      >
        <p className="text-xs text-[var(--ne-text-muted)]">
          This dialog is part of @nextcms/editor-ui primitives and accepts arbitrary slot contents.
        </p>
      </Dialog>

      <ConflictDialog
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        onKeepMine={() => {
          toast({ title: 'Conflict Resolved', message: 'Kept current local changes.' });
          setConflictOpen(false);
        }}
        onUseSaved={() => {
          toast({ title: 'Conflict Resolved', message: 'Restored saved remote version.' });
          setConflictOpen(false);
        }}
      />
    </div>
  );
};
