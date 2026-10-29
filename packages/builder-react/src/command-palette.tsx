/**
 * Command palette (R712 / UXE-02): Cmd/Ctrl+K opens a searchable list of
 * every command the editor offers — insert a block, jump to a layer, run an
 * editor action. Hosts add their own commands (open another page, search
 * settings) through `extraCommands`.
 */

import type { NodeId } from '@nextcms/builder-core';
import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { BlockGroup } from './block-list';
import { useEditor, useEditorStore } from './context';

export type Command = {
  id: string;
  /** Group heading the command is listed under. */
  section: string;
  label: string;
  /** Extra text matched by search but shown smaller, such as a block's category. */
  hint?: string;
  icon?: string;
  shortcut?: string;
  run: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: BlockGroup[];
  /** Host commands appended after the built-in ones (open another page, search settings, …). */
  extraCommands?: Command[];
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.4)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '12vh',
  zIndex: 2147483647,
};

const panelStyle: CSSProperties = {
  width: 'min(560px, 90vw)',
  maxHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#1c1c1f',
  color: '#fff',
  borderRadius: 10,
  boxShadow: '0 16px 48px rgba(0,0,0,.4)',
  overflow: 'hidden',
  font: '13px/1.4 system-ui, sans-serif',
};

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function CommandPalette({
  open,
  onOpenChange,
  groups,
  extraCommands = [],
}: CommandPaletteProps) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the dialog mounts so the input actually receives it.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const insertCommands: Command[] = groups.flatMap(group =>
      group.types.map(type => ({
        id: `insert:${type}`,
        section: 'Insert a block',
        label: store.schemas[type]?.label ?? type,
        hint: group.title,
        icon: '＋',
        run: () => store.insertBlock(type),
      }))
    );
    const nodeCommands: Command[] = Object.values(doc.nodes).map(node => ({
      id: `jump:${node.id}`,
      section: 'Jump to a block',
      label: node.meta?.name || store.schemas[node.type]?.label || node.type,
      hint: node.type,
      icon: '◎',
      run: () => store.select(node.id as NodeId),
    }));
    const actionCommands: Command[] = [
      {
        id: 'undo',
        section: 'Editor',
        label: 'Undo',
        shortcut: 'Mod+Z',
        icon: '↶',
        run: () => store.undo(),
      },
      {
        id: 'redo',
        section: 'Editor',
        label: 'Redo',
        shortcut: 'Mod+Shift+Z',
        icon: '↷',
        run: () => store.redo(),
      },
      {
        id: 'duplicate',
        section: 'Editor',
        label: 'Duplicate selection',
        shortcut: 'Mod+D',
        icon: '⧉',
        run: () => store.duplicate(),
      },
      {
        id: 'delete',
        section: 'Editor',
        label: 'Delete selection',
        shortcut: 'Del',
        icon: '✕',
        run: () => store.remove(),
      },
    ];
    return [
      ...actionCommands,
      ...insertCommands,
      ...nodeCommands,
      ...extraCommands,
    ];
  }, [groups, doc, store, extraCommands]);

  const filtered = useMemo(
    () =>
      commands.filter(c =>
        fuzzyMatch(query, `${c.label} ${c.hint ?? ''} ${c.section}`)
      ),
    [commands, query]
  );

  useEffect(() => setActive(0), [filtered.length === 0]);

  if (!open) return null;

  const run = (command: Command | undefined) => {
    if (!command) return;
    command.run();
    onOpenChange(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(i => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(filtered[active]);
    }
  };

  let lastSection = '';

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay close is a pointer-only convenience; Escape is the keyboard path
    // biome-ignore lint/a11y/noStaticElementInteractions: same as above
    <div style={overlayStyle} onClick={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-label="Command palette"
        style={panelStyle}
        onClick={event => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Insert a block, jump to a layer, run a command…"
          aria-label="Search commands"
          style={{
            all: 'unset',
            boxSizing: 'border-box',
            width: '100%',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,.1)',
            font: '14px/1.4 system-ui, sans-serif',
          }}
        />
        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          style={{ overflowY: 'auto', padding: 6 }}
        >
          {filtered.length === 0 && (
            <p style={{ padding: '10px 10px', opacity: 0.6 }}>No matches.</p>
          )}
          {filtered.slice(0, 80).map((command, index) => {
            const showHeading = command.section !== lastSection;
            lastSection = command.section;
            return (
              <div key={command.id}>
                {showHeading && (
                  <p
                    style={{
                      margin: '8px 10px 4px',
                      font: '600 11px/1.4 system-ui, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      opacity: 0.5,
                    }}
                  >
                    {command.section}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(command)}
                  style={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background:
                      index === active ? 'rgba(79,70,229,.3)' : 'transparent',
                  }}
                >
                  <span
                    aria-hidden
                    style={{ width: 18, textAlign: 'center', opacity: 0.7 }}
                  >
                    {command.icon ?? '›'}
                  </span>
                  <span style={{ flex: 1 }}>{command.label}</span>
                  {command.hint && (
                    <span style={{ opacity: 0.5, fontSize: 11 }}>
                      {command.hint}
                    </span>
                  )}
                  {command.shortcut && (
                    <span
                      style={{
                        opacity: 0.5,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}
                    >
                      {command.shortcut}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
