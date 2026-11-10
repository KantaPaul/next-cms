/**
 * Hardening found in review: SSRF bypasses through IPv6 spellings and
 * redirects, a spoofable rate-limit IP, and Mailchimp inputs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clientIp } from '@/server/lib/client-ip';
import { getMailchimpDc } from '@/server/integrations/mailchimp';
import { isPrivateOrReservedIp, safeFetch } from '@/server/lib/safe-fetch';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

describe('SSRF guard: IPv6 spellings', () => {
  for (const ip of [
    '0::1',
    '0:0:0:0:0:0:0:1',
    '::ffff:7f00:1', // how the URL parser writes ::ffff:127.0.0.1
    '::ffff:a9fe:a9fe', // 169.254.169.254
    '::ffff:10.0.0.5',
    '::127.0.0.1',
    '64:ff9b::a9fe:a9fe', // NAT64 to metadata
    '2002:7f00:1::', // 6to4 wrapping 127.0.0.1
    'fe80::1%en0',
    'fd12::1',
  ]) {
    it(`rejects ${ip}`, () => {
      assert.equal(isPrivateOrReservedIp(ip), true);
    });
  }

  it('allows a public IPv6 address', () => {
    assert.equal(isPrivateOrReservedIp('2606:4700:4700::1111'), false);
  });
});

describe('SSRF guard: redirects', () => {
  it('refuses a redirect to the cloud metadata address', async () => {
    const fetchFn = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      })) as unknown as typeof fetch;
    await assert.rejects(
      safeFetch('https://hooks.example.com/x', { method: 'POST' }, fetchFn, {
        lookup: publicLookup,
        nodeEnv: 'production',
      }),
      /HTTPS|SSRF/
    );
  });

  it('follows a safe redirect with fetch redirects turned off', async () => {
    const seen: { url: string; redirect?: RequestRedirect }[] = [];
    const fetchFn = (async (url: URL, init?: RequestInit) => {
      seen.push({ url: String(url), redirect: init?.redirect });
      return seen.length === 1
        ? new Response(null, { status: 307, headers: { location: '/final' } })
        : new Response('ok', { status: 200 });
    }) as unknown as typeof fetch;
    const res = await safeFetch('https://hooks.example.com/x', undefined, fetchFn, {
      lookup: publicLookup,
      nodeEnv: 'production',
    });
    assert.equal(res.status, 200);
    assert.equal(seen[1].url, 'https://hooks.example.com/final');
    assert.ok(seen.every(s => s.redirect === 'manual'));
  });
});

describe('clientIp', () => {
  it('ignores the client-written start of X-Forwarded-For', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.9' });
    assert.equal(clientIp(headers), '203.0.113.9');
    assert.equal(clientIp(headers, 2), '2.2.2.2');
  });

  it('falls back to X-Real-IP', () => {
    assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.7' })), '198.51.100.7');
  });
});

describe('Mailchimp datacenter', () => {
  it('rejects a key suffix that would change the API host', () => {
    assert.throws(() => getMailchimpDc('abc-evil.com/x'), /datacenter/);
    assert.equal(getMailchimpDc('abc-us21'), 'us21');
  });
});
