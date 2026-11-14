import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { presetBindingFields } from '@/server/services/dynamic-refs.service';

describe('External API binding fields', () => {
  it('lists the core mapping first, then mapped fields, without duplicates', () => {
    const fields = presetBindingFields({
      fieldId: 'id',
      fieldTitle: 'title',
      fieldImage: 'image',
      fields: [
        { key: 'price', label: 'Price', fieldType: 'number' },
        { key: 'image', label: 'Image again', fieldType: 'media' },
        { key: 'rating.rate', label: 'Rating', fieldType: 'number' },
        { key: 'link', fieldType: 'url' },
      ],
    });
    assert.deepEqual(
      fields.map(f => `${f.key}:${f.type}`),
      ['title:text', 'image:image', 'price:number', 'rating.rate:number', 'link:url', 'id:text']
    );
    assert.equal(fields.find(f => f.key === 'link')?.label, 'link');
  });
});
