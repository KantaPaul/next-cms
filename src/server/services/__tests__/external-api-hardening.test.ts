import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scrubExternalApiRow } from '@/server/backup/tables';
import {
  isSameOriginUrl,
  secretsForEndpoint,
} from '@/server/lib/external-api-secrets';
import { safeFetch, stripCrossOriginHeaders } from '@/server/lib/safe-fetch';
import {
  publicExternalApiError,
  safeExternalUrl,
} from '@/server/services/listing-query.service';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

/** A fetch stub that redirects once, then records what the next hop got. */
function redirectingFetch(location: string) {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    if (calls.length === 1) {
      return new Response(null, { status: 302, headers: { location } });
    }
    return new Response('[]', { status: 200 });
  }) as typeof fetch;
  return { fn, calls };
}

describe('External API hardening', () => {
  describe('safeFetch redirect credential stripping', () => {
    const headers = {
      Authorization: 'Bearer top-secret',
      'X-Api-Key': 'k-123',
      Accept: 'application/json',
    };

    it('drops credential headers when a redirect changes origin', async () => {
      const { fn, calls } = redirectingFetch('https://other.example/next');
      await safeFetch('https://api.example/items', { headers }, fn, {
        lookup: publicLookup,
      });
      assert.equal(calls.length, 2);
      const second = calls[1].headers;
      assert.equal(second.get('authorization'), null);
      assert.equal(second.get('x-api-key'), null);
      assert.equal(second.get('accept'), 'application/json');
    });

    it('keeps headers on a same-origin redirect', async () => {
      const { fn, calls } = redirectingFetch('/v2/items');
      await safeFetch('https://api.example/items', { headers }, fn, {
        lookup: publicLookup,
      });
      assert.equal(calls[1].url, 'https://api.example/v2/items');
      assert.equal(calls[1].headers.get('authorization'), 'Bearer top-secret');
      assert.equal(calls[1].headers.get('x-api-key'), 'k-123');
    });

    it('stripCrossOriginHeaders keeps only content-negotiation headers', () => {
      assert.deepEqual(
        stripCrossOriginHeaders({
          Cookie: 'a=b',
          Token: 't',
          'Content-Type': 'application/json',
        }),
        { 'content-type': 'application/json' }
      );
    });
  });

  describe('preset secrets are bound to the preset origin', () => {
    const vault = { TOKEN: 's3cr3t' };

    it('returns secrets for the same origin, any path', () => {
      assert.deepEqual(
        secretsForEndpoint(
          vault,
          'https://api.example/v1/items',
          'https://api.example/v2/other?x=1'
        ),
        vault
      );
    });

    it('withholds secrets from a different host, scheme or port', () => {
      const preset = 'https://api.example/items';
      for (const target of [
        'https://attacker.tld/items',
        'http://api.example/items',
        'https://api.example:8443/items',
        'https://api.example.attacker.tld/items',
        'not a url',
        undefined,
      ]) {
        assert.deepEqual(secretsForEndpoint(vault, preset, target), {}, String(target));
      }
    });

    it('isSameOriginUrl rejects unparseable input', () => {
      assert.equal(isSameOriginUrl(null, null), false);
      assert.equal(isSameOriginUrl('nope', 'nope'), false);
    });
  });

  describe('safeExternalUrl', () => {
    it('allows http(s), site-relative paths and fragments', () => {
      assert.equal(safeExternalUrl('https://x.test/a'), 'https://x.test/a');
      assert.equal(safeExternalUrl('http://x.test/'), 'http://x.test/');
      assert.equal(safeExternalUrl('/blog/post'), '/blog/post');
      assert.equal(safeExternalUrl('#top'), '#top');
    });

    it('blocks script, data and protocol-relative URLs', () => {
      for (const bad of [
        'javascript:alert(1)',
        ' JavaScript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        '//evil.test/x',
        '/\\evil.test',
        '',
        null,
      ]) {
        assert.equal(safeExternalUrl(bad), null, String(bad));
      }
    });
  });

  describe('publicExternalApiError', () => {
    it('hides SSRF guard details such as resolved internal IPs', () => {
      const msg = publicExternalApiError(
        new Error('SSRF guard: prohibited IP address 10.0.0.5')
      );
      assert.equal(msg, 'External API endpoint is not allowed.');
      assert.ok(!msg.includes('10.0.0.5'));
    });

    it('maps timeouts, size, JSON and unknown errors', () => {
      const timeout = new Error('t');
      timeout.name = 'TimeoutError';
      assert.equal(publicExternalApiError(timeout), 'External API request timed out.');
      assert.equal(
        publicExternalApiError(
          new Error('External API response exceeds maximum allowed size (1 bytes).')
        ),
        'External API response is too large.'
      );
      assert.equal(
        publicExternalApiError(new SyntaxError('Unexpected token')),
        'External API returned invalid JSON.'
      );
      assert.equal(
        publicExternalApiError(new Error('connect ECONNREFUSED 10.1.2.3:443')),
        'External API request failed.'
      );
    });
  });

  describe('backup scrub', () => {
    it('drops the vault and credential headers but keeps placeholders', () => {
      const row = scrubExternalApiRow({
        id: 'a',
        secrets: { TOKEN: 'enc:v1:aa:bb:cc' },
        headers: {
          Authorization: 'Bearer raw-token',
          'X-Api-Key': 'enc:v1:aa:bb:cc',
          'X-Token': '{{secret.TOKEN}}',
          'X-Custom': 'enc:v1:dd:ee:ff',
          Accept: 'application/json',
        },
      });
      assert.deepEqual(row.secrets, {});
      assert.deepEqual(row.headers, {
        'X-Token': '{{secret.TOKEN}}',
        Accept: 'application/json',
      });
    });
  });
});
