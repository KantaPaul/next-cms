import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createMockAdapters } from '../adapters';

describe('adapters (R759, E8)', () => {
  it('creates mock adapters with working defaults', () => {
    const adapters = createMockAdapters();
    assert.ok(adapters.storage);
    assert.ok(adapters.media);
    assert.ok(adapters.link);
    assert.ok(adapters.data);
    assert.ok(adapters.permissions);
  });

  it('mock permissions allow everything', () => {
    const adapters = createMockAdapters();
    assert.equal(adapters.permissions!.canInsert('Hero'), true);
    assert.equal(adapters.permissions!.canDelete('Hero'), true);
    assert.equal(adapters.permissions!.canPublish(), true);
    assert.equal(adapters.permissions!.isLocked('Hero', 'title'), false);
  });

  it('mock media resolves with a URL', async () => {
    const adapters = createMockAdapters();
    const resolved = await adapters.media!.resolve('asset-1');
    assert.equal(resolved.src, 'https://mock/asset-1');
  });

  it('mock storage saves and returns a version', async () => {
    const adapters = createMockAdapters();
    const result = await adapters.storage!.saveFull('doc-1', {} as any, 1);
    assert.equal(result.version, 1);
  });
});
