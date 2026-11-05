/**
 * SQL for filtering and sorting collection entries by their custom fields
 * (`collection_entries.data->>key`). Keys must match one of the collection's
 * real fields; unknown keys are dropped, never interpolated.
 */
import type { FieldFilter } from '@nextcms/builder-core';
import { type AnyColumn, type SQL, sql } from 'drizzle-orm';

export type FieldMeta = { key: string; type: string };

type Cast = 'numeric' | 'timestamptz' | 'boolean' | 'text';

function castFor(type: string): Cast {
  if (type === 'number') return 'numeric';
  if (type === 'date') return 'timestamptz';
  if (type === 'boolean') return 'boolean';
  return 'text';
}

/** `(data->>'key')` cast to the field's SQL type; NULL for unparsable values. */
export function fieldExpr(data: AnyColumn, field: FieldMeta): SQL {
  // Key is validated against FIELD_KEY_PATTERN and the collection's fields,
  // but it's still passed as a bound parameter, not raw SQL.
  const raw = sql`(${data}->>${field.key})`;
  switch (castFor(field.type)) {
    case 'numeric':
      return sql`(case when ${raw} ~ '^-?[0-9]+(\\.[0-9]+)?$' then ${raw}::numeric end)`;
    case 'timestamptz':
      return sql`(case when ${raw} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then ${raw}::timestamptz end)`;
    case 'boolean':
      return sql`(case when ${raw} in ('true','false') then ${raw}::boolean end)`;
    default:
      return raw;
  }
}

function coerce(value: unknown, cast: Cast): unknown {
  if (cast === 'numeric') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (cast === 'boolean') {
    return value === true || value === 'true' || value === '1' || value === 1;
  }
  if (cast === 'timestamptz') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return value == null ? null : String(value);
}

/** One custom-field condition, or undefined when the key or value is invalid. */
export function fieldFilterSql(
  data: AnyColumn,
  fields: readonly FieldMeta[],
  filter: FieldFilter
): SQL | undefined {
  const field = fields.find(f => f.key === filter.key);
  if (!field) return undefined;
  const raw = sql`(${data}->>${field.key})`;
  const cast = castFor(field.type);
  const expr = fieldExpr(data, field);

  if (filter.operator === 'exists') {
    const want = filter.value === undefined ? true : coerce(filter.value, 'boolean');
    return want
      ? sql`(${raw} is not null and ${raw} <> '')`
      : sql`(${raw} is null or ${raw} = '')`;
  }
  if (filter.value === undefined || filter.value === '') return undefined;

  if (filter.operator === 'in') {
    const list = (Array.isArray(filter.value) ? filter.value : String(filter.value).split(','))
      .map(v => String(v).trim())
      .filter(Boolean);
    if (!list.length) return undefined;
    return sql`${raw} in (${sql.join(list.map(v => sql`${v}`), sql`, `)})`;
  }
  if (filter.operator === 'contains') {
    // Arrays (multi-select / relation) and strings both match.
    return sql`(${data}->${field.key})::text ilike ${'%' + String(filter.value) + '%'}`;
  }

  const value = coerce(filter.value, cast);
  if (value === null) return undefined;
  const param =
    cast === 'numeric'
      ? sql`${value}::numeric`
      : cast === 'timestamptz'
        ? sql`${value}::timestamptz`
        : cast === 'boolean'
          ? sql`${value}::boolean`
          : sql`${value}`;
  switch (filter.operator) {
    case 'eq':
      return sql`${expr} = ${param}`;
    case 'neq':
      return sql`(${expr} is distinct from ${param})`;
    case 'gt':
      return sql`${expr} > ${param}`;
    case 'gte':
      return sql`${expr} >= ${param}`;
    case 'lt':
      return sql`${expr} < ${param}`;
    case 'lte':
      return sql`${expr} <= ${param}`;
    default:
      return undefined;
  }
}

/** Order-by on a custom field (nulls last), or undefined for an unknown key. */
export function fieldSortSql(
  data: AnyColumn,
  fields: readonly FieldMeta[],
  key: string,
  order: 'asc' | 'desc'
): SQL | undefined {
  const field = fields.find(f => f.key === key);
  if (!field) return undefined;
  const expr = fieldExpr(data, field);
  return order === 'asc'
    ? sql`${expr} asc nulls last`
    : sql`${expr} desc nulls last`;
}
