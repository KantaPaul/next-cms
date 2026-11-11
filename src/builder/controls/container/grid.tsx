'use client';

import {
  type ContainerSettings,
  GRID_AUTO_FLOWS,
  type GridAutoFlow,
  normalizeResponsiveEnum,
} from '../../style';
import { ResponsiveChoose } from '../primitives';
import { LinkedGapInput } from './gap';
import {
  COLUMN_TRACK_PRESETS,
  ResponsiveTrackInput,
  ROW_TRACK_PRESETS,
} from './track-input';

const FLOW_LABELS: Record<GridAutoFlow, string> = {
  row: 'Row',
  'row-dense': 'Row dense',
  column: 'Column',
  'column-dense': 'Column dense',
};

export function ContainerGridControl({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (value: ContainerSettings) => void;
}) {
  const c = value ?? {};
  const set = (patch: Partial<ContainerSettings>) =>
    onChange({ ...c, ...patch });

  return (
    <div className="space-y-3.5">
      <ResponsiveTrackInput
        label="Columns"
        value={c.gridTemplateColumns}
        presets={COLUMN_TRACK_PRESETS}
        placeholder="e.g. repeat(3, 1fr)"
        onChange={gridTemplateColumns => set({ gridTemplateColumns })}
      />

      <ResponsiveTrackInput
        label="Rows"
        value={c.gridTemplateRows}
        presets={ROW_TRACK_PRESETS}
        placeholder="e.g. auto 1fr"
        onChange={gridTemplateRows => set({ gridTemplateRows })}
      />

      <ResponsiveChoose<GridAutoFlow>
        label="Auto flow"
        columns={2}
        value={c.gridAutoFlow}
        options={GRID_AUTO_FLOWS.map(v => ({ value: v, label: FLOW_LABELS[v] }))}
        onChange={next =>
          set({
            gridAutoFlow: normalizeResponsiveEnum(next, GRID_AUTO_FLOWS),
          })
        }
      />

      <LinkedGapInput value={c} onChange={set} />
    </div>
  );
}
