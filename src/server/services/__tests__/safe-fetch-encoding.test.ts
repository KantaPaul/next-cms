import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import zlib from 'node:zlib';
import { fetchJsonCapped, safeFetch } from '@/server/lib/safe-fetch';

const payload = { items: [{ id: 1, title: 'Gzip works' }], note: 'x'.repeat(2000) };
const json = Buffer.from(JSON.stringify(payload));
const encoders: Partial<Record<string, (b: Buffer) => Buffer>> = {
  gzip: b => zlib.gzipSync(b),
  deflate: b => zlib.deflateSync(b),
  br: b => zlib.brotliCompressSync(b),
};

let server: http.Server;
let base = '';
const seenAcceptEncoding: string[] = [];

before(async () => {
  server = http.createServer((req, res) => {
    seenAcceptEncoding.push(String(req.headers['accept-encoding'] ?? ''));
    const encoding = (req.url ?? '/').slice(1);
    if (encoding === 'bomb') {
      // 5 MB of zeros, a few KB compressed: must trip the decoded-size cap.
      const body = zlib.gzipSync(Buffer.alloc(5 * 1024 * 1024, 0x20));
      res.writeHead(200, { 'content-type': 'application/json', 'content-encoding': 'gzip' });
      res.end(body);
      return;
    }
    const encode = encoders[encoding];
    const body = encode ? encode(json) : json;
    res.writeHead(200, {
      'content-type': 'application/json',
      'content-length': String(body.byteLength),
      ...(encode ? { 'content-encoding': encoding } : {}),
    });
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

const devFetch = (path: string, init?: RequestInit) =>
  safeFetch(`${base}${path}`, init, fetch, { nodeEnv: 'development' });

describe('safeFetch compressed responses (pinned connection)', () => {
  for (const encoding of ['gzip', 'deflate', 'br', 'identity']) {
    it(`decodes ${encoding} bodies`, async () => {
      const res = await devFetch(`/${encoding}`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-encoding'), null);
      assert.deepEqual(await fetchJsonCapped(res), payload);
    });
  }

  it('asks for encodings it can decode, replacing a preset value', async () => {
    seenAcceptEncoding.length = 0;
    await devFetch('/gzip', { headers: { 'Accept-Encoding': 'zstd' } });
    assert.equal(seenAcceptEncoding[0], 'gzip, deflate, br');
  });

  it('caps the decoded size, so a small compressed bomb is rejected', async () => {
    const res = await devFetch('/bomb');
    await assert.rejects(() => fetchJsonCapped(res), /exceeds maximum allowed size/);
  });
});
