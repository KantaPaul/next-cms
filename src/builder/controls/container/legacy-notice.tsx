'use client';

import type { SectionSettings } from '../../style';

function hasTruthyValues(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Object.values(obj as Record<string, unknown>).some(v => {
    if (v === undefined || v === null || v === '') return false;
    if (typeof v === 'object') return hasTruthyValues(v);
    return true;
  });
}

function hasAlignValue(val: unknown): boolean {
  if (typeof val === 'string') return val.trim() !== '';
  if (val && typeof val === 'object') {
    return Object.values(val as Record<string, unknown>).some(
      v => typeof v === 'string' && v.trim() !== ''
    );
  }
  return false;
}

/** Lists human-readable names of hidden legacy styles saved on a Container's `section`. */
export function getLegacySectionStyleLabels(
  section: SectionSettings | undefined
): string[] {
  if (!section || typeof section !== 'object') return [];
  const raw = section as SectionSettings & { textAlign?: unknown };
  const labels: string[] = [];

  if (hasTruthyValues(raw.typography)) labels.push('Typography');
  if (typeof raw.textColor === 'string' && raw.textColor.trim() !== '') {
    labels.push('Text color');
  }
  if (hasTruthyValues(raw.display)) labels.push('Height & alignment');
  if (hasAlignValue(raw.align) || hasAlignValue(raw.textAlign)) {
    labels.push('Text alignment');
  }

  return labels;
}

export function hasLegacySectionStyles(
  section: SectionSettings | undefined
): boolean {
  return getLegacySectionStyleLabels(section).length > 0;
}

export function ContainerLegacyNotice({
  value,
  onChange,
}: {
  value: SectionSettings | undefined;
  onChange: (value: Partial<SectionSettings>) => void;
}) {
  const labels = getLegacySectionStyleLabels(value);
  if (labels.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-2 text-[11px] text-amber-900">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-medium">Hidden legacy styles</p>
          <p className="text-amber-800/90">
            Saved on this container ({labels.join(', ')}). They still render on
            the page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next: Record<string, unknown> = {
              ...(value ?? {}),
              typography: undefined,
              textColor: undefined,
              display: undefined,
              align: undefined,
              textAlign: undefined,
            };
            onChange(next as Partial<SectionSettings>);
          }}
          className="shrink-0 rounded border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
