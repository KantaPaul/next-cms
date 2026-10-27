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
    const params = new URLSearchParams({ format: 'json', address, limit: '1' });
    fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!active) return;
        const lat = Number(data?.lat);
        const lon = Number(data?.lon);
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
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed text-sm">
          Add an address in the sidebar
        </div>
      </Section>
    );
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <p className="s-muted mb-3 text-center text-sm">{address}</p>
      <iframe
        className="s-radius aspect-[16/9] w-full rounded border"
        src={src ?? FALLBACK_SRC}
        title="Map"
        loading="lazy"
      />
    </Section>
  );
}
