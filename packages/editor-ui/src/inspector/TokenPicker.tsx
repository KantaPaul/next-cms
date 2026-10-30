import React from 'react';
import { Popover } from '../primitives/Popover.tsx';
import { Check } from 'lucide-react';

export interface DesignTokenOption {
  name: string;
  value: string;
  category?: string;
  cssVar?: string;
}

export interface TokenPickerProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'color' | 'spacing' | 'radius';
  className?: string;
}

const COLOR_TOKENS: DesignTokenOption[] = [
  { name: 'Brand Primary', value: '#2563EB', cssVar: '--ne-primary' },
  { name: 'Primary Soft', value: '#DBEAFE', cssVar: '--ne-primary-soft' },
  { name: 'Slate Dark', value: '#0F172A', cssVar: '--ne-text' },
  { name: 'Slate Muted', value: '#64748B', cssVar: '--ne-text-muted' },
  { name: 'Slate Light', value: '#F8FAFC', cssVar: '--ne-bg' },
  { name: 'Surface White', value: '#FFFFFF', cssVar: '--ne-surface' },
  { name: 'Success Emerald', value: '#059669', cssVar: '--ne-success' },
  { name: 'Warning Amber', value: '#D97706', cssVar: '--ne-warning' },
  { name: 'Danger Crimson', value: '#DC2626', cssVar: '--ne-danger' },
  { name: 'Purple Accent', value: '#8B5CF6' },
  { name: 'Cyan Accent', value: '#06B6D4' },
  { name: 'Transparent', value: 'transparent' },
];

const SPACING_TOKENS: DesignTokenOption[] = [
  { name: 'None (0)', value: '0px' },
  { name: 'X-Small (4px)', value: '4px' },
  { name: 'Small (8px)', value: '8px' },
  { name: 'Medium (12px)', value: '12px' },
  { name: 'Base (16px)', value: '16px' },
  { name: 'Large (24px)', value: '24px' },
  { name: 'X-Large (32px)', value: '32px' },
  { name: '2X-Large (48px)', value: '48px' },
];

export const TokenPicker: React.FC<TokenPickerProps> = ({
  value,
  onChange,
  type = 'color',
  className = '',
}) => {
  const tokens = type === 'color' ? COLOR_TOKENS : SPACING_TOKENS;

  if (type === 'color') {
    return (
      <Popover
        align="end"
        trigger={
          <div className={`flex items-center gap-1.5 h-7 px-2 border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] bg-[var(--ne-surface)] hover:bg-[var(--ne-surface-hover)] cursor-pointer select-none text-xs ${className}`}>
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
              style={{ backgroundColor: value }}
            />
            <span className="font-mono text-[11px] text-[var(--ne-text)] truncate max-w-[80px]">
              {value}
            </span>
          </div>
        }
        content={(close) => (
          <div className="w-56 space-y-2">
            <div className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider">
              Theme Token Swatches
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {COLOR_TOKENS.map((token) => {
                const isSelected = value.toLowerCase() === token.value.toLowerCase();
                return (
                  <button
                    key={token.name}
                    type="button"
                    title={`${token.name} (${token.value})`}
                    onClick={() => {
                      onChange(token.value);
                      close();
                    }}
                    className={`group relative h-8 rounded-[var(--ne-radius-sm)] border flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
                      isSelected ? 'ring-2 ring-[var(--ne-primary)] border-transparent' : 'border-[var(--ne-border)]'
                    }`}
                    style={{ backgroundColor: token.value }}
                  >
                    {isSelected && (
                      <Check className={`w-3.5 h-3.5 ${
                        token.value === '#FFFFFF' || token.value === '#F8FAFC' || token.value === '#DBEAFE'
                          ? 'text-slate-900'
                          : 'text-white'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--ne-border)]">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#HEX or var(--ne-...)"
                className="w-full h-6 px-2 text-xs font-mono bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-sm)] text-[var(--ne-text)] focus:outline-none focus:border-[var(--ne-primary)]"
              />
            </div>
          </div>
        )}
      />
    );
  }

  return (
    <Popover
      align="end"
      trigger={
        <div className={`flex items-center gap-1.5 h-7 px-2 border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] bg-[var(--ne-surface)] hover:bg-[var(--ne-surface-hover)] cursor-pointer select-none text-xs font-mono ${className}`}>
          <span className="text-[var(--ne-text)]">{value}</span>
        </div>
      }
      content={(close) => (
        <div className="w-48 space-y-1">
          <div className="text-[11px] font-semibold text-[var(--ne-text-muted)] uppercase tracking-wider mb-1.5">
            Spacing Scale Tokens
          </div>
          {SPACING_TOKENS.map((token) => (
            <button
              key={token.name}
              type="button"
              onClick={() => {
                onChange(token.value);
                close();
              }}
              className="w-full flex items-center justify-between px-2 py-1 text-xs rounded-[var(--ne-radius-sm)] hover:bg-[var(--ne-surface-hover)] text-left cursor-pointer transition-colors"
            >
              <span className="text-[var(--ne-text)]">{token.name}</span>
              <span className="font-mono text-[10px] text-[var(--ne-text-muted)]">{token.value}</span>
            </button>
          ))}
        </div>
      )}
    />
  );
};
