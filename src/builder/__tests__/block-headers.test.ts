import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { resolveBlockHeaders } from '../loaders';

const preset = {
  endpointUrl: 'https://api.example.com/items',
  headers: {
    Authorization: 'Bearer {{env.EXT_API_TEST_TOKEN}}',
    'X-Key': '{{secret.KEY}}',
    Accept: 'application/json',
  },
  secrets: { KEY: 'vault-key' },
};

describe('External API block headers', () => {
  beforeEach(() => {
    process.env.EXT_API_TEST_TOKEN = 'env-token';
  });
  afterEach(() => {
    delete process.env.EXT_API_TEST_TOKEN;
  });

  it('resolves env and secrets in headers that come from the preset', async () => {
    const headers = await resolveBlockHeaders(undefined, preset, preset.endpointUrl);
    assert.equal(headers.Authorization, 'Bearer env-token');
    assert.equal(headers['X-Key'], 'vault-key');
  });

  it('leaves env placeholders typed into the block unresolved here', async () => {
    const headers = await resolveBlockHeaders(
      { 'X-Leak': '{{env.EXT_API_TEST_TOKEN}}' },
      preset,
      preset.endpointUrl
    );
    assert.equal(headers['X-Leak'], '{{env.EXT_API_TEST_TOKEN}}');
  });

  it('replaces masked copies with the stored value on the preset origin', async () => {
    const headers = await resolveBlockHeaders(
      { Authorization: '••••oken', Accept: 'text/plain' },
      preset,
      'https://api.example.com/other'
    );
    assert.equal(headers.Authorization, 'Bearer env-token');
    assert.equal(headers.Accept, 'text/plain');
  });

  it('never uses stored or env values for another host', async () => {
    const fromPreset = await resolveBlockHeaders(undefined, preset, 'https://attacker.test/x');
    assert.deepEqual(fromPreset, {});
    const masked = await resolveBlockHeaders(
      { Authorization: '••••oken' },
      preset,
      'https://attacker.test/x'
    );
    assert.deepEqual(masked, {});
  });
});
