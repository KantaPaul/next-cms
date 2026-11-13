/**
 * Classes manager (KRK-04): every style class and tag style of the site.
 * Search and sort them, see how many elements use each, open one to edit its
 * styles, rename, duplicate or delete it, see where it is used, and clean up
 * classes nothing uses.
 *
 * Counts come from one site-wide scan (`usageCounts`), loaded when the view
 * opens; where a class is used is fetched when it is opened. Classes used on
 * the open page count as used even before the page is saved.
 */

import {
  type BreakpointConfig,
  CLASS_STATE_OPTIONS,
  DEVICE_LABELS,
  type Device,
  fallbackFor,
  isValidState,
  parseVariantKey,
  type StyleClass,
} from '@nextcms/builder-core';
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { ClassStyleEditor } from './class-styles-panel';
import { useEditor } from './context';
import {
  getStyleClassStore,
  slugifyClassName,
  type StyleClassStore,
  type StyleClassUsageHit,
  uniqueClassName,
  useStyleClasses,
} from './style-classes';

/* ---------- Pure helpers (exported for tests) ---------- */

export type ClassSort = 'name' | 'usage' | 'recent' | 'unused';

/** Display name: `.card`, `.button.is-large` for a combo, `<h1>` for a tag style. */
export function classLabel(cls: StyleClass, classes: Record<string, StyleClass>): string {
  if (cls.kind === 'tag') return `<${cls.tag ?? cls.name}>`;
  const base = cls.comboOf ? classes[cls.comboOf] : undefined;
  return base ? `.${base.name}.${cls.name}` : `.${cls.name}`;
}

/** Search by name, then sort. Unknown counts (null) sort as unused but are never called unused. */
export function sortAndFilterClasses(
  list: StyleClass[],
  query: string,
  sort: ClassSort,
  counts: Record<string, number> | null,
  classes: Record<string, StyleClass>
): StyleClass[] {
  const q = query.trim().toLowerCase().replace(/^[.<]|>$/g, '');
  const count = (cls: StyleClass) => counts?.[cls.id] ?? 0;
  const filtered = q ? list.filter(cls => classLabel(cls, classes).toLowerCase().includes(q)) : list.slice();
  const byName = (a: StyleClass, b: StyleClass) => classLabel(a, classes).localeCompare(classLabel(b, classes));
  const compare: Record<ClassSort, (a: StyleClass, b: StyleClass) => number> = {
    name: byName,
    usage: (a, b) => count(b) - count(a) || byName(a, b),
    recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || byName(a, b),
    unused: (a, b) => count(a) - count(b) || byName(a, b),
  };
  return filtered.sort(compare[sort]);
}

/**
 * Classes nothing uses: no saved element (counts), not on the open page, and
 * not the base of a combo that is used (deleting a base deletes its combos).
 * Empty when counts are unknown.
 */
export function unusedClasses(
  classes: Record<string, StyleClass>,
  counts: Record<string, number> | null,
  usedOnPage: Set<string>
): StyleClass[] {
  if (!counts) return [];
  const used = (id: string) => (counts[id] ?? 0) > 0 || usedOnPage.has(id);
  const basesInUse = new Set(
    Object.values(classes)
      .filter(cls => cls.comboOf && used(cls.id))
      .map(cls => cls.comboOf as string)
  );
  return Object.values(classes).filter(cls => cls.kind === 'class' && !used(cls.id) && !basesInUse.has(cls.id));
}

export type VariantRow = { key: string; device: string; state: string | null; declarations: [string, string][] };

/** A class's variants for reading: breakpoints in cascade order, state-less first. */
export function variantRows(cls: StyleClass, breakpoints: BreakpointConfig): VariantRow[] {
  const order = [...fallbackFor('mobile', breakpoints)].reverse();
  const rank = (device: string) => {
    if (device === 'widescreen') return -1;
    const index = order.indexOf(device as Device);
    return index === -1 ? 99 : index;
  };
  return Object.entries(cls.variants)
    .map(([key, decls]) => {
      const { device, state } = parseVariantKey(key);
      return {
        key,
        device,
        state,
        declarations: Object.entries(decls).sort(([a], [b]) => a.localeCompare(b)),
      };
    })
    .filter(row => row.declarations.length > 0)
    .sort((a, b) => rank(a.device) - rank(b.device) || (a.state ?? '').localeCompare(b.state ?? ''));
}

/** Class ids used in the open document. */
function usedInDoc(nodes: Record<string, { props: Record<string, unknown> }>): Set<string> {
  const used = new Set<string>();
  for (const node of Object.values(nodes)) {
    if (!Array.isArray(node.props.classIds)) continue;
    for (const id of node.props.classIds) if (typeof id === 'string') used.add(id);
  }
  return used;
}

/* ---------- Styles ---------- */

const ui = {
  font: 'var(--ne-font-ui, system-ui, sans-serif)',
  mono: 'var(--ne-font-mono, ui-monospace, monospace)',
  muted: 'var(--ne-ink-500, #6b7280)',
  border: 'var(--ne-border, rgba(127,127,127,.3))',
  accent: 'var(--ne-cobalt-500, #3b82f6)',
  danger: 'var(--ne-danger, #dc2626)',
  radius: 'var(--ne-radius-sm, 4px)',
};
const heading: CSSProperties = { font: `600 11px/1.4 ${ui.font}`, color: ui.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 };
const field: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 28,
  padding: '0 8px',
  borderRadius: ui.radius,
  border: `1px solid ${ui.border}`,
  background: 'transparent',
  color: 'inherit',
  font: `13px/1 ${ui.font}`,
};
const button: CSSProperties = {
  padding: '3px 8px',
  borderRadius: ui.radius,
  border: `1px solid ${ui.border}`,
  background: 'transparent',
  color: 'inherit',
  font: `12px/1.5 ${ui.font}`,
  cursor: 'pointer',
};
const dangerButton: CSSProperties = { ...button, color: ui.danger, borderColor: ui.danger };

const formatCount = (count: number | undefined, known: boolean) =>
  !known ? '—' : count ? `${count} element${count === 1 ? '' : 's'}` : 'unused';

/* ---------- Detail ---------- */

function ClassDetail({
  cls,
  classes,
  count,
  store,
  hrefFor,
  onBack,
  onChanged,
}: {
  cls: StyleClass;
  classes: Record<string, StyleClass>;
  count: number | undefined;
  store: StyleClassStore;
  hrefFor?: (hit: StyleClassUsageHit) => string | undefined;
  onBack: () => void;
  onChanged: () => void;
}) {
  const device = useEditor(state => state.device);
  const breakpoints = useEditor(state => state.breakpoints);
  const [state, setState] = useState<string | null>(null);
  const [name, setName] = useState(cls.name);
  const [hits, setHits] = useState<StyleClassUsageHit[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const rows = variantRows(cls, breakpoints);
  const slug = slugifyClassName(name);
  const taken = Object.values(classes).some(other => other.id !== cls.id && other.name === slug);
  const elements = hits?.reduce((sum, hit) => sum + hit.nodeIds.length, 0) ?? count ?? 0;
  const combos = Object.values(classes).filter(other => other.comboOf === cls.id);

  useEffect(() => {
    let live = true;
    store
      .usage(cls.id)
      .then(result => live && setHits(result))
      .catch(() => live && setHits([]));
    return () => {
      live = false;
    };
  }, [cls.id, store]);

  const rename = () => {
    if (!slug || slug === cls.name || taken) return;
    store.updateClass(cls.id, { name: slug });
    onChanged();
  };
  const duplicate = async () => {
    setBusy(true);
    try {
      const copy = uniqueClassName(`${cls.kind === 'tag' ? (cls.tag ?? cls.name) : cls.name}-copy`, Object.values(classes).map(c => c.name));
      await store.createClass({ name: copy, kind: 'class', comboOf: cls.kind === 'class' ? cls.comboOf : undefined, variants: cls.variants });
      onChanged();
    } catch {
      /* shown through the store's error */
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await store.removeClass(cls.id, { force: elements > 0 || combos.length > 0 });
      onChanged();
      onBack();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <button type="button" style={{ ...button, justifySelf: 'start' }} onClick={onBack}>
        ← All classes
      </button>
      <div style={{ display: 'grid', gap: 4 }}>
        <p style={{ margin: 0, font: `600 14px/1.4 ${ui.mono}` }}>{classLabel(cls, classes)}</p>
        <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
          {formatCount(elements, hits !== null || count !== undefined)}
          {cls.comboOf ? ` · applies only with .${classes[cls.comboOf]?.name ?? '?'}` : ''}
          {combos.length ? ` · ${combos.length} combo class${combos.length === 1 ? '' : 'es'}` : ''}
        </p>
      </div>

      {cls.kind === 'class' && (
        <form
          style={{ display: 'flex', gap: 4 }}
          onSubmit={event => {
            event.preventDefault();
            rename();
          }}
        >
          <input aria-label="Class name" value={name} onChange={event => setName(event.target.value)} style={field} />
          <button type="submit" style={button} disabled={!slug || slug === cls.name || taken}>
            Rename
          </button>
        </form>
      )}
      {taken && <p style={{ margin: 0, color: ui.danger, font: `12px/1.4 ${ui.font}` }}>A class named .{slug} already exists.</p>}

      <div style={{ display: 'grid', gap: 6 }}>
        <h4 style={heading}>Styles</h4>
        {rows.length === 0 ? (
          <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>No styles yet.</p>
        ) : (
          rows.map(row => (
            <div key={row.key} style={{ display: 'grid', gap: 2 }}>
              <span style={{ color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
                {breakpoints.find(b => b.device === row.device)?.label ?? DEVICE_LABELS[row.device as Device] ?? row.device}
                {row.state ? ` · ${row.state}` : ''}
              </span>
              <code style={{ font: `12px/1.5 ${ui.mono}`, whiteSpace: 'pre-wrap' }}>
                {row.declarations.map(([prop, value]) => `${prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}: ${value};`).join('\n')}
              </code>
            </div>
          ))
        )}
      </div>

      <details>
        <summary style={{ ...heading, cursor: 'pointer' }}>
          Edit styles · {breakpoints.find(b => b.device === device)?.label ?? DEVICE_LABELS[device]}
        </summary>
        <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
          <select
            aria-label="State to edit"
            value={state ?? ''}
            onChange={event => setState(event.target.value && isValidState(event.target.value) ? event.target.value : null)}
            style={field}
          >
            <option value="">None (always)</option>
            {CLASS_STATE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ClassStyleEditor cls={cls} device={device} state={state} breakpoints={breakpoints} store={store} />
        </div>
      </details>

      <div style={{ display: 'grid', gap: 4 }}>
        <h4 style={heading}>Used on</h4>
        {hits === null ? (
          <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>Checking…</p>
        ) : hits.length === 0 ? (
          <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>No saved content uses this class.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, font: `13px/1.6 ${ui.font}` }}>
            {hits.map(hit => {
              const href = hrefFor?.(hit);
              const text = `${hit.title} (${hit.nodeIds.length})`;
              return (
                <li key={`${hit.kind}-${hit.entryId}`}>
                  {href ? <a href={href}>{text}</a> : text}
                  {hit.kind ? <span style={{ color: ui.muted }}> · {hit.kind.replace(/-/g, ' ')}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" style={button} disabled={busy} onClick={() => void duplicate()}>
          Duplicate
        </button>
        {!confirmDelete ? (
          <button type="button" style={dangerButton} disabled={busy} onClick={() => setConfirmDelete(true)}>
            Delete…
          </button>
        ) : (
          <div role="alertdialog" aria-label="Confirm delete" style={{ display: 'grid', gap: 6, width: '100%' }}>
            <p style={{ margin: 0, font: `12px/1.4 ${ui.font}` }}>
              Delete {classLabel(cls, classes)}?
              {elements > 0 && ` ${elements} element${elements === 1 ? '' : 's'} will lose its styles.`}
              {combos.length > 0 && ` Its ${combos.length} combo class${combos.length === 1 ? ' is' : 'es are'} deleted too.`}
              {' '}This cannot be undone.
            </p>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={dangerButton} disabled={busy} onClick={() => void remove()}>
                Delete
              </button>
              <button type="button" style={button} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Manager ---------- */

export type ClassesViewProps = {
  /** Link to the editor of an entry that uses a class; no link when undefined. */
  hrefFor?: (hit: StyleClassUsageHit) => string | undefined;
  /** Tags that can get a tag style (the host's allow-list). */
  tags?: readonly string[];
};

export function ClassesView({ hrefFor, tags = [] }: ClassesViewProps) {
  const store = getStyleClassStore();
  const { classes, status, error } = useStyleClasses(store);
  const nodes = useEditor(state => state.doc.nodes);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ClassSort>('name');
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [cleanup, setCleanup] = useState<StyleClass[] | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const usedOnPage = useMemo(() => usedInDoc(nodes), [nodes]);

  const refreshCounts = useCallback(() => {
    if (!store) return;
    store
      .usageCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, [store]);
  useEffect(refreshCounts, [refreshCounts]);

  if (!store) return <p style={{ margin: 0, color: ui.muted }}>Style classes are not available here.</p>;

  const all = Object.values(classes);
  const tagStyles = sortAndFilterClasses(all.filter(c => c.kind === 'tag'), query, 'name', counts, classes);
  const list = sortAndFilterClasses(all.filter(c => c.kind === 'class'), query, sort, counts, classes);
  const open = openId ? classes[openId] : undefined;
  const styledTags = new Set(all.filter(c => c.kind === 'tag').map(c => c.tag));
  const freeTags = tags.filter(tag => !styledTags.has(tag));
  const unused = unusedClasses(classes, counts, usedOnPage);

  if (open) {
    return (
      <ClassDetail
        cls={open}
        classes={classes}
        count={counts?.[open.id]}
        store={store}
        hrefFor={hrefFor}
        onBack={() => setOpenId(null)}
        onChanged={refreshCounts}
      />
    );
  }

  const runCleanup = async (targets: StyleClass[]) => {
    let removed = 0;
    let failed = 0;
    for (const cls of targets) {
      try {
        await store.removeClass(cls.id);
        removed++;
      } catch {
        failed++;
      }
    }
    setCleanup(null);
    setCleanupResult(
      `Deleted ${removed} class${removed === 1 ? '' : 'es'}.${failed ? ` ${failed} could not be deleted (now in use, or no permission).` : ''}`
    );
    refreshCounts();
  };

  const row = (cls: StyleClass) => (
    <li key={cls.id}>
      <button
        type="button"
        onClick={() => setOpenId(cls.id)}
        style={{
          ...button,
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          gap: 8,
          border: 'none',
          borderBottom: `1px solid ${ui.border}`,
          borderRadius: 0,
          padding: '6px 2px',
        }}
      >
        <span style={{ font: `13px/1.4 ${ui.mono}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {classLabel(cls, classes)}
        </span>
        <span style={{ color: (counts?.[cls.id] ?? 0) || usedOnPage.has(cls.id) ? ui.muted : ui.danger, flex: 'none' }}>
          {usedOnPage.has(cls.id) && !counts?.[cls.id] ? 'on this page' : formatCount(counts?.[cls.id], counts !== null)}
        </span>
      </button>
    </li>
  );

  return (
    <div style={{ display: 'grid', gap: 12, font: `13px/1.4 ${ui.font}` }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="search"
          aria-label="Search classes"
          placeholder="Search classes"
          value={query}
          onChange={event => setQuery(event.target.value)}
          style={field}
        />
        <select aria-label="Sort classes" value={sort} onChange={event => setSort(event.target.value as ClassSort)} style={{ ...field, width: 'auto' }}>
          <option value="name">Name</option>
          <option value="usage">Most used</option>
          <option value="recent">Recently edited</option>
          <option value="unused">Unused first</option>
        </select>
      </div>
      {status === 'loading' && <p style={{ margin: 0, color: ui.muted }}>Loading classes…</p>}
      {error && (
        <p role="alert" style={{ margin: 0, color: ui.danger, font: `12px/1.4 ${ui.font}` }}>
          {error}
        </p>
      )}
      {cleanupResult && (
        <p role="status" style={{ margin: 0, font: `12px/1.4 ${ui.font}` }}>
          {cleanupResult}
        </p>
      )}

      <section style={{ display: 'grid', gap: 4 }}>
        <h4 style={heading}>Tag styles</h4>
        {tagStyles.length > 0 && <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{tagStyles.map(row)}</ul>}
        {freeTags.length > 0 && (
          <form
            style={{ display: 'flex', gap: 4 }}
            onSubmit={event => {
              event.preventDefault();
              if (!newTag) return;
              void store
                .createClass({ name: newTag, kind: 'tag', tag: newTag, variants: {} })
                .then(created => {
                  setNewTag('');
                  setOpenId(created.id);
                })
                .catch(() => {});
            }}
          >
            <select aria-label="Tag to style" value={newTag} onChange={event => setNewTag(event.target.value)} style={field}>
              <option value="">Style a tag…</option>
              {freeTags.map(tag => (
                <option key={tag} value={tag}>
                  {`<${tag}>`}
                </option>
              ))}
            </select>
            <button type="submit" style={button} disabled={!newTag}>
              Add
            </button>
          </form>
        )}
      </section>

      <section style={{ display: 'grid', gap: 4 }}>
        <h4 style={heading}>Classes ({list.length})</h4>
        {list.length === 0 ? (
          <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
            {query ? 'No class matches.' : 'No classes yet. Add one to a block in its Settings.'}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{list.map(row)}</ul>
        )}
      </section>

      {cleanup === null ? (
        <button
          type="button"
          style={{ ...button, justifySelf: 'start' }}
          disabled={unused.length === 0}
          title={counts === null ? 'Counts are not available' : undefined}
          onClick={() => {
            setCleanupResult(null);
            setCleanup(unused);
          }}
        >
          Clean up unused classes{unused.length ? ` (${unused.length})` : ''}
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirm clean up" style={{ display: 'grid', gap: 6 }}>
          <p style={{ margin: 0, font: `12px/1.4 ${ui.font}` }}>
            Delete {cleanup.length} unused class{cleanup.length === 1 ? '' : 'es'}? This cannot be undone.
          </p>
          <code style={{ font: `12px/1.5 ${ui.mono}`, whiteSpace: 'pre-wrap' }}>
            {cleanup.map(cls => classLabel(cls, classes)).join('\n')}
          </code>
          <span style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={dangerButton} onClick={() => void runCleanup(cleanup)}>
              Delete {cleanup.length}
            </button>
            <button type="button" style={button} onClick={() => setCleanup(null)}>
              Cancel
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
