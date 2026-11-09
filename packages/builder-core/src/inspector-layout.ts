/**
 * Inspector layout engine: explicit tabs, sections, paths, and dynamic tab ordering.
 * Used by SettingsView, Inspector, and block definitions to produce an Elementor-style
 * organized inspector.
 */

import { type Device, type FieldDef, valueForDevice } from './fields';

export type InspectorTabDef = {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
};

export const DEFAULT_TABS: InspectorTabDef[] = [
  { id: 'content', label: 'Content', shortcut: '⌥C', icon: 'FileText' },
  { id: 'style', label: 'Style', shortcut: '⌥S', icon: 'Paintbrush' },
  { id: 'advanced', label: 'Advanced', shortcut: '⌥A', icon: 'Sliders' },
];

/** Read a value at a dotted path (e.g. 'section.fill' or 'elements.title.color'). */
export function getPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return undefined;
  if (!path) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/** Immutably set a value at a dotted path, returning a shallow-cloned object tree. */
export function setPath<T extends Record<string, unknown>>(
  obj: T | undefined,
  path: string,
  value: unknown
): T {
  if (!path) return (obj ?? {}) as T;
  const parts = path.split('.');
  const root: any = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  let current: any = root;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextVal = current[part];
    current[part] =
      nextVal && typeof nextVal === 'object'
        ? Array.isArray(nextVal)
          ? [...nextVal]
          : { ...nextVal }
        : {};
    current = current[part];
  }

  const last = parts[parts.length - 1];
  if (value === undefined) {
    delete current[last];
  } else {
    current[last] = value;
  }

  return root as T;
}

/** Categorize a field into a section title using explicit `section` or legacy heuristic. */
export function fieldSectionTitle(field: FieldDef): string {
  if (field.section) return field.section;
  const g = (field.group ?? '').toLowerCase();
  if (g.includes('content') || g.includes('basic') || g.includes('main')) return 'Content';
  if (g.includes('layout') || g.includes('spacing') || g.includes('dimension')) return 'Layout & Spacing';
  if (g.includes('typo') || g.includes('font') || g.includes('text')) return 'Typography';
  if (g.includes('border') || g.includes('corner') || g.includes('radius')) return 'Borders';
  if (g.includes('back') || g.includes('color') || g.includes('shadow') || g.includes('effect')) return 'Background & Effects';
  if (g.includes('advanced') || g.includes('meta')) return 'Advanced';

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'image':
    case 'icon':
    case 'media':
      return 'Content';
    case 'color':
    case 'shadow':
    case 'background':
      return 'Background & Effects';
    case 'typography':
      return 'Typography';
    case 'border':
      return 'Borders';
    case 'dimensions':
    case 'flex':
    case 'alignment':
      return 'Layout & Spacing';
    case 'easing':
    case 'transition':
      return 'Animation & Effects';
    default:
      return 'General';
  }
}

/** Legacy heuristic to determine which tab a section lives in. */
function defaultSectionTab(section: string): string {
  if (section === 'Content') return 'content';
  if (section === 'Advanced' || section === 'Animation & Effects') return 'advanced';
  return 'style';
}

/** Determine which tab a field lives in, using explicit `tab` or legacy heuristic. */
export function fieldTabId(field: FieldDef): string {
  if (field.tab) return field.tab;
  return defaultSectionTab(fieldSectionTitle(field));
}

/** Check if a field value differs from its default value on the given device. */
export function fieldChanged(
  field: FieldDef,
  value: unknown,
  defaultValue: unknown,
  device: Device
): boolean {
  const shown = field.responsive ? valueForDevice(value, device) : value;
  const defaultShown = field.responsive
    ? valueForDevice(defaultValue, device)
    : defaultValue;
  if (shown === undefined && defaultShown === undefined) return false;
  return JSON.stringify(shown) !== JSON.stringify(defaultShown);
}

/** Whether a field's control shows on `device`, given its `devices` and `when`. */
export function fieldVisible(
  field: FieldDef,
  props: Record<string, unknown>,
  device: Device,
  parentProps?: Record<string, unknown>
): boolean {
  if (field.devices && !field.devices.includes(device)) return false;
  return !field.when || field.when(props, parentProps);
}

export type LayoutSection = {
  title: string;
  fields: Array<[string, FieldDef]>;
  changedCount: number;
};

export type LayoutTab = {
  def: InspectorTabDef;
  sections: LayoutSection[];
  changedCount: number;
};

export type LayoutFieldsResult = {
  tabs: LayoutTab[];
};

export type LayoutFieldsOptions = {
  fields: Record<string, FieldDef>;
  props: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  device: Device;
  tabs?: InspectorTabDef[];
  query?: string;
  changedOnly?: boolean;
};

function startCase(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

/**
 * Organizes fields into tabs and collapsible sections:
 * - Preserves declaration order of fields and sections.
 * - Drops fields hidden by `when(props)` or `devices` (see `fieldVisible`).
 * - Drops tabs that have no visible fields.
 * - Calculates changed count per section and tab.
 */
export function layoutFields({
  fields,
  props,
  defaultProps = {},
  device,
  tabs: customTabs,
  query = '',
  changedOnly = false,
}: LayoutFieldsOptions): LayoutFieldsResult {
  const q = query.trim().toLowerCase();

  // Establish base tabs order
  const tabDefs: InspectorTabDef[] = customTabs && customTabs.length > 0 ? [...customTabs] : [...DEFAULT_TABS];
  const tabDefMap = new Map<string, InspectorTabDef>();
  for (const t of tabDefs) {
    tabDefMap.set(t.id, t);
  }

  // Map of tabId -> Map of sectionTitle -> LayoutSection
  const tabSections = new Map<string, Map<string, LayoutSection>>();
  const tabChangedCounts = new Map<string, number>();

  for (const [name, field] of Object.entries(fields)) {
    // 1. Conditional visibility
    if (!fieldVisible(field, props, device)) continue;

    // 2. Read values through path
    const targetPath = field.path ?? name;
    const val = getPath(props, targetPath);
    const defVal = getPath(defaultProps, targetPath);
    const isChanged = fieldChanged(field, val, defVal, device);

    // 3. Changed filter
    if (changedOnly && !isChanged) continue;

    const tabId = fieldTabId(field);
    const sectionTitle = fieldSectionTitle(field);

    // 4. Search query
    if (q) {
      const matchName = name.toLowerCase().includes(q);
      const matchLabel = (field.label ?? '').toLowerCase().includes(q);
      const matchDesc = (field.description ?? '').toLowerCase().includes(q);
      const matchSection = sectionTitle.toLowerCase().includes(q);
      if (!matchName && !matchLabel && !matchDesc && !matchSection) {
        continue;
      }
    }

    // Ensure tab definition exists
    if (!tabDefMap.has(tabId)) {
      const newDef: InspectorTabDef = {
        id: tabId,
        label: startCase(tabId),
      };
      tabDefMap.set(tabId, newDef);
      tabDefs.push(newDef);
    }

    // Ensure sections map exists for this tab
    let sectionsMap = tabSections.get(tabId);
    if (!sectionsMap) {
      sectionsMap = new Map<string, LayoutSection>();
      tabSections.set(tabId, sectionsMap);
    }

    // Ensure section exists (preserves section order within tab)
    let section = sectionsMap.get(sectionTitle);
    if (!section) {
      section = {
        title: sectionTitle,
        fields: [],
        changedCount: 0,
      };
      sectionsMap.set(sectionTitle, section);
    }

    section.fields.push([name, field]);
    if (isChanged) {
      section.changedCount++;
      tabChangedCounts.set(tabId, (tabChangedCounts.get(tabId) ?? 0) + 1);
    }
  }

  // Build result tabs in tabDefs order, dropping empty tabs
  const resultTabs: LayoutTab[] = [];
  for (const def of tabDefs) {
    const sectionsMap = tabSections.get(def.id);
    if (!sectionsMap || sectionsMap.size === 0) continue;

    const sections = Array.from(sectionsMap.values()).filter(s => s.fields.length > 0);
    if (sections.length === 0) continue;

    resultTabs.push({
      def,
      sections,
      changedCount: tabChangedCounts.get(def.id) ?? 0,
    });
  }

  return { tabs: resultTabs };
}
