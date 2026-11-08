import * as Lucide from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Lucide exports that are not icons, or whose names shadow JS globals
 * (`Infinity`, `Map`) and were never offered as block icons.
 */
const EXCLUDED = new Set(['Icon', 'Infinity', 'Map']);

/**
 * Every Lucide icon, keyed by export name (including the `*Icon` and
 * `Lucide*` aliases), in ASCII order.
 *
 * Built from one namespace import on purpose: listing ~5.6k named imports
 * makes Next's barrel optimization embed the full name list into every one
 * of them (~600 MB of generated code), which breaks `next build`.
 */
export const BLOCK_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  Object.keys(Lucide)
    .filter(
      name =>
        /^[A-Z]/.test(name) &&
        !EXCLUDED.has(name) &&
        typeof (Lucide as Record<string, unknown>)[name] === 'object'
    )
    .sort()
    .map(name => [
      name,
      (Lucide as unknown as Record<string, LucideIcon>)[name],
    ])
);

export const ICON_OPTIONS = [
  { label: 'None', value: '' },
  ...Object.keys(BLOCK_ICONS).map(name => ({ label: name, value: name })),
];

export function BlockIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = name ? BLOCK_ICONS[name] : undefined;
  return Icon ? <Icon className={className} aria-hidden /> : null;
}
