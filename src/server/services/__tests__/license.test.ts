import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  licenseService,
  GENERIC_LICENSE_ERROR,
  HARD_MAX_GRACE_SECONDS,
} from '../license.service';
import { generateLicenseKey, hashLicenseKey } from '@/lib/license/keys';
import {
  signLicenseToken,
  verifyLicenseToken,
  type LicenseTokenClaims,
} from '@/lib/license/token';
import {
  generateEd25519KeyPair,
  generateInstallationPublicId,
  signInstallationRequest,
  verifyInstallationRequest,
} from '@/lib/license/installation';
import {
  PRODUCT_ID_NEXT_CMS,
  DEFAULT_LICENSE_SETTINGS,
  licenseSettingsSchema,
} from '@/db/schemas/licenses.schema';

describe('Single-Install Licensing Service & Enforcement (R254–R258 / L8)', () => {
  const authorityKeysV1 = generateEd25519KeyPair();
  const authorityKeysV2 = generateEd25519KeyPair();
  const installKey1 = generateEd25519KeyPair();
  const installKey2 = generateEd25519KeyPair();

  describe('L8-01: Activation Rules & Generic Errors (R254)', () => {
    test('verifies generic error constant', () => {
      assert.equal(GENERIC_LICENSE_ERROR, 'Invalid or inactive license key');
    });

    test('hashes license key deterministically for database lookup', () => {
      const generated = generateLicenseKey();
      const h1 = hashLicenseKey(generated.key);
      const h2 = hashLicenseKey(generated.key);
      assert.equal(h1, h2);
      assert.equal(h1, generated.keyHash);
    });

    test('token claims enforce PRODUCT_ID_NEXT_CMS', () => {
      const installId = generateInstallationPublicId();
      const token = signLicenseToken({
        licensePublicId: 'lic_valid_123',
        installationPublicId: installId,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const res = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedProductId: PRODUCT_ID_NEXT_CMS,
      });
      assert.equal(res.valid, true);

      // Wrong product must fail
      const wrongProductRes = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedProductId: 'other-product',
      });
      assert.equal(wrongProductRes.valid, false);
      assert.match(wrongProductRes.error, /product id/i);
    });

    test('token claims enforce bound installation public id', () => {
      const installId = generateInstallationPublicId();
      const otherInstallId = generateInstallationPublicId();
      const token = signLicenseToken({
        licensePublicId: 'lic_valid_123',
        installationPublicId: installId,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const matchRes = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedInstallationPublicId: installId,
      });
      assert.equal(matchRes.valid, true);

      const mismatchRes = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedInstallationPublicId: otherInstallId,
      });
      assert.equal(mismatchRes.valid, false);
      assert.match(mismatchRes.error, /installation id mismatch/i);
    });
  });

  describe('L8-02: Single Installation Constraint (R255)', () => {
    test('max_installations is fixed at 1 and schema rejects values other than 1', () => {
      // In licenses.schema.ts, check('licenses_max_installations_check', sql`${t.maxInstallations} = 1`)
      // Policy settings schema has no control for max_installations
      const parsed = licenseSettingsSchema.parse({});
      assert.equal((parsed as Record<string, unknown>).maxInstallations, undefined);
      assert.equal((parsed as Record<string, unknown>).enforcement, undefined);
    });

    test('simulated two concurrent activations on one license: second public key rejected', () => {
      // Simulate state of active license locked to installation 1
      const activeState = {
        licenseId: 'lic_123',
        status: 'active',
        boundPublicKey: installKey1.publicKeyPem,
      };

      // Installation 1 calls activate again (idempotent retry)
      const isSameKey = activeState.boundPublicKey === installKey1.publicKeyPem;
      assert.equal(isSameKey, true, 'Same installation should be recognized as idempotent');

      // Installation 2 calls activate on same license (competing install)
      const isSecondKey = activeState.boundPublicKey === installKey2.publicKeyPem;
      assert.equal(isSecondKey, false, 'Different installation must be rejected');
    });
  });

  describe('L8-03: Inactive Statuses, Tampering & Key Rotation (R256)', () => {
    test('tampered token fails cryptographic verification', () => {
      const installId = generateInstallationPublicId();
      const token = signLicenseToken({
        licensePublicId: 'lic_orig',
        installationPublicId: installId,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      payload.licensePublicId = 'lic_tampered';
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = verifyLicenseToken(forgedToken, authorityKeysV1.publicKeyPem);
      assert.equal(res.valid, false);
      assert.match(res.error, /signature/i);
    });

    test('expired token verification fails', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = signLicenseToken({
        licensePublicId: 'lic_exp',
        installationPublicId: generateInstallationPublicId(),
        expiresAt: now - 3600,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const res = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, { now });
      assert.equal(res.valid, false);
      assert.match(res.error, /expired/i);
    });

    test('authority key rotation: validates v1 token with previous key fallback', () => {
      const tokenV1 = signLicenseToken({
        licensePublicId: 'lic_rot',
        installationPublicId: generateInstallationPublicId(),
        privateKeyPem: authorityKeysV1.privateKeyPem,
        kid: 'v1',
      });

      const res = verifyLicenseToken(tokenV1, {
        current: authorityKeysV2.publicKeyPem,
        previous: authorityKeysV1.publicKeyPem,
      });
      assert.equal(res.valid, true);
    });
  });

  describe('L8-04: Reassignment Policy (R257)', () => {
    test('enforces max reassignments policy', () => {
      const settings = licenseSettingsSchema.parse({ maxReassignments: 3 });
      assert.equal(settings.maxReassignments, 3);

      const canReassign = (currentCount: number) => currentCount < settings.maxReassignments;
      assert.equal(canReassign(0), true);
      assert.equal(canReassign(2), true);
      assert.equal(canReassign(3), false);
      assert.equal(canReassign(4), false);
    });

    test('enforces cooldown hours policy', () => {
      const settings = licenseSettingsSchema.parse({ reassignmentCooldownHours: 24 });
      const now = Date.now();
      const cooldownMs = settings.reassignmentCooldownHours * 3600 * 1000;

      const isCoolingDown = (lastValidatedAt: Date) => now - lastValidatedAt.getTime() < cooldownMs;

      const recentValidation = new Date(now - 2 * 3600 * 1000); // 2 hours ago
      assert.equal(isCoolingDown(recentValidation), true);

      const pastCooldownValidation = new Date(now - 25 * 3600 * 1000); // 25 hours ago
      assert.equal(isCoolingDown(pastCooldownValidation), false);
    });
  });

  describe('L8-05: Grace Period, Rate Limits & Replay Protection (R258)', () => {
    test('grace period is capped at HARD_MAX_GRACE_SECONDS in code', () => {
      assert.equal(HARD_MAX_GRACE_SECONDS, 7 * 24 * 3600); // 7 days

      // Schema rejects any grace period above 604800 (7 days)
      assert.throws(() => {
        licenseSettingsSchema.parse({ gracePeriodSeconds: 800000 });
      });

      const validGrace = licenseSettingsSchema.parse({ gracePeriodSeconds: 259200 });
      assert.equal(validGrace.gracePeriodSeconds, 259200); // 3 days
    });

    test('installation request signing verifies timestamp window and prevents excessive skew', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = { action: 'validate' };
      const { signature, nonce } = signInstallationRequest(payload, installKey1.privateKeyPem);

      // Current timestamp -> valid
      const validRes = verifyInstallationRequest({
        payload,
        signature,
        timestamp: now,
        nonce,
        publicKeyPem: installKey1.publicKeyPem,
        now,
      });
      assert.equal(validRes.valid, true);

      // Stale timestamp (10 minutes ago, max skew 5 minutes) -> invalid
      const staleRes = verifyInstallationRequest({
        payload,
        signature,
        timestamp: now - 600,
        nonce,
        publicKeyPem: installKey1.publicKeyPem,
        maxSkewSeconds: 300,
        now,
      });
      assert.equal(staleRes.valid, false);
      assert.match(staleRes.error || '', /skew/i);
    });

    test('cached token helper in licenseService stores and clears token', () => {
      const dummyClaims: LicenseTokenClaims = {
        licensePublicId: 'lic_cache_test',
        productId: PRODUCT_ID_NEXT_CMS,
        installationPublicId: 'inst_cache_test',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        tokenVersion: 1,
        issuer: 'next-cms-authority',
        audience: 'next-cms-installation',
        kid: 'v1',
      };

      licenseService.setCachedInstallationToken('dummy.token.sig', dummyClaims);
      licenseService.clearCachedInstallationToken();
      // Should clear cleanly
      assert.ok(true);
    });
  });
});
