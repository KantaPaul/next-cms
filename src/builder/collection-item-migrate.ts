import type { BuilderDocument } from '@nextcms/builder-core';

/**
 * Collection item blocks used to show one `field` with block-level
 * `textSize` / `showLabel`. They now take a list of `items`, each with its
 * own style. This turns the old shape into a one-row list so the inspector
 * shows (and edits) what the canvas renders. Untouched nodes keep identity.
 */
export function migrateCollectionItems(doc: BuilderDocument): BuilderDocument {
  let changed = false;
  const nodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (node.type !== 'CollectionItem') continue;
    const { field, textSize, showLabel, items, ...rest } = node.props as Record<
      string,
      unknown
    >;
    const hasItems = Array.isArray(items) && items.length > 0;
    if (hasItems || typeof field !== 'string' || !field) continue;
    changed = true;
    nodes[id] = {
      ...node,
      props: {
        ...rest,
        items: [
          {
            field,
            textSize: typeof textSize === 'string' ? textSize : 'auto',
            showLabel: showLabel !== false,
            labelText: '',
            style: {},
            labelStyle: {},
          },
        ],
      },
    };
  }
  return changed ? { ...doc, nodes } : doc;
}
