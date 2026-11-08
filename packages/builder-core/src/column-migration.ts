/**
 * Pure, idempotent, deterministic migration of legacy column slots
 * (`left/center/right`, `col1..6`, `column1..4`) on `Columns`, `HeaderBar`,
 * `HeaderColumns`, and `FooterColumns` into real `Column` child blocks.
 *
 * Covers all three stored representations:
 * - Puck zones (`${parentId}:left`, `${parentId}:col1`, `${parentId}:column1`)
 * - Puck inline slot arrays on `props` (`props.left = [...]`, `props.column1 = [...]`)
 * - `BuilderDocument` (`node.slots.left`, `node.slots.col1`, `node.slots.column1`)
 */

import {
  type BuilderDocument,
  type BuilderNode,
  isBuilderDocument,
  isLegacyPuckData,
  META_PROP,
  type NodeId,
  type NodeMeta,
} from './document';
import type { PuckData, PuckItem } from './puck-data';

export const COLUMN_PARENT_TYPES = new Set([
  'Columns',
  'HeaderBar',
  'HeaderColumns',
  'FooterColumns',
]);

const HEADER_BAR_SLOTS = ['left', 'center', 'right'] as const;
const HEADER_FOOTER_COL_SLOTS = [
  'col1',
  'col2',
  'col3',
  'col4',
  'col5',
  'col6',
] as const;
const PAGE_COLUMNS_SLOTS = [
  'column1',
  'column2',
  'column3',
  'column4',
] as const;

const LEGACY_SLOTS_BY_TYPE: Record<string, readonly string[]> = {
  Columns: PAGE_COLUMNS_SLOTS,
  HeaderBar: HEADER_BAR_SLOTS,
  HeaderColumns: HEADER_FOOTER_COL_SLOTS,
  FooterColumns: HEADER_FOOTER_COL_SLOTS,
};

const SIZE_RE = /^\d+(\.\d+)?(px|%|rem|em|fr|ch|vw)$/;

export type ColumnSpec = {
  slotKey: string;
  width: string;
  align?: 'start' | 'center' | 'end';
  active: boolean;
};

function resolveLegacyWidth(
  widthProp: unknown,
  sizeProp: unknown,
  fallback: string
): string {
  if (widthProp === 'auto' || widthProp === 'fill') return widthProp;
  if (widthProp === 'custom') {
    const size = typeof sizeProp === 'string' ? sizeProp.trim() : '';
    return SIZE_RE.test(size) ? size : 'fill';
  }
  if (typeof widthProp === 'string' && SIZE_RE.test(widthProp.trim())) {
    return widthProp.trim();
  }
  return fallback;
}

function resolveLegacyAlign(
  alignProp: unknown,
  fallback?: 'start' | 'center' | 'end'
): 'start' | 'center' | 'end' | undefined {
  if (alignProp === 'start' || alignProp === 'center' || alignProp === 'end') {
    return alignProp;
  }
  return fallback;
}

/**
 * Computes the column specifications for each legacy slot of a parent block,
 * mapping legacy layout presets and custom column props to identical CSS widths.
 */
export function buildColumnSpecsForParent(
  type: string,
  props: Record<string, unknown>,
  slotHasContent?: (slotKey: string) => boolean
): ColumnSpec[] {
  if (type === 'Columns') {
    const layout = typeof props.layout === 'string' ? props.layout : undefined;
    let activeWidths: string[];
    switch (layout) {
      case '1-1-1':
        activeWidths = ['fill', 'fill', 'fill'];
        break;
      case '1-1-1-1':
        activeWidths = ['fill', 'fill', 'fill', 'fill'];
        break;
      case '2-1':
        activeWidths = ['2fr', '1fr'];
        break;
      case '1-2':
        activeWidths = ['1fr', '2fr'];
        break;
      case '1-1':
        activeWidths = ['fill', 'fill'];
        break;
      default: {
        const legacyCount =
          typeof props.columns === 'number'
            ? Math.min(Math.max(Math.round(props.columns), 1), 4)
            : 2;
        activeWidths = Array.from({ length: legacyCount }, () => 'fill');
        break;
      }
    }
    return PAGE_COLUMNS_SLOTS.map((slotKey, index) => ({
      slotKey,
      width: activeWidths[index] ?? 'fill',
      active: index < activeWidths.length,
    }));
  }

  if (type === 'HeaderBar') {
    const layout =
      typeof props.layout === 'string' ? props.layout : 'left-center-right';
    if (layout === 'split-2') {
      return [
        { slotKey: 'left', width: 'fill', align: 'start', active: true },
        { slotKey: 'center', width: 'fill', align: 'center', active: false },
        { slotKey: 'right', width: 'auto', align: 'end', active: true },
      ];
    }
    if (layout === 'equal-3') {
      return [
        { slotKey: 'left', width: 'fill', align: 'start', active: true },
        { slotKey: 'center', width: 'fill', align: 'center', active: true },
        { slotKey: 'right', width: 'fill', align: 'end', active: true },
      ];
    }
    if (layout === 'left-heavy') {
      return [
        { slotKey: 'left', width: '2fr', align: 'start', active: true },
        { slotKey: 'center', width: '1fr', align: 'center', active: true },
        { slotKey: 'right', width: '1fr', align: 'end', active: true },
      ];
    }
    if (layout === 'right-heavy') {
      return [
        { slotKey: 'left', width: '1fr', align: 'start', active: true },
        { slotKey: 'center', width: '1fr', align: 'center', active: true },
        { slotKey: 'right', width: '2fr', align: 'end', active: true },
      ];
    }
    if (layout === 'custom') {
      const leftWidth = resolveLegacyWidth(
        props.leftWidth,
        props.leftSize,
        'auto'
      );
      const centerWidth = resolveLegacyWidth(
        props.centerWidth,
        props.centerSize,
        'fill'
      );
      const rightWidth = resolveLegacyWidth(
        props.rightWidth,
        props.rightSize,
        'auto'
      );
      const centerHasItems = slotHasContent ? slotHasContent('center') : true;
      const centerActive = !(
        props.centerWidth === 'auto' && !centerHasItems
      );
      return [
        {
          slotKey: 'left',
          width: leftWidth,
          align: resolveLegacyAlign(props.leftAlign, 'start'),
          active: true,
        },
        {
          slotKey: 'center',
          width: centerWidth,
          align: resolveLegacyAlign(props.centerAlign, 'center'),
          active: centerActive,
        },
        {
          slotKey: 'right',
          width: rightWidth,
          align: resolveLegacyAlign(props.rightAlign, 'end'),
          active: true,
        },
      ];
    }
    // Default: 'left-center-right'
    return [
      { slotKey: 'left', width: 'auto', align: 'start', active: true },
      { slotKey: 'center', width: 'fill', align: 'center', active: true },
      { slotKey: 'right', width: 'auto', align: 'end', active: true },
    ];
  }

  if (type === 'HeaderColumns') {
    const activeCount =
      typeof props.columns === 'number'
        ? Math.min(Math.max(Math.round(props.columns), 1), 6)
        : 3;
    return HEADER_FOOTER_COL_SLOTS.map((slotKey, index) => {
      const n = index + 1;
      const width = resolveLegacyWidth(
        props[`col${n}Width`],
        props[`col${n}Size`],
        'fill'
      );
      const align = resolveLegacyAlign(props[`col${n}Align`], undefined);
      return {
        slotKey,
        width,
        ...(align ? { align } : {}),
        active: index < activeCount,
      };
    });
  }

  if (type === 'FooterColumns') {
    const activeCount =
      typeof props.columns === 'number'
        ? Math.min(Math.max(Math.round(props.columns), 1), 6)
        : 4;
    return HEADER_FOOTER_COL_SLOTS.map((slotKey, index) => ({
      slotKey,
      width: 'fill',
      active: index < activeCount,
    }));
  }

  return [];
}

/** Deterministic ID for a migrated Column node. */
export function deterministicColumnId(parentId: string, slotKey: string): string {
  return `${parentId}-col-${slotKey}`;
}

/** Clean legacy slot arrays and legacy per-column props from a migrated parent's props. */
function cleanParentProps(
  type: string,
  props: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...props };
  const legacySlots = LEGACY_SLOTS_BY_TYPE[type] ?? [];
  for (const slotKey of legacySlots) {
    delete next[slotKey];
  }
  if (type === 'HeaderBar') {
    delete next.leftWidth;
    delete next.leftSize;
    delete next.leftAlign;
    delete next.centerWidth;
    delete next.centerSize;
    delete next.centerAlign;
    delete next.rightWidth;
    delete next.rightSize;
    delete next.rightAlign;
  } else if (type === 'HeaderColumns') {
    for (let i = 1; i <= 6; i++) {
      delete next[`col${i}Width`];
      delete next[`col${i}Size`];
      delete next[`col${i}Align`];
    }
    if (typeof next.columns === 'number') {
      delete next.columns;
    }
  } else if (type === 'FooterColumns') {
    if (typeof next.columns === 'number') {
      delete next.columns;
    }
  } else if (type === 'Columns') {
    if (typeof next.columns === 'number') {
      delete next.columns;
    }
  }
  return next;
}

function isPuckItemArray(value: unknown): value is PuckItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      v =>
        v &&
        typeof v === 'object' &&
        typeof (v as PuckItem).type === 'string' &&
        typeof (v as PuckItem).props === 'object'
    )
  );
}

/**
 * Entry point 1: Migrate a `BuilderDocument` in-place (pure, idempotent, deterministic).
 */
export function migrateDocumentColumns(doc: BuilderDocument): BuilderDocument {
  if (!doc || !doc.nodes || typeof doc.nodes !== 'object') return doc;

  let changed = false;
  const nodes: Record<NodeId, BuilderNode> = { ...doc.nodes };

  // First pass: ensure any existing Column nodes have `slots.content`
  for (const [id, node] of Object.entries(nodes)) {
    if (!node || node.type !== 'Column') continue;
    if (!node.slots?.content || Array.isArray(node.props?.content)) {
      const nextProps = { ...node.props };
      delete nextProps.content;
      nodes[id] = {
        ...node,
        props: nextProps,
        slots: {
          ...node.slots,
          content: node.slots?.content ?? [],
        },
      };
      changed = true;
    }
  }

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (!node || !COLUMN_PARENT_TYPES.has(node.type)) continue;

    const legacySlots = LEGACY_SLOTS_BY_TYPE[node.type] ?? [];
    const hasLegacySlotInSlots = legacySlots.some(
      k => node.slots && k in node.slots
    );
    const hasLegacySlotInProps = legacySlots.some(k =>
      Array.isArray(node.props?.[k])
    );
    const alreadyHasColumns =
      Array.isArray(node.slots?.columns) &&
      node.slots.columns.length > 0 &&
      !hasLegacySlotInSlots;

    if (alreadyHasColumns) {
      // Still strip any leftover empty legacy slot arrays from props if present
      if (hasLegacySlotInProps || Array.isArray(node.props?.columns)) {
        const cleanedProps = cleanParentProps(node.type, node.props ?? {});
        delete cleanedProps.columns;
        nodes[id] = { ...nodes[id], props: cleanedProps };
        changed = true;
      }
      continue;
    }

    const specs = buildColumnSpecsForParent(
      node.type,
      node.props ?? {},
      slotKey => (node.slots?.[slotKey]?.length ?? 0) > 0
    );

    const columnIds: NodeId[] = [];
    const nextSlots: Record<string, NodeId[]> = {};
    for (const [slotKey, childIds] of Object.entries(node.slots ?? {})) {
      if (!legacySlots.includes(slotKey)) {
        nextSlots[slotKey] = childIds;
      }
    }

    for (const spec of specs) {
      const childIds = node.slots?.[spec.slotKey] ?? [];
      if (!spec.active && childIds.length === 0) continue;

      const colId = deterministicColumnId(id, spec.slotKey);
      const colProps: Record<string, unknown> = {
        width: spec.width,
        ...(spec.align ? { align: spec.align } : {}),
      };
      const meta: NodeMeta | undefined = !spec.active
        ? { hidden: true }
        : undefined;

      nodes[colId] = {
        id: colId,
        type: 'Column',
        props: colProps,
        slots: { content: childIds },
        ...(meta ? { meta } : {}),
      };
      columnIds.push(colId);
    }

    nextSlots.columns = columnIds;
    const cleanedProps = cleanParentProps(node.type, node.props ?? {});
    delete cleanedProps.columns;

    nodes[id] = {
      ...node,
      props: cleanedProps,
      slots: nextSlots,
    };
    changed = true;
  }

  return changed ? { ...doc, nodes } : doc;
}

/**
 * Entry point 2 & 3: Migrate `PuckData` covering both `zones` (`${id}:left`)
 * and inline slot arrays on `props` (`props.left = [...]`).
 */
export function migratePuckColumns(
  data: PuckData,
  options: { mode?: 'auto' | 'zones' | 'inline' } = {}
): PuckData {
  if (!data || typeof data !== 'object') return data;

  let changed = false;
  const zonesOut: Record<string, PuckItem[]> = {};
  const inputZones = data.zones ?? {};
  for (const [k, v] of Object.entries(inputZones)) {
    zonesOut[k] = v;
  }

  let autoCounter = 0;

  function migrateItem(item: PuckItem): PuckItem {
    if (!item || typeof item !== 'object') return item;
    const rawProps = (item.props ?? {}) as Record<string, unknown>;
    let itemChanged = false;
    const nextProps: Record<string, unknown> = { ...rawProps };

    // Recursively migrate any non-legacy inline slot arrays or panel items first
    const legacySlots = LEGACY_SLOTS_BY_TYPE[item.type] ?? [];
    for (const [key, value] of Object.entries(nextProps)) {
      if (legacySlots.includes(key)) continue;
      if (isPuckItemArray(value) && value.length > 0) {
        const migratedArr = value.map(migrateItem);
        if (migratedArr.some((m, idx) => m !== value[idx])) {
          nextProps[key] = migratedArr;
          itemChanged = true;
        }
        continue;
      }
      if (Array.isArray(value) && value.length > 0) {
        let panelArrChanged = false;
        const nextArr = value.map(entry => {
          if (!entry || typeof entry !== 'object') return entry;
          const rec = entry as Record<string, unknown>;
          if (isPuckItemArray(rec.content) && rec.content.length > 0) {
            const contentArr = rec.content;
            const migratedContent = contentArr.map(migrateItem);
            if (migratedContent.some((m, idx) => m !== contentArr[idx])) {
              panelArrChanged = true;
              return { ...rec, content: migratedContent };
            }
          }
          return entry;
        });
        if (panelArrChanged) {
          nextProps[key] = nextArr;
          itemChanged = true;
        }
      }
    }

    if (!COLUMN_PARENT_TYPES.has(item.type)) {
      if (itemChanged) {
        changed = true;
        return { ...item, props: nextProps as PuckItem['props'] };
      }
      return item;
    }

    const parentId =
      typeof nextProps.id === 'string' && nextProps.id.length > 0
        ? nextProps.id
        : `${item.type}-auto-${++autoCounter}`;

    // Check if already migrated
    const hasZonesColumns =
      Array.isArray(zonesOut[`${parentId}:columns`]) &&
      zonesOut[`${parentId}:columns`].length > 0;
    const hasInlineColumns =
      Array.isArray(nextProps.columns) &&
      isPuckItemArray(nextProps.columns) &&
      nextProps.columns.some(c => c.type === 'Column');
    const hasLegacyZone = legacySlots.some(
      slotKey => `${parentId}:${slotKey}` in zonesOut
    );
    const hasLegacyInlineNonEmpty = legacySlots.some(
      slotKey =>
        Array.isArray(nextProps[slotKey]) &&
        (nextProps[slotKey] as unknown[]).length > 0
    );

    if ((hasZonesColumns || hasInlineColumns) && !hasLegacyZone && !hasLegacyInlineNonEmpty) {
      // Already migrated: still recurse into existing Column children
      if (hasZonesColumns) {
        const cols = zonesOut[`${parentId}:columns`];
        zonesOut[`${parentId}:columns`] = cols.map(col => {
          const cid = col.props?.id;
          if (cid && Array.isArray(zonesOut[`${cid}:content`])) {
            const m = zonesOut[`${cid}:content`].map(migrateItem);
            if (m.some((x, i) => x !== zonesOut[`${cid}:content`][i])) {
              zonesOut[`${cid}:content`] = m;
              changed = true;
            }
          }
          return migrateItem(col);
        });
      }
      if (hasInlineColumns) {
        const cols = nextProps.columns as PuckItem[];
        const mCols = cols.map(migrateItem);
        if (mCols.some((x, i) => x !== cols[i])) {
          nextProps.columns = mCols;
          itemChanged = true;
        }
      }
      if (itemChanged) {
        changed = true;
        return { ...item, props: nextProps as PuckItem['props'] };
      }
      return item;
    }

    // Gather children for each legacy slot from zones (preferred) or inline props
    const slotItemsMap: Record<string, PuckItem[]> = {};
    for (const slotKey of legacySlots) {
      const zoneKey = `${parentId}:${slotKey}`;
      if (Array.isArray(zonesOut[zoneKey])) {
        slotItemsMap[slotKey] = zonesOut[zoneKey].map(migrateItem);
        delete zonesOut[zoneKey];
      } else if (isPuckItemArray(nextProps[slotKey])) {
        slotItemsMap[slotKey] = (nextProps[slotKey] as PuckItem[]).map(
          migrateItem
        );
      } else {
        slotItemsMap[slotKey] = [];
      }
    }

    const specs = buildColumnSpecsForParent(
      item.type,
      nextProps,
      slotKey => (slotItemsMap[slotKey]?.length ?? 0) > 0
    );

    const useInline =
      options.mode === 'inline' ||
      (options.mode !== 'zones' &&
        !hasLegacyZone &&
        Object.keys(inputZones).length === 0 &&
        legacySlots.some(slotKey => Array.isArray(nextProps[slotKey])));

    const cleaned = cleanParentProps(item.type, nextProps);
    if (!cleaned.id && nextProps.id) cleaned.id = nextProps.id;

    const columnItems: PuckItem[] = [];
    for (const spec of specs) {
      const children = slotItemsMap[spec.slotKey] ?? [];
      if (!spec.active && children.length === 0) continue;

      const colId = deterministicColumnId(parentId, spec.slotKey);
      const colProps: Record<string, unknown> & { id: string } = {
        id: colId,
        width: spec.width,
        ...(spec.align ? { align: spec.align } : {}),
        ...(!spec.active ? { [META_PROP]: { hidden: true } } : {}),
      };

      if (useInline) {
        colProps.content = children;
      } else {
        zonesOut[`${colId}:content`] = children;
      }

      columnItems.push({
        type: 'Column',
        props: colProps,
      });
    }

    if (useInline) {
      cleaned.columns = columnItems;
    } else {
      cleaned.id = parentId;
      delete cleaned.columns;
      zonesOut[`${parentId}:columns`] = columnItems;
    }

    changed = true;
    return {
      ...item,
      props: cleaned as PuckItem['props'],
    };
  }

  const nextContent = (data.content ?? []).map(migrateItem);

  // Also migrate any orphan/nested zone items that weren't reached from content
  for (const zoneKey of Object.keys(zonesOut)) {
    const items = zonesOut[zoneKey];
    if (!Array.isArray(items)) continue;
    const migrated = items.map(migrateItem);
    if (migrated.some((m, idx) => m !== items[idx])) {
      zonesOut[zoneKey] = migrated;
      changed = true;
    }
  }

  if (!changed) return data;

  return {
    ...data,
    root: data.root ?? { props: {} },
    content: nextContent,
    zones: zonesOut,
  };
}

/** Explicit entry point for migrating zone-based PuckData. */
export function migrateZonesColumns(data: PuckData): PuckData {
  return migratePuckColumns(data, { mode: 'zones' });
}

/** Explicit entry point for migrating inline-slot PuckData. */
export function migrateInlineColumns(data: PuckData): PuckData {
  return migratePuckColumns(data, { mode: 'inline' });
}

/** Auto-detecting entry point covering BuilderDocument, PuckData (zones or inline), and PuckItem[]. */
export function migrateColumnBlocks<T>(raw: T): T {
  if (!raw || typeof raw !== 'object') return raw;
  if (isBuilderDocument(raw)) {
    return migrateDocumentColumns(raw) as unknown as T;
  }
  if (isLegacyPuckData(raw)) {
    return migratePuckColumns(raw as unknown as PuckData) as unknown as T;
  }
  if (Array.isArray(raw)) {
    const wrapped: PuckData = {
      root: { props: {} },
      content: raw as unknown as PuckItem[],
      zones: {},
    };
    const migrated = migratePuckColumns(wrapped, { mode: 'inline' });
    return (migrated === wrapped ? raw : migrated.content) as unknown as T;
  }
  return raw;
}
