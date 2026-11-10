/**
 * Review fixes: dotted slugs stay behind maintenance mode, and zip entries
 * can't inflate past their declared size.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { evaluateSiteModeAccess, isStaticFilePath } from '@/lib/site-mode-gate';
import { readZipEntry } from '@/server/backup/zip';

describe('Maintenance mode and dotted paths', () => {
  it('blocks page slugs that contain a dot', () => {
    for (const pathname of ['/main/blog/release-1.2', '/docs/v2.0', '/about.']) {
      const res = evaluateSiteModeAccess({
        siteMode: { mode: 'maintenance' },
        pathname,
        hasStaffSession: false,
      });
      assert.equal(res.blocked, true, pathname);
    }
  });

  it('still lets real static files through', () => {
    for (const pathname of ['/favicon.ico', '/next.svg', '/lottie/pulse.json', '/fonts/a.woff2']) {
      assert.equal(isStaticFilePath(pathname), true, pathname);
    }
    assert.equal(isStaticFilePath('/blog/release-1.2'), false);
  });
});

describe('Backup zip reading', () => {
  const entryFor = (data: Buffer, declared: number) => {
    // A minimal local file header (30 bytes, no name) followed by the data.
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    return {
      zip: Buffer.concat([header, data]),
      entry: {
        name: 'tables/x.json',
        compressionMethod: 8,
        compressedSize: data.length,
        uncompressedSize: declared,
        localHeaderOffset: 0,
      },
    };
  };

  it('reads an entry whose size matches its header', () => {
    const raw = Buffer.from('{"ok":true}');
    const { zip, entry } = entryFor(deflateRawSync(raw), raw.length);
    assert.equal(readZipEntry(zip, entry).toString(), '{"ok":true}');
  });

  it('refuses an entry that inflates past its declared size', () => {
    const bomb = deflateRawSync(Buffer.alloc(5 * 1024 * 1024));
    const { zip, entry } = entryFor(bomb, 1024);
    assert.throws(() => readZipEntry(zip, entry));
  });
});

describe('Privacy confirmation signing secret', () => {
  const KEYS = ['PRIVACY_SIGNING_SECRET', 'AUTH_SECRET', 'NEXTAUTH_SECRET', 'NODE_ENV'] as const;
  const env = process.env as Record<string, string | undefined>;
  const withEnv = async (vars: Partial<Record<(typeof KEYS)[number], string>>, fn: () => Promise<void> | void) => {
    const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
    for (const k of KEYS) delete env[k];
    Object.assign(env, vars);
    try {
      await fn();
    } finally {
      for (const k of KEYS) {
        if (saved[k] === undefined) delete env[k];
        else env[k] = saved[k];
      }
    }
  };
  const input = { siteId: 'default', email: 'a@example.test', type: 'erase' as const };

  it('refuses to sign in production without a real secret', async () => {
    const { createPrivacyConfirmationToken } = await import('@/lib/privacy-token');
    await withEnv({ NODE_ENV: 'production' }, () => {
      assert.throws(() => createPrivacyConfirmationToken(input), /PRIVACY_SIGNING_SECRET/);
    });
  });

  it('never accepts a token signed with the database URL', async () => {
    const { createPrivacyConfirmationToken, verifyPrivacyConfirmationToken } = await import('@/lib/privacy-token');
    await withEnv({ NODE_ENV: 'development' }, () => {
      const forged = createPrivacyConfirmationToken(input, {
        secret: process.env.DATABASE_URL ?? 'postgres://nextcms:nextcms_pass@localhost:5432/nextcms',
      });
      const result = verifyPrivacyConfirmationToken(forged) as { ok?: boolean } | null;
      assert.ok(!result || result.ok === false, 'forged token must not verify');
    });
  });
});
