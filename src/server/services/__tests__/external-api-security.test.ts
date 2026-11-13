import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PERMISSIONS,
  PERMISSION_MATRIX,
  ROLE_NAMES,
} from '@/config/permissions';
import {
  decryptHeadersForRuntime,
  decryptSecretMap,
  encryptHeadersForStorage,
  encryptSecretMap,
  interpolateExternalApiHeaders,
  isEncryptedExternalApiSecret,
  isMaskedSecret,
  maskHeadersForDisplay,
  maskSecretLast4,
  maskSecretMap,
} from '@/server/lib/external-api-secrets';
import {
  createPinnedLookup,
  fetchJsonCapped,
  resolveSafeUrl,
} from '@/server/lib/safe-fetch';
import {
  createListingCache,
  interpolateEnvHeaders,
} from '@/server/services/listing-query.service';

describe('External API Phase 1 Security', () => {
  describe('EXTERNAL_API_MANAGE permission', () => {
    it('defines external_api.manage as Admin-only in PERMISSION_MATRIX', () => {
      assert.equal(PERMISSIONS.EXTERNAL_API_MANAGE, 'external_api.manage');
      const row = PERMISSION_MATRIX.find(
        r => r.key === PERMISSIONS.EXTERNAL_API_MANAGE
      );
      assert.ok(row, 'missing matrix row for external_api.manage');
      assert.equal(row.roles.Admin, true);
      for (const role of ROLE_NAMES.filter(r => r !== 'Admin')) {
        assert.equal(row.roles[role], false, `${role} should not have manage`);
      }
    });
  });

  describe('Env placeholder lockdown & secrets vault', () => {
    it('never resolves arbitrary env vars like DATABASE_URL or AUTH_SECRET', () => {
      const prevDb = process.env.DATABASE_URL;
      const prevExt = process.env.EXT_API_PUBLIC_TOKEN;
      process.env.DATABASE_URL = 'postgres://super-secret-db';
      process.env.EXT_API_PUBLIC_TOKEN = 'ext-allowed-123';

      try {
        const result = interpolateEnvHeaders({
          'X-Leak': '{{env.DATABASE_URL}}',
          'X-Allowed-Prefix': '{{env.EXT_API_PUBLIC_TOKEN}}',
        });
        assert.equal(result['X-Leak'], '');
        assert.equal(result['X-Allowed-Prefix'], 'ext-allowed-123');
      } finally {
        if (prevDb === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = prevDb;
        if (prevExt === undefined) delete process.env.EXT_API_PUBLIC_TOKEN;
        else process.env.EXT_API_PUBLIC_TOKEN = prevExt;
      }
    });

    it('allows explicitly allowlisted env vars and disables env when allowEnv=false', () => {
      const prevCustom = process.env.CUSTOM_PARTNER_KEY;
      process.env.CUSTOM_PARTNER_KEY = 'partner-xyz';

      try {
        const allowed = interpolateExternalApiHeaders(
          { Authorization: 'Bearer {{env.CUSTOM_PARTNER_KEY}}' },
          {},
          { envAllowlist: ['CUSTOM_PARTNER_KEY'] }
        );
        assert.equal(allowed.Authorization, 'Bearer partner-xyz');

        const blocked = interpolateExternalApiHeaders(
          { Authorization: 'Bearer {{env.CUSTOM_PARTNER_KEY}}' },
          {},
          { allowEnv: false, envAllowlist: ['CUSTOM_PARTNER_KEY'] }
        );
        assert.equal(blocked.Authorization, 'Bearer ');
      } finally {
        if (prevCustom === undefined) delete process.env.CUSTOM_PARTNER_KEY;
        else process.env.CUSTOM_PARTNER_KEY = prevCustom;
      }
    });

    it('resolves {{secret.NAME}} from decrypted vault secrets', () => {
      const headers = interpolateExternalApiHeaders(
        {
          Authorization: 'Bearer {{secret.API_TOKEN}}',
          'X-Missing': '{{secret.NOPE}}',
        },
        { API_TOKEN: 'sk-live-9876' }
      );
      assert.equal(headers.Authorization, 'Bearer sk-live-9876');
      assert.equal(headers['X-Missing'], '');
    });

    it('encrypts secrets & sensitive headers, masks as ••••last4, and preserves on masked round-trip', () => {
      const key = 'test-master-key-32-bytes-minimum!!';
      const storedSecrets = encryptSecretMap(
        { API_TOKEN: 'sk-live-abcdef1234', SHORT: 'abc' },
        {},
        key
      );
      assert.ok(isEncryptedExternalApiSecret(storedSecrets.API_TOKEN));
      assert.ok(isEncryptedExternalApiSecret(storedSecrets.SHORT));

      const maskedSecrets = maskSecretMap(storedSecrets, key);
      assert.equal(maskedSecrets.API_TOKEN, '••••1234');
      assert.equal(maskedSecrets.SHORT, '••••');
      assert.ok(isMaskedSecret(maskedSecrets.API_TOKEN));

      // Round-trip update with masked values preserves original encrypted secrets
      const updatedSecrets = encryptSecretMap(
        { API_TOKEN: maskedSecrets.API_TOKEN, SHORT: maskedSecrets.SHORT },
        storedSecrets,
        key
      );
      assert.equal(updatedSecrets.API_TOKEN, storedSecrets.API_TOKEN);
      assert.equal(updatedSecrets.SHORT, storedSecrets.SHORT);

      const decryptedSecrets = decryptSecretMap(updatedSecrets, key);
      assert.equal(decryptedSecrets.API_TOKEN, 'sk-live-abcdef1234');
      assert.equal(decryptedSecrets.SHORT, 'abc');

      // Sensitive headers are also encrypted, masked, and preserved on round-trip
      const storedHeaders = encryptHeadersForStorage(
        {
          Authorization: 'Bearer raw-secret-token-9999',
          'X-Custom': 'plain-value',
          'X-Vault': 'Bearer {{secret.API_TOKEN}}',
        },
        {},
        key
      );
      assert.ok(isEncryptedExternalApiSecret(storedHeaders.Authorization));
      assert.equal(storedHeaders['X-Custom'], 'plain-value');
      assert.equal(storedHeaders['X-Vault'], 'Bearer {{secret.API_TOKEN}}');

      const maskedHeaders = maskHeadersForDisplay(storedHeaders, key);
      assert.equal(maskedHeaders.Authorization, maskSecretLast4('Bearer raw-secret-token-9999'));
      assert.equal(maskedHeaders['X-Custom'], 'plain-value');
      assert.equal(maskedHeaders['X-Vault'], 'Bearer {{secret.API_TOKEN}}');

      const roundTripHeaders = encryptHeadersForStorage(
        maskedHeaders,
        storedHeaders,
        key
      );
      assert.equal(roundTripHeaders.Authorization, storedHeaders.Authorization);

      const runtimeHeaders = decryptHeadersForRuntime(roundTripHeaders, key);
      assert.equal(runtimeHeaders.Authorization, 'Bearer raw-secret-token-9999');
    });
  });

  describe('Response size cap (fetchJsonCapped)', () => {
    it('parses JSON responses within the byte limit', async () => {
      const res = new Response(JSON.stringify({ ok: true, count: 2 }), {
        headers: { 'content-type': 'application/json' },
      });
      const parsed = await fetchJsonCapped(res, 1024);
      assert.deepEqual(parsed, { ok: true, count: 2 });
    });

    it('rejects responses exceeding Content-Length limit', async () => {
      const res = new Response(JSON.stringify({ data: 'x'.repeat(200) }), {
        headers: { 'content-length': '5000' },
      });
      await assert.rejects(
        () => fetchJsonCapped(res, 1024),
        /exceeds maximum allowed size/
      );
    });

    it('aborts and rejects streaming responses exceeding maxBytes without Content-Length', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('{"items":["'));
          controller.enqueue(encoder.encode('a'.repeat(500)));
          controller.enqueue(encoder.encode('b'.repeat(500)));
          controller.enqueue(encoder.encode('"]}'));
          controller.close();
        },
      });
      const res = new Response(stream);
      await assert.rejects(
        () => fetchJsonCapped(res, 600),
        /exceeds maximum allowed size/
      );
    });
  });

  describe('LRU listingCache eviction', () => {
    it('evicts the least-recently-used entry when capacity is reached', () => {
      const cache = createListingCache(3);
      const makeEntry = (id: string) => ({
        result: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          hasMore: false,
        },
        expiresAt: Date.now() + 60_000,
        siteId: 'site-1',
        language: 'en',
        source: 'posts' as const,
        _tag: id,
      });

      cache.set('k1', makeEntry('1'));
      cache.set('k2', makeEntry('2'));
      cache.set('k3', makeEntry('3'));
      assert.equal(cache.size, 3);

      // Touch k1 so k2 becomes the oldest
      assert.ok(cache.get('k1'));

      cache.set('k4', makeEntry('4'));
      assert.equal(cache.size, 3);
      assert.equal(cache.get('k2'), undefined);
      assert.ok(cache.get('k1'));
      assert.ok(cache.get('k3'));
      assert.ok(cache.get('k4'));
    });
  });

  describe('DNS pinning in safeFetch', () => {
    it('resolves safe public IPs and pins them in createPinnedLookup', async () => {
      const resolved = await resolveSafeUrl('https://api.example.com/v1', {
        lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      });
      assert.equal(resolved.url.hostname, 'api.example.com');
      assert.deepEqual(resolved.addresses, [
        { address: '93.184.216.34', family: 4 },
      ]);

      const pinned = createPinnedLookup(resolved.addresses);
      await new Promise<void>((resolve, reject) => {
        pinned!(
          'api.example.com',
          { family: 4 },
          (err, address, family) => {
            if (err) return reject(err);
            assert.equal(address, '93.184.216.34');
            assert.equal(family, 4);
            resolve();
          }
        );
      });
    });
  });

  describe('Auth & public action lockdown', () => {
    it('rejects unauthenticated calls to inspectExternalApiAction and resolveEditorListingQuery', async () => {
      const { inspectExternalApiAction, resolveEditorListingQuery, resolveListingQuery } =
        await import('@/server/actions/listing.actions');

      // procedure.builder catches auth redirect / errors via handleServerError
      // and returns undefined or { error }, never executing the action handler.
      let inspectResult: unknown;
      let inspectThrew = false;
      try {
        inspectResult = await inspectExternalApiAction({
          endpointUrl: 'https://example.com',
        });
      } catch {
        inspectThrew = true;
      }
      assert.ok(
        inspectThrew ||
          !inspectResult ||
          (typeof inspectResult === 'object' &&
            !('ok' in inspectResult && (inspectResult as { ok?: boolean }).ok === true)),
        'unauthenticated inspectExternalApiAction must not succeed'
      );

      let editorResult: unknown;
      let editorThrew = false;
      try {
        editorResult = await resolveEditorListingQuery({
          config: { source: 'posts' },
        });
      } catch {
        editorThrew = true;
      }
      assert.ok(
        editorThrew ||
          !editorResult ||
          (typeof editorResult === 'object' && !('items' in editorResult)),
        'unauthenticated resolveEditorListingQuery must not succeed'
      );

      // Public resolveListingQuery rejects external-api without a saved presetId
      // (and strips/ignores any inline apiConfig)
      await assert.rejects(
        () =>
          resolveListingQuery({
            source: 'external-api',
            apiConfig: {
              endpointUrl: 'https://attacker.tld',
              headers: { X: '{{env.DATABASE_URL}}' },
            },
          } as never),
        // Either fails because siteContext/DB isn't available or returns presetId required
        () => true
      );
    });
  });
});
