'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { UrlValue } from '../style';
import { el, type WithSection } from './element';
import { Section } from './section';
import { BlockIcon } from '../icons';

export type HotspotItem = {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  title: string;
  content?: string;
  icon?: string;
  link?: UrlValue;
};

export type HotspotProps = WithSection & {
  image?: string;
  imageAlt?: string;
  spots?: HotspotItem[];
  pulse?: boolean;
  trigger?: 'hover' | 'click';
  spotColor?: string;
  onChangeSpots?: (spots: HotspotItem[]) => void;
};

export function Hotspot(p: HotspotProps) {
  const spots = p.spots ?? [
    {
      id: 'spot-1',
      x: 35,
      y: 40,
      title: 'Feature Hotspot',
      content: 'Click or hover to reveal contextual details.',
    },
  ];
  const pulse = p.pulse ?? true;
  const trigger = p.trigger ?? 'hover';
  const spotColor = p.spotColor || 'var(--site-primary, #4f46e5)';

  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const imgEl = el(p, 'image');

  // Drag-to-place in editor
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    if (!p.editing) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));

      const updated = spots.map(s => (s.id === id ? { ...s, x: Math.round(x), y: Math.round(y) } : s));
      p.onChangeSpots?.(updated);
    };

    const onPointerUp = () => {
      setDraggingId(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-steel-200 select-none dark:border-dark-300"
      >
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={p.imageAlt || 'Hotspot background'}
            className={cn('w-full h-auto object-cover block', imgEl.className)}
            style={imgEl.style}
          />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-steel-100 text-steel-400 dark:bg-dark-200">
            <BlockIcon name="Image" className="size-16" />
          </div>
        )}

        {/* Hotspots */}
        {spots.map(spot => {
          const isActive = activeSpotId === spot.id;

          return (
            <div
              key={spot.id}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 group',
                p.editing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              )}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                zIndex: isActive || draggingId === spot.id ? 40 : 20,
              }}
              onMouseEnter={() => trigger === 'hover' && setActiveSpotId(spot.id)}
              onMouseLeave={() => trigger === 'hover' && setActiveSpotId(null)}
              onClick={() => {
                if (trigger === 'click') {
                  setActiveSpotId(isActive ? null : spot.id);
                }
              }}
              onPointerDown={e => handlePointerDown(spot.id, e)}
            >
              {/* Pulse Ring */}
              {pulse && (
                <span
                  className="absolute inset-0 size-8 -translate-x-1/4 -translate-y-1/4 rounded-full opacity-75 animate-ping pointer-events-none"
                  style={{ backgroundColor: spotColor }}
                />
              )}

              {/* Pin Icon */}
              <button
                type="button"
                className="relative flex size-6 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-110 focus:outline-none"
                style={{ backgroundColor: spotColor }}
                aria-label={spot.title}
              >
                {spot.icon ? (
                  <BlockIcon name={spot.icon} className="size-3.5" />
                ) : (
                  <Plus className="size-3.5 stroke-[3]" />
                )}
              </button>

              {/* Tooltip Content */}
              {(isActive || (p.editing && draggingId === spot.id)) && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 rounded-xl border border-steel-200 bg-white p-3.5 shadow-xl text-left dark:border-dark-300 dark:bg-dark-100 animate-in fade-in zoom-in-95 pointer-events-auto"
                >
                  <h4 className="text-sm font-bold text-foreground">
                    {spot.title}
                  </h4>
                  {spot.content && (
                    <p className="mt-1 text-xs text-steel-500 leading-relaxed dark:text-steel-400">
                      {spot.content}
                    </p>
                  )}
                  {spot.link && (
                    <a
                      href={typeof spot.link === 'string' ? spot.link : spot.link.url}
                      className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      Learn more →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
