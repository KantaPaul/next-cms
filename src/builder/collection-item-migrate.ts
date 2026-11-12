import type { BuilderDocument } from '@nextcms/builder-core';

/**
 * Collection item and Loop item field blocks used to show one `field` with
 * block-level options. They now take a list of `items`, each with its own
 * options and style. This turns the old shape into a one-row list so the
 * inspector shows (and edits) what the canvas renders. Untouched nodes keep
 * identity.
 */
export function migrateCollectionItems(doc: BuilderDocument): BuilderDocument {
  let changed = false;
  const nodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (node.type === 'CollectionItem') {
      const { field, textSize, showLabel, items, ...rest } =
        node.props as Record<string, unknown>;
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
    } else if (node.type === 'LoopItemField') {
      const {
        field,
        customKey,
        linkToItem,
        showGalleryBadge,
        galleryBadgePosition,
        readMoreLabel,
        items,
        ...rest
      } = node.props as Record<string, unknown>;
      const hasItems = Array.isArray(items) && items.length > 0;
      if (hasItems || typeof field !== 'string' || !field) continue;
      changed = true;
      const elementsObj = (
        rest.elements && typeof rest.elements === 'object' ? rest.elements : {}
      ) as Record<string, unknown>;
      const trimmedReadMore =
        typeof readMoreLabel === 'string' && readMoreLabel.trim()
          ? readMoreLabel.trim()
          : 'Read more';
      nodes[id] = {
        ...node,
        props: {
          ...rest,
          items: [
            {
              field,
              customKey: typeof customKey === 'string' ? customKey : '',
              linkToItem: linkToItem !== false,
              showGalleryBadge: showGalleryBadge !== false,
              galleryBadgePosition:
                typeof galleryBadgePosition === 'string'
                  ? galleryBadgePosition
                  : 'top-right',
              readMoreLabel: trimmedReadMore,
              urlLinkText: trimmedReadMore === 'Read more' ? '' : trimmedReadMore,
              urlDisplay: 'link',
              dateFormat: 'medium',
              galleryViewMode: 'featured-slider',
              galleryAspect: 'wide',
              excludeFeaturedImage: false,
              termsDisplay: 'badges',
              textSize: 'auto',
              showLabel: false,
              labelText: '',
              style:
                (elementsObj.value as Record<string, unknown>) ??
                (elementsObj.image as Record<string, unknown>) ??
                (elementsObj.link as Record<string, unknown>) ??
                {},
              labelStyle: {},
              badgeStyle:
                (elementsObj.galleryBadge as Record<string, unknown>) ?? {},
            },
          ],
        },
      };
    }
  }
  return changed ? { ...doc, nodes } : doc;
}
