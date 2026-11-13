import type { BlockSchema, NodeId } from '@nextcms/builder-core';
import { showToast } from '@nextcms/editor-ui';
import type { EditorStore } from './store';

/**
 * Shared in-memory clipboard for copied block styles across canvas context menu,
 * toolbar actions, and keyboard shortcuts (⌘⇧C / ⌘⇧V and ⌥⌘C / ⌥⌘V).
 */
let copiedBlockStyles: Record<string, unknown> | null = null;
/** Style classes of the copied block (KRK-01), pasted with its styles. Same site, so ids stay valid. */
let copiedClassIds: string[] = [];

/** Section keys that belong to identity/visibility/motion and must not be overwritten by style paste. */
const PRESERVED_SECTION_KEYS = new Set([
  'anchor',
  'hideOn',
  'hideOnMobile',
  'hideOnTablet',
  'hideOnDesktop',
  'animation',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeObjects(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(base));
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue;
    if (isPlainObject(val) && isPlainObject(result[key])) {
      result[key] = deepMergeObjects(
        result[key] as Record<string, unknown>,
        val
      );
    } else {
      result[key] = JSON.parse(JSON.stringify(val));
    }
  }
  return result;
}

function targetHasPropKey(
  schema: BlockSchema | undefined,
  key: string,
  value: unknown
): boolean {
  if (!schema || (!schema.fields && !schema.defaultProps)) return true;
  const field = schema.fields?.[key];
  if (field && key !== 'section' && key !== 'elements') {
    if (field.type === 'number' && typeof value !== 'number') return false;
    if (field.type !== 'number' && typeof value === 'number') return false;
  }
  if (schema.defaultProps && key in schema.defaultProps) return true;
  if (schema.fields) {
    for (const [fieldKey, fieldDef] of Object.entries(schema.fields)) {
      if (!fieldDef) continue;
      const rootKey = fieldDef.path ? fieldDef.path.split('.')[0] : fieldKey;
      if (rootKey === key) return true;
    }
  }
  return false;
}

export function getCopiedBlockStyles(): Record<string, unknown> | null {
  return copiedBlockStyles;
}

export function setCopiedBlockStyles(styles: Record<string, unknown> | null, classIds: string[] = []) {
  copiedBlockStyles = styles;
  copiedClassIds = classIds;
}

/** Class ids copied with the last style copy. */
export function getCopiedClassIds(): string[] {
  return copiedClassIds;
}

export function hasCopiedBlockStyles(): boolean {
  return (!!copiedBlockStyles && Object.keys(copiedBlockStyles).length > 0) || copiedClassIds.length > 0;
}

function classIdsOf(props: Record<string, unknown>): string[] {
  return Array.isArray(props.classIds)
    ? (props.classIds as unknown[]).filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
}

/**
 * Copies the styling properties from a block, including its unified `section` styling,
 * per-element styles (`elements`), and any schema fields declared in Style tabs.
 */
export function copyBlockStyle(
  store: EditorStore,
  targetId?: NodeId
): Record<string, unknown> | null {
  const id = targetId ?? store.getState().selection[0];
  if (!id) return null;
  const targetNode = store.getState().doc.nodes[id];
  if (!targetNode) return null;

  const patch: Record<string, unknown> = {};

  const schema = store.schemas[targetNode.type];
  const defaultProps = isPlainObject(schema?.defaultProps)
    ? schema.defaultProps
    : undefined;

  // 1. Copy section styling (excluding anchor, hide flags, and animation)
  const rawSection = isPlainObject(targetNode.props.section)
    ? isPlainObject(defaultProps?.section)
      ? deepMergeObjects(defaultProps.section, targetNode.props.section)
      : targetNode.props.section
    : isPlainObject(defaultProps?.section)
      ? defaultProps.section
      : null;
  if (rawSection) {
    const sectionCopy: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rawSection)) {
      if (PRESERVED_SECTION_KEYS.has(key) || val === undefined) continue;
      sectionCopy[key] = JSON.parse(JSON.stringify(val));
    }
    if (Object.keys(sectionCopy).length > 0) {
      patch.section = sectionCopy;
    }
  }

  // 2. Copy per-element styling (Elementor-style element overrides)
  if (
    isPlainObject(targetNode.props.elements) &&
    Object.keys(targetNode.props.elements).length > 0
  ) {
    patch.elements = JSON.parse(JSON.stringify(targetNode.props.elements));
  }

  // 3. Copy any fields explicitly marked with tab: 'style' or styling sections
  const schemaFields = schema?.fields as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (schemaFields) {
    for (const [key, field] of Object.entries(schemaFields)) {
      if (!field) continue;
      if (
        field.tab === 'style' ||
        field.section === 'Style' ||
        field.section === 'Dimensions' ||
        field.section === 'Background' ||
        field.section === 'Typography' ||
        field.section === 'Border' ||
        field.section === 'Filters'
      ) {
        const propKey =
          typeof field.path === 'string' ? field.path.split('.')[0] : key;
        if (propKey === 'section' || propKey === 'elements') continue;
        // A column's width is layout, not style: pasting it would reflow the row.
        if (targetNode.type === 'Column' && propKey === 'width') continue;
        const val =
          targetNode.props[propKey] !== undefined
            ? targetNode.props[propKey]
            : defaultProps?.[propKey];
        if (val !== undefined) {
          patch[propKey] = JSON.parse(JSON.stringify(val));
        }
      }
    }
  } else if (Object.keys(patch).length === 0) {
    // 4. Fallback for schemas without field definitions
    const commonStyleProps = [
      'background',
      'backgroundColor',
      'bgTone',
      'color',
      'textColor',
      'padding',
      'paddingY',
      'paddingX',
      'margin',
      'borderRadius',
      'border',
      'shadow',
      'textAlign',
      'align',
      'maxWidth',
      'opacity',
    ];
    for (const k of commonStyleProps) {
      if (k in targetNode.props && targetNode.props[k] !== undefined) {
        patch[k] = JSON.parse(JSON.stringify(targetNode.props[k]));
      }
    }
  }

  const classIds = classIdsOf(targetNode.props);
  if (Object.keys(patch).length === 0 && classIds.length === 0) {
    showToast({ type: 'info', message: 'Nothing to copy' });
    return null;
  }

  copiedBlockStyles = patch;
  copiedClassIds = classIds;
  showToast({
    type: 'success',
    message: classIds.length ? `Style copied with ${classIds.length} class${classIds.length === 1 ? '' : 'es'}` : 'Style copied',
  });
  return patch;
}

/**
 * Pastes the copied styling properties onto the target block (or currently selected block).
 */
export function pasteBlockStyle(
  store: EditorStore,
  targetId?: NodeId,
  options: {
    /**
     * Also give the target the copied block's classes, replacing its own
     * (default true). False pastes only the block-level settings.
     */
    classes?: boolean;
  } = {}
): boolean {
  const withClasses = options.classes !== false && copiedClassIds.length > 0;
  if ((!copiedBlockStyles || Object.keys(copiedBlockStyles).length === 0) && !withClasses) {
    showToast({ type: 'info', message: 'Nothing to paste' });
    return false;
  }
  const id = targetId ?? store.getState().selection[0];
  if (!id) return false;
  const targetNode = store.getState().doc.nodes[id];
  if (!targetNode || targetNode.meta?.locked) return false;

  const targetSchema = store.schemas[targetNode.type];
  const filteredPatch: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(copiedBlockStyles ?? {})) {
    if (!targetHasPropKey(targetSchema, key, val)) continue;
    if (key === 'section' && isPlainObject(val)) {
      const existingSection = isPlainObject(targetNode.props.section)
        ? targetNode.props.section
        : {};
      const cleanSource: Record<string, unknown> = {};
      for (const [sKey, sVal] of Object.entries(val)) {
        if (PRESERVED_SECTION_KEYS.has(sKey)) continue;
        cleanSource[sKey] = sVal;
      }
      filteredPatch.section = deepMergeObjects(existingSection, cleanSource);
    } else {
      filteredPatch[key] = JSON.parse(JSON.stringify(val));
    }
  }

  if (withClasses) {
    const current = classIdsOf(targetNode.props);
    const same = current.length === copiedClassIds.length && current.every((c, i) => c === copiedClassIds[i]);
    if (!same) filteredPatch.classIds = [...copiedClassIds];
  }

  if (Object.keys(filteredPatch).length === 0) {
    showToast({
      type: 'info',
      message: 'Nothing to paste for this block',
    });
    return false;
  }

  // One update, so styles and classes paste as a single undo step.
  store.updateProps(id, filteredPatch);
  showToast({ type: 'success', message: filteredPatch.classIds ? 'Style and classes pasted' : 'Style pasted' });
  return true;
}

/**
 * Resets block props to schema defaultProps.
 */
export function resetBlockToDefaults(
  store: EditorStore,
  targetId?: NodeId
): boolean {
  const id = targetId ?? store.getState().selection[0];
  if (!id) return false;
  const targetNode = store.getState().doc.nodes[id];
  if (!targetNode || targetNode.meta?.locked) return false;

  const schema = store.schemas[targetNode.type] as Record<string, unknown> | undefined;
  const defaults =
    (schema?.defaultProps as Record<string, unknown> | undefined) ??
    (typeof schema?.defaults === 'function'
      ? (schema.defaults as () => Record<string, unknown>)()
      : {});
  if (defaults && Object.keys(defaults).length > 0) {
    store.updateProps(id, JSON.parse(JSON.stringify(defaults)));
    return true;
  }
  return false;
}

/**
 * Selects a block and triggers an inspection event to switch the active inspector panel to settings.
 */
export function inspectBlock(
  store: EditorStore,
  targetId?: NodeId
): void {
  const id = targetId ?? store.getState().selection[0];
  if (!id) return;
  store.select(id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ne-inspect-block', { detail: { id } })
    );
  }
}
