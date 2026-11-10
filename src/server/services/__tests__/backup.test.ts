import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBackupMigrationCompatible,
  selectBackupsToPrune,
} from '@/server/backup/manifest';
import {
  EXCLUDED_SECRETS,
  scrubApiKeyRow,
  scrubSiteSettingsRow,
  scrubUserRow,
  scrubWebhookSubscriptionRow,
} from '@/server/backup/tables';
import { createZipArchive, readZipEntry, readZipIndex } from '@/server/backup/zip';

describe('backup manifest, secrets, pruning, and zip reader', () => {
  it('allows same or older migration tags and refuses newer migration tags', () => {
    const journal = [
      '20251106124107_abnormal_karma',
      '20261110053037_wordpress_import',
      '20261110082958_site_essentials',
    ];

    assert.equal(
      isBackupMigrationCompatible('20261110082958_site_essentials', journal).compatible,
      true
    );
    assert.equal(
      isBackupMigrationCompatible('20251106124107_abnormal_karma', journal).compatible,
      true
    );
    assert.equal(
      isBackupMigrationCompatible('20250101000000_even_older', journal).compatible,
      true
    );

    const newer = isBackupMigrationCompatible('20270101000000_future_feature', journal);
    assert.equal(newer.compatible, false);
    assert.ok(newer.reason?.includes('newer'));

    const missing = isBackupMigrationCompatible('', journal);
    assert.equal(missing.compatible, false);
  });

  it('scrubs password hashes, TOTP secrets, API key hashes, Mailchimp key, and webhook secrets', () => {
    const user = scrubUserRow({
      id: 'u1',
      email: 'admin@example.com',
      passwordHash: '$2b$10$secret',
      totpSecret: 'JBSWY3DPEHPK3PXP',
    });
    assert.equal('passwordHash' in user, false);
    assert.equal('totpSecret' in user, false);
    assert.equal(user.email, 'admin@example.com');

    const settings = scrubSiteSettingsRow({
      id: 'default',
      siteName: 'My Site',
      integrations: { mailchimp: { apiKey: 'mc-secret-key' } },
    });
    assert.equal(
      'apiKey' in ((settings.integrations as any).mailchimp ?? {}),
      false
    );

    const key = scrubApiKeyRow({
      id: 'k1',
      prefix: 'ncms_',
      hashedKey: 'sha256-secret',
    });
    assert.equal('hashedKey' in key, false);

    const hook = scrubWebhookSubscriptionRow({
      id: 'w1',
      url: 'https://example.com/hook',
      secret: 'whsec_123',
    });
    assert.equal('secret' in hook, false);

    assert.ok(EXCLUDED_SECRETS.some(s => s.includes('password_hash')));
    assert.ok(EXCLUDED_SECRETS.some(s => s.includes('totp_secret')));
    assert.ok(EXCLUDED_SECRETS.some(s => s.includes('mailchimp')));
  });

  it('prunes older backups keeping the newest N', () => {
    const items = [
      { id: 'b1', createdAt: '2026-11-01T00:00:00Z' },
      { id: 'b2', createdAt: '2026-11-05T00:00:00Z' },
      { id: 'b3', createdAt: '2026-11-03T00:00:00Z' },
      { id: 'b4', createdAt: '2026-11-07T00:00:00Z' },
    ];
    const toDelete = selectBackupsToPrune(items, 2);
    assert.deepEqual(
      toDelete.map(x => x.id),
      ['b3', 'b1']
    );
  });

  it('round-trips archiver zip entries via pure-Node ZIP reader', async () => {
    const chunks: Buffer[] = [];
    const archive = createZipArchive(6);
    const done = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (c: Buffer) => chunks.push(c));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });
    archive.append(JSON.stringify({ ok: true }), { name: 'manifest.json' });
    archive.append(JSON.stringify([{ id: 'p1' }]), { name: 'tables/pages.json' });
    archive.finalize();

    const zipBuf = await done;
    const index = readZipIndex(zipBuf);
    assert.ok(index.has('manifest.json'));
    assert.ok(index.has('tables/pages.json'));
    assert.deepEqual(
      JSON.parse(readZipEntry(zipBuf, index.get('manifest.json')!).toString('utf8')),
      { ok: true }
    );
    assert.deepEqual(
      JSON.parse(readZipEntry(zipBuf, index.get('tables/pages.json')!).toString('utf8')),
      [{ id: 'p1' }]
    );
  });
});
