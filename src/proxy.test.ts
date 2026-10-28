/**
 * Unit tests for the proxy: client site-header stripping and site-slug
 * injection from the first path segment (R650/R665).
 * Run with: npx tsx --test src/proxy.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { proxy } from './proxy';
import { NextRequest } from 'next/server';

// Minimal fetch stub used by the proxy's redirect lookup.
let capturedHeaders: Record<string, string> = {};
globalThis.fetch = (async (_url: string | Request, init?: any) => {
  const raw = init?.headers;
  const entries =
    raw && typeof raw.entries === 'function'
      ? Array.from(raw.entries())
      : raw
        ? Object.entries(raw)
        : [];
  capturedHeaders = Object.fromEntries(
    entries as [string, string][]
  );
  return new Response(JSON.stringify({ to: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  } as any);
}) as any;

function makeRequest(url: string, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers(extraHeaders);
  if (!headers.has('host')) headers.set('host', 'example.com');
  return new NextRequest(`http://localhost${url}`, { headers });
}

async function runProxy(url: string, extraHeaders: Record<string, string> = {}) {
  capturedHeaders = {};
  const res = await proxy(makeRequest(url, extraHeaders));
  return { res, headers: capturedHeaders };
}

describe('proxy site header handling', () => {
  it('strips a client-sent x-cms-host header', async () => {
    const { headers } = await runProxy('/main/about', {
      'x-cms-host': 'attacker.com',
    });
    assert.equal(headers['x-cms-host'], 'example.com');
  });

  it('strips a client-sent x-cms-site-slug header', async () => {
    const { headers } = await runProxy('/main/about', {
      'x-cms-site-slug': 'attacker',
    });
    assert.equal(headers['x-cms-site-slug'], 'main');
  });

  it('sets x-cms-site-slug from the first path segment', async () => {
    const { headers } = await runProxy('/agency-2026/contact');
    assert.equal(headers['x-cms-site-slug'], 'agency-2026');
  });

  it('does not set x-cms-site-slug on the root path', async () => {
    const { headers } = await runProxy('/');
    assert.equal(headers['x-cms-site-slug'], undefined);
  });

  it('sets x-cms-host from the request host', async () => {
    const { headers } = await runProxy('/main/about');
    assert.equal(headers['x-cms-host'], 'example.com');
  });
});
