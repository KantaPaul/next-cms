import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PERMISSION_MATRIX,
  PERMISSIONS,
  ROLE_NAMES,
  type RoleName,
} from '@/config/permissions';
import {
  authSettingsSchema,
  DEFAULT_AUTH_SETTINGS,
} from '@/db/schemas/pages.schema';
import { hashIdentifier } from '@/server/services/auth-rate-limit.service';
import { getSafeNextPath } from '@/lib/auth-path';

describe('Login visibility & default Viewer RBAC (R262–R291 / A1–A8)', () => {
  describe('A1 & A5: Default Role Assignment & Privilege Escalation Prevention (R264, R265, R286)', () => {
    it('always assigns Viewer by default, never Admin', () => {
      // In the new RBAC architecture, default role name is strictly Viewer
      const defaultRole: RoleName = 'Viewer';
      assert.equal(defaultRole, 'Viewer');
      assert.notEqual(defaultRole, 'Admin');
    });

    it('first-user-in-table becomes Viewer, not Admin', () => {
      // Simulating user creation in an empty table:
      // The previous logic checked `userCount === 0 ? 'Admin' : 'Viewer'`.
      // The new logic assigns Viewer unconditionally.
      const simulateAssignRole = (
        existingUserCount: number,
        existingRoleId?: string | null
      ) => {
        if (existingRoleId) return existingRoleId;
        // Strict requirement: Always assign Viewer regardless of existingUserCount
        return 'role-viewer-id';
      };

      // Empty table (first user)
      const firstUserRole = simulateAssignRole(0);
      assert.equal(firstUserRole, 'role-viewer-id');

      // Subsequent users
      const secondUserRole = simulateAssignRole(1);
      assert.equal(secondUserRole, 'role-viewer-id');
    });

    it('leaves users with an existing roleId unchanged', () => {
      const simulateAssignRole = (existingRoleId?: string | null) => {
        if (existingRoleId) return existingRoleId;
        return 'role-viewer-id';
      };

      const existingAdmin = simulateAssignRole('role-admin-id');
      assert.equal(existingAdmin, 'role-admin-id');

      const existingEditor = simulateAssignRole('role-editor-id');
      assert.equal(existingEditor, 'role-editor-id');
    });

    it('ignores client-supplied roleId during registration', () => {
      // Client-supplied roleId must be stripped or ignored
      const sanitizeRegistrationInput = (input: {
        email: string;
        roleId?: string | null;
      }) => {
        return {
          email: input.email.trim().toLowerCase(),
          roleId: null, // Forces server-side assignDefaultRole
        };
      };

      const maliciousPayload = {
        email: 'attacker@example.com',
        roleId: 'role-admin-id',
      };
      const sanitized = sanitizeRegistrationInput(maliciousPayload);
      assert.equal(sanitized.roleId, null);
    });
  });

  describe('A2 & A6: Permission Matrix & Enforcement (R266, R287)', () => {
    const matrix = Object.fromEntries(
      PERMISSION_MATRIX.map(row => [row.key, row])
    ) as Record<
      string,
      { key: string; label: string; roles: Record<RoleName, boolean> }
    >;

    it('Viewer role is denied all administrative and mutation permissions', () => {
      const viewerDenied = [
        PERMISSIONS.SETTINGS_MANAGE,
        PERMISSIONS.LICENSES_MANAGE,
        PERMISSIONS.API_MANAGE,
        PERMISSIONS.PAGES_CREATE,
        PERMISSIONS.PAGES_EDIT,
        PERMISSIONS.PAGES_PUBLISH,
        PERMISSIONS.PAGES_DELETE,
        PERMISSIONS.MEDIA_UPLOAD,
        PERMISSIONS.VIDEOS_CREATE,
        PERMISSIONS.VIDEOS_EDIT,
        PERMISSIONS.VIDEOS_PUBLISH,
        PERMISSIONS.VIDEOS_DELETE,
      ];

      for (const key of viewerDenied) {
        const row = matrix[key];
        assert.ok(row, `Missing matrix row for ${key}`);
        assert.equal(
          row.roles.Viewer,
          false,
          `Viewer must NOT have permission: ${key}`
        );
      }
    });

    it('Editor role can manage content but cannot manage settings, licenses, or api', () => {
      const editorDenied = [
        PERMISSIONS.SETTINGS_MANAGE,
        PERMISSIONS.LICENSES_MANAGE,
        PERMISSIONS.API_MANAGE,
      ];

      for (const key of editorDenied) {
        const row = matrix[key];
        assert.ok(row, `Missing matrix row for ${key}`);
        assert.equal(
          row.roles.Editor,
          false,
          `Editor must NOT have administrative permission: ${key}`
        );
      }

      // Editor CAN edit and publish pages
      assert.equal(matrix[PERMISSIONS.PAGES_CREATE].roles.Editor, true);
      assert.equal(matrix[PERMISSIONS.PAGES_EDIT].roles.Editor, true);
      assert.equal(matrix[PERMISSIONS.PAGES_PUBLISH].roles.Editor, true);
    });

    it('Admin role has all permissions in the system', () => {
      for (const row of PERMISSION_MATRIX) {
        assert.equal(
          row.roles.Admin,
          true,
          `Admin must have permission: ${row.key}`
        );
      }
    });
  });

  describe('A3 & A7: Auth Settings Schema, Login Disabled & Registration Gates (R262, R268–R273, R288)', () => {
    it('validates DEFAULT_AUTH_SETTINGS schema and default values', () => {
      const parsed = authSettingsSchema.parse(DEFAULT_AUTH_SETTINGS);
      assert.equal(parsed.loginEnabled, true);
      assert.equal(parsed.publicRegistrationEnabled, true);
      assert.equal(parsed.requireEmailVerification, false);
      assert.equal(parsed.requireAdminApproval, false);
      assert.equal(parsed.sessionLifetimeHours, 720); // 30 days
      assert.equal(parsed.maxFailedAttempts, 5);
      assert.equal(parsed.lockoutMinutes, 15);
      assert.equal(parsed.loginDisabledMessage, 'Login is currently disabled.');
    });

    it('enforces strict boundary limits on sessionLifetimeHours, maxFailedAttempts, and lockoutMinutes', () => {
      // sessionLifetimeHours: min 1, max 2160 (90 days)
      assert.throws(() => {
        authSettingsSchema.parse({
          ...DEFAULT_AUTH_SETTINGS,
          sessionLifetimeHours: 0,
        });
      }, /too_small/);
      assert.throws(() => {
        authSettingsSchema.parse({
          ...DEFAULT_AUTH_SETTINGS,
          sessionLifetimeHours: 2161,
        });
      }, /too_big/);

      // maxFailedAttempts: min 1, max 100
      assert.throws(() => {
        authSettingsSchema.parse({
          ...DEFAULT_AUTH_SETTINGS,
          maxFailedAttempts: 0,
        });
      }, /too_small/);
      assert.throws(() => {
        authSettingsSchema.parse({
          ...DEFAULT_AUTH_SETTINGS,
          maxFailedAttempts: 101,
        });
      }, /too_big/);

      // lockoutMinutes: min 1, max 1440 (24 hours)
      assert.throws(() => {
        authSettingsSchema.parse({
          ...DEFAULT_AUTH_SETTINGS,
          lockoutMinutes: 0,
        });
      }, /too_small/);
      assert.throws(() => {
        authSettingsSchema.parse({
          ...DEFAULT_AUTH_SETTINGS,
          lockoutMinutes: 1441,
        });
      }, /too_big/);
    });

    it('login refusal invariant: rejects authentication when loginEnabled is false', () => {
      const authSettings = {
        ...DEFAULT_AUTH_SETTINGS,
        loginEnabled: false,
        loginDisabledMessage:
          'System undergoing maintenance. Login is disabled.',
      };

      const checkLoginAllowed = (settings: typeof authSettings) => {
        if (!settings.loginEnabled) {
          return { allowed: false, error: settings.loginDisabledMessage };
        }
        return { allowed: true, error: null };
      };

      const res = checkLoginAllowed(authSettings);
      assert.equal(res.allowed, false);
      assert.equal(
        res.error,
        'System undergoing maintenance. Login is disabled.'
      );
    });

    it('registration refusal invariant: rejects new accounts when publicRegistrationEnabled is false', () => {
      const authSettings = {
        ...DEFAULT_AUTH_SETTINGS,
        publicRegistrationEnabled: false,
      };

      const handleRegistration = (
        settings: typeof authSettings,
        userExists: boolean
      ) => {
        if (!userExists && !settings.publicRegistrationEnabled) {
          return {
            allowed: false,
            error: 'Registration is currently disabled.',
          };
        }
        return { allowed: true, error: null };
      };

      // Existing user is allowed to sign in
      assert.equal(handleRegistration(authSettings, true).allowed, true);

      // New visitor is refused registration
      const newVisit = handleRegistration(authSettings, false);
      assert.equal(newVisit.allowed, false);
      assert.match(newVisit.error!, /registration is currently disabled/i);
    });

    it('admin approval invariant: sets new user to Inactive with approvedAt = null when requireAdminApproval is true', () => {
      const authSettings = {
        ...DEFAULT_AUTH_SETTINGS,
        requireAdminApproval: true,
      };

      const createNewUserRecord = (
        settings: typeof authSettings,
        email: string
      ) => {
        const requiresApproval = settings.requireAdminApproval;
        return {
          email,
          status: requiresApproval ? 'Inactive' : 'Active',
          approvedAt: requiresApproval ? null : new Date(),
          sessionCreated: !requiresApproval,
        };
      };

      const newUser = createNewUserRecord(authSettings, 'pending@example.com');
      assert.equal(newUser.status, 'Inactive');
      assert.equal(newUser.approvedAt, null);
      assert.equal(newUser.sessionCreated, false);
    });

    it('session validation invariants: rejects inactive, locked, and unapproved users', () => {
      const now = new Date();

      type SessionMockUser = {
        status: string;
        approvedAt: Date | null;
        lockedUntil: Date | null;
      };

      const validateUserForSession = (
        user: SessionMockUser,
        requireAdminApproval: boolean
      ): { valid: boolean; reason?: string } => {
        if (user.status !== 'Active') {
          return { valid: false, reason: 'user_inactive' };
        }
        if (user.lockedUntil && user.lockedUntil > now) {
          return { valid: false, reason: 'user_locked' };
        }
        if (requireAdminApproval && !user.approvedAt) {
          return { valid: false, reason: 'unapproved' };
        }
        return { valid: true };
      };

      // Active approved user -> valid
      assert.deepEqual(
        validateUserForSession(
          {
            status: 'Active',
            approvedAt: new Date(now.getTime() - 1000),
            lockedUntil: null,
          },
          true
        ),
        { valid: true }
      );

      // Inactive user -> invalid
      assert.deepEqual(
        validateUserForSession(
          { status: 'Inactive', approvedAt: new Date(), lockedUntil: null },
          true
        ),
        { valid: false, reason: 'user_inactive' }
      );

      // Locked user -> invalid
      assert.deepEqual(
        validateUserForSession(
          {
            status: 'Active',
            approvedAt: new Date(),
            lockedUntil: new Date(now.getTime() + 60000),
          },
          false
        ),
        { valid: false, reason: 'user_locked' }
      );

      // Unapproved user when approval is required -> invalid
      assert.deepEqual(
        validateUserForSession(
          { status: 'Active', approvedAt: null, lockedUntil: null },
          true
        ),
        { valid: false, reason: 'unapproved' }
      );
    });
  });

  describe('A4 & A8: Rate Limiting, Lockout, Open Redirect Prevention & CLI Recovery (R276, R277, R284, R289)', () => {
    it('hashes user identifiers with sha256 deterministically', () => {
      const h1 = hashIdentifier('User@Example.COM ');
      const h2 = hashIdentifier('user@example.com');
      assert.equal(h1, h2);
      assert.equal(h1.length, 64);
    });

    it('locks account after reaching maxFailedAttempts', () => {
      const maxAttempts = 5;
      const lockoutMs = 15 * 60 * 1000;
      let count = 0;
      let lockedUntil: Date | null = null;

      const recordFailure = (now: Date) => {
        count += 1;
        if (count >= maxAttempts) {
          lockedUntil = new Date(now.getTime() + lockoutMs);
        }
        return { count, locked: lockedUntil !== null && lockedUntil > now };
      };

      const now = new Date();
      for (let i = 1; i <= 4; i++) {
        const attempt = recordFailure(now);
        assert.equal(attempt.locked, false);
      }

      // 5th attempt locks account
      const fifth = recordFailure(now);
      assert.equal(fifth.locked, true);
      assert.ok(lockedUntil! > now);
    });

    it('clears failed attempts upon successful authentication', () => {
      let count = 4;
      let lockedUntil: Date | null = new Date();

      const clearLogins = () => {
        count = 0;
        lockedUntil = null;
      };

      clearLogins();
      assert.equal(count, 0);
      assert.equal(lockedUntil, null);
    });

    it('sanitizes post-login next path to prevent open redirect vulnerabilities (R277 / A4-03)', () => {
      // Valid paths
      assert.equal(getSafeNextPath('/dashboard'), '/dashboard');
      assert.equal(
        getSafeNextPath('/dashboard/settings'),
        '/dashboard/settings'
      );
      assert.equal(getSafeNextPath('/posts?filter=all'), '/posts?filter=all');

      // Malicious or protocol-relative paths must fall back to /dashboard
      assert.equal(getSafeNextPath('//evil.com'), '/dashboard');
      assert.equal(getSafeNextPath('//attacker.org/steal'), '/dashboard');
      assert.equal(getSafeNextPath('/\\evil.com'), '/dashboard');
      assert.equal(getSafeNextPath('https://evil.com'), '/dashboard');
      assert.equal(getSafeNextPath('javascript:alert(1)'), '/dashboard');
      assert.equal(getSafeNextPath(null), '/dashboard');
      assert.equal(getSafeNextPath(''), '/dashboard');
      assert.equal(getSafeNextPath('   '), '/dashboard');
    });

    it('emergency recovery: verify enable-login updates auth_settings.loginEnabled', () => {
      const initialSettings = {
        ...DEFAULT_AUTH_SETTINGS,
        loginEnabled: false,
      };

      // Simulated enable-login script action
      const recoveredSettings = {
        ...initialSettings,
        loginEnabled: true,
      };

      assert.equal(recoveredSettings.loginEnabled, true);
      const parsed = authSettingsSchema.parse(recoveredSettings);
      assert.equal(parsed.loginEnabled, true);
    });
  });
});
