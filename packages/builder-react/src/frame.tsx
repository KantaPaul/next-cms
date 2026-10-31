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

function syncStyles(from: Document, to: Document) {
  for (const old of Array.from(to.head.querySelectorAll(`[${COPIED}]`))) old.remove();
  for (const sheet of Array.from(from.querySelectorAll('link[rel="stylesheet"], style'))) {
    const copy = sheet.cloneNode(true) as Element;
    copy.setAttribute(COPIED, '');
    to.head.appendChild(copy);
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
