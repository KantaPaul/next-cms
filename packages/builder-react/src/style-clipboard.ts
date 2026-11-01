import type { NodeId } from '@nextcms/builder-core';
import type { EditorStore } from './store';

/**
 * Shared in-memory clipboard for copied block styles across canvas context menu,
 * toolbar actions, and keyboard shortcuts (⌥⌘C / ⌥⌘V).
 */
let copiedBlockStyles: Record<string, unknown> | null = null;

export function getCopiedBlockStyles(): Record<string, unknown> | null {
  return copiedBlockStyles;
}

export function setCopiedBlockStyles(styles: Record<string, unknown> | null) {
  copiedBlockStyles = styles;
}

export function hasCopiedBlockStyles(): boolean {
  return !!copiedBlockStyles && Object.keys(copiedBlockStyles).length > 0;
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

  // 1. Copy section styling (the unified section object used across native blocks)
  if (targetNode.props.section && typeof targetNode.props.section === 'object') {
    patch.section = JSON.parse(JSON.stringify(targetNode.props.section));
  }

  // 2. Copy per-element styling (Elementor-style element overrides)
  if (targetNode.props.elements && typeof targetNode.props.elements === 'object') {
    patch.elements = JSON.parse(JSON.stringify(targetNode.props.elements));
  }

  // 3. Copy any fields explicitly marked with tab: 'style' or styling sections
  const schema = store.schemas[targetNode.type] as Record<string, unknown> | undefined;
  const schemaFields = schema?.fields as Record<string, Record<string, unknown>> | undefined;
  if (schemaFields) {
    for (const [key, field] of Object.entries(schemaFields)) {
      if (
        field.tab === 'style' ||
        field.section === 'Style' ||
        field.section === 'Dimensions' ||
        field.section === 'Background' ||
        field.section === 'Typography' ||
        field.section === 'Border' ||
        field.section === 'Filters'
      ) {
        if (key in targetNode.props && targetNode.props[key] !== undefined) {
          patch[key] = JSON.parse(JSON.stringify(targetNode.props[key]));
        }
      }
    }
  }

  // 4. Fallback for common styling props
  if (Object.keys(patch).length === 0) {
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

  copiedBlockStyles = patch;
  return patch;
}

/**
 * Pastes the copied styling properties onto the target block (or currently selected block).
 */
export function pasteBlockStyle(
  store: EditorStore,
  targetId?: NodeId
): boolean {
  if (!copiedBlockStyles || Object.keys(copiedBlockStyles).length === 0) {
    return false;
  }
  const id = targetId ?? store.getState().selection[0];
  if (!id) return false;
  const targetNode = store.getState().doc.nodes[id];
  if (!targetNode || targetNode.meta?.locked) return false;

  store.updateProps(id, JSON.parse(JSON.stringify(copiedBlockStyles)));
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
