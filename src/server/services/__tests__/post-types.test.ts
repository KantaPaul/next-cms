import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  entryTitle,
  fieldKeyFromLabel,
  POST_TYPE_FIELD_TYPE_VALUES,
  POST_TYPE_PRESETS,
} from '@/config/post-types';
import { PERMISSION_MATRIX, PERMISSIONS } from '@/config/permissions';
import { collectionFieldTypeEnum } from '@/db/schemas/collections.schema';
import { parseEntryData } from '@/server/services/collections.service';

type FieldRow = Parameters<typeof parseEntryData>[0][number];

const field = (
  key: string,
  type: FieldRow['type'],
  extra: Partial<FieldRow> = {}
): FieldRow => ({
  id: key,
  collectionId: 'c1',
  key,
  label: key,
  type,
  required: false,
  position: 0,
  config: {},
  createdAt: new Date(),
  updatedAt: null,
  deletedAt: null,
  ...extra,
});

describe('post type entry data', () => {
  it('coerces form strings to numbers and booleans and drops empty optionals', () => {
    const fields = [
      field('name', 'text', { required: true }),
      field('rating', 'number'),
      field('featured', 'boolean'),
      field('site', 'url'),
      field('bio', 'richtext'),
    ];
    const { data, error } = parseEntryData(fields, {
      name: '  Ada ',
      rating: '4.5',
      featured: 'true',
      site: '',
      bio: '<p></p>',
    });
    assert.equal(error, null);
    assert.deepEqual(data, { name: 'Ada', rating: 4.5, featured: true });
  });

  it('rejects invalid URLs and unknown select choices', () => {
    const fields = [
      field('site', 'url'),
      field('team', 'select', { config: { choices: ['Design', 'Eng'] } }),
    ];
    assert.ok(parseEntryData(fields, { site: 'not a url' }).error);
    assert.ok(parseEntryData(fields, { team: 'Sales' }).error);
    assert.equal(
      parseEntryData(fields, { site: 'https://x.dev', team: 'Eng' }).error,
      null
    );
  });

  it('requires required fields', () => {
    const { error } = parseEntryData([field('name', 'text', { required: true })], {
      name: '   ',
    });
    assert.ok(error);
  });
});

describe('post type presets', () => {
  it('only use field types the database enum knows', () => {
    const dbTypes = new Set<string>(collectionFieldTypeEnum.enumValues);
    for (const type of POST_TYPE_FIELD_TYPE_VALUES) assert.ok(dbTypes.has(type), type);
    for (const preset of POST_TYPE_PRESETS) {
      const keys = preset.fields.map(f => f.key);
      assert.equal(new Set(keys).size, keys.length, `${preset.id} has duplicate keys`);
      for (const f of preset.fields) assert.ok(dbTypes.has(f.type));
    }
  });

  it('derive field keys and entry titles', () => {
    assert.equal(fieldKeyFromLabel('LinkedIn URL'), 'linkedin_url');
    assert.equal(fieldKeyFromLabel('  Rating (1–5) '), 'rating_1_5');
    assert.equal(entryTitle({ author: 'Sam' }, []), 'Sam');
    assert.equal(
      entryTitle({ headline: 'Hi' }, [{ key: 'headline', type: 'text' }]),
      'Hi'
    );
  });

  it('lets Admins and Editors manage post types', () => {
    const row = PERMISSION_MATRIX.find(
      r => r.key === PERMISSIONS.POST_TYPES_MANAGE
    );
    assert.deepEqual(row?.roles, {
      Admin: true,
      Editor: true,
      Author: false,
      Viewer: false,
    });
  });
});
