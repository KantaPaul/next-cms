/**
 * Filter options shared by the standalone Query Filter block and the
 * built-in filters on Query Loop. Query Loop stores them with a `filter`
 * prefix (`filterShowKeyword`) so they can't clash with its own props.
 */
import type { FieldDef, Fields } from '@nextcms/builder-core';
import { z } from 'zod';
/** Same value as `CONTENT` in ./fields (not imported: this file is used by site-side render code). */
const CONTENT = 'Content';

const taxonomyStyles = z.enum(['select', 'checkboxes', 'chips']);

export const FILTER_OPTION_SCHEMA = {
  showKeyword: z.boolean().default(true),
  keywordPlaceholder: z.string().default('Search items…'),
  showCategories: z.boolean().default(true),
  categoryStyle: taxonomyStyles.default('select'),
  showTags: z.boolean().default(true),
  tagStyle: taxonomyStyles.default('chips'),
  showDateRange: z.boolean().default(false),
  showNumberRange: z.boolean().default(false),
  numberRangeLabel: z.string().default('Duration / Value'),
  showBooleanToggle: z.boolean().default(false),
  booleanToggleLabel: z.string().default('With image only'),
  showSort: z.boolean().default(true),
  showResultCount: z.boolean().default(true),
  showActiveChips: z.boolean().default(true),
  showFacetCounts: z.boolean().default(true),
  mobileDrawer: z.boolean().default(true),
  applyButtonLabel: z.string().default('Apply filters'),
} as const;

export type FilterOptionKey = keyof typeof FILTER_OPTION_SCHEMA;
export const FILTER_OPTION_KEYS = Object.keys(
  FILTER_OPTION_SCHEMA
) as FilterOptionKey[];

export const FILTER_OPTION_DEFAULTS = {
  showKeyword: true,
  keywordPlaceholder: 'Search items…',
  showCategories: true,
  categoryStyle: 'select',
  showTags: true,
  tagStyle: 'chips',
  showDateRange: false,
  showNumberRange: false,
  numberRangeLabel: 'Duration / Value',
  showBooleanToggle: false,
  booleanToggleLabel: 'With image only',
  showSort: true,
  showResultCount: true,
  showActiveChips: true,
  showFacetCounts: true,
  mobileDrawer: true,
  applyButtonLabel: 'Apply filters',
} satisfies Record<FilterOptionKey, unknown>;

type When = (props: any) => boolean;

const toggle = (label: string, when?: When): FieldDef =>
  ({
    label,
    group: CONTENT,
    type: 'toggle',
    ...(when && { when }),
  }) as FieldDef;
const text = (label: string, when?: When): FieldDef =>
  ({ label, group: CONTENT, type: 'text', ...(when && { when }) }) as FieldDef;
const styleSelect = (
  label: string,
  first: 'select' | 'chips',
  when: When
): FieldDef =>
  ({
    label,
    group: CONTENT,
    type: 'select',
    options:
      first === 'chips'
        ? [
            { label: 'Filter chips', value: 'chips' },
            { label: 'Dropdown select', value: 'select' },
            { label: 'Checkboxes', value: 'checkboxes' },
          ]
        : [
            { label: 'Dropdown select', value: 'select' },
            { label: 'Checkboxes', value: 'checkboxes' },
            { label: 'Filter chips', value: 'chips' },
          ],
    when,
  }) as FieldDef;

/** Unprefixed field set; `when` callbacks read unprefixed props. */
export const FILTER_OPTION_FIELDS: Record<FilterOptionKey, FieldDef> = {
  showKeyword: toggle('Show keyword search'),
  keywordPlaceholder: text('Keyword placeholder', p => p.showKeyword !== false),
  showCategories: toggle('Show category filter'),
  categoryStyle: styleSelect(
    'Category control style',
    'select',
    p => p.showCategories !== false
  ),
  showTags: toggle('Show tag filter'),
  tagStyle: styleSelect(
    'Tag control style',
    'chips',
    p => p.showTags !== false
  ),
  showDateRange: toggle('Show date range filter'),
  showNumberRange: toggle('Show number range filter'),
  numberRangeLabel: text('Number range label', p => Boolean(p.showNumberRange)),
  showBooleanToggle: toggle('Show yes/no toggle filter'),
  booleanToggleLabel: text('Yes/No toggle label', p =>
    Boolean(p.showBooleanToggle)
  ),
  showSort: toggle('Show sort selector'),
  showResultCount: toggle('Show result count'),
  showActiveChips: toggle('Show active filter chips & clear all'),
  showFacetCounts: toggle('Show facet counts next to options'),
  mobileDrawer: toggle('Use collapsible filter drawer on mobile'),
  applyButtonLabel: text('Apply button label'),
};

export const prefixedFilterKey = (key: FilterOptionKey) =>
  `filter${key[0].toUpperCase()}${key.slice(1)}`;

/** Reads `filterShowKeyword`… back into `{ showKeyword }…`, falling back to defaults. */
export function unprefixFilterOptions(
  props: Record<string, unknown>
): Record<FilterOptionKey, unknown> {
  const out = {} as Record<FilterOptionKey, unknown>;
  for (const key of FILTER_OPTION_KEYS) {
    const value = props[prefixedFilterKey(key)];
    out[key] = value === undefined ? FILTER_OPTION_DEFAULTS[key] : value;
  }
  return out;
}

/** Query Loop: prefixed fields, shown only while `visible(props)` holds. */
export function prefixedFilterFields(visible: When): Fields {
  const fields: Fields = {};
  for (const key of FILTER_OPTION_KEYS) {
    const def = FILTER_OPTION_FIELDS[key] as FieldDef & { when?: When };
    const inner = def.when;
    fields[prefixedFilterKey(key)] = {
      ...def,
      tab: 'content',
      section: 'Filters',
      when: (p: any) =>
        visible(p) && (inner ? inner(unprefixFilterOptions(p)) : true),
    } as FieldDef;
  }
  return fields;
}

export function prefixedFilterSchema() {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const key of FILTER_OPTION_KEYS) {
    shape[prefixedFilterKey(key)] = FILTER_OPTION_SCHEMA[key].optional();
  }
  return shape;
}
