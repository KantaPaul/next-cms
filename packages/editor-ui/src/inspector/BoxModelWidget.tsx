import { ChevronsUpDown, Link, Unlink } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { useScrub } from '../controls/useScrub';

export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type BoxLinkMode = 'all' | 'axial' | 'independent';

export interface BoxModelWidgetProps {
  margin: BoxSpacing;
  padding: BoxSpacing;
  onMarginChange: (margin: BoxSpacing) => void;
  onPaddingChange: (padding: BoxSpacing) => void;
  unit?: string;
  className?: string;
}

interface MiniInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
}

const MiniInput: React.FC<MiniInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const { onPointerDown } = useScrub({
    value,
    onChange,
    step: 1,
    min: 0,
    disabled,
  });

  return (
    <div className="inline-flex items-center gap-0.5">
      {label && (
        <span
          onPointerDown={disabled ? undefined : onPointerDown}
          className="cursor-ew-resize font-mono text-[8px] uppercase text-[var(--ne-text-muted)] select-none hover:text-[var(--ne-primary)]"
          title={`Drag to scrub ${label}`}
        >
          {label}
        </span>
      )}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={e => {
          const num = parseInt(e.target.value, 10);
          onChange(Number.isNaN(num) ? 0 : num);
        }}
        className="w-7 h-4 text-[10px] text-center font-mono tabular-nums bg-transparent hover:bg-[var(--ne-surface)] focus:bg-[var(--ne-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--ne-primary)] rounded-[2px] text-[var(--ne-text)] border border-transparent hover:border-[var(--ne-border)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
};

export const BoxModelWidget: React.FC<BoxModelWidgetProps> = ({
  margin,
  padding,
  onMarginChange,
  onPaddingChange,
  unit = 'px',
  className = '',
}) => {
  const [marginMode, setMarginMode] = useState<BoxLinkMode>('independent');
  const [paddingMode, setPaddingMode] = useState<BoxLinkMode>('independent');

  const cycleMode = (mode: BoxLinkMode): BoxLinkMode => {
    if (mode === 'independent') return 'all';
    if (mode === 'all') return 'axial';
    return 'independent';
  };

  const updateMarginSide = (side: keyof BoxSpacing, val: number) => {
    if (marginMode === 'all') {
      onMarginChange({ top: val, right: val, bottom: val, left: val });
    } else if (marginMode === 'axial') {
      if (side === 'top' || side === 'bottom') {
        onMarginChange({ ...margin, top: val, bottom: val });
      } else {
        onMarginChange({ ...margin, right: val, left: val });
      }
    } else {
      onMarginChange({ ...margin, [side]: val });
    }
  };

  const updatePaddingSide = (side: keyof BoxSpacing, val: number) => {
    if (paddingMode === 'all') {
      onPaddingChange({ top: val, right: val, bottom: val, left: val });
    } else if (paddingMode === 'axial') {
      if (side === 'top' || side === 'bottom') {
        onPaddingChange({ ...padding, top: val, bottom: val });
      } else {
        onPaddingChange({ ...padding, right: val, left: val });
      }
    } else {
      onPaddingChange({ ...padding, [side]: val });
    }
  };

  const modeIcon = (mode: BoxLinkMode) => {
    if (mode === 'all') return <Link className="w-2.5 h-2.5 text-[var(--ne-primary)]" />;
    if (mode === 'axial') return <ChevronsUpDown className="w-2.5 h-2.5 text-[var(--ne-primary)]" />;
    return <Unlink className="w-2.5 h-2.5 opacity-60" />;
  };

  const modeTitle = (mode: BoxLinkMode) => {
    if (mode === 'all') return 'All sides linked (click for axial split)';
    if (mode === 'axial') return 'Axial split (click for independent)';
    return 'Independent sides (click to link all)';
  };

  return (
    <div
      className={cn(
        'p-2 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] select-none text-[10px] font-mono',
        className
      )}
    >
      {/* Outer Box: Margin */}
      <div className="relative border border-dashed border-[var(--ne-warning)]/60 bg-[var(--ne-warning-soft)]/15 rounded-[var(--ne-radius-sm)] p-4 flex flex-col items-center">
        {/* Margin Label & Link Mode */}
        <div className="absolute top-1 left-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[var(--ne-warning)] font-sans font-semibold">
          <span>margin</span>
          <button
            type="button"
            onClick={() => setMarginMode(cycleMode(marginMode))}
            title={modeTitle(marginMode)}
            aria-label={modeTitle(marginMode)}
            className="p-0.5 hover:text-[var(--ne-text)] cursor-pointer"
          >
            {modeIcon(marginMode)}
          </button>
        </div>

        {/* Margin Top */}
        <div className="mb-1">
          <MiniInput
            value={margin.top}
            onChange={v => updateMarginSide('top', v)}
            label={marginMode === 'axial' ? 'Y' : undefined}
          />
        </div>

        <div className="flex items-center justify-between w-full">
          {/* Margin Left */}
          <div>
            <MiniInput
              value={margin.left}
              onChange={v => updateMarginSide('left', v)}
              label={marginMode === 'axial' ? 'X' : undefined}
            />
          </div>

          {/* Inner Box: Padding */}
          <div className="relative border border-solid border-[var(--ne-primary)]/50 bg-[var(--ne-primary-soft)]/20 rounded-[var(--ne-radius-sm)] px-5 py-3 flex flex-col items-center flex-1 mx-2">
            {/* Padding Label & Link Mode */}
            <div className="absolute top-0.5 left-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[var(--ne-primary)] font-sans font-semibold">
              <span>pad</span>
              <button
                type="button"
                onClick={() => setPaddingMode(cycleMode(paddingMode))}
                title={modeTitle(paddingMode)}
                aria-label={modeTitle(paddingMode)}
                className="p-0.5 hover:text-[var(--ne-text)] cursor-pointer"
              >
                {modeIcon(paddingMode)}
              </button>
            </div>

            {/* Padding Top */}
            <div className="mb-1">
              <MiniInput
                value={padding.top}
                onChange={v => updatePaddingSide('top', v)}
                label={paddingMode === 'axial' ? 'Y' : undefined}
              />
            </div>

            <div className="flex items-center justify-between w-full">
              {/* Padding Left */}
              <div>
                <MiniInput
                  value={padding.left}
                  onChange={v => updatePaddingSide('left', v)}
                  label={paddingMode === 'axial' ? 'X' : undefined}
                />
              </div>

              {/* Core Content Box */}
              <div className="h-5 px-2 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[2px] flex items-center justify-center text-[9px] text-[var(--ne-text-muted)]">
                {unit}
              </div>

              {/* Padding Right */}
              <div>
                <MiniInput
                  value={padding.right}
                  onChange={v => updatePaddingSide('right', v)}
                />
              </div>
            </div>

            {/* Padding Bottom */}
            <div className="mt-1">
              <MiniInput
                value={padding.bottom}
                onChange={v => updatePaddingSide('bottom', v)}
              />
            </div>
          </div>

          {/* Margin Right */}
          <div>
            <MiniInput
              value={margin.right}
              onChange={v => updateMarginSide('right', v)}
            />
          </div>
        </div>

        {/* Margin Bottom */}
        <div className="mt-1">
          <MiniInput
            value={margin.bottom}
            onChange={v => updateMarginSide('bottom', v)}
          />
        </div>
      </div>
    </div>
  );
};
