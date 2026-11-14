import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('proxy dashboard locale rewrite', () => {
  it('rewrites /dashboard/es/pages to /dashboard/pages with x-cms-admin-locale', async () => {
    const req = new NextRequest('http://localhost:3001/dashboard/es/pages');
    const res = await proxy(req);
    assert.equal(res.headers.get('x-middleware-rewrite'), 'http://localhost:3001/dashboard/pages');
    assert.equal(res.headers.get('x-middleware-request-x-cms-admin-locale'), 'es');
  });

  it('does not rewrite /dashboard/api routes', async () => {
    const req = new NextRequest('http://localhost:3001/dashboard/api/health');
    const res = await proxy(req);
    assert.equal(res.headers.get('x-middleware-rewrite'), null);
    assert.equal(res.headers.get('x-middleware-request-x-cms-admin-locale'), null);
  });

  it('strips spoofed x-cms-admin-locale headers on unprefixed routes', async () => {
    const req = new NextRequest('http://localhost:3001/dashboard/pages', {
      headers: { 'x-cms-admin-locale': 'fr' },
    });
    const res = await proxy(req);
    assert.equal(res.headers.get('x-middleware-request-x-cms-admin-locale'), null);
  });
});
