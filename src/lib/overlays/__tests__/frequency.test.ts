import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShow,
  getOverlayStorageKey,
} from '../frequency';
import type { OverlayFrequency, OverlayStorageState } from '../types';

describe('Overlay frequency engine', () => {
  const baseFrequency: OverlayFrequency = {
    mode: 'every-page',
    days: 7,
    stopAfterConversion: false,
  };

  it('allows every-page mode across multiple views unless converted', () => {
    const freq: OverlayFrequency = {
      mode: 'every-page',
      stopAfterConversion: true,
    };

    // First view
    assert.equal(shouldShow(freq, null), true);

    // Seen multiple times but not converted
    const seenState: OverlayStorageState = {
      viewCount: 5,
      lastViewedAt: Date.now() - 1000,
      sessionViewed: true,
      converted: false,
    };
    assert.equal(shouldShow(freq, seenState), true);

    // Converted with stopAfterConversion
    const convertedState: OverlayStorageState = {
      ...seenState,
      converted: true,
    };
    assert.equal(shouldShow(freq, convertedState), false);
  });

  it('restricts once-session mode to once per session', () => {
    const freq: OverlayFrequency = {
      mode: 'once-session',
      stopAfterConversion: false,
    };

    assert.equal(shouldShow(freq, null), true);
    assert.equal(
      shouldShow(freq, { viewCount: 0, sessionViewed: false }),
      true
    );
    assert.equal(
      shouldShow(freq, { viewCount: 1, sessionViewed: true }),
      false
    );
  });

  it('enforces once-per-days mode based on elapsed time', () => {
    const freq: OverlayFrequency = {
      mode: 'once-per-days',
      days: 3,
      stopAfterConversion: false,
    };
    const now = new Date('2026-06-10T12:00:00Z').getTime();
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    const fourDaysAgo = now - 4 * 24 * 60 * 60 * 1000;

    // First time
    assert.equal(shouldShow(freq, null, now), true);

    // Viewed 2 days ago (less than 3 days) -> do not show
    assert.equal(
      shouldShow(freq, { viewCount: 1, lastViewedAt: twoDaysAgo }, now),
      false
    );

    // Viewed 4 days ago (more than 3 days) -> show
    assert.equal(
      shouldShow(freq, { viewCount: 1, lastViewedAt: fourDaysAgo }, now),
      true
    );
  });

  it('enforces once-ever mode', () => {
    const freq: OverlayFrequency = {
      mode: 'once-ever',
      stopAfterConversion: false,
    };

    assert.equal(shouldShow(freq, null), true);
    assert.equal(shouldShow(freq, { viewCount: 0 }), true);
    assert.equal(shouldShow(freq, { viewCount: 1 }), false);
    assert.equal(shouldShow(freq, { viewCount: 10 }), false);
  });

  it('resets frequency cap when publishedAt changes (republish reset)', () => {
    const overlayId = 'popup-promo-1';
    const firstPublishedAt = '2026-06-01T10:00:00Z';
    const republishAt = '2026-06-15T10:00:00Z';

    const key1 = getOverlayStorageKey(overlayId, firstPublishedAt);
    const key2 = getOverlayStorageKey(overlayId, republishAt);

    // The storage key changes on republish, resetting any client-side frequency state
    assert.notEqual(key1, key2);
    assert.ok(key1.includes(String(new Date(firstPublishedAt).getTime())));
    assert.ok(key2.includes(String(new Date(republishAt).getTime())));
  });
});
