/**
 * Inline text editing on the canvas (R696). Double-click text in a block to
 * edit the prop it shows. The element is found by matching its text to the
 * block's inline props, so blocks need no editor markup. Enter or clicking
 * away saves (Shift+Enter adds a line break), Escape cancels. Afterwards the
 * block re-mounts, so React never reconciles against edited DOM.
 */

import type { NodeId } from '@nextcms/builder-core';
import { useEffect } from 'react';
import { NODE_ATTR } from './dom';
import type { EditorStore } from './store';

export type InlinePropsFor = (type: string) => string[] | undefined;

const normalize = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/**
 * The element showing `value`: the deepest element between the clicked
 * target and the block wrapper whose text is exactly the prop's value.
 */
export function findTextElement(
  target: Element,
  wrapper: Element,
  value: string
): HTMLElement | null {
  const wanted = normalize(value);
  if (!wanted) return null;
  for (let element: Element | null = target; element && element !== wrapper; element = element.parentElement) {
    if (normalize(element.textContent) === wanted) return element as HTMLElement;
  }
  return null;
}

export function useInlineEditing({
  frame,
  store,
  inlineProps,
  onDone,
}: {
  frame: HTMLIFrameElement | null;
  store: EditorStore;
  inlineProps?: InlinePropsFor;
  /** Called after an edit ends, so the canvas can re-mount the block. */
  onDone: (id: NodeId) => void;
}) {
  useEffect(() => {
    const doc = frame?.contentDocument;
    if (!doc || !inlineProps) return;

    const onDoubleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const wrapper = target?.closest?.(`[${NODE_ATTR}]`);
      const id = wrapper?.getAttribute(NODE_ATTR);
      const node = id ? store.getState().doc.nodes[id] : undefined;
      if (!target || !wrapper || !id || !node || node.meta?.locked) return;

      for (const prop of inlineProps(node.type) ?? []) {
        const value = node.props[prop];
        if (typeof value !== 'string') continue;
        const element = findTextElement(target, wrapper, value);
        if (!element) continue;
        event.preventDefault();
        startEditing(id, prop, element);
        return;
      }
    };

    const startEditing = (id: NodeId, prop: string, element: HTMLElement) => {
      element.contentEditable = 'plaintext-only';
      if (element.contentEditable !== 'plaintext-only') element.contentEditable = 'true';
      element.style.outline = '2px solid #4f46e5';
      element.style.outlineOffset = '2px';
      element.style.cursor = 'text';
      element.focus();
      const selection = doc.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);

      let done = false;
      const finish = (save: boolean) => {
        if (done) return;
        done = true;
        element.removeEventListener('keydown', onKey);
        element.removeEventListener('blur', onBlur);
        // innerText keeps line breaks typed with Shift+Enter; textContent drops them.
        // biome-ignore lint/performance/useDomNodeTextContent: line breaks are part of the value
        const text = element.innerText.replace(/\n$/, '');
        element.contentEditable = 'false';
        onDone(id);
        if (save && text !== store.getState().doc.nodes[id]?.props[prop]) {
          store.updateProps(id, { [prop]: text });
        }
      };
      const onKey = (event: KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        } else if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          finish(true);
        }
      };
      const onBlur = () => finish(true);
      element.addEventListener('keydown', onKey);
      element.addEventListener('blur', onBlur);
    };

    doc.addEventListener('dblclick', onDoubleClick);
    return () => doc.removeEventListener('dblclick', onDoubleClick);
  }, [frame, store, inlineProps, onDone]);
}
