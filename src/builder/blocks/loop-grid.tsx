/**
 * Loop Grid (Elementor-style Loop Builder). Queries blog posts or one post
 * type's entries and renders a saved Loop Item template once per item. Layout,
 * pagination, empty state and JSON-LD come from QueryLoop; this block only
 * swaps the card for the template.
 */
import {
  type BlockComponents,
  type BuilderDocument,
  type FieldFilter,
  renderNodes,
  type SlotRender,
} from '@nextcms/builder-core';
import { PAGES } from '@/config/pages';
import { resolvePanels } from '../resolve-panels';
import { QueryLoop, type QueryLoopProps } from './query-loop';
import * as registry from './registry';

export type LoopGridSource = 'posts' | 'collection-entries';

export type LoopGridProps = Omit<QueryLoopProps, 'source' | 'layout'> & {
  source?: LoopGridSource;
  layout?: 'grid' | 'list' | 'masonry' | 'carousel';
  templateId?: string;
  fieldFilters?: FieldFilter[];
  equalHeight?: boolean;
  /** Loaded: the Loop Item template as a builder document. */
  template?: BuilderDocument | null;
  templateName?: string;
};

function hasBlocks(doc: BuilderDocument | null | undefined): doc is BuilderDocument {
  return !!doc && Array.isArray(doc.rootSlot) && doc.rootSlot.length > 0;
}

export function LoopGrid({
  template,
  templateId,
  templateName,
  equalHeight = true,
  editing,
  card: _unusedCard,
  hasCustomCard: _unusedHasCard,
  fieldFilters: _fieldFilters,
  source: _source,
  ...rest
}: LoopGridProps) {
  const ready = hasBlocks(template);

  // Read at call time: the registry imports this module.
  const components = registry.getBlockComponents() as unknown as BlockComponents;
  const card: SlotRender | undefined = ready
    ? options =>
        renderNodes(template, template.rootSlot, {
          components,
          editing: false,
          itemContext: options?.itemContext,
          transformProps: resolvePanels,
        })
    : undefined;

  return (
    <>
      {editing && !ready && (
        <div className="mx-auto mb-3 max-w-3xl rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
          {templateId ? (
            <>
              <strong>{templateName || 'This loop item template'}</strong> is
              empty. Design it in the{' '}
              <a
                href={PAGES.DASHBOARD.LOOP_TEMPLATE(templateId)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-700 underline"
              >
                loop item editor
              </a>
              . The default card is shown until then.
            </>
          ) : (
            <>
              Choose a <strong>Loop Item template</strong> in the inspector, or{' '}
              <a
                href={PAGES.DASHBOARD.LOOP_TEMPLATES}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-700 underline"
              >
                create one
              </a>
              . The default card is shown until then.
            </>
          )}
        </div>
      )}
      <QueryLoop
        {...rest}
        editing={editing}
        card={card}
        hasCustomCard={ready}
        // cardClassName={equalHeight ? 'h-full [&>*]:h-full' : undefined}
      />
    </>
  );
}
