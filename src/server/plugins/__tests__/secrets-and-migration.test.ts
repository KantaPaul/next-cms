import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PluginSettingField } from '@nextcms/plugin-sdk';
import { maskSecretValue } from '@nextcms/plugin-sdk';
import { runMailchimpMigrationOnce } from '../migrate-mailchimp';
import {
  decryptPluginSecret,
  decryptPluginSettings,
  encryptPluginSecret,
  encryptPluginSettings,
  isEncryptedPluginSecret,
  maskPluginSettingsForClient,
  scrubPluginRow,
} from '../secrets';

describe('plugin secrets, masking, backups, and Mailchimp migration', () => {
  const secretKey = 'unit-test-plugin-secret-key-32bytes!';
  const fields: Record<string, PluginSettingField> = {
    apiKey: { label: 'API Key', secret: true },
    label: { label: 'Label', type: 'text', defaultValue: 'Default Label' },
  };

  it('encrypts secrets with AES-256-GCM and decrypts only on server', () => {
    const cipher = encryptPluginSecret('mc-secret-123-us21', secretKey);
    assert.ok(isEncryptedPluginSecret(cipher));
    assert.equal(cipher.includes('mc-secret-123'), false);
    assert.equal(decryptPluginSecret(cipher, secretKey), 'mc-secret-123-us21');
  });

  it('never leaks secrets in client payloads and preserves existing secret when masked value is saved', () => {
    const stored = encryptPluginSettings(
      { apiKey: 'my-secret-key-us10', label: 'Custom' },
      fields,
      {},
      secretKey
    );
    assert.ok(isEncryptedPluginSecret(stored.apiKey));

    const clientView = maskPluginSettingsForClient(stored, fields);
    assert.equal(clientView.label, 'Custom');
    assert.equal(typeof clientView.apiKey, 'string');
    assert.equal(String(clientView.apiKey).includes('my-secret-key'), false);
    assert.equal(String(clientView.apiKey).includes('enc:v1:'), false);

    // Resubmitting masked value keeps the encrypted secret intact
    const reSaved = encryptPluginSettings(
      { apiKey: maskSecretValue('anything'), label: 'Updated' },
      fields,
      stored,
      secretKey
    );
    assert.equal(reSaved.apiKey, stored.apiKey);
    assert.equal(
      decryptPluginSettings(reSaved, fields, secretKey).apiKey,
      'my-secret-key-us10'
    );
  });

  it('scrubs secret settings from plugin backup rows', () => {
    const stored = encryptPluginSettings(
      { apiKey: 'secret-val', label: 'Public' },
      fields,
      {},
      secretKey
    );
    const scrubbed = scrubPluginRow(
      { pluginId: 'mailchimp', settings: stored },
      { mailchimp: new Set(['apiKey']) }
    );
    assert.equal('apiKey' in (scrubbed.settings as Record<string, unknown>), false);
    assert.equal((scrubbed.settings as Record<string, unknown>).label, 'Public');
  });

  it('migrates legacy Mailchimp key once, encrypts it, and turns plugin on', async () => {
    const inserted: Array<{
      siteId: string;
      encryptedApiKey: string;
      version: string | null;
    }> = [];
    let cleared = false;

    const first = await runMailchimpMigrationOnce(
      'site-1',
      {
        hasPluginRow: async () => false,
        readLegacyApiKey: async () => 'legacy-key-us21',
        insertEnabledPlugin: async (siteId, encryptedApiKey, version) => {
          inserted.push({ siteId, encryptedApiKey, version });
        },
        clearLegacyApiKey: async () => {
          cleared = true;
        },
      },
      '1.0.0',
      secretKey
    );

    assert.deepEqual(first, { migrated: true, enabled: true });
    assert.equal(inserted.length, 1);
    assert.ok(isEncryptedPluginSecret(inserted[0].encryptedApiKey));
    assert.equal(decryptPluginSecret(inserted[0].encryptedApiKey, secretKey), 'legacy-key-us21');
    assert.equal(cleared, true);

    // Second run when row already exists is a no-op
    const second = await runMailchimpMigrationOnce(
      'site-1',
      {
        hasPluginRow: async () => true,
        readLegacyApiKey: async () => 'legacy-key-us21',
        insertEnabledPlugin: async () => {
          throw new Error('should not insert again');
        },
      },
      '1.0.0',
      secretKey
    );
    assert.deepEqual(second, { migrated: false, enabled: false });
  });
});
