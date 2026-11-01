import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, CornerDownLeft, Plus, Star } from 'lucide-react';
import React, { useMemo } from 'react';
import { cn } from '../lib/cn';
import { useLayerScope } from '../theme/EditorUIProvider';
import { BlockIcon } from './BlockIcon';
import { BlockThumbnailPreview } from './BlockThumbnailPreview';

/** A block as the library shows it: identity plus the definition's metadata. */
export interface BlockLibraryBlock {
  type: string;
  label: string;
  /** Section title the block is listed under. */
  category: string;
  /** Icon name from the block definition. */
  icon?: string;
  description?: string;
  capabilities?: string[];
  semanticTag?: string;
  nesting?: 'children' | 'leaf';
  defaultSize?: string;
}

export interface BlockHoverPreviewProps {
  /** The block to describe; nothing renders while it or `anchor` is null. */
  block: BlockLibraryBlock | null;
  /** The library card the preview sits beside. */
  anchor: HTMLElement | null;
  /** Preferred side of the card; flips when there is no room. */
  side?: 'left' | 'right';
  isFavorite?: boolean;
  onToggleFavorite?: (type: string) => void;
  onAdd: (type: string) => void;
  /** Escape or a click outside. */
  onClose: () => void;
  /** Lets the host keep the preview open while the pointer is over it. */
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export const BlockHoverPreview: React.FC<BlockHoverPreviewProps> = ({
  block,
  anchor,
  side = 'right',
  isFavorite = false,
  onToggleFavorite,
  onAdd,
  onClose,
  onPointerEnter,
  onPointerLeave,
}) => {
  const layer = useLayerScope();
  const virtualRef = useMemo(() => ({ current: anchor }), [anchor]);
  const open = !!block && !!anchor;

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      {anchor && (
        <PopoverPrimitive.Anchor
          virtualRef={virtualRef as React.RefObject<HTMLElement>}
        />
      )}
      {block && (
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side={side}
            align="center"
            sideOffset={12}
            collisionPadding={16}
            // A hover preview must not pull focus off the card.
            onOpenAutoFocus={e => e.preventDefault()}
            onCloseAutoFocus={e => e.preventDefault()}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            aria-label={`${block.label} preview`}
            {...layer}
            className={cn(
              layer.className,
              'ne-motion-pop z-50 flex w-[300px] select-none flex-col overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-text)] shadow-lg focus:outline-none'
            )}
          >
            <div className="flex items-center gap-2 border-b border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] text-[var(--ne-primary)]">
                <BlockIcon name={block.icon} label={block.label} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold">
                    {block.label}
                  </span>
                  <span className="shrink-0 rounded-[var(--ne-radius-sm)] bg-[var(--ne-primary-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ne-primary)]">
                    {block.category}
                  </span>
                </div>
                {block.description && (
                  <p className="truncate text-[11px] text-[var(--ne-text-muted)]">
                    {block.description}
                  </p>
                )}
              </div>
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(block.type)}
                  aria-pressed={isFavorite}
                  aria-label={
                    isFavorite
                      ? `Remove ${block.label} from favorites`
                      : `Add ${block.label} to favorites`
                  }
                  className={cn(
                    'cursor-pointer rounded-[var(--ne-radius-sm)] p-1.5 hover:bg-[var(--ne-surface-hover)]',
                    isFavorite
                      ? 'text-[var(--ne-warning)]'
                      : 'text-[var(--ne-text-subtle)] hover:text-[var(--ne-text)]'
                  )}
                >
                  <Star
                    aria-hidden
                    className={cn('h-4 w-4', isFavorite && 'fill-current')}
                  />
                </button>
              )}
            </div>

            <div className="h-[128px] border-b border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-3">
              <BlockThumbnailPreview type={block.type} />
            </div>

            <div className="ne-scrollbar max-h-[220px] space-y-3 overflow-y-auto p-3">
              <section>
                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-subtle)]">
                  Overview
                </h4>
                <p className="text-xs leading-relaxed text-[var(--ne-text-muted)]">
                  {block.description ?? `Adds a ${block.label} block.`}
                </p>
              </section>

              <dl className="grid grid-cols-2 gap-2 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-2 text-[11px]">
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-[var(--ne-text-subtle)]">
                    Semantic Tag
                  </dt>
                  <dd className="font-mono font-medium">
                    &lt;{block.semanticTag ?? 'div'}&gt;
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-[var(--ne-text-subtle)]">
                    Nesting
                  </dt>
                  <dd className="font-medium">
                    {block.nesting === 'children'
                      ? 'Children supported'
                      : 'Single leaf block'}
                  </dd>
                </div>
                <div className="col-span-2 flex items-center justify-between border-t border-[var(--ne-border)] pt-1 text-[10px]">
                  <dt className="text-[var(--ne-text-muted)]">Default Size</dt>
                  <dd className="font-mono">{block.defaultSize ?? 'auto'}</dd>
                </div>
              </dl>

              {!!block.capabilities?.length && (
                <section>
                  <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-subtle)]">
                    Key Capabilities
                  </h4>
                  <ul className="space-y-1">
                    {block.capabilities.map(capability => (
                      <li
                        key={capability}
                        className="flex items-start gap-1.5 text-xs text-[var(--ne-text-muted)]"
                      >
                        <Check
                          aria-hidden
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ne-primary)]"
                        />
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-2.5">
              <span className="flex items-center gap-1 text-[11px] text-[var(--ne-text-subtle)]">
                <CornerDownLeft aria-hidden className="h-3 w-3" />
                Click to add
              </span>
              <button
                type="button"
                onClick={() => onAdd(block.type)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--ne-radius-md)] bg-[var(--ne-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--ne-primary-hover)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]"
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
                Add to Canvas
              </button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      )}
    </PopoverPrimitive.Root>
  );
};
