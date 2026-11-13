/**
 * Class styles in the inspector (KRK-03): the selected block's style classes
 * as chips, a state picker, and a CSS editor for the chosen class at the
 * current breakpoint and state. Every value shows where it comes from: set
 * here, inherited from a wider breakpoint or the state-less style, or unset.
 *
 * What is edited lives in the editor store (`classEdit`), so the canvas can
 * preview the chosen state (`useForcedStatePreview`). Class changes save
 * through the style class store; which classes a block has is a document
 * change (undoable).
 */

import {
  allowsCssContent,
  type BreakpointConfig,
  type BuilderDocument,
  CLASS_CONTENT_PROPERTY,
  CLASS_STATE_OPTIONS,
  CLASS_STYLE_GROUPS,
  type ClassStyleProperty,
  type ClassValueSource,
  DEVICE_LABELS,
  type Device,
  FORCEABLE_STATES,
  isValidState,
  type NodeId,
  resolveClassValue,
  sanitizeCssValue,
  setClassVariantValue,
  statesWithValues,
  type StyleClass,
} from '@nextcms/builder-core';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { NODE_ATTR, nodeElement } from './dom';
import {
  getStyleClassStore,
  slugifyClassName,
  type StyleClassStore,
  uniqueClassName,
  useStyleClasses,
} from './style-classes';

/* ---------- Pure helpers (exported for tests) ---------- */

export type ClassChip = {
  id: string;
  name: string;
  /** True when this class is a combo of the chip before it. */
  combo: boolean;
  /** The class no longer exists (deleted elsewhere); shown so it can be removed. */
  missing: boolean;
};

/** Chips for a node's class ids, in order. */
export function classChips(classIds: unknown, classes: Record<string, StyleClass>): ClassChip[] {
  if (!Array.isArray(classIds)) return [];
  return classIds
    .filter((id): id is string => typeof id === 'string')
    .map((id, index, ids) => {
      const cls = classes[id];
      return {
        id,
        name: cls?.name ?? 'missing class',
        combo: Boolean(cls?.comboOf && index > 0 && ids[index - 1] === cls.comboOf),
        missing: !cls,
      };
    });
}

/** Blocks in this document that use a class. */
export function nodesUsingClass(doc: BuilderDocument, classId: string): NodeId[] {
  return Object.values(doc.nodes)
    .filter(node => Array.isArray(node.props.classIds) && (node.props.classIds as unknown[]).includes(classId))
    .map(node => node.id);
}

/**
 * What adding `input` to a block means: apply an existing class by name, or
 * create one. A new class on a block that already has a base class becomes a
 * combo of it (`.button.is-large`), like Webflow.
 */
export function classToAdd(
  input: string,
  classIds: string[],
  classes: Record<string, StyleClass>
): { kind: 'apply'; id: string } | { kind: 'create'; name: string; comboOf?: string } | null {
  const slug = slugifyClassName(input);
  if (!slug) return null;
  const existing = Object.values(classes).find(cls => cls.name === slug && cls.kind === 'class');
  if (existing) return classIds.includes(existing.id) ? null : { kind: 'apply', id: existing.id };
  const base = classIds.map(id => classes[id]).find(cls => cls && !cls.comboOf);
  const name = uniqueClassName(slug, Object.values(classes).map(cls => cls.name));
  return base ? { kind: 'create', name, comboOf: base.id } : { kind: 'create', name };
}

/* ---------- Styles ---------- */

const ui = {
  font: 'var(--ne-font-ui, system-ui, sans-serif)',
  text: 'var(--ne-text, inherit)',
  muted: 'var(--ne-ink-500, #6b7280)',
  border: 'var(--ne-border, rgba(127,127,127,.3))',
  surface: 'var(--ne-surface-subtle, rgba(127,127,127,.06))',
  own: 'var(--ne-cobalt-500, #3b82f6)',
  inherited: 'var(--ne-amber-500, #f59e0b)',
  danger: 'var(--ne-danger, #dc2626)',
  radius: 'var(--ne-radius-sm, 4px)',
};

const label: CSSProperties = { font: `600 11px/1.4 ${ui.font}`, color: ui.muted, textTransform: 'uppercase', letterSpacing: '0.04em' };
const input: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 26,
  padding: '0 6px',
  borderRadius: ui.radius,
  border: `1px solid ${ui.border}`,
  background: 'transparent',
  color: ui.text,
  font: `13px/1 ${ui.font}`,
  fontVariantNumeric: 'tabular-nums',
};
const button: CSSProperties = {
  padding: '2px 8px',
  borderRadius: ui.radius,
  border: `1px solid ${ui.border}`,
  background: 'transparent',
  color: ui.text,
  font: `12px/1.6 ${ui.font}`,
  cursor: 'pointer',
};

/* ---------- Class bar ---------- */

function ClassBar({
  nodeId,
  classIds,
  classes,
  activeId,
  store,
}: {
  nodeId: NodeId;
  classIds: string[];
  classes: Record<string, StyleClass>;
  activeId: string | null;
  store: StyleClassStore;
}) {
  const editor = useEditorStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const chips = classChips(classIds, classes);
  const plan = classToAdd(text, classIds, classes);
  const matches = useMemo(() => {
    const q = slugifyClassName(text);
    if (!q) return [];
    return Object.values(classes)
      .filter(cls => cls.kind === 'class' && cls.name.includes(q) && !classIds.includes(cls.id))
      .slice(0, 6);
  }, [text, classes, classIds]);

  const add = async (choice = plan) => {
    if (!choice || busy) return;
    setBusy(true);
    try {
      const id =
        choice.kind === 'apply'
          ? choice.id
          : (await store.createClass({ name: choice.name, kind: 'class', comboOf: choice.comboOf, variants: {} })).id;
      editor.addNodeClass(nodeId, id);
      editor.setClassEdit({ classId: id, state: null });
      setText('');
    } catch {
      /* shown through the store's error */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div role="listbox" aria-label="Classes on this block" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <button
          type="button"
          role="option"
          aria-selected={activeId === null}
          onClick={() => editor.setClassEdit({ classId: null })}
          style={{ ...button, borderStyle: 'dashed', ...(activeId === null && { borderColor: ui.own, color: ui.own }) }}
          title="Edit this block's own settings below"
        >
          Block only
        </button>
        {chips.map(chip => (
          <span
            key={chip.id}
            style={{ display: 'inline-flex', alignItems: 'center', marginLeft: chip.combo ? -4 : 0 }}
          >
            <button
              type="button"
              role="option"
              aria-selected={activeId === chip.id}
              disabled={chip.missing}
              onClick={() => editor.setClassEdit({ classId: chip.id, state: null })}
              title={chip.missing ? 'This class was deleted' : chip.combo ? 'Combo class: applies only with the class before it' : undefined}
              style={{
                ...button,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                fontFamily: 'var(--ne-font-mono, ui-monospace, monospace)',
                ...(chip.combo && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }),
                ...(activeId === chip.id && { borderColor: ui.own, color: ui.own, background: 'var(--ne-primary-soft, rgba(59,130,246,.1))' }),
                ...(chip.missing && { color: ui.danger, textDecoration: 'line-through' }),
              }}
            >
              .{chip.name}
            </button>
            <button
              type="button"
              aria-label={`Remove .${chip.name} from this block`}
              onClick={() => {
                editor.removeNodeClass(nodeId, chip.id);
                if (activeId === chip.id) editor.setClassEdit({ classId: null });
              }}
              style={{ ...button, borderLeft: 'none', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: '2px 5px', color: ui.muted }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form
        style={{ display: 'flex', gap: 4 }}
        onSubmit={event => {
          event.preventDefault();
          void add();
        }}
      >
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder={classIds.length ? 'Add class or combo…' : 'Add class…'}
          aria-label="Add a class to this block"
          style={input}
        />
        <button type="submit" disabled={!plan || busy} style={button}>
          {plan?.kind === 'apply' ? 'Apply' : plan?.kind === 'create' && plan.comboOf ? 'Add combo' : 'Create'}
        </button>
      </form>
      {matches.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {matches.map(cls => (
            <button key={cls.id} type="button" onClick={() => void add({ kind: 'apply', id: cls.id })} style={{ ...button, color: ui.muted }}>
              .{cls.name}
            </button>
          ))}
        </div>
      )}
      {plan?.kind === 'create' && plan.comboOf && (
        <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
          Creates <code>.{classes[plan.comboOf]?.name}.{plan.name}</code>: it only applies together with .
          {classes[plan.comboOf]?.name}.
        </p>
      )}
    </div>
  );
}

/* ---------- State picker ---------- */

function StatePicker({ cls, state }: { cls: StyleClass; state: string | null }) {
  const editor = useEditorStore();
  const withValues = statesWithValues(cls);
  const isNth = state?.startsWith('nth-child(') ?? false;
  const [formula, setFormula] = useState(isNth ? (state as string).slice(10, -1) : '2n');
  const nthState = `nth-child(${formula})`;
  const nthValid = isValidState(nthState);
  const mark = (value: string) => (withValues.has(value) ? ' •' : '');

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <label style={label} htmlFor="class-state">
        State
      </label>
      <select
        id="class-state"
        value={isNth ? '__nth' : (state ?? '')}
        onChange={event => {
          const value = event.target.value;
          editor.setClassEdit({ state: value === '' ? null : value === '__nth' ? (nthValid ? nthState : null) : value });
        }}
        style={input}
      >
        <option value="">None (always)</option>
        <optgroup label="States">
          {CLASS_STATE_OPTIONS.filter(o => o.group === 'state').map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
              {mark(o.value)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Pseudo-elements">
          {CLASS_STATE_OPTIONS.filter(o => o.group === 'pseudo-element').map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
              {mark(o.value)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Structure">
          {CLASS_STATE_OPTIONS.filter(o => o.group === 'structure').map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
              {mark(o.value)}
            </option>
          ))}
          <option value="__nth">nth-child(…)</option>
        </optgroup>
      </select>
      {isNth && (
        <input
          aria-label="nth-child formula"
          value={formula}
          onChange={event => {
            setFormula(event.target.value);
            const next = `nth-child(${event.target.value})`;
            if (isValidState(next)) editor.setClassEdit({ state: next });
          }}
          placeholder="2n+1, odd, 3"
          style={{ ...input, ...(!nthValid && { borderColor: ui.danger }) }}
        />
      )}
      {state && !FORCEABLE_STATES.has(state.split(':')[0]) && (
        <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
          {allowsCssContent(state) ? 'Set Content below, or nothing shows.' : 'Shown on the canvas when it applies.'}
        </p>
      )}
    </div>
  );
}

/* ---------- Usage warning ---------- */

function UsageNotice({ cls, doc, store }: { cls: StyleClass; doc: BuilderDocument; store: StyleClassStore }) {
  const editor = useEditorStore();
  const onPage = nodesUsingClass(doc, cls.id).length;
  const [elsewhere, setElsewhere] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    setElsewhere(null);
    store
      .usage(cls.id)
      .then(hits => {
        if (!live) return;
        const total = hits.reduce((sum, hit) => sum + hit.nodeIds.length, 0);
        setElsewhere(Math.max(0, total - onPage));
      })
      .catch(() => live && setElsewhere(null));
    return () => {
      live = false;
    };
  }, [cls.id, store, onPage]);

  const others = onPage - 1 + (elsewhere ?? 0);
  if (others <= 0) return null;
  return (
    <div
      role="status"
      style={{
        display: 'grid',
        gap: 4,
        padding: 8,
        borderRadius: ui.radius,
        background: 'var(--ne-warning-soft, rgba(245,158,11,.12))',
        font: `12px/1.4 ${ui.font}`,
      }}
    >
      <span>
        Editing <code>.{cls.name}</code> changes {others} other element{others === 1 ? '' : 's'}
        {elsewhere ? ` (${elsewhere} on other pages)` : ''}.
      </span>
      {onPage > 0 && (
        <span style={{ display: 'flex', gap: 4 }}>
          <button type="button" style={button} onClick={() => editor.select(nodesUsingClass(editor.getState().doc, cls.id))}>
            Select all on this page
          </button>
        </span>
      )}
    </div>
  );
}

/* ---------- CSS editor ---------- */

function SourceDot({ source, breakpoints }: { source: ClassValueSource; breakpoints: BreakpointConfig }) {
  if (source.kind === 'none') return <span aria-hidden style={{ width: 6 }} />;
  const from =
    source.kind === 'inherited'
      ? `${breakpoints.find(b => b.device === source.from.device)?.label ?? DEVICE_LABELS[source.from.device as Device] ?? source.from.device}${source.from.state ? ` · ${source.from.state}` : ''}`
      : '';
  const title = source.kind === 'own' ? 'Set here' : `Inherited from ${from}`;
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        flex: 'none',
        background: source.kind === 'own' ? ui.own : ui.inherited,
      }}
    />
  );
}

function PropertyRow({
  property,
  cls,
  device,
  state,
  breakpoints,
  store,
}: {
  property: ClassStyleProperty;
  cls: StyleClass;
  device: Device;
  state: string | null;
  breakpoints: BreakpointConfig;
  store: StyleClassStore;
}) {
  const source = resolveClassValue(cls, property.prop, device, state, breakpoints);
  const own = source.kind === 'own' ? source.value : '';
  const placeholder =
    source.kind === 'inherited'
      ? source.value
      : property.control.kind === 'length' || property.control.kind === 'text'
        ? (property.control.placeholder ?? '')
        : '';
  const [draft, setDraft] = useState(own);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(own);
    setInvalid(false);
  }, [own, cls.id, device, state]);

  const commit = (value: string) => {
    setDraft(value);
    if (value.trim() && sanitizeCssValue(value) === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    store.updateClass(cls.id, {
      variants: setClassVariantValue(cls.variants, device, state, property.prop, value),
    });
  };
  const id = `class-${property.prop}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '6px 88px 1fr auto', alignItems: 'center', gap: 6 }}>
      <SourceDot source={source} breakpoints={breakpoints} />
      <label htmlFor={id} style={{ font: `12px/1.3 ${ui.font}`, color: source.kind === 'own' ? ui.own : ui.text }}>
        {property.label}
      </label>
      {property.control.kind === 'select' ? (
        <select id={id} value={own} onChange={event => commit(event.target.value)} style={input}>
          <option value="">{source.kind === 'inherited' ? `${source.value} (inherited)` : '—'}</option>
          {property.control.options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <span style={{ display: 'flex', gap: 4 }}>
          {property.control.kind === 'color' && (
            <input
              type="color"
              aria-label={`${property.label} picker`}
              value={/^#[0-9a-f]{6}$/i.test(draft || placeholder) ? draft || placeholder : '#000000'}
              onChange={event => commit(event.target.value)}
              style={{ ...input, width: 26, padding: 0, flex: 'none' }}
            />
          )}
          <input
            id={id}
            value={draft}
            placeholder={placeholder}
            onChange={event => commit(event.target.value)}
            aria-invalid={invalid || undefined}
            style={{ ...input, ...(invalid && { borderColor: ui.danger }) }}
          />
        </span>
      )}
      <button
        type="button"
        aria-label={`Reset ${property.label}`}
        title="Reset"
        disabled={source.kind !== 'own'}
        onClick={() => commit('')}
        style={{ ...button, padding: '0 5px', visibility: source.kind === 'own' ? 'visible' : 'hidden' }}
      >
        ↺
      </button>
    </div>
  );
}

/** The CSS editor for one class at a breakpoint and state (also used by the Classes manager). */
export function ClassStyleEditor({
  cls,
  device,
  state,
  breakpoints,
  store,
}: {
  cls: StyleClass;
  device: Device;
  state: string | null;
  breakpoints: BreakpointConfig;
  store: StyleClassStore;
}) {
  const rowProps = { cls, device, state, breakpoints, store };
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {allowsCssContent(state) && <PropertyRow property={CLASS_CONTENT_PROPERTY} {...rowProps} />}
      {CLASS_STYLE_GROUPS.map(group => {
        const setHere = group.properties.some(p => resolveClassValue(cls, p.prop, device, state, breakpoints).kind !== 'none');
        return (
          <details key={group.id} open={setHere || group.id === 'spacing'}>
            <summary style={{ ...label, cursor: 'pointer', padding: '4px 0' }}>{group.label}</summary>
            <div style={{ display: 'grid', gap: 4, paddingTop: 4 }}>
              {group.properties.map(property => (
                <PropertyRow key={property.prop} property={property} {...rowProps} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/* ---------- Panel ---------- */

/**
 * The class section of the Style inspector for one block. Render it only for
 * block types that support classes (the host decides, e.g. with
 * `supportsStyleClasses`).
 */
export function ClassStylesPanel({ nodeId }: { nodeId: NodeId }) {
  const store = getStyleClassStore();
  const { classes, error, status } = useStyleClasses(store);
  const doc = useEditor(state => state.doc);
  const device = useEditor(state => state.device);
  const breakpoints = useEditor(state => state.breakpoints);
  const classEdit = useEditor(state => state.classEdit);
  const editor = useEditorStore();
  const node = doc.nodes[nodeId];

  if (!store || !node) return null;
  const classIds = Array.isArray(node.props.classIds)
    ? (node.props.classIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];
  const active = classEdit.classId ? classes[classEdit.classId] : undefined;
  const deviceLabel = breakpoints.find(b => b.device === device)?.label ?? DEVICE_LABELS[device];

  return (
    <section aria-label="Class styles" style={{ display: 'grid', gap: 10, font: `13px/1.4 ${ui.font}`, color: ui.text }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={label}>Classes</span>
        {active && (
          <span style={{ color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
            {deviceLabel}
            {classEdit.state ? ` · ${classEdit.state}` : ''}
          </span>
        )}
      </div>
      {status === 'loading' && <p style={{ margin: 0, color: ui.muted }}>Loading classes…</p>}
      <ClassBar nodeId={nodeId} classIds={classIds} classes={classes} activeId={active ? active.id : null} store={store} />
      {error && (
        <p role="alert" style={{ margin: 0, color: ui.danger, font: `12px/1.4 ${ui.font}` }}>
          {error}{' '}
          <button type="button" style={{ ...button, padding: '0 6px' }} onClick={() => store.clearError()}>
            Dismiss
          </button>
        </p>
      )}
      {active ? (
        <>
          <UsageNotice cls={active} doc={doc} store={store} />
          <StatePicker key={active.id} cls={active} state={classEdit.state} />
          <ClassStyleEditor cls={active} device={device} state={classEdit.state} breakpoints={breakpoints} store={store} />
          <button type="button" style={{ ...button, justifySelf: 'start' }} onClick={() => editor.setClassEdit({ classId: null })}>
            Done editing .{active.name}
          </button>
        </>
      ) : (
        <p style={{ margin: 0, color: ui.muted, font: `12px/1.4 ${ui.font}` }}>
          {classIds.length
            ? 'Choose a class to edit its styles. Settings below apply to this block only and win over classes.'
            : 'Add a class to reuse these styles on other blocks. Settings below apply to this block only.'}
        </p>
      )}
    </section>
  );
}

/* ---------- Canvas state preview ---------- */

/**
 * Previews the chosen class state on the canvas: puts
 * `data-force-state="hover"` on the selected block's element that carries
 * the class (the editor CSS is compiled with `forceStates`). Removed when the
 * state, class or selection changes.
 */
export function useForcedStatePreview(frameDoc: Document | null | undefined): void {
  const selection = useEditor(state => state.selection);
  const classEdit = useEditor(state => state.classEdit);
  const { classes } = useStyleClasses();
  const nodeId = selection.length === 1 ? selection[0] : null;
  const name = classEdit.classId ? classes[classEdit.classId]?.name : undefined;
  const forced = classEdit.state
    ?.split(':')
    .filter(part => FORCEABLE_STATES.has(part))
    .join(' ');

  useEffect(() => {
    if (!frameDoc || !nodeId || !name || !forced) return;
    const wrapper = nodeElement(frameDoc, nodeId);
    if (!wrapper) return;
    const selector = `.c-${name}`;
    // The element with the class that belongs to this block, not a nested one.
    const candidates = [wrapper, ...Array.from(wrapper.querySelectorAll(selector))];
    const target = candidates.find(
      el => el.matches(selector) && (el === wrapper || el.closest(`[${NODE_ATTR}]`) === wrapper)
    );
    if (!target) return;
    target.setAttribute('data-force-state', forced);
    return () => target.removeAttribute('data-force-state');
  }, [frameDoc, nodeId, name, forced]);
}

/** Renders nothing; runs `useForcedStatePreview` for hosts that hold the frame outside the editor context. */
export function ForcedStatePreview({ frameDoc }: { frameDoc: Document | null | undefined }) {
  useForcedStatePreview(frameDoc);
  return null;
}

/**
 * `ClassStylesPanel` for the current selection: shown when exactly one block
 * is selected and `supports(type)` says its type takes style classes.
 */
export function SelectedClassStyles({ supports }: { supports: (type: string) => boolean }) {
  const nodeId = useEditor(state => (state.selection.length === 1 ? state.selection[0] : null));
  const type = useEditor(state => (nodeId ? (state.doc.nodes[nodeId]?.type ?? null) : null));
  if (!nodeId || !type || !supports(type)) return null;
  return <ClassStylesPanel key={nodeId} nodeId={nodeId} />;
}
