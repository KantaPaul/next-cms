'use client';

import { useEffect, useState } from 'react';
import { type SectionSettings, Section } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type MapProps = WithSection & {
  /** Address shown as text and searched on the map. */
  address?: string;
};

const FALLBACK_SRC =
  'https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik';

/**
 * Shows the address as text and as an OpenStreetMap embed. The embed centers on
 * the address via reverse geocoding; until it resolves the world view renders.
 */
export function Map(p: MapProps) {
  const address = p.address?.trim() ?? '';
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let active = true;
    const params = new URLSearchParams({ format: 'json', q: address, limit: '1' });
    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!active) return;
        const item = Array.isArray(data) ? data[0] : data;
        const lat = Number(item?.lat);
        const lon = Number(item?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        const halfSpan = 0.05;
        const west = lon - halfSpan;
        const south = Math.max(-85, lat - halfSpan);
        const east = lon + halfSpan;
        const north = Math.min(85, lat + halfSpan);
        setSrc(
          `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${lat},${lon}`
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [address]);

  if (!address) {
    if (!p.editing) return null;
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed border-[color:var(--site-border-subtle)] text-sm">
          Add an address in the sidebar
        </div>
      </Section>
    );
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <p className="s-muted mb-4 text-center text-sm font-medium tracking-wide">{address}</p>
      <div className="s-radius overflow-hidden border border-[color:var(--site-border-subtle)] bg-[var(--site-surface)] shadow-sm">
        <iframe
          className="aspect-[16/9] w-full"
          src={src ?? FALLBACK_SRC}
          title="Map"
          loading="lazy"
        />
      </div>
    </Section>
  );
}
