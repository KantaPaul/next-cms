import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveEntryRoute } from '../entry-route';

const site = {
  defaultLocale: 'en',
  locales: [{ code: 'en' }, { code: 'bn' }, { code: 'fr' }],
};

describe('resolveEntryRoute', () => {
  it('reads default-language entry routes', () => {
    assert.deepEqual(resolveEntryRoute(['team', 'ada'], site), ['team', 'ada', 'en']);
    assert.deepEqual(
      resolveEntryRoute(['collections', 'team', 'ada'], site),
      ['team', 'ada', 'en']
    );
  });

  it('reads a language prefix for other languages', () => {
    assert.deepEqual(resolveEntryRoute(['bn', 'team', 'ada'], site), ['team', 'ada', 'bn']);
    assert.deepEqual(
      resolveEntryRoute(['fr', 'collections', 'team', 'ada'], site),
      ['team', 'ada', 'fr']
    );
  });

  it('rejects blog, bare locales and the default-locale prefix', () => {
    assert.equal(resolveEntryRoute(['blog', 'post'], site)[0], undefined);
    assert.equal(resolveEntryRoute(['bn', 'blog'], site)[0], undefined);
    assert.equal(resolveEntryRoute(['en', 'team', 'ada'], site)[0], undefined);
    assert.equal(resolveEntryRoute(['team'], site)[0], undefined);
  });
});
