import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateLicenseKey, hashLicenseKey } from '../keys';
import {
  signLicenseToken,
  verifyLicenseToken,
  LICENSE_TOKEN_ISSUER,
  LICENSE_TOKEN_AUDIENCE,
} from '../token';
import {
  generateEd25519KeyPair,
  generateInstallationPublicId,
  signInstallationRequest,
  verifyInstallationRequest,
} from '../installation';
import { PRODUCT_ID_NEXT_CMS, LICENSE_KEY_PREFIX } from '@/db/schemas/licenses.schema';

describe('License Cryptography & Tokens (R222–R227)', () => {
  describe('License Keys (R222)', () => {
    test('generates key with correct prefix and non-empty hash', () => {
      const generated = generateLicenseKey();
      assert.ok(generated.key.startsWith(LICENSE_KEY_PREFIX));
      assert.equal(generated.keyPrefix, LICENSE_KEY_PREFIX);
      assert.ok(generated.keyHash.length === 64, 'SHA-256 hex string should be 64 characters');

      const recomputedHash = hashLicenseKey(generated.key);
      assert.equal(recomputedHash, generated.keyHash);
    });

    test('different keys produce different hashes', () => {
      const k1 = generateLicenseKey();
      const k2 = generateLicenseKey();
      assert.notEqual(k1.key, k2.key);
      assert.notEqual(k1.keyHash, k2.keyHash);
    });
  });

  describe('Ed25519 License Tokens (R223–R226)', () => {
    const authorityKeysV1 = generateEd25519KeyPair();
    const authorityKeysV2 = generateEd25519KeyPair();
    const testLicenseId = 'lic_test_123456';
    const testInstallId = generateInstallationPublicId();

    test('signs and verifies a valid token with current key', () => {
      const token = signLicenseToken({
        licensePublicId: testLicenseId,
        installationPublicId: testInstallId,
        expiresInSeconds: 3600,
        privateKeyPem: authorityKeysV1.privateKeyPem,
        kid: 'v1',
      });

      const res = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedInstallationPublicId: testInstallId,
      });

      assert.equal(res.valid, true);
      if (res.valid) {
        assert.equal(res.claims.licensePublicId, testLicenseId);
        assert.equal(res.claims.installationPublicId, testInstallId);
        assert.equal(res.claims.productId, PRODUCT_ID_NEXT_CMS);
        assert.equal(res.claims.issuer, LICENSE_TOKEN_ISSUER);
        assert.equal(res.claims.audience, LICENSE_TOKEN_AUDIENCE);
        assert.equal(res.claims.tokenVersion, 1);
        assert.equal(res.claims.kid, 'v1');
      }
    });

    test('rejects a forged token (tampered claims with same signature)', () => {
      const token = signLicenseToken({
        licensePublicId: testLicenseId,
        installationPublicId: testInstallId,
        expiresInSeconds: 3600,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const parts = token.split('.');
      // Tamper payload: change license id
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      payload.licensePublicId = 'forged_license_id';
      const forgedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

      const res = verifyLicenseToken(forgedToken, authorityKeysV1.publicKeyPem);
      assert.equal(res.valid, false);
      assert.match(res.error, /invalid.*signature/i);
    });

    test('rejects an expired token', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = signLicenseToken({
        licensePublicId: testLicenseId,
        installationPublicId: testInstallId,
        expiresAt: now - 100, // Expired 100 seconds ago
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const res = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, { now });
      assert.equal(res.valid, false);
      assert.match(res.error, /expired/i);
    });

    test('rejects wrong product id', () => {
      const token = signLicenseToken({
        licensePublicId: testLicenseId,
        installationPublicId: testInstallId,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const res = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedProductId: 'some-other-cms',
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /product id/i);
    });

    test('rejects wrong installation id', () => {
      const token = signLicenseToken({
        licensePublicId: testLicenseId,
        installationPublicId: testInstallId,
        privateKeyPem: authorityKeysV1.privateKeyPem,
      });

      const res = verifyLicenseToken(token, authorityKeysV1.publicKeyPem, {
        expectedInstallationPublicId: 'inst_different_999999',
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /installation id mismatch/i);
    });

    test('supports key rotation (accepts previous public key when rotated)', () => {
      // Token signed with v1 key
      const tokenV1 = signLicenseToken({
        licensePublicId: testLicenseId,
        installationPublicId: testInstallId,
        privateKeyPem: authorityKeysV1.privateKeyPem,
        kid: 'v1',
      });

      // Verification resolver with current = V2, previous = V1
      const res = verifyLicenseToken(tokenV1, {
        current: authorityKeysV2.publicKeyPem,
        previous: authorityKeysV1.publicKeyPem,
      });

      assert.equal(res.valid, true);

      // Now verify that if previous key is omitted, V1 token fails against V2
      const resV2Only = verifyLicenseToken(tokenV1, authorityKeysV2.publicKeyPem);
      assert.equal(resV2Only.valid, false);
      assert.match(resV2Only.error, /invalid.*signature/i);
    });

    test('rejects completely malformed tokens', () => {
      assert.equal(verifyLicenseToken('', authorityKeysV1.publicKeyPem).valid, false);
      assert.equal(verifyLicenseToken('part1.part2', authorityKeysV1.publicKeyPem).valid, false);
      assert.equal(verifyLicenseToken('not-json.not-json.sig', authorityKeysV1.publicKeyPem).valid, false);
    });
  });

  describe('Installation Request Signing & Verification (R224)', () => {
    const installKeys = generateEd25519KeyPair();
    const payload = { action: 'activate', licenseKey: 'ncms_lic_test' };

    test('signs and verifies valid installation request', () => {
      const { signature, timestamp, nonce } = signInstallationRequest(
        payload,
        installKeys.privateKeyPem
      );

      const res = verifyInstallationRequest({
        payload,
        signature,
        timestamp,
        nonce,
        publicKeyPem: installKeys.publicKeyPem,
      });

      assert.equal(res.valid, true);
    });

    test('rejects tampered installation request payload', () => {
      const { signature, timestamp, nonce } = signInstallationRequest(
        payload,
        installKeys.privateKeyPem
      );

      const tamperedPayload = { ...payload, licenseKey: 'ncms_lic_hacked' };
      const res = verifyInstallationRequest({
        payload: tamperedPayload,
        signature,
        timestamp,
        nonce,
        publicKeyPem: installKeys.publicKeyPem,
      });

      assert.equal(res.valid, false);
      assert.match(res.error || '', /invalid signature/i);
    });

    test('rejects request with excessive clock skew', () => {
      const now = Math.floor(Date.now() / 1000);
      const staleTimestamp = now - 600; // 10 minutes ago
      const { signature, nonce } = signInstallationRequest(payload, installKeys.privateKeyPem);

      const res = verifyInstallationRequest({
        payload,
        signature,
        timestamp: staleTimestamp,
        nonce,
        publicKeyPem: installKeys.publicKeyPem,
        maxSkewSeconds: 300,
        now,
      });

      assert.equal(res.valid, false);
      assert.match(res.error || '', /skew/i);
    });
  });
});
