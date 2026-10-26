import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import type { ReferenceConfig } from 'drizzle-orm/pg-core';
import { type PgTimestampConfig, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { SentenceCase } from '@/lib/types';
import { titleCase } from '@/lib/utils/title-case';

export const createdAt = (
  name: string = 'created_at',
  config: PgTimestampConfig<'string' | 'date'> | undefined = {
    mode: 'date',
  }
) => timestamp(name, config).defaultNow().notNull();

export const deletedAt = (
  name: string = 'deleted_at',
  config: PgTimestampConfig<'string' | 'date'> | undefined = {
    mode: 'date',
  }
) => timestamp(name, config).$defaultFn(() => sql`NULL`);

export const primaryCuid = (name: string = 'id') => {
  return text(name)
    .$defaultFn(() => createId())
    .primaryKey();
};

export const updatedAt = (
  name: string = 'updated_at',
  config: PgTimestampConfig<'string' | 'date'> | undefined = {
    mode: 'date',
  }
) =>
  timestamp(name, config)
    .defaultNow()
    .$onUpdateFn(() => new Date());

export function generateEnum<T extends readonly [string, ...string[]]>(
  values: T
) {
  return (name: string) => text(name, { enum: values }).$type<T[number]>();
}

export const generateEnumObject = <T extends readonly [string, ...string[]]>(
  values: T
) => {
  return z.enum(values).enum;
};

export const generateEnumSelectOptions = <
  T extends readonly [string, ...string[]],
>(
  values: T
) => {
  const options = values.map(val => ({
    value: val,
    label: titleCase(val),
  }));

  return options as {
    label: SentenceCase<T[number]>;
    value: T[number];
  }[];
};

export const foreignId = (
  name: string,
  column: ReferenceConfig['ref'],
  action: ReferenceConfig['actions'] = {
    onDelete: 'cascade',
    onUpdate: 'cascade',
  }
) => text(name).references(column, action);
