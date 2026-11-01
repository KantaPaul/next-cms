import React, { useState } from 'react';
import { EasingField, FieldGroup, FieldRow, SliderField } from '@nextcms/editor-ui';
import { Clapperboard, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useEditor, useEditorStore } from './context';

export interface AnimationViewProps {
  className?: string;
}

export type AnimationConfig = {
  entrance?: string;
  duration?: number;
  delay?: number;
  easing?: string;
};

const ENTRANCE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'fadeInUp', label: 'Fade In Up' },
  { value: 'fadeInDown', label: 'Fade In Down' },
  { value: 'fadeInLeft', label: 'Fade In Left' },
  { value: 'fadeInRight', label: 'Fade In Right' },
  { value: 'zoomIn', label: 'Zoom In' },
  { value: 'bounceIn', label: 'Bounce In' },
  { value: 'slideInUp', label: 'Slide In Up' },
  { value: 'slideInDown', label: 'Slide In Down' },
  { value: 'slideInLeft', label: 'Slide In Left' },
  { value: 'slideInRight', label: 'Slide In Right' },
];

export const AnimationView: React.FC<AnimationViewProps> = ({ className = '' }) => {
  const store = useEditorStore();
  const selection = useEditor(state => state.selection);
  const doc = useEditor(state => state.doc);
  const [previewKey, setPreviewKey] = useState(0);

  const selectedId = selection.length === 1 ? selection[0] : null;
  const selectedNode = selectedId ? doc.nodes[selectedId] : null;

  if (!selectedNode || !selectedId) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 text-center text-[var(--ne-text-muted)] min-h-[300px] ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] flex items-center justify-center mb-3 text-[var(--ne-text-muted)]">
          <Clapperboard className="w-6 h-6" />
        </div>
        <h4 className="text-xs font-semibold text-[var(--ne-text)] mb-1">
          No Block Selected
        </h4>
        <p className="text-xs max-w-xs leading-relaxed text-[var(--ne-text-muted)]">
          Select a block on the canvas to configure its entrance effect, timing, and easing curve.
        </p>
      </div>
    );
  }

  const rawAnimation = (selectedNode.props?.animation as AnimationConfig) || {};
  const currentEntrance = rawAnimation.entrance || 'none';
  const currentDuration = typeof rawAnimation.duration === 'number' ? rawAnimation.duration : 600;
  const currentDelay = typeof rawAnimation.delay === 'number' ? rawAnimation.delay : 0;
  const currentEasing = rawAnimation.easing || 'ease-out';

  const update = (patch: Partial<AnimationConfig>) => {
    const next: AnimationConfig = {
      entrance: currentEntrance,
      duration: currentDuration,
      delay: currentDelay,
      easing: currentEasing,
      ...patch,
    };
    store.updateProps(selectedId, { animation: next });
    setPreviewKey(k => k + 1);
  };

  const handleReset = () => {
    store.updateProps(selectedId, {
      animation: {
        entrance: 'none',
        duration: 600,
        delay: 0,
        easing: 'ease-out',
      },
    });
    setPreviewKey(k => k + 1);
  };

  const nodeLabel =
    selectedNode.meta?.name ||
    store.schemas[selectedNode.type]?.label ||
    selectedNode.type;

  return (
    <div className={`p-4 space-y-4 overflow-y-auto ne-scrollbar ${className}`}>
      {/* Selected Block Info Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--ne-border)]">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--ne-text-muted)]">
            Block Animation
          </span>
          <h3 className="text-xs font-semibold text-[var(--ne-text)] truncate max-w-[200px]">
            {nodeLabel}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleReset}
          title="Reset animation to default"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-[var(--ne-border)] hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Live Preview Box */}
      <div className="rounded-lg border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-4 flex flex-col items-center justify-center gap-3">
        <div className="relative w-full h-24 flex items-center justify-center overflow-hidden bg-[var(--ne-surface)] rounded-md border border-[var(--ne-border-subtle)]">
          <div
            key={previewKey}
            className={`px-4 py-2 rounded bg-[var(--ne-primary)] text-white text-xs font-medium shadow-sm transition-all flex items-center gap-1.5`}
            style={{
              animationDuration: `${currentDuration}ms`,
              animationDelay: `${currentDelay}ms`,
              animationTimingFunction: currentEasing,
              animationFillMode: 'both',
              animationName:
                currentEntrance !== 'none' ? `ne-${currentEntrance}` : undefined,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentEntrance !== 'none' ? currentEntrance : 'No Animation'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPreviewKey(k => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-[var(--ne-surface)] border border-[var(--ne-border)] hover:bg-[var(--ne-surface-hover)] text-[var(--ne-text)] shadow-2xs transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current text-[var(--ne-primary)]" />
          <span>Replay Animation</span>
        </button>
      </div>

      {/* Animation Properties Form */}
      <FieldGroup title="Entrance Effect" defaultExpanded>
        <FieldRow label="Effect">
          <select
            value={currentEntrance}
            onChange={e => update({ entrance: e.target.value })}
            className="w-full h-8 px-2 text-xs rounded-md border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ne-primary)] cursor-pointer"
          >
            {ENTRANCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Duration (ms)">
          <SliderField
            value={currentDuration}
            min={100}
            max={3000}
            step={50}
            unit="ms"
            onChange={val => update({ duration: val })}
          />
        </FieldRow>

        <FieldRow label="Delay (ms)">
          <SliderField
            value={currentDelay}
            min={0}
            max={2000}
            step={50}
            unit="ms"
            onChange={val => update({ delay: val })}
          />
        </FieldRow>
      </FieldGroup>

      <FieldGroup title="Easing Curve" defaultExpanded>
        <EasingField
          label="Timing Function"
          value={currentEasing}
          onChange={val => update({ easing: val })}
        />
      </FieldGroup>
    </div>
  );
};
