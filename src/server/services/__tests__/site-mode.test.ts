import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSiteModeAccess,
  hashBypassToken,
  isAlwaysAllowedSiteModePath,
  isPathExcludedFromSiteMode,
} from '@/lib/site-mode-gate';

describe('site mode proxy gate', () => {
  it('allows all paths when mode is live', () => {
    const res = evaluateSiteModeAccess({
      siteMode: { mode: 'live', bypassToken: 'secret-1' },
      pathname: '/about',
      hasStaffSession: false,
    });
    assert.equal(res.blocked, false);
    assert.equal(res.mode, 'live');
    assert.equal(res.status, 200);
  });

  it('blocks anonymous visitors with 503 + Retry-After in maintenance mode', () => {
    const res = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance', bypassToken: 'secret-1' },
      pathname: '/about',
      hasStaffSession: false,
    });
    assert.equal(res.blocked, true);
    assert.equal(res.mode, 'maintenance');
    assert.equal(res.status, 503);
    assert.equal(res.retryAfter, '3600');
    assert.equal(res.noindex, true);
  });

  it('blocks anonymous visitors with 200 + noindex in coming_soon mode', () => {
    const res = evaluateSiteModeAccess({
      siteMode: { mode: 'coming_soon', bypassToken: 'secret-1' },
      pathname: '/',
      hasStaffSession: false,
    });
    assert.equal(res.blocked, true);
    assert.equal(res.mode, 'coming_soon');
    assert.equal(res.status, 200);
    assert.equal(res.noindex, true);
  });

  it('always skips dashboard, login, api, media, static files, robots.txt, sitemap.xml', () => {
    for (const p of [
      '/dashboard',
      '/dashboard/settings',
      '/login',
      '/api/health',
      '/media/hero.png',
      '/robots.txt',
      '/sitemap.xml',
      '/favicon.ico',
      '/_site-mode',
    ]) {
      assert.equal(isAlwaysAllowedSiteModePath(p), true, p);
      const res = evaluateSiteModeAccess({
        siteMode: { mode: 'maintenance' },
        pathname: p,
        hasStaffSession: false,
      });
      assert.equal(res.blocked, false, p);
    }
  });

  it('respects excludePaths including wildcards and site prefixes', () => {
    assert.equal(
      isPathExcludedFromSiteMode('/privacy', ['/privacy', '/legal/*']),
      true
    );
    assert.equal(
      isPathExcludedFromSiteMode('/main/legal/cookies', ['/legal/*'], 'main'),
      true
    );
    assert.equal(
      isPathExcludedFromSiteMode('/about', ['/privacy', '/legal/*']),
      false
    );

    const allowed = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance', excludePaths: ['/privacy'] },
      pathname: '/privacy',
      hasStaffSession: false,
    });
    assert.equal(allowed.blocked, false);
  });

  it('grants access via bypass query param and returns cookie hash, or via valid bypass cookie', () => {
    const token = 'shareable-preview-token-123';
    const expectedHash = hashBypassToken(token);

    const viaParam = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance', bypassToken: token },
      pathname: '/',
      bypassParam: token,
      hasStaffSession: false,
    });
    assert.equal(viaParam.blocked, false);
    assert.equal(viaParam.setBypassCookieHash, expectedHash);

    const viaCookie = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance', bypassToken: token },
      pathname: '/blog',
      bypassCookie: expectedHash,
      hasStaffSession: false,
    });
    assert.equal(viaCookie.blocked, false);

    const forged = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance', bypassToken: token },
      pathname: '/blog',
      bypassCookie: 'wrong-hash',
      bypassParam: 'wrong-token',
      hasStaffSession: false,
    });
    assert.equal(forged.blocked, true);
  });

  it('requires real staff session (hasStaffSession=true) and cannot be bypassed by forged hint', () => {
    const staff = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance' },
      pathname: '/about',
      hasStaffSession: true,
    });
    assert.equal(staff.blocked, false);

    const nonStaff = evaluateSiteModeAccess({
      siteMode: { mode: 'maintenance' },
      pathname: '/about',
      hasStaffSession: false,
    });
    assert.equal(nonStaff.blocked, true);
    assert.equal(nonStaff.status, 503);
  });
});
