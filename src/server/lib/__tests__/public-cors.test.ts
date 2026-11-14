import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluatePublicCors, publicCorsPreflight } from '../public-cors';

const site = {
  id: 'site_agency',
  primaryHost: 'agency.example.com',
  extraDomains: ['preview.agency.example.com'],
  exportAllowedOrigins: ['http://localhost:4010', 'https://static.example.org'],
};

describe('public-cors', () => {
  it('allows same-origin requests without explicit export origin', () => {
    const req = new Request('http://localhost:3001/api/forms/submit', {
      method: 'POST',
      headers: { host: 'localhost:3001', origin: 'http://localhost:3001' },
    });
    const res = evaluatePublicCors(req, site);
    assert.equal(res.allowed, true);
  });

  it('allows configured export origins with matching x-cms-site', () => {
    const req = new Request('http://localhost:3001/api/forms/submit', {
      method: 'POST',
      headers: {
        host: 'localhost:3001',
        origin: 'http://localhost:4010',
        'x-cms-site': 'site_agency',
      },
    });
    const res = evaluatePublicCors(req, site);
    assert.equal(res.allowed, true);
    assert.equal(res.allowOriginHeader, 'http://localhost:4010');
  });

  it('rejects mismatched x-cms-site even from an allowed origin', () => {
    const req = new Request('http://localhost:3001/api/forms/submit', {
      method: 'POST',
      headers: {
        host: 'localhost:3001',
        origin: 'http://localhost:4010',
        'x-cms-site': 'other_site',
      },
    });
    const res = evaluatePublicCors(req, site);
    assert.equal(res.allowed, false);
  });

  it('rejects unknown origins on preflight and POST', () => {
    const req = new Request('http://localhost:3001/api/forms/submit', {
      method: 'OPTIONS',
      headers: {
        host: 'localhost:3001',
        origin: 'https://evil.example.net',
      },
    });
    const res = publicCorsPreflight(req, site);
    assert.equal(res.status, 403);
  });
});
