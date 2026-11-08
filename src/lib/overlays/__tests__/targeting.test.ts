import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchTargeting,
  matchesRule,
  isWithinSchedule,
  type TargetingContext,
} from '../targeting';
import type { OverlaySettings } from '../types';

describe('Overlay targeting engine', () => {
  it('matches prefix vs exact matching rules correctly', () => {
    const ctx: TargetingContext = { pathname: '/blog/posts/summer-sale' };

    // Exact matches
    assert.equal(
      matchesRule({ kind: 'exact', value: '/blog/posts/summer-sale' }, ctx),
      true
    );
    assert.equal(
      matchesRule({ kind: 'exact', value: '/blog/posts' }, ctx),
      false
    );

    // Prefix matches
    assert.equal(
      matchesRule({ kind: 'prefix', value: '/blog' }, ctx),
      true
    );
    assert.equal(
      matchesRule({ kind: 'prefix', value: '/blog/posts' }, ctx),
      true
    );
    assert.equal(
      matchesRule({ kind: 'prefix', value: '/products' }, ctx),
      false
    );
    // Boundary prefix check: /blogging should not match /blog
    assert.equal(
      matchesRule({ kind: 'prefix', value: '/blog' }, { pathname: '/blogging' }),
      false
    );
  });

  it('matches entity and post-type rules', () => {
    const ctx: TargetingContext = {
      pathname: '/posts/featured-article',
      entity: {
        type: 'post',
        id: 'post-123',
        slug: 'featured-article',
      },
    };

    assert.equal(
      matchesRule({ kind: 'post-type', value: 'post' }, ctx),
      true
    );
    assert.equal(
      matchesRule({ kind: 'post-type', value: 'page' }, ctx),
      false
    );
    assert.equal(
      matchesRule({ kind: 'entity', value: 'post-123' }, ctx),
      true
    );
    assert.equal(
      matchesRule({ kind: 'entity', value: 'featured-article' }, ctx),
      true
    );
    assert.equal(
      matchesRule({ kind: 'entity', value: 'other-id' }, ctx),
      false
    );
  });

  it('enforces path include and exclude precedence (exclude takes precedence)', () => {
    const settings: Partial<OverlaySettings> = {
      enabled: true,
      targeting: {
        include: [{ kind: 'prefix', value: '/blog' }],
        exclude: [{ kind: 'exact', value: '/blog/private' }],
        userState: 'all',
        devices: ['desktop', 'tablet', 'mobile'],
      },
    };

    // Included path
    assert.equal(
      matchTargeting(settings as OverlaySettings, { pathname: '/blog/article-1' }),
      true
    );

    // Path outside include
    assert.equal(
      matchTargeting(settings as OverlaySettings, { pathname: '/pricing' }),
      false
    );

    // Excluded path (even though it matches prefix /blog)
    assert.equal(
      matchTargeting(settings as OverlaySettings, { pathname: '/blog/private' }),
      false
    );
  });

  it('filters by user state (all, guest, logged-in)', () => {
    const guestOnly: Partial<OverlaySettings> = {
      enabled: true,
      targeting: {
        include: [{ kind: 'all', value: '' }],
        exclude: [],
        userState: 'guest',
        devices: ['desktop', 'tablet', 'mobile'],
      },
    };

    assert.equal(
      matchTargeting(guestOnly as OverlaySettings, {
        pathname: '/',
        userState: 'guest',
      }),
      true
    );
    assert.equal(
      matchTargeting(guestOnly as OverlaySettings, {
        pathname: '/',
        userState: 'logged-in',
      }),
      false
    );

    const loggedInOnly: Partial<OverlaySettings> = {
      enabled: true,
      targeting: {
        include: [{ kind: 'all', value: '' }],
        exclude: [],
        userState: 'logged-in',
        devices: ['desktop', 'tablet', 'mobile'],
      },
    };

    assert.equal(
      matchTargeting(loggedInOnly as OverlaySettings, {
        pathname: '/',
        userState: 'guest',
      }),
      false
    );
    assert.equal(
      matchTargeting(loggedInOnly as OverlaySettings, {
        pathname: '/',
        userState: 'logged-in',
      }),
      true
    );
  });

  it('respects schedule window (startsAt, endsAt, enabled)', () => {
    const schedule = {
      enabled: true,
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-06-30T23:59:59.000Z',
    };

    // Before startsAt
    assert.equal(
      isWithinSchedule(schedule, '2026-05-15T00:00:00.000Z'),
      false
    );

    // Within window
    assert.equal(
      isWithinSchedule(schedule, '2026-06-15T12:00:00.000Z'),
      true
    );

    // After endsAt
    assert.equal(
      isWithinSchedule(schedule, '2026-07-01T00:00:00.000Z'),
      false
    );

    // Disabled overlay
    assert.equal(
      isWithinSchedule({ ...schedule, enabled: false }, '2026-06-15T12:00:00.000Z'),
      false
    );
  });
});
