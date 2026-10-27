/**
 * node:test suite for the video library parsers, embed host allowlist,
 * video settings schema, and progress clamp.
 *
 * Run with: pnpm test   (or: npx tsx --test src/lib/video/__tests__/video.test.ts)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseVideoUrl } from '../parse';
import { buildEmbed, isAllowlistedEmbedHost } from '../embed';
import { parseVideoSettings } from '../settings';
import { clampProgress } from '../progress';

describe('parseVideoUrl', () => {
  it('parses YouTube watch URLs', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(result?.provider, 'youtube');
    assert.equal(result?.id, 'dQw4w9WgXcQ');
  });

  it('parses youtu.be short URLs', () => {
    const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    assert.equal(result?.provider, 'youtube');
    assert.equal(result?.id, 'dQw4w9WgXcQ');
  });

  it('parses YouTube embed URLs', () => {
    const result = parseVideoUrl(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
    assert.equal(result?.provider, 'youtube');
    assert.equal(result?.id, 'dQw4w9WgXcQ');
  });

  it('parses YouTube shorts URLs', () => {
    const result = parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.equal(result?.provider, 'youtube');
    assert.equal(result?.id, 'dQw4w9WgXcQ');
  });

  it('parses youtube-nocookie embed URLs', () => {
    const result = parseVideoUrl(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
    assert.equal(result?.provider, 'youtube');
    assert.equal(result?.id, 'dQw4w9WgXcQ');
  });

  it('parses Vimeo URLs', () => {
    const result = parseVideoUrl('https://vimeo.com/123456789');
    assert.equal(result?.provider, 'vimeo');
    assert.equal(result?.id, '123456789');
  });

  it('parses player.vimeo.com URLs', () => {
    const result = parseVideoUrl('https://player.vimeo.com/video/123456789');
    assert.equal(result?.provider, 'vimeo');
    assert.equal(result?.id, '123456789');
  });

  it('parses direct MP4 URLs', () => {
    const result = parseVideoUrl('https://example.com/video.mp4');
    assert.equal(result?.provider, 'direct');
    assert.equal(result?.id, 'https://example.com/video.mp4');
  });

  it('parses direct WebM URLs', () => {
    const result = parseVideoUrl('https://example.com/video.webm');
    assert.equal(result?.provider, 'direct');
    assert.equal(result?.id, 'https://example.com/video.webm');
  });

  it('rejects HTTP (non-HTTPS) direct URLs', () => {
    assert.equal(parseVideoUrl('http://example.com/video.mp4'), null);
  });

  it('rejects non-video extensions', () => {
    assert.equal(parseVideoUrl('https://example.com/video.mov'), null);
    assert.equal(parseVideoUrl('https://example.com/video.avi'), null);
  });

  it('rejects unsupported hosts', () => {
    assert.equal(parseVideoUrl('https://dailymotion.com/video/x123'), null);
  });

  it('rejects empty and invalid input', () => {
    assert.equal(parseVideoUrl(''), null);
    assert.equal(parseVideoUrl('not-a-url'), null);
    assert.equal(parseVideoUrl('https://example.com'), null);
  });
});

describe('buildEmbed', () => {
  it('builds YouTube embed src on the allowlisted host', () => {
    const parsed = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')!;
    const embed = buildEmbed(parsed);
    assert.equal(embed?.provider, 'youtube');
    assert.equal(
      embed?.src,
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });

  it('builds Vimeo embed src on the allowlisted host', () => {
    const parsed = parseVideoUrl('https://vimeo.com/123456789')!;
    const embed = buildEmbed(parsed);
    assert.equal(embed?.provider, 'vimeo');
    assert.equal(embed?.src, 'https://player.vimeo.com/video/123456789');
  });

  it('returns null for direct files', () => {
    const parsed = parseVideoUrl('https://example.com/video.mp4')!;
    assert.equal(buildEmbed(parsed), null);
  });
});

describe('isAllowlistedEmbedHost', () => {
  it('returns true for allowlisted hosts', () => {
    assert.equal(isAllowlistedEmbedHost('www.youtube-nocookie.com'), true);
    assert.equal(isAllowlistedEmbedHost('player.vimeo.com'), true);
  });

  it('returns false for non-allowlisted hosts', () => {
    assert.equal(isAllowlistedEmbedHost('www.youtube.com'), false);
    assert.equal(isAllowlistedEmbedHost('evil.com'), false);
  });
});

describe('parseVideoSettings', () => {
  it('accepts default settings', () => {
    const result = parseVideoSettings({
      providers: { youtube: true, vimeo: true, direct: true },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.providers.youtube, true);
      assert.equal(result.data.providers.vimeo, true);
      assert.equal(result.data.providers.direct, true);
    }
  });

  it('accepts disabled providers', () => {
    const result = parseVideoSettings({
      providers: { youtube: true, vimeo: false, direct: false },
    });
    assert.equal(result.ok, true);
  });

  it('rejects when all providers are disabled', () => {
    const result = parseVideoSettings({
      providers: { youtube: false, vimeo: false, direct: false },
    });
    assert.equal(result.ok, false);
  });

  it('rejects unknown providers', () => {
    const result = parseVideoSettings({
      providers: { youtube: true, vimeo: true, direct: true, fake: true },
    });
    assert.equal(result.ok, false);
  });
});

describe('clampProgress', () => {
  it('clamps position below zero to zero', () => {
    const result = clampProgress(-10, 100);
    assert.equal(result.position, 0);
    assert.equal(result.completed, false);
  });

  it('clamps position above duration to duration', () => {
    const result = clampProgress(150, 100);
    assert.equal(result.position, 100);
    assert.equal(result.completed, true);
  });

  it('marks complete at 95% of duration', () => {
    const result = clampProgress(95, 100);
    assert.equal(result.completed, true);
    assert.equal(result.progress, 0.95);
  });

  it('is not complete at 94% of duration', () => {
    const result = clampProgress(94, 100);
    assert.equal(result.completed, false);
    assert.equal(result.progress, 0.94);
  });

  const result = clampProgress(30, 100);
  assert.equal(result.position, 30);
  assert.equal(result.progress, 0.3);
  assert.equal(result.completed, false);

  it('returns null progress when duration is unknown', () => {
    const result = clampProgress(30, null);
    assert.equal(result.progress, null);
    assert.equal(result.completed, false);
  });

  it('uses maxPosition as upper bound', () => {
    const result = clampProgress(50, 100, 40);
    assert.equal(result.position, 40);
  });
});
