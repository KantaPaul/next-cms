'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type LightboxItem = {
  url: string;
  alt?: string;
  caption?: string;
};

export type LightboxContextValue = {
  images: LightboxItem[];
  initialIndex: number;
};

type TriggerElement = Pick<Element, 'getAttribute'> & {
  closest(selector: string): (TriggerElement & ParentNodeLike) | null;
};
type ParentNodeLike = {
  querySelectorAll(selector: string): Iterable<TriggerElement>;
};

function overlayIdOf(trigger: TriggerElement): string | null {
  const id = trigger.getAttribute('data-overlay-open');
  if (id) return id;
  const href = trigger.getAttribute('href');
  return href?.startsWith('#overlay:')
    ? href.slice('#overlay:'.length).trim() || null
    : null;
}

/**
 * The images a clicked trigger opens. Inside a `data-overlay-group` (a Gallery)
 * that is every image opening the same overlay, so an image with its own
 * override isn't mixed in. Returns null when the trigger carries no image.
 */
export function collectLightboxItems(
  opener: TriggerElement
): LightboxContextValue | null {
  if (!opener.getAttribute('data-overlay-image')) return null;
  const openerId = overlayIdOf(opener);
  const group = opener.closest('[data-overlay-group]');
  const triggers = group
    ? Array.from(group.querySelectorAll('[data-overlay-image]')).filter(
        trigger => overlayIdOf(trigger) === openerId
      )
    : [opener];
  const list = triggers.includes(opener) ? triggers : [opener];
  return {
    images: list.map(trigger => ({
      url: trigger.getAttribute('data-overlay-image') ?? '',
      alt: trigger.getAttribute('data-overlay-alt') || undefined,
      caption: trigger.getAttribute('data-overlay-caption') || undefined,
    })),
    initialIndex: list.indexOf(opener),
  };
}

/** The index one step away, wrapping when `loop` is on and staying put at the ends when off. */
export function stepLightboxIndex(
  index: number,
  count: number,
  direction: -1 | 1,
  loop: boolean
): number {
  if (count <= 1) return index;
  const target = index + direction;
  if (target >= 0 && target < count) return target;
  if (!loop) return index;
  return direction === 1 ? 0 : count - 1;
}

/** How far a zoomed image can pan before its edge would come into view. */
export function clampLightboxPan(
  pan: number,
  size: number,
  zoom: number
): number {
  const limit = (Math.max(1, zoom) - 1) * (size / 2);
  return Math.min(limit, Math.max(-limit, pan));
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function LightboxProvider({
  value,
  children,
}: {
  value: LightboxContextValue | null;
  children?: ReactNode;
}) {
  return (
    <LightboxContext.Provider value={value}>
      {children}
    </LightboxContext.Provider>
  );
}

export function useLightbox(): LightboxContextValue | null {
  return useContext(LightboxContext);
}
