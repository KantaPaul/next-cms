import assert from 'node:assert';
import { describe, it } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { collectionEntries } from '@/db/schema';
import {
  fieldFilterSql,
  fieldSortSql,
} from '@/server/services/listing-field-filters';

const dialect = new PgDialect();
const FIELDS = [
  { key: 'price', type: 'number' },
  { key: 'role', type: 'select' },
  { key: 'startsAt', type: 'date' },
  { key: 'active', type: 'boolean' },
];
const compile = (sql: ReturnType<typeof fieldFilterSql>) =>
  sql ? dialect.sqlToQuery(sql) : null;

describe('custom field filter SQL', () => {
  it('drops keys that are not fields of the collection', () => {
    assert.equal(
      fieldFilterSql(collectionEntries.data, FIELDS, {
        key: 'secret',
        operator: 'eq',
        value: 'x',
      }),
      undefined
    );
  });

  it('casts numbers and binds the key and value as parameters', () => {
    const q = compile(
      fieldFilterSql(collectionEntries.data, FIELDS, {
        key: 'price',
        operator: 'gt',
        value: '10',
      })
    )!;
    assert.match(q.sql, /::numeric/);
    assert.match(q.sql, / > /);
    assert.ok(q.params.includes('price'));
    assert.ok(q.params.includes(10));
  });

  it('builds IN lists from comma-separated values', () => {
    const q = compile(
      fieldFilterSql(collectionEntries.data, FIELDS, {
        key: 'role',
        operator: 'in',
        value: 'lead, engineer',
      })
    )!;
    assert.match(q.sql, / in \(/);
    assert.ok(q.params.includes('lead'));
    assert.ok(q.params.includes('engineer'));
  });

  it('skips empty values and invalid dates', () => {
    assert.equal(
      fieldFilterSql(collectionEntries.data, FIELDS, {
        key: 'role',
        operator: 'eq',
        value: '',
      }),
      undefined
    );
    assert.equal(
      fieldFilterSql(collectionEntries.data, FIELDS, {
        key: 'startsAt',
        operator: 'gte',
        value: 'not a date',
      }),
      undefined
    );
  });

  it('supports exists without a value', () => {
    const q = compile(
      fieldFilterSql(collectionEntries.data, FIELDS, {
        key: 'role',
        operator: 'exists',
      })
    )!;
    assert.match(q.sql, /is not null/);
  });

  it('sorts by a field with nulls last, and ignores unknown keys', () => {
    const q = dialect.sqlToQuery(
      fieldSortSql(collectionEntries.data, FIELDS, 'price', 'asc')!
    );
    assert.match(q.sql, /asc nulls last/);
    assert.equal(
      fieldSortSql(collectionEntries.data, FIELDS, 'nope', 'asc'),
      undefined
    );
  });
});
