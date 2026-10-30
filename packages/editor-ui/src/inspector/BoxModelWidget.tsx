import React, { useState } from 'react';
import { Link2, Link2Off } from 'lucide-react';

export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModelWidgetProps {
  margin: BoxSpacing;
  padding: BoxSpacing;
  onMarginChange: (margin: BoxSpacing) => void;
  onPaddingChange: (padding: BoxSpacing) => void;
  unit?: string;
  className?: string;
}

export const BoxModelWidget: React.FC<BoxModelWidgetProps> = ({
  margin,
  padding,
  onMarginChange,
  onPaddingChange,
  unit = 'px',
  className = '',
}) => {
  const [marginLinked, setMarginLinked] = useState(false);
  const [paddingLinked, setPaddingLinked] = useState(false);

  const updateMarginSide = (side: keyof BoxSpacing, val: number) => {
    if (marginLinked) {
      onMarginChange({ top: val, right: val, bottom: val, left: val });
    } else {
      onMarginChange({ ...margin, [side]: val });
    }
  };

  const updatePaddingSide = (side: keyof BoxSpacing, val: number) => {
    if (paddingLinked) {
      onPaddingChange({ top: val, right: val, bottom: val, left: val });
    } else {
      onPaddingChange({ ...padding, [side]: val });
    }
  };

  const renderSmallInput = (
    val: number,
    onChange: (newVal: number) => void,
    placeholder = '0'
  ) => {
    return (
      <input
        type="number"
        value={val}
        onChange={(e) => {
          const num = parseInt(e.target.value, 10);
          onChange(isNaN(num) ? 0 : num);
        }}
        placeholder={placeholder}
        className="w-8 h-4 text-[10px] text-center font-mono tabular-nums bg-transparent hover:bg-[var(--ne-surface)] focus:bg-[var(--ne-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--ne-primary)] rounded-[2px] text-[var(--ne-text)] border border-transparent hover:border-[var(--ne-border)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  };

  return (
    <div className={`p-2 bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] select-none text-[10px] font-mono ${className}`}>
      {/* Outer Box: Margin */}
      <div className="relative border border-dashed border-[var(--ne-warning)]/60 bg-[var(--ne-warning-soft)]/15 rounded-[var(--ne-radius-sm)] p-4 flex flex-col items-center">
        {/* Margin Label & Lock */}
        <div className="absolute top-1 left-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[var(--ne-warning)] font-sans font-semibold">
          <span>margin</span>
          <button
            type="button"
            onClick={() => setMarginLinked(!marginLinked)}
            title={marginLinked ? 'Unlink sides' : 'Link all sides'}
            className="p-0.5 hover:text-[var(--ne-text)] cursor-pointer"
          >
            {marginLinked ? <Link2 className="w-2.5 h-2.5 text-[var(--ne-primary)]" /> : <Link2Off className="w-2.5 h-2.5 opacity-60" />}
          </button>
        </div>

        {/* Margin Top */}
        <div className="mb-1">{renderSmallInput(margin.top, (v) => updateMarginSide('top', v))}</div>

        <div className="flex items-center justify-between w-full">
          {/* Margin Left */}
          <div>{renderSmallInput(margin.left, (v) => updateMarginSide('left', v))}</div>

          {/* Inner Box: Padding */}
          <div className="relative border border-solid border-[var(--ne-primary)]/50 bg-[var(--ne-primary-soft)]/20 rounded-[var(--ne-radius-sm)] px-5 py-3 flex flex-col items-center flex-1 mx-2">
            {/* Padding Label & Lock */}
            <div className="absolute top-0.5 left-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-[var(--ne-primary)] font-sans font-semibold">
              <span>pad</span>
              <button
                type="button"
                onClick={() => setPaddingLinked(!paddingLinked)}
                title={paddingLinked ? 'Unlink sides' : 'Link all sides'}
                className="p-0.5 hover:text-[var(--ne-text)] cursor-pointer"
              >
                {paddingLinked ? <Link2 className="w-2.5 h-2.5 text-[var(--ne-primary)]" /> : <Link2Off className="w-2.5 h-2.5 opacity-60" />}
              </button>
            </div>

            {/* Padding Top */}
            <div className="mb-1">{renderSmallInput(padding.top, (v) => updatePaddingSide('top', v))}</div>

            <div className="flex items-center justify-between w-full">
              {/* Padding Left */}
              <div>{renderSmallInput(padding.left, (v) => updatePaddingSide('left', v))}</div>

              {/* Core / Content box */}
              <div className="mx-2 px-2 py-1 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[2px] text-[9px] text-[var(--ne-text-muted)] text-center font-sans">
                content
              </div>

              {/* Padding Right */}
              <div>{renderSmallInput(padding.right, (v) => updatePaddingSide('right', v))}</div>
            </div>

            {/* Padding Bottom */}
            <div className="mt-1">{renderSmallInput(padding.bottom, (v) => updatePaddingSide('bottom', v))}</div>
          </div>

          {/* Margin Right */}
          <div>{renderSmallInput(margin.right, (v) => updateMarginSide('right', v))}</div>
        </div>

        {/* Margin Bottom */}
        <div className="mt-1">{renderSmallInput(margin.bottom, (v) => updateMarginSide('bottom', v))}</div>
      </div>
    </div>
  );
};
