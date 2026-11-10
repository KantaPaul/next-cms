'use client';

import { useEffect, useState } from 'react';
import { useConsent } from '@/components/site/consent-provider';
import { ConsentEmbedPlaceholder } from '@/components/site/embed-consent-gate';
import { el, type WithSection } from './element';
import { Section } from './section';

export type MapProps = WithSection & {
  /** Address shown as text and searched on the map. */
  address?: string;
};

const FALLBACK_SRC =
  'https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik';

/**
 * Shows the address as text and as an OpenStreetMap embed. The embed centers on
 * the address via forward geocoding; until it resolves the world view renders.
 * Gated on marketing consent so no third-party request happens before consent.
 */
export function Map(p: MapProps) {
  const address = p.address?.trim() ?? '';
  const [src, setSrc] = useState<string | null>(null);
  const { hasConsent, acceptCategory } = useConsent();
  const [loadedOnce, setLoadedOnce] = useState(false);

  const canLoad = Boolean(p.editing) || hasConsent('marketing') || loadedOnce;

  useEffect(() => {
    if (!address || !canLoad) return;
    let active = true;
    const params = new URLSearchParams({
      format: 'json',
      q: address,
      limit: '1',
    });
    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!active) return;
        // `/search` returns an array of matches.
        const hit = Array.isArray(data) ? data[0] : data;
        const lat = Number(hit?.lat);
        const lon = Number(hit?.lon);
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
  }, [address, canLoad]);

  if (!address) {
    if (!p.editing) return null;
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-surface s-border s-muted s-radius flex aspect-[16/9] items-center justify-center border border-dashed text-sm">
          Add an address in the sidebar
        </div>
      </Section>
    );
  }

  const captionEl = el(p, 'caption', 's-muted mb-3 text-center text-sm');
  const frameEl = el(
    p,
    'frame',
    's-radius aspect-[16/9] w-full rounded border'
  );

  return (
    <Section section={p.section} editing={p.editing}>
      <p className={captionEl.className} style={captionEl.style}>
        {address}
      </p>
      {canLoad ? (
        <iframe
          className={frameEl.className}
          style={frameEl.style}
          src={src ?? FALLBACK_SRC}
          title="Map"
          loading="lazy"
        />
      ) : (
        <ConsentEmbedPlaceholder
          provider="OpenStreetMap"
          title={address}
          onLoadOnce={() => setLoadedOnce(true)}
          onAlwaysAllow={() => void acceptCategory('marketing')}
        />
      )}
    </Section>
  );
}
