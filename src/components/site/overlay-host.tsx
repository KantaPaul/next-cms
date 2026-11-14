'use client';

import {
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useConsent } from '@/components/site/consent-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  readOverlayStorage,
  shouldShow,
  writeOverlayStorage,
} from '@/lib/overlays/frequency';
import {
  resolveBackdropColor,
  resolveOverlayPanelStyle,
} from '@/lib/overlays/layout-style';
import type { OverlaySettings } from '@/lib/overlays/types';
import {
  collectLightboxItems,
  LightboxProvider,
  type LightboxContextValue,
} from '@/components/site/lightbox-context';
import { LoopItemProvider } from '@/builder/blocks/query-loop-client';
import {
  type BuilderDocument,
  type NormalizedListingItem,
  resolveDynamicDocument,
} from '@nextcms/builder-core';

/** Clicks on these close the overlay or work its controls, so they aren't conversions. */
export const NOT_A_CONVERSION =
  '[data-overlay-close],[data-slot="dialog-close"],[data-overlay-dismiss],[data-overlay-ui]';

export type OverlayHostItem = {
  id: string;
  name: string;
  category: 'Popup' | 'Drawer';
  settings: OverlaySettings;
  renderedContent: ReactNode;
  /** Document with per-item bindings intact (External API Item, Loop Item). */
  clientDocument?: BuilderDocument;
  publishedAt: string | null;
  draft: boolean;
};

type ItemRenderModules = {
  renderer: typeof import('@/builder/renderer');
  queryLoop: typeof import('@/builder/blocks/query-loop');
};

/**
 * A popup opened from a Loop Grid item: renders the popup document in the
 * browser with that item as the binding context, so "External API Item"
 * fields show the clicked record. Shows the server render while the
 * renderer loads.
 */
function ItemPopupContent({
  document,
  item,
  fallback,
}: {
  document: BuilderDocument;
  item: NormalizedListingItem;
  fallback: ReactNode;
}) {
  const [modules, setModules] = useState<ItemRenderModules | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([import('@/builder/renderer'), import('@/builder/blocks/query-loop')])
      .then(([renderer, queryLoop]) => {
        if (live) setModules({ renderer, queryLoop });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const resolved = useMemo(
    () =>
      modules
        ? resolveDynamicDocument(document, {
            ...modules.queryLoop.itemBindingContext(item),
            preserveLoopBindings: true,
          })
        : null,
    [document, item, modules]
  );
  if (!modules || !resolved) return <>{fallback}</>;
  return (
    <LoopItemProvider item={item}>
      <modules.renderer.BuilderRenderer
        kind="page"
        document={resolved}
        metadata={{ editing: false }}
      />
    </LoopItemProvider>
  );
}

type EventType = 'view' | 'close' | 'conversion';

function currentDevice(): 'desktop' | 'tablet' | 'mobile' {
  if (window.matchMedia('(max-width: 767px)').matches) return 'mobile';
  if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet';
  return 'desktop';
}

function sendEvent(overlay: OverlayHostItem, type: EventType) {
  // Drafts are only rendered in preview sessions; never count them.
  if (overlay.draft) return;

  try {
    const url = `/api/overlays/${encodeURIComponent(overlay.id)}/event`;
    const payload = JSON.stringify({ type });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        url,
        new Blob([payload], { type: 'application/json' })
      );
    } else {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics must never break the page.
  }
}

/** Popup position → classes. Each one resets the dialog's centred defaults it doesn't use. */
const POPUP_POSITION: Record<string, string> = {
  center: 'top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2',
  top: 'top-8 bottom-auto start-1/2 -translate-x-1/2 translate-y-0',
  bottom: 'top-auto bottom-8 start-1/2 -translate-x-1/2 translate-y-0',
  'top-left': 'top-8 bottom-auto start-8 end-auto translate-x-0 translate-y-0',
  'top-right':
    'top-8 bottom-auto start-auto end-8 translate-x-0 translate-y-0',
  'bottom-left':
    'top-auto bottom-8 start-8 end-auto translate-x-0 translate-y-0',
  'bottom-right':
    'top-auto bottom-8 start-auto end-8 translate-x-0 translate-y-0',
};

export function OverlayHost({ overlays }: { overlays: OverlayHostItem[] }) {
  const { isOpen: consentPromptOpen } = useConsent();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<
    Record<string, LightboxContextValue>
  >({});
  const lightboxDataRef = useRef<Record<string, LightboxContextValue>>({});
  const [loopItemData, setLoopItemData] = useState<
    Record<string, NormalizedListingItem>
  >({});
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalContainer(document.querySelector<HTMLElement>('.site-root'));
  }, []);

  // Mutable mirrors so trigger listeners never need to re-subscribe when an
  // overlay opens or closes (which would restart delay timers and re-arm exit intent).
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const activeRef = useRef<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const reported = useRef<Set<string>>(new Set());

  const report = useCallback((overlay: OverlayHostItem, type: EventType) => {
    // One view and one conversion per overlay per page view.
    if (type !== 'close') {
      const key = `${overlay.id}:${type}`;
      if (reported.current.has(key)) return;
      reported.current.add(key);
    }

    sendEvent(overlay, type);
  }, []);

  const open = useCallback(
    (overlayId: string, manual = false) => {
      const overlay = overlaysRef.current.find(o => o.id === overlayId);
      if (!overlay) return;
      if (activeRef.current === overlayId) return;

      const devices = overlay.settings.targeting?.devices;
      if (devices?.length && !devices.includes(currentDevice())) return;

      // A visitor's own click always opens; automatic triggers respect the cap.
      if (!manual) {
        const state = readOverlayStorage(overlay.id, overlay.publishedAt);
        if (!shouldShow(overlay.settings.frequency, state)) return;
      }

      if (activeRef.current) {
        if (!queueRef.current.includes(overlayId))
          queueRef.current.push(overlayId);
        return;
      }

      activeRef.current = overlayId;
      setActiveId(overlayId);
      const prior = readOverlayStorage(overlay.id, overlay.publishedAt);
      writeOverlayStorage(overlay.id, overlay.publishedAt, {
        viewCount: (prior?.viewCount ?? 0) + 1,
        lastViewedAt: Date.now(),
        sessionViewed: true,
      });
      report(overlay, 'view');
    },
    [report]
  );

  const close = useCallback(() => {
    const id = activeRef.current;
    if (!id) return;
    const overlay = overlaysRef.current.find(o => o.id === id);
    if (overlay) report(overlay, 'close');
    activeRef.current = null;
    setActiveId(null);
    delete lightboxDataRef.current[id];
    setLightboxData(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const next = queueRef.current.shift();
    // Let the exit animation finish before the next one opens.
    if (next) window.setTimeout(() => open(next), 300);
  }, [open, report]);

  const onInteract = useCallback(
    (event: SyntheticEvent) => {
      const overlay = overlaysRef.current.find(
        o => o.id === activeRef.current
      );
      if (!overlay) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(
          NOT_A_CONVERSION
        )
      )
        return;
      const isCta =
        event.type === 'submit' ||
        Boolean(target.closest('a[href],button,input[type="submit"]'));
      if (!isCta) return;
      writeOverlayStorage(overlay.id, overlay.publishedAt, {
        converted: true,
        convertedAt: Date.now(),
      });
      report(overlay, 'conversion');
    },
    [report]
  );

  // Re-arm triggers only when the set of overlays changes (client navigation).
  const idsKey = overlays.map(o => o.id).join('|');

  useEffect(() => {
    const list = overlaysRef.current;
    if (!list.length) return;
    const cleanups: (() => void)[] = [];

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-overlay-close]')) {
        close();
        return;
      }

      const opener = target.closest<HTMLElement>(
        '[data-overlay-open],a[href^="#overlay:"]'
      );
      let openerId: string | null = null;
      if (opener) {
        openerId = opener.getAttribute('data-overlay-open');
        if (!openerId) {
          const href = opener.getAttribute('href');
          if (href?.startsWith('#overlay:')) {
            openerId = href.slice('#overlay:'.length).trim() || null;
          }
        }
      }

      if (openerId && opener) {
        event.preventDefault();
        const lightbox = collectLightboxItems(opener);
        const id = openerId;
        if (lightbox) {
          lightboxDataRef.current[id] = lightbox;
          setLightboxData(prev => ({ ...prev, [id]: lightbox }));
        } else {
          delete lightboxDataRef.current[id];
          setLightboxData(prev => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
        const rawLoopItem = opener.getAttribute('data-overlay-loop-item');
        if (rawLoopItem) {
          try {
            const parsedItem = JSON.parse(rawLoopItem) as NormalizedListingItem;
            setLoopItemData(prev => ({ ...prev, [id]: parsedItem }));
          } catch {
            // ignore malformed JSON
          }
        } else {
          setLoopItemData(prev => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
        open(openerId, true);
        return;
      }

      for (const overlay of overlaysRef.current) {
        const { type, selector } = overlay.settings.trigger ?? {};
        if (type !== 'click' || !selector) continue;

        try {
          if (target.closest(selector)) {
            event.preventDefault();
            open(overlay.id, true);
            return;
          }
        } catch {
          // An invalid selector typed in the builder must not break clicks.
        }
      }
    };

    document.addEventListener('click', onDocumentClick);
    cleanups.push(() => document.removeEventListener('click', onDocumentClick));

    for (const overlay of list) {
      const trigger = overlay.settings.trigger;
      if (!trigger) continue;

      if (trigger.type === 'load' || trigger.type === 'delay') {
        const ms =
          trigger.type === 'load'
            ? 150
            : Math.max(0, Number(trigger.delaySec ?? 3)) * 1000;
        const timer = window.setTimeout(() => open(overlay.id), ms);
        cleanups.push(() => window.clearTimeout(timer));
      }

      if (trigger.type === 'scroll') {
        const goal = Math.min(
          100,
          Math.max(1, Number(trigger.scrollPercent ?? 50))
        );

        const onScroll = () => {
          const total =
            document.documentElement.scrollHeight - window.innerHeight;
          if (total <= 0) return;

          if ((window.scrollY / total) * 100 >= goal) {
            window.removeEventListener('scroll', onScroll);
            open(overlay.id);
          }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', onScroll));
      }

      if (trigger.type === 'exit') {
        let fired = false;

        const fire = () => {
          if (fired) return;
          fired = true;
          open(overlay.id);
        };

        // Desktop: the pointer leaves through the top edge of the window.
        const onMouseOut = (event: MouseEvent) => {
          if (!event.relatedTarget && event.clientY <= 0) fire();
        };

        // Touch: a fast flick back up towards the address bar.
        let lastY = window.scrollY;
        let lastT = performance.now();

        const onScroll = () => {
          const y = window.scrollY;
          const t = performance.now();
          const dy = y - lastY;
          const dt = t - lastT;
          if (dt > 0 && dy < -50 && y < 200 && Math.abs(dy) / dt > 1.2)
            fire();
          lastY = y;
          lastT = t;
        };

        document.addEventListener('mouseout', onMouseOut);
        const touch = window.matchMedia('(pointer: coarse)').matches;
        if (touch)
          window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => {
          document.removeEventListener('mouseout', onMouseOut);
          window.removeEventListener('scroll', onScroll);
        });
      }
    }

    return () => {
      for (const fn of cleanups) fn();
    };
    // idsKey stands in for `overlays`; open/close are stable.
  }, [idsKey, open, close]);

  // A navigation that drops the open overlay closes it.
  useEffect(() => {
    if (activeRef.current && !overlays.some(o => o.id === activeRef.current)) {
      activeRef.current = null;
      queueRef.current = [];
      setActiveId(null);
    }
  }, [overlays]);

  // A modal popup blocks every click outside it, including the cookie banner,
  // so the visitor's first "Accept" only closed the promo. Wait for the
  // consent choice; the popup then shows as soon as the banner closes.
  const current = consentPromptOpen
    ? undefined
    : overlays.find(o => o.id === activeId);
  if (!current) return null;

  const { settings, category, renderedContent, name } = current;
  const layout = settings.layout;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noAnimation = reduced || layout.animation === 'none';

  const dismissProps = {
    onPointerDownOutside: (event: Event) => {
      if (!layout.closeOnOverlay) event.preventDefault();
    },
    onInteractOutside: (event: Event) => {
      // Without a backdrop the page behind stays usable and clicks there don't close it.
      if (!layout.closeOnOverlay || !layout.overlay) event.preventDefault();
    },
    onEscapeKeyDown: (event: KeyboardEvent) => {
      if (!layout.closeOnEsc) event.preventDefault();
    },
  };
  const backdropColor = resolveBackdropColor(layout.overlayColor);
  const overlayStyle: CSSProperties = layout.overlay
    ? backdropColor
      ? { backgroundColor: backdropColor }
      : {}
    : { display: 'none' };
  const background = layout.background || undefined;
  const panelStyle = resolveOverlayPanelStyle(layout, category, layout.position);

  // Rendered after the content (with a z-index) so a block's own background can't cover it.
  const closeButton =
    layout.showCloseButton !== false ? (
      <button
        type="button"
        data-overlay-dismiss=""
        onClick={close}
        aria-label="Close"
        className="absolute end-3 top-3 z-20 inline-flex size-8 items-center justify-center rounded-full bg-black/5 text-current opacity-80 transition hover:bg-black/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="size-4" aria-hidden />
      </button>
    ) : null;

  const currentLightbox = activeId ? lightboxData[activeId] ?? null : null;
  const currentLoopItem = activeId ? loopItemData[activeId] ?? null : null;
  const innerContent = currentLoopItem ? (
    <LoopItemProvider item={currentLoopItem}>
      {current.clientDocument ? (
        <ItemPopupContent
          document={current.clientDocument}
          item={currentLoopItem}
          fallback={renderedContent}
        />
      ) : (
        renderedContent
      )}
    </LoopItemProvider>
  ) : (
    renderedContent
  );
  const contentWithLightbox = (
    <LightboxProvider value={currentLightbox}>{innerContent}</LightboxProvider>
  );

  if (category === 'Drawer') {
    const side =
      layout.position === 'left' ||
      layout.position === 'top' ||
      layout.position === 'bottom'
        ? layout.position
        : 'right';
    const horizontal = side === 'left' || side === 'right';
    return (
      <Sheet
        open
        modal={layout.overlay !== false}
        onOpenChange={next => {
          if (!next) close();
        }}
      >
        <SheetContent
          side={side}
          showCloseButton={false}
          overlayStyle={overlayStyle}
          portalContainer={portalContainer}
          className={cn(
            's-ov-panel overflow-y-auto shadow-2xl',
            noAnimation && '!animate-none !duration-0'
          )}
          style={{
            ...panelStyle,
            maxWidth: horizontal ? '100vw' : undefined,
            backgroundColor: background,
          }}
          onClick={onInteract}
          onSubmit={onInteract}
          {...dismissProps}
        >
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>{name}</SheetTitle>
            </SheetHeader>
          </VisuallyHidden>
          {contentWithLightbox}
          {closeButton}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog
      open
      modal={layout.overlay !== false}
      onOpenChange={next => {
        if (!next) close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayStyle={overlayStyle}
        portalContainer={portalContainer}
        className={cn(
          's-ov-panel block overflow-y-auto shadow-2xl sm:max-w-none',
          POPUP_POSITION[layout.position] ?? POPUP_POSITION.center,
          layout.animation === 'fade' &&
            'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100',
          noAnimation && '!animate-none !duration-0'
        )}
        style={{
          ...panelStyle,
          maxWidth: 'calc(100vw - 2rem)',
          backgroundColor: background,
        }}
        onClick={onInteract}
        onSubmit={onInteract}
        {...dismissProps}
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        {contentWithLightbox}
        {closeButton}
      </DialogContent>
    </Dialog>
  );
}
