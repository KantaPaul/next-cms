/**
 * The canvas iframe (R689). Content renders through a portal, so blocks share
 * the editor's React tree and context, while media queries and viewport units
 * follow the iframe's width. Stylesheets from the editor page are copied into
 * the frame and kept in sync, including ones added later by the dev server.
 */

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const COPIED = 'data-builder-copied';
const FRAME_DOC = '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"></body></html>';

/** Editor sheet → its copy in the frame. */
const copies = new WeakMap<Element, Element>();

/**
 * Brings the frame's sheets in line with the editor's, touching only what
 * changed. Re-cloning everything made linked sheets reload, so the canvas lost
 * its styles for a frame and jumped to the top whenever the editor head changed
 * (e.g. the scroll-lock style a select or popover adds while open).
 */
function syncStyles(from: Document, to: Document) {
  const keep = new Set<Element>();
  let next: ChildNode | null = to.head.querySelector(`[${COPIED}]`);
  for (const sheet of Array.from(from.querySelectorAll('link[rel="stylesheet"], style'))) {
    let copy = copies.get(sheet);
    const stale =
      !copy ||
      copy.ownerDocument !== to ||
      !copy.isConnected ||
      (sheet.tagName === 'LINK' && copy.getAttribute('href') !== sheet.getAttribute('href'));
    if (stale) {
      copy = sheet.cloneNode(true) as Element;
      copy.setAttribute(COPIED, '');
      copies.set(sheet, copy);
      to.head.insertBefore(copy, next);
    } else if (copy && sheet.tagName === 'STYLE' && copy.textContent !== sheet.textContent) {
      copy.textContent = sheet.textContent;
    }
    if (copy) {
      keep.add(copy);
      if (copy === next) next = copy.nextSibling;
    }
  }
  for (const old of Array.from(to.head.querySelectorAll(`[${COPIED}]`))) {
    if (!keep.has(old)) old.remove();
  }
}

export function CanvasFrame({
  children,
  title = 'Page canvas',
  style,
  onReady,
}: {
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
  /** Called with the iframe once its document is ready. */
  onReady?: (frame: HTMLIFrameElement, doc: Document) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  const setup = () => {
    const frame = ref.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body) return;
    syncStyles(document, doc);
    setBody(doc.body);
    onReady?.(frame, doc);
  };

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const onFrameLoad = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      syncStyles(document, doc);
      setBody(doc.body);
      onReady?.(frame, doc);
    };

    frame.addEventListener('load', onFrameLoad);
    onFrameLoad();
    const raf = requestAnimationFrame(onFrameLoad);

    return () => {
      cancelAnimationFrame(raf);
      frame.removeEventListener('load', onFrameLoad);
    };
  }, [onReady]);

  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!body || !doc) return;
    let pending = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => syncStyles(document, doc));
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(pending);
      observer.disconnect();
    };
  }, [body]);

  return (
    <>
      <iframe
        ref={ref}
        title={title}
        srcDoc={FRAME_DOC}
        onLoad={setup}
        style={{ display: 'block', width: '100%', height: '100%', border: 0, ...style }}
      />
      {body && createPortal(children, body)}
    </>
  );
}
