import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueryFilterBlock } from '../definitions/native';

const fields = QueryFilterBlock.fields as Record<
  string,
  { when?: (props: Record<string, unknown>) => boolean }
>;
const shown = (key: string, props: Record<string, unknown>) =>
  fields[key]?.when ? fields[key].when!(props) : true;

const REQUEST_FIELDS = [
  'apiMethod',
  'apiItemsPath',
  'apiTotalPath',
  'apiCacheTtlSeconds',
  'apiTimeoutMs',
];

describe('Query Filter External API fields', () => {
  it('hides endpoint and request settings when a saved API is selected', () => {
    const props = { source: 'external-api', apiPresetId: 'preset-1', apiEndpointUrl: 'https://x.test' };
    assert.equal(shown('apiPresetId', props), true);
    assert.equal(shown('apiFilterFields', props), true);
    for (const key of ['apiEndpointUrl', ...REQUEST_FIELDS, 'apiBody']) {
      assert.equal(shown(key, props), false, key);
    }
  });

  it('shows only the endpoint while inheriting the target loop API', () => {
    const props = { source: 'external-api' };
    assert.equal(shown('apiEndpointUrl', props), true);
    for (const key of REQUEST_FIELDS) assert.equal(shown(key, props), false, key);
  });

  it('shows request settings for a custom endpoint typed into the filter', () => {
    const props = { source: 'external-api', apiEndpointUrl: 'https://x.test/items' };
    for (const key of REQUEST_FIELDS) assert.equal(shown(key, props), true, key);
    assert.equal(shown('apiBody', props), false);
    assert.equal(shown('apiBody', { ...props, apiMethod: 'POST' }), true);
  });
});
