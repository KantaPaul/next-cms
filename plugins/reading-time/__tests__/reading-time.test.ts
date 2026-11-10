import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import clientPlugin from '../plugin.client';
import serverPlugin from '../plugin.server';
import { estimateReadingTimeMinutes } from '../src/estimate';

describe('reading-time example plugin', () => {
  it('estimates reading time from HTML text', () => {
    const words = Array.from({ length: 450 }, () => 'word').join(' ');
    const res = estimateReadingTimeMinutes(`<p>${words}</p>`, 200);
    assert.equal(res.words, 450);
    assert.equal(res.minutes, 3);
    assert.equal(res.label, '3 min read');
  });

  it('adds data-reading-time via content.html filter', async () => {
    const filter = serverPlugin.filters?.['content.html'];
    assert.ok(filter);
    const run = typeof filter === 'function' ? filter : filter.run;
    const out = await run('<p>Hello world from Next CMS</p>', {
      pluginId: 'reading-time',
      settings: { wordsPerMinute: 200 },
      site: { id: 'default', name: 'Test', slug: null, url: null, defaultLocale: 'en' },
      logger: console,
      mail: async () => ({ sent: false }),
      storage: {} as any,
      safeFetch: fetch,
      db: null,
      kv: {} as any,
      meta: { kind: 'page', id: 'p1', siteId: 'default' },
    });
    assert.ok(out.includes('data-reading-time="1"'));
  });

  it('registers a namespaced reading-time/ReadingTime block', () => {
    assert.equal(clientPlugin.id, 'reading-time');
    assert.equal(clientPlugin.blocks?.[0]?.type, 'reading-time/ReadingTime');
  });
});
