import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { and, desc, eq, gt, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  licenses,
  licenseInstallations,
  licenseEvents,
  licenseNonces,
  licenseRateLimits,
  PRODUCT_ID_NEXT_CMS,
  DEFAULT_LICENSE_SETTINGS,
  type LicenseStatus,
  type InstallationStatus,
  type LicenseSettings,
} from '@/db/schemas/licenses.schema';
import { users } from '@/db/schemas/auth.schema';
import { env } from '@/env.mjs';
import { hashLicenseKey, generateLicenseKey } from '@/lib/license/keys';
import {
  signLicenseToken,
  verifyLicenseToken,
  type LicenseTokenClaims,
  type VerifyResult,
} from '@/lib/license/token';
import {
  generateInstallationPublicId,
  verifyInstallationRequest,
} from '@/lib/license/installation';
import { siteSettingsService } from './site-settings.service';
import { auditService } from './audit.service';
import { ApplicationException } from '@/lib/utils/error';
import type { DBTrx } from '@/lib/types/db';

export const GENERIC_LICENSE_ERROR = 'Invalid or inactive license key';
export const HARD_MAX_GRACE_SECONDS = 7 * 24 * 3600; // 7 days maximum hard limit in code

// In-memory cache for installation license token verification
interface CachedTokenState {
  token: string;
  claims: LicenseTokenClaims;
  cachedAt: number;
}
let cachedInstallationToken: CachedTokenState | null = null;

export const licenseService = {
  /* ========================================================================
   * 1. RATE LIMITING & NONCES (R232 / L3-05)
   * ======================================================================== */

  /**
   * Validates rate limit for an identifier (e.g. IP address).
   * Persists attempts in `license_rate_limits` table shared across processes.
   */
  async checkRateLimit(
    identifier: string,
    settings: LicenseSettings = DEFAULT_LICENSE_SETTINGS
  ): Promise<{ allowed: boolean; remaining: number }> {
    const windowMs = settings.rateLimitWindowMinutes * 60_000;
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

    const [existing] = await db
      .select({ count: licenseRateLimits.count })
      .from(licenseRateLimits)
      .where(
        and(
          eq(licenseRateLimits.identifier, identifier),
          eq(licenseRateLimits.windowStart, windowStart)
        )
      )
      .limit(1);

    if (existing) {
      const currentCount = existing.count;
      if (currentCount >= settings.rateLimitMaxAttempts) {
        return { allowed: false, remaining: 0 };
      }
      await db
        .update(licenseRateLimits)
        .set({ count: currentCount + 1 })
        .where(
          and(
            eq(licenseRateLimits.identifier, identifier),
            eq(licenseRateLimits.windowStart, windowStart)
          )
        );
      return {
        allowed: true,
        remaining: Math.max(0, settings.rateLimitMaxAttempts - (currentCount + 1)),
      };
    }

    await db.insert(licenseRateLimits).values({
      identifier,
      windowStart,
      count: 1,
    });

    return {
      allowed: true,
      remaining: settings.rateLimitMaxAttempts - 1,
    };
  },

  /**
   * Verifies that a nonce has not been used before (replay protection)
   * and records its sha256 hash in `license_nonces` until expiry.
   */
  async recordAndVerifyNonce(nonce: string, expirySeconds = 300): Promise<boolean> {
    if (!nonce || typeof nonce !== 'string') return false;
    const nonceHash = createHash('sha256').update(nonce).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirySeconds * 1000);

    // Look for existing unexpired nonce
    const [existing] = await db
      .select({ id: licenseNonces.id, expiresAt: licenseNonces.expiresAt })
      .from(licenseNonces)
      .where(eq(licenseNonces.nonceHash, nonceHash))
      .limit(1);

    if (existing) {
      return false; // Replay detected!
    }

    try {
      await db.insert(licenseNonces).values({
        nonceHash,
        expiresAt,
        createdAt: now,
      });
      return true;
    } catch {
      return false;
    }
  },

  /* ========================================================================
   * 2. AUTHORITY RULES (R228–R233 / L3-01–L3-06)
   * ======================================================================== */

  /**
   * Atomic license activation (R228 / L3-01).
   * - Hashes key and locks row.
   * - Rejects invalid, wrong product, suspended, expired, revoked with generic error.
   * - Idempotent for same installation public key.
   * - Rejects second installation attempt with generic error and records event.
   */
  async activateLicense(params: {
    licenseKey: string;
    installationPublicKey: string;
    ipAddress?: string;
  }): Promise<{ ok: true; token: string; installationPublicId: string } | { ok: false; error: string }> {
    const { licenseKey, installationPublicKey, ipAddress } = params;
    const identifier = ipAddress || 'unknown';

    // 1. Rate limit check
    const siteSettings = await siteSettingsService.get();
    const settings = siteSettings.licenseSettings;
    const rateCheck = await this.checkRateLimit(identifier, settings);
    if (!rateCheck.allowed) {
      return { ok: false, error: GENERIC_LICENSE_ERROR };
    }

    const keyHash = hashLicenseKey(licenseKey);

    return await db.transaction(async tx => {
      // 2. Select and lock license row
      const [license] = await tx
        .select()
        .from(licenses)
        .where(eq(licenses.keyHash, keyHash))
        .for('update')
        .limit(1);

      if (!license) {
        return { ok: false, error: GENERIC_LICENSE_ERROR };
      }

      // Check product ID
      if (license.productId !== PRODUCT_ID_NEXT_CMS) {
        await tx.insert(licenseEvents).values({
          licenseId: license.id,
          type: 'activate',
          outcome: 'failure',
          reason: 'wrong_product',
          ipAddress,
        });
        return { ok: false, error: GENERIC_LICENSE_ERROR };
      }

      const now = new Date();

      // Check status: suspended, revoked, expired
      if (
        license.status === 'suspended' ||
        license.status === 'revoked' ||
        license.status === 'expired' ||
        (license.expiresAt && license.expiresAt < now)
      ) {
        await tx.insert(licenseEvents).values({
          licenseId: license.id,
          type: 'activate',
          outcome: 'failure',
          reason: `status_${license.status}`,
          ipAddress,
        });
        return { ok: false, error: GENERIC_LICENSE_ERROR };
      }

      // Find current active installation binding for this license
      const [currentActive] = await tx
        .select()
        .from(licenseInstallations)
        .where(
          and(
            eq(licenseInstallations.licenseId, license.id),
            eq(licenseInstallations.status, 'active')
          )
        )
        .limit(1);

      let installationPublicId: string;

      if (!currentActive) {
        // Initial activation on pending or re-activated license
        installationPublicId = generateInstallationPublicId();
        const [instRow] = await tx
          .insert(licenseInstallations)
          .values({
            publicId: installationPublicId,
            publicKey: installationPublicKey,
            licenseId: license.id,
            status: 'active',
            lastSeenAt: now,
          })
          .returning({ id: licenseInstallations.id });

        await tx
          .update(licenses)
          .set({
            status: 'active',
            activatedAt: license.activatedAt || now,
            currentInstallationId: instRow.id,
            lastValidatedAt: now,
            lastValidationResult: 'success',
            updatedAt: now,
          })
          .where(eq(licenses.id, license.id));
      } else {
        // Active binding exists: check public key identity
        if (currentActive.publicKey === installationPublicKey) {
          // Idempotent refresh for the same installation!
          installationPublicId = currentActive.publicId;
          await tx
            .update(licenseInstallations)
            .set({ lastSeenAt: now, updatedAt: now })
            .where(eq(licenseInstallations.id, currentActive.id));

          await tx
            .update(licenses)
            .set({
              lastValidatedAt: now,
              lastValidationResult: 'success',
              updatedAt: now,
            })
            .where(eq(licenses.id, license.id));
        } else {
          // Different installation attempting to bind already active license!
          // Max installations = 1 strict enforcement
          await tx.insert(licenseEvents).values({
            licenseId: license.id,
            installationPublicId: currentActive.publicId,
            type: 'activate',
            outcome: 'failure',
            reason: 'second_installation_rejected',
            ipAddress,
          });

          await auditService.log(
            {
              action: 'activate',
              targetType: 'license',
              targetId: license.publicId,
              targetName: `License ${license.publicId}`,
              details: 'Rejected 2nd installation activation attempt',
            },
            tx as unknown as DBTrx
          );

          return { ok: false, error: GENERIC_LICENSE_ERROR };
        }
      }

      // Record success event
      await tx.insert(licenseEvents).values({
        licenseId: license.id,
        installationPublicId,
        type: 'activate',
        outcome: 'success',
        ipAddress,
      });

      // Sign short-lived token using authority signing private key
      const privateKey = env.LICENSE_SIGNING_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('LICENSE_SIGNING_PRIVATE_KEY is not configured on authority');
      }

      const token = signLicenseToken({
        licensePublicId: license.publicId,
        installationPublicId,
        expiresInSeconds: settings.heartbeatIntervalSeconds + settings.gracePeriodSeconds,
        privateKeyPem: privateKey,
      });

      return {
        ok: true,
        token,
        installationPublicId,
      };
    });
  },

  /**
   * Validate or Heartbeat for a bound installation (R229 / L3-02).
   */
  async validateOrHeartbeat(params: {
    installationPublicId: string;
    signature: string;
    timestamp: number;
    nonce: string;
    ipAddress?: string;
    isHeartbeat?: boolean;
  }): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
    const { installationPublicId, signature, timestamp, nonce, ipAddress, isHeartbeat } = params;

    // Check nonce replay
    const nonceValid = await this.recordAndVerifyNonce(nonce);
    if (!nonceValid) {
      return { ok: false, error: 'Replay detected or duplicate request' };
    }

    // Look up active installation
    const [inst] = await db
      .select({
        id: licenseInstallations.id,
        publicId: licenseInstallations.publicId,
        publicKey: licenseInstallations.publicKey,
        licenseId: licenseInstallations.licenseId,
        status: licenseInstallations.status,
      })
      .from(licenseInstallations)
      .where(eq(licenseInstallations.publicId, installationPublicId))
      .limit(1);

    if (!inst || inst.status !== 'active') {
      return { ok: false, error: 'Installation not found or inactive' };
    }

    // Verify request signature
    const sigCheck = verifyInstallationRequest({
      payload: { action: isHeartbeat ? 'heartbeat' : 'validate' },
      signature,
      timestamp,
      nonce,
      publicKeyPem: inst.publicKey,
    });

    if (!sigCheck.valid) {
      await db.insert(licenseEvents).values({
        licenseId: inst.licenseId,
        installationPublicId,
        type: isHeartbeat ? 'heartbeat' : 'validate',
        outcome: 'failure',
        reason: 'bad_signature',
        ipAddress,
      });
      return { ok: false, error: sigCheck.error || 'Invalid signature' };
    }

    const [license] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, inst.licenseId))
      .limit(1);

    const now = new Date();
    if (!license || license.status !== 'active' || (license.expiresAt && license.expiresAt < now)) {
      await db
        .update(licenses)
        .set({
          lastValidatedAt: now,
          lastValidationResult: license ? `license_${license.status}` : 'license_not_found',
          updatedAt: now,
        })
        .where(eq(licenses.id, inst.licenseId));

      return { ok: false, error: 'License is not active or expired' };
    }

    // Update timestamps
    await db
      .update(licenseInstallations)
      .set({ lastSeenAt: now, updatedAt: now })
      .where(eq(licenseInstallations.id, inst.id));

    await db
      .update(licenses)
      .set({
        lastValidatedAt: now,
        lastValidationResult: 'success',
        updatedAt: now,
      })
      .where(eq(licenses.id, license.id));

    const siteSettings = await siteSettingsService.get();
    const settings = siteSettings.licenseSettings;
    const privateKey = env.LICENSE_SIGNING_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('LICENSE_SIGNING_PRIVATE_KEY is not configured on authority');
    }

    const token = signLicenseToken({
      licensePublicId: license.publicId,
      installationPublicId,
      expiresInSeconds: settings.heartbeatIntervalSeconds + settings.gracePeriodSeconds,
      privateKeyPem: privateKey,
    });

    return { ok: true, token };
  },

  /**
   * Deactivate a bound installation (R230 / L3-03).
   * Accepts a request signed by the bound installation key.
   */
  async deactivateLicense(params: {
    installationPublicId: string;
    signature: string;
    timestamp: number;
    nonce: string;
    ipAddress?: string;
    actorId?: string;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    const { installationPublicId, signature, timestamp, nonce, ipAddress, actorId } = params;

    const nonceValid = await this.recordAndVerifyNonce(nonce);
    if (!nonceValid) {
      return { ok: false, error: 'Replay detected or duplicate request' };
    }

    const [inst] = await db
      .select()
      .from(licenseInstallations)
      .where(eq(licenseInstallations.publicId, installationPublicId))
      .limit(1);

    if (!inst || inst.status !== 'active') {
      return { ok: false, error: 'Active installation not found' };
    }

    const sigCheck = verifyInstallationRequest({
      payload: { action: 'deactivate' },
      signature,
      timestamp,
      nonce,
      publicKeyPem: inst.publicKey,
    });

    if (!sigCheck.valid) {
      return { ok: false, error: sigCheck.error || 'Invalid signature' };
    }

    const now = new Date();
    await db.transaction(async tx => {
      await tx
        .update(licenseInstallations)
        .set({ status: 'inactive', updatedAt: now })
        .where(eq(licenseInstallations.id, inst.id));

      await tx
        .update(licenses)
        .set({ currentInstallationId: null, updatedAt: now })
        .where(eq(licenses.id, inst.licenseId));

      await tx.insert(licenseEvents).values({
        licenseId: inst.licenseId,
        installationPublicId,
        type: 'deactivate',
        outcome: 'success',
        actorId,
        ipAddress,
      });

      if (actorId) {
        await auditService.log(
          {
            actorId,
            action: 'deactivate',
            targetType: 'license',
            targetId: inst.licenseId,
            targetName: 'License installation',
            details: `Deactivated installation ${installationPublicId}`,
          },
          tx as unknown as DBTrx
        );
      }
    });

    return { ok: true };
  },

  /**
   * Admin operation to deactivate the current active installation binding (R250 / L6-08).
   */
  async adminDeactivateInstallation(licenseId: string, actorId: string, reason?: string) {
    const now = new Date();
    return await db.transaction(async tx => {
      const [license] = await tx
        .select()
        .from(licenses)
        .where(or(eq(licenses.id, licenseId), eq(licenses.publicId, licenseId)))
        .for('update')
        .limit(1);

      if (!license) throw new ApplicationException('License not found');

      const [currentActive] = await tx
        .select()
        .from(licenseInstallations)
        .where(
          and(
            eq(licenseInstallations.licenseId, license.id),
            eq(licenseInstallations.status, 'active')
          )
        )
        .limit(1);

      if (currentActive) {
        await tx
          .update(licenseInstallations)
          .set({ status: 'inactive', updatedAt: now })
          .where(eq(licenseInstallations.id, currentActive.id));

        await tx.insert(licenseEvents).values({
          licenseId: license.id,
          installationPublicId: currentActive.publicId,
          type: 'deactivate',
          outcome: 'success',
          reason: reason || 'Deactivated by admin',
          actorId,
        });
      }

      await tx
        .update(licenses)
        .set({ currentInstallationId: null, updatedAt: now })
        .where(eq(licenses.id, license.id));

      await auditService.log(
        {
          actorId,
          action: 'deactivate',
          targetType: 'license',
          targetId: license.publicId,
          targetName: `License ${license.publicId}`,
          details: reason || 'Deactivated bound installation by admin',
        },
        tx as unknown as DBTrx
      );

      return { ok: true };
    });
  },

  /**
   * Admin Reassignment (R231 / L3-04).
   * Revokes previous binding and binds new public key in one atomic transaction.
   * Enforces cooldown and maxReassignments policy.
   */
  async reassignLicense(params: {
    licenseId: string;
    newPublicKey: string;
    reason: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<{ ok: true; newInstallationPublicId: string } | { ok: false; error: string }> {
    const { licenseId, newPublicKey, reason, actorId, ipAddress } = params;
    const siteSettings = await siteSettingsService.get();
    const settings = siteSettings.licenseSettings;

    return await db.transaction(async tx => {
      const [license] = await tx
        .select()
        .from(licenses)
        .where(or(eq(licenses.id, licenseId), eq(licenses.publicId, licenseId)))
        .for('update')
        .limit(1);

      if (!license) {
        return { ok: false, error: 'License not found' };
      }

      // Check max reassignments
      if (license.reassignmentCount >= settings.maxReassignments) {
        return {
          ok: false,
          error: `Maximum reassignment limit reached (${settings.maxReassignments})`,
        };
      }

      const now = new Date();

      // Check cooldown if previous validation occurred
      if (license.lastValidatedAt && settings.reassignmentCooldownHours > 0) {
        const cooldownMs = settings.reassignmentCooldownHours * 3600 * 1000;
        const elapsed = now.getTime() - license.lastValidatedAt.getTime();
        if (elapsed < cooldownMs) {
          const remainingHours = Math.ceil((cooldownMs - elapsed) / (3600 * 1000));
          return {
            ok: false,
            error: `Reassignment cooldown in effect. Please wait ${remainingHours} hour(s).`,
          };
        }
      }

      // Revoke currently active installation
      const [currentActive] = await tx
        .select()
        .from(licenseInstallations)
        .where(
          and(
            eq(licenseInstallations.licenseId, license.id),
            eq(licenseInstallations.status, 'active')
          )
        )
        .limit(1);

      const oldPublicId = currentActive?.publicId;

      if (currentActive) {
        await tx
          .update(licenseInstallations)
          .set({ status: 'revoked', updatedAt: now })
          .where(eq(licenseInstallations.id, currentActive.id));
      }

      // Insert new installation
      const newInstallationPublicId = generateInstallationPublicId();
      const [newInst] = await tx
        .insert(licenseInstallations)
        .values({
          publicId: newInstallationPublicId,
          publicKey: newPublicKey,
          licenseId: license.id,
          status: 'active',
          lastSeenAt: now,
        })
        .returning({ id: licenseInstallations.id });

      // Update license row
      await tx
        .update(licenses)
        .set({
          currentInstallationId: newInst.id,
          reassignmentCount: license.reassignmentCount + 1,
          lastValidatedAt: now,
          lastValidationResult: 'reassigned',
          updatedAt: now,
        })
        .where(eq(licenses.id, license.id));

      // Record event with old and new IDs, actor, and reason
      await tx.insert(licenseEvents).values({
        licenseId: license.id,
        installationPublicId: newInstallationPublicId,
        type: 'reassign',
        outcome: 'success',
        reason: `${reason || 'Admin reassignment'} (previous: ${oldPublicId || 'none'})`,
        actorId,
        ipAddress,
      });

      await auditService.log(
        {
          actorId,
          action: 'reassign',
          targetType: 'license',
          targetId: license.publicId,
          targetName: `License ${license.publicId}`,
          details: `Reassigned from ${oldPublicId || 'none'} to ${newInstallationPublicId}. Reason: ${reason}`,
        },
        tx as unknown as DBTrx
      );

      return {
        ok: true,
        newInstallationPublicId,
      };
    });
  },

  /**
   * Sweeps expired licenses (R233 / L3-06) setting status = 'expired'.
   */
  async sweepExpiredLicenses(): Promise<number> {
    const now = new Date();
    const expiredList = await db
      .select({ id: licenses.id, publicId: licenses.publicId })
      .from(licenses)
      .where(and(eq(licenses.status, 'active'), lte(licenses.expiresAt, now)));

    if (expiredList.length === 0) return 0;

    for (const item of expiredList) {
      await db
        .update(licenses)
        .set({ status: 'expired', updatedAt: now })
        .where(eq(licenses.id, item.id));

      await db.insert(licenseEvents).values({
        licenseId: item.id,
        type: 'status_change',
        outcome: 'success',
        reason: 'License expired via cron sweep',
      });
    }

    return expiredList.length;
  },

  /* ========================================================================
   * 3. ADMIN MANAGEMENT METHODS (R245–R250 / L6)
   * ======================================================================== */

  /**
   * Issues a pending license for product next-cms and returns plaintext key once.
   */
  async issueLicense(params: {
    ownerUserId?: string | null;
    expiresInDays?: number;
    actorId: string;
  }): Promise<{ license: typeof licenses.$inferSelect; plaintextKey: string }> {
    const { ownerUserId, expiresInDays, actorId } = params;
    const generated = generateLicenseKey();
    const siteSettings = await siteSettingsService.get();
    const defaultDays = expiresInDays ?? siteSettings.licenseSettings.defaultExpiryDays;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + defaultDays * 86400 * 1000);
    const publicId = `lic_${randomBytes(12).toString('hex')}`;

    const [license] = await db
      .insert(licenses)
      .values({
        publicId,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        productId: PRODUCT_ID_NEXT_CMS,
        ownerUserId: ownerUserId || null,
        status: 'pending',
        issuedAt: now,
        expiresAt,
        maxInstallations: 1,
      })
      .returning();

    await auditService.log({
      actorId,
      action: 'create',
      targetType: 'license',
      targetId: license.publicId,
      targetName: `License ${license.publicId}`,
      details: `Issued new pending license for ${PRODUCT_ID_NEXT_CMS}`,
    });

    return {
      license,
      plaintextKey: generated.key,
    };
  },

  async suspendLicense(licenseId: string, actorId: string, reason?: string) {
    const now = new Date();
    const [row] = await db
      .update(licenses)
      .set({ status: 'suspended', updatedAt: now })
      .where(or(eq(licenses.id, licenseId), eq(licenses.publicId, licenseId)))
      .returning();

    if (row) {
      await db.insert(licenseEvents).values({
        licenseId: row.id,
        type: 'suspend',
        outcome: 'success',
        reason,
        actorId,
      });

      await auditService.log({
        actorId,
        action: 'suspend',
        targetType: 'license',
        targetId: row.publicId,
        targetName: `License ${row.publicId}`,
        details: reason || 'Suspended by admin',
      });
    }
    return row;
  },

  async revokeLicense(licenseId: string, actorId: string, reason?: string) {
    const now = new Date();
    const [row] = await db
      .update(licenses)
      .set({ status: 'revoked', updatedAt: now })
      .where(or(eq(licenses.id, licenseId), eq(licenses.publicId, licenseId)))
      .returning();

    if (row) {
      await db.insert(licenseEvents).values({
        licenseId: row.id,
        type: 'revoke',
        outcome: 'success',
        reason,
        actorId,
      });

      await auditService.log({
        actorId,
        action: 'revoke',
        targetType: 'license',
        targetId: row.publicId,
        targetName: `License ${row.publicId}`,
        details: reason || 'Revoked by admin',
      });
    }
    return row;
  },

  async renewLicense(licenseId: string, daysToAdd: number, actorId: string) {
    const [license] = await db
      .select()
      .from(licenses)
      .where(or(eq(licenses.id, licenseId), eq(licenses.publicId, licenseId)))
      .limit(1);

    if (!license) throw new ApplicationException('License not found');

    const baseDate = license.expiresAt && license.expiresAt > new Date() ? license.expiresAt : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 86400 * 1000);
    const now = new Date();

    const [row] = await db
      .update(licenses)
      .set({
        expiresAt: newExpiresAt,
        status: license.status === 'expired' ? 'active' : license.status,
        updatedAt: now,
      })
      .where(eq(licenses.id, license.id))
      .returning();

    await db.insert(licenseEvents).values({
      licenseId: row.id,
      type: 'renew',
      outcome: 'success',
      reason: `Renewed for ${daysToAdd} days until ${newExpiresAt.toISOString()}`,
      actorId,
    });

    await auditService.log({
      actorId,
      action: 'renew',
      targetType: 'license',
      targetId: row.publicId,
      targetName: `License ${row.publicId}`,
      details: `Renewed until ${newExpiresAt.toISOString()}`,
    });

    return row;
  },

  async listLicenses(params: {
    search?: string;
    status?: LicenseStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.status) {
      conditions.push(eq(licenses.status, params.status));
    }
    if (params.search) {
      const q = `%${params.search.trim()}%`;
      conditions.push(or(ilike(licenses.publicId, q), ilike(licenses.keyPrefix, q)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: licenses.id,
          publicId: licenses.publicId,
          keyPrefix: licenses.keyPrefix,
          productId: licenses.productId,
          status: licenses.status,
          ownerUserId: licenses.ownerUserId,
          ownerName: users.name,
          ownerEmail: users.email,
          issuedAt: licenses.issuedAt,
          activatedAt: licenses.activatedAt,
          expiresAt: licenses.expiresAt,
          reassignmentCount: licenses.reassignmentCount,
          lastValidatedAt: licenses.lastValidatedAt,
        })
        .from(licenses)
        .leftJoin(users, eq(users.id, licenses.ownerUserId))
        .where(whereClause)
        .orderBy(desc(licenses.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(licenses)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getLicenseDetail(idOrPublicId: string) {
    const [license] = await db
      .select({
        id: licenses.id,
        publicId: licenses.publicId,
        keyPrefix: licenses.keyPrefix,
        productId: licenses.productId,
        status: licenses.status,
        ownerUserId: licenses.ownerUserId,
        ownerName: users.name,
        ownerEmail: users.email,
        issuedAt: licenses.issuedAt,
        activatedAt: licenses.activatedAt,
        expiresAt: licenses.expiresAt,
        maxInstallations: licenses.maxInstallations,
        currentInstallationId: licenses.currentInstallationId,
        lastValidatedAt: licenses.lastValidatedAt,
        lastValidationResult: licenses.lastValidationResult,
        reassignmentCount: licenses.reassignmentCount,
        createdAt: licenses.createdAt,
      })
      .from(licenses)
      .leftJoin(users, eq(users.id, licenses.ownerUserId))
      .where(or(eq(licenses.id, idOrPublicId), eq(licenses.publicId, idOrPublicId)))
      .limit(1);

    if (!license) return null;

    // Load active installation if any
    const [activeInstallation] = await db
      .select()
      .from(licenseInstallations)
      .where(
        and(
          eq(licenseInstallations.licenseId, license.id),
          eq(licenseInstallations.status, 'active')
        )
      )
      .limit(1);

    // Load recent events
    const events = await db
      .select()
      .from(licenseEvents)
      .where(eq(licenseEvents.licenseId, license.id))
      .orderBy(desc(licenseEvents.timestamp))
      .limit(50);

    return {
      license,
      activeInstallation,
      events,
    };
  },

  /* ========================================================================
   * 4. SERVER ENFORCEMENT & GUARDS (R238–R242 / L5)
   * ======================================================================== */

  /**
   * Central license enforcement guard (R238 / L5-01).
   * - Bypassed if LICENSE_ROLE === 'authority'.
   * - Honors LICENSE_ENFORCEMENT=off ONLY in development or test (R242 / L5-05).
   * - In production, LICENSE_ENFORCEMENT=off is strictly ignored.
   * - Checks cached Ed25519 token.
   * - Within grace period, allows operation.
   * - Past grace or on revoked/invalid status, fails closed.
   */
  async requireLicense(): Promise<{ ok: true; claims?: LicenseTokenClaims; note?: string } | { ok: false; error: string }> {
    // 1. Authority deployment does not require an installation license
    if (env.LICENSE_ROLE === 'authority') {
      return { ok: true, note: 'authority_role' };
    }

    // 2. In development or test, allow LICENSE_ENFORCEMENT=off (R242)
    if (env.NODE_ENV !== 'production' && env.LICENSE_ENFORCEMENT === 'off') {
      return { ok: true, note: 'enforcement_off_dev' };
    }

    // 3. Installation deployment verification
    const publicKey = env.LICENSE_SIGNING_PUBLIC_KEY;
    if (!publicKey) {
      return {
        ok: false,
        error: 'LICENSE_SIGNING_PUBLIC_KEY is not configured on installation deployment',
      };
    }

    const previousPublicKey = env.LICENSE_SIGNING_PREVIOUS_PUBLIC_KEY;

    // Check cached token
    if (cachedInstallationToken) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const verifyRes = verifyLicenseToken(
        cachedInstallationToken.token,
        { current: publicKey, previous: previousPublicKey },
        { expectedInstallationPublicId: env.LICENSE_INSTALLATION_PUBLIC_KEY }
      );

      if (verifyRes.valid) {
        return { ok: true, claims: verifyRes.claims };
      }

      // Check if within offline grace period
      if (verifyRes.claims && verifyRes.claims.expiresAt) {
        const graceSeconds = Math.min(
          DEFAULT_LICENSE_SETTINGS.gracePeriodSeconds,
          HARD_MAX_GRACE_SECONDS
        );
        if (nowSeconds <= verifyRes.claims.expiresAt + graceSeconds) {
          return {
            ok: true,
            claims: verifyRes.claims as LicenseTokenClaims,
            note: 'within_grace_period',
          };
        }
      }
    }

    // If authority URL and credentials are configured, try online validation
    if (env.LICENSE_AUTHORITY_URL && env.LICENSE_INSTALLATION_PRIVATE_KEY) {
      // In production installation, background heartbeat or validate refreshes this token
    }

    return {
      ok: false,
      error: 'A valid active license is required for this installation',
    };
  },

  /**
   * Sets cached installation token in memory (used when token is refreshed or loaded).
   */
  setCachedInstallationToken(token: string, claims: LicenseTokenClaims) {
    cachedInstallationToken = {
      token,
      claims,
      cachedAt: Date.now(),
    };
  },

  clearCachedInstallationToken() {
    cachedInstallationToken = null;
  },

  /**
   * Strict assertion that throws if license requirement is not met.
   */
  async assertLicense() {
    const res = await this.requireLicense();
    if (!res.ok) {
      throw new ApplicationException(res.error);
    }
    return res;
  },
};
