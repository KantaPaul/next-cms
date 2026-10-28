/**
 * node:test suite for the video permission keys and the role matrix.
 *
 * Run with: npm test   (tsx --test src/lib/video/__tests__/video.test.ts src/config/__tests__/permissions.test.ts)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PERMISSIONS,
  PERMISSION_MATRIX,
  ROLE_NAMES,
} from '../permissions';

const VIDEO_KEYS = [
  PERMISSIONS.VIDEOS_CREATE,
  PERMISSIONS.VIDEOS_EDIT,
  PERMISSIONS.VIDEOS_PUBLISH,
  PERMISSIONS.VIDEOS_DELETE,
] as const;

describe('video permissions', () => {
  it('exposes the four video permission keys', () => {
    assert.equal(PERMISSIONS.VIDEOS_CREATE, 'videos.create');
    assert.equal(PERMISSIONS.VIDEOS_EDIT, 'videos.edit');
    assert.equal(PERMISSIONS.VIDEOS_PUBLISH, 'videos.publish');
    assert.equal(PERMISSIONS.VIDEOS_DELETE, 'videos.delete');
    assert.equal(VIDEO_KEYS.length, 4);
  });

  it('has a matrix row for each video key', () => {
    const rows = PERMISSION_MATRIX.filter(row =>
      VIDEO_KEYS.includes(row.key as (typeof VIDEO_KEYS)[number])
    );
    assert.equal(rows.length, 4);
  });

  it('matches the intended role matrix', () => {
    const matrix = Object.fromEntries(
      PERMISSION_MATRIX.map(row => [row.key, row])
    ) as Record<string, { key: string; label: string; roles: Record<string, boolean> }>;

    const expected: Record<string, Record<string, boolean>> = {
      'videos.create': { Admin: true, Editor: true, Author: true, Viewer: false },
      'videos.edit': { Admin: true, Editor: true, Author: true, Viewer: false },
      'videos.publish': { Admin: true, Editor: true, Author: false, Viewer: false },
      'videos.delete': { Admin: true, Editor: true, Author: false, Viewer: false },
    };

    for (const key of VIDEO_KEYS) {
      const row = matrix[key];
      assert.ok(row, `missing matrix row for ${key}`);
      for (const role of ROLE_NAMES) {
        assert.equal(
          row.roles[role],
          expected[key][role],
          `${key} should ${expected[key][role] ? 'allow' : 'deny'} ${role}`
        );
      }
    }
  });
});
