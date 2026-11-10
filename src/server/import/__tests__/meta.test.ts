import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractSeoFromMeta, parsePhpSerialized } from '../meta';

describe('Safe PHP serialized parser & SEO meta extraction', () => {
  it('parses primitives, UTF-8 strings, arrays, and objects safely', () => {
    assert.equal(parsePhpSerialized('N;'), null);
    assert.equal(parsePhpSerialized('b:1;'), true);
    assert.equal(parsePhpSerialized('i:42;'), 42);
    assert.equal(parsePhpSerialized('d:3.14;'), 3.14);
    // Multi-byte UTF-8 byte length (6 bytes for "café!")
    assert.equal(parsePhpSerialized('s:6:"café!";'), 'café!');
    assert.deepEqual(
      parsePhpSerialized('a:2:{i:0;s:7:"noindex";i:1;s:8:"nofollow";}'),
      ['noindex', 'nofollow']
    );
    assert.deepEqual(
      parsePhpSerialized('a:2:{s:5:"width";i:800;s:6:"height";i:600;}'),
      { width: 800, height: 600 }
    );
  });

  it('drops prototype-pollution keys and rejects malformed input', () => {
    const obj = parsePhpSerialized(
      'a:2:{s:9:"__proto__";s:4:"evil";s:4:"safe";s:2:"ok";}'
    ) as Record<string, unknown>;
    assert.equal(Object.prototype.hasOwnProperty.call(obj, '__proto__'), false);
    assert.equal(obj.safe, 'ok');
    assert.equal(parsePhpSerialized('O:999:"Evil":0:{}'), undefined);
    assert.equal(parsePhpSerialized('not-serialized'), undefined);
  });

  it('extracts Yoast and Rank Math SEO fields including serialized robots', () => {
    const yoast = extractSeoFromMeta(
      {
        _yoast_wpseo_title: '%%title%% %%sep%% %%sitename%%',
        _yoast_wpseo_metadesc: 'Meta desc',
        _yoast_wpseo_canonical: 'https://example.com/post',
        '_yoast_wpseo_opengraph-title': 'OG Title',
        '_yoast_wpseo_opengraph-description': 'OG Desc',
        '_yoast_wpseo_opengraph-image': 'https://example.com/og.jpg',
        '_yoast_wpseo_meta-robots-noindex': '1',
      },
      { title: 'My Post', siteName: 'Acme' }
    );
    assert.deepEqual(yoast, {
      title: 'My Post - Acme',
      description: 'Meta desc',
      canonicalUrl: 'https://example.com/post',
      ogTitle: 'OG Title',
      ogDescription: 'OG Desc',
      ogImage: 'https://example.com/og.jpg',
      noIndex: true,
    });

    const rankMath = extractSeoFromMeta({
      rank_math_title: 'RM Title',
      rank_math_description: 'RM Desc',
      rank_math_robots: 'a:1:{i:0;s:7:"noindex";}',
    });
    assert.deepEqual(rankMath, {
      title: 'RM Title',
      description: 'RM Desc',
      noIndex: true,
    });
  });
});
