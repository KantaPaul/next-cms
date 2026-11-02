# Authentication & Access Control

Next CMS provides a robust authentication and authorization framework built on secure HTTP cookies, session tokens, dynamic session life-cycles, rate limiting, and role-based access control (RBAC).

---

## Default Authentication Settings

Authentication configuration is stored in the `auth_settings` column of `site_settings` and managed via **Settings > Authentication & Access** in the Admin Dashboard.

| Setting                                                     | Default Value    | Description                                                                                                         |
| :---------------------------------------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Login Enabled** (`loginEnabled`)                          | `true`           | When disabled, sign-ins are blocked across password, magic link, and OAuth routes.                                  |
| **Public Registration** (`publicRegistrationEnabled`)       | `true`           | Allows new visitors to create accounts via sign-in. If disabled, only pre-invited users can sign in.                |
| **Require Email Verification** (`requireEmailVerification`) | `false`          | When enabled, users without verified emails are refused session generation.                                         |
| **Require Admin Approval** (`requireAdminApproval`)         | `false`          | When enabled, new accounts are created as `Inactive` with `approvedAt = null` until an administrator approves them. |
| **Session Lifetime** (`sessionLifetimeHours`)               | `720` (30 days)  | Session duration before expiration. Max cap: 8,760 hours (1 year). Sessions refresh automatically past halfway.     |
| **Max Failed Attempts** (`maxFailedAttempts`)               | `5`              | Failed sign-ins before an account/IP is temporarily locked.                                                         |
| **Lockout Duration** (`lockoutMinutes`)                     | `15`             | Minutes an account remains locked after reaching max failed attempts. Max cap: 1,440 minutes (24 hours).            |
| **Default User Role**                                       | `Viewer` (fixed) | All new users receive the `Viewer` role. The first user to register does **not** automatically become an Admin.     |

---

## Default Viewer Role & Role Hierarchy

To eliminate privilege escalation risks, **every new user receives the `Viewer` role by default**.
Pre-seeded roles in Next CMS:

1. **Admin**: Full system access, settings management, user role assignment, plugin/license management, and audit inspection.
2. **Editor**: Content authoring, full publishing, category/tag taxonomies, and media library management. Cannot modify system settings or users.
3. **Author**: Create, edit, and submit articles/pages for review. Cannot publish directly or change system settings.
4. **Viewer**: Read-only dashboard access. Cannot publish, create content, or change settings.

---

## CLI Recovery & Administration Commands

Next CMS provides standalone CLI tools that bypass locked-out sessions or disabled authentication. These scripts run via `pnpm` / `npm` directly against the database:

### 1. Promote a User to Admin

To promote any registered user to an `Admin`:

```bash
npm run auth:promote -- user@example.com
```

- Verifies that the user exists.
- Assigns the `Admin` role.
- Activates the user (`status = 'Active'`) and sets `approvedAt = now()`.
- Logs the promotion event to the audit trail.

### 2. Emergency Enable Login

If an administrator inadvertently turns off `loginEnabled` and logs out, login can be restored via:

```bash
npm run auth:enable-login
```

- Immediately updates `auth_settings.loginEnabled = true` in `site_settings`.
- Logs the emergency recovery action in the audit trail.

---

## User Approval Workflow

When `requireAdminApproval` is enabled:

1. **Sign-up**: When a new user completes Google sign-in or registration, an account is saved with `status = 'Inactive'` and `approvedAt = null`. No session is issued, and the user receives a notice indicating their account is awaiting administrator approval.
2. **Admin Review**: Administrators navigate to **Users** in the dashboard.
   - Pending users display a `Pending approval` badge in the **Status** column alongside an **Approve** button.
3. **Approval**: Clicking **Approve** sets `status = 'Active'` and `approvedAt = now()`. The user can now sign in normally.

---

## Rate Limiting & Account Lockout

Failed login attempts (both password and OAuth) are tracked by hashed identifier (`sha256(email)`) in `auth_attempts` and on the `users` table:

- Every failed attempt increments `failedLoginCount`.
- When `failedLoginCount >= maxFailedAttempts` (default 5), the account is locked until `now + lockoutMinutes` (default 15 minutes).
- Requests during lockout are rejected with `429 Too Many Requests` or friendly lockout messages.
- A successful sign-in clears both the `auth_attempts` record and `users.failedLoginCount`.

---

## Subscriber & Invite Exceptions

- **Staff Invitations**: Admins can invite team members directly from the Users panel with a chosen role. Invited staff receive pre-approved accounts bypass approval delays.
- **Subscribers / Readers**: Public newsletter subscribers or external portal subscribers do not receive CMS dashboard access unless granted a staff role.

---

## Public Routes

When `loginEnabled` is set to `false`, access to the CMS dashboard is blocked, but public-facing site operations remain fully functional:

- `/` (Home page)
- `/[slug]` (All published public pages & articles)
- `/api/health` / `/api/ready` (Health check endpoints)
- `/api/content/*` (Public read-only content endpoints)
- `/login` (Renders the administrator-configured `loginDisabledMessage`, withholding the sign-in form)
