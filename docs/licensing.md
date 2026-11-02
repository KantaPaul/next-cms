# Single-Install Licensing Architecture

This document describes the single-installation licensing system for **Next CMS** (`next-cms`), implementing requirements **R217–R261** (L1–L8).

---

## 1. Overview & Architecture

Next CMS is sold and deployed as licensed software. A single license authorizes the product `next-cms` on exactly **one** installation deployment at any given time.

The codebase supports two operational roles configured via environment variables:

- **Authority** (`LICENSE_ROLE=authority`): The vendor deployment. It issues license keys, stores SHA-256 key hashes, locks installation bindings, verifies request signatures, and signs short-lived Ed25519 tokens.
- **Installation** (`LICENSE_ROLE=installation`): A customer deployment. It holds an installation key pair, registers its public key with the authority, periodically validates its binding, and verifies authority-signed tokens.

```mermaid
flowchart TD
  customer[Customer Deployment] -->|1. POST /api/licenses/activate| authority[Vendor Authority]
  authority -->|2. Row lock + verify SHA-256 key hash| db[(Database: max_installations = 1)]
  authority -->|3. Ed25519 short-lived signed token| customer
  customer -->|4. requireLicense guard| guard{Is Token Valid & Product next-cms?}
  guard -->|Valid| pass[Allow Dashboard & Mutations]
  guard -->|Invalid / Expired| fail[Fail Closed]
```

---

## 2. Cryptographic Keys & Secrets Management

To guarantee strict security, **no secrets are stored in the database or client bundles**:

| Secret / Key | Role | Where It Lives | Storage Form |
| :--- | :--- | :--- | :--- |
| **Plaintext License Key** (`ncms_lic_...`) | Authority & Customer | Customer receives once on purchase/issue | Only **SHA-256 hash** stored in DB |
| **Authority Signing Private Key** | Authority | `LICENSE_SIGNING_PRIVATE_KEY` server env | Ed25519 PKCS#8 PEM string |
| **Authority Signing Public Key** | Installation & Authority | `LICENSE_SIGNING_PUBLIC_KEY` server env | Ed25519 SPKI PEM string |
| **Authority Previous Public Key** | Installation & Authority | `LICENSE_SIGNING_PREVIOUS_PUBLIC_KEY` | Ed25519 SPKI PEM (for rotation) |
| **Installation Private Key** | Installation | `LICENSE_INSTALLATION_PRIVATE_KEY` server env | Ed25519 PKCS#8 PEM string |
| **Installation Public Key** | Authority & Installation | Registered in `license_installations` | Ed25519 SPKI PEM string |

> [!CAUTION]
> None of the private keys or license tokens are ever exposed via `NEXT_PUBLIC_` variables or sent to client-side browser bundles.

---

## 3. Strict Single-Installation Constraint

- **Check Constraint**: `max_installations` has a database check constraint (`CHECK ("max_installations" = 1)`) and cannot be configured to exceed 1.
- **Partial Unique Index**: `CREATE UNIQUE INDEX "license_installations_active_unique_idx" ON "license_installations" ("license_id") WHERE status = 'active'`.
- **Atomic Concurrency**: Activations use PostgreSQL row-level locks (`SELECT ... FOR UPDATE`). When two concurrent activation requests target the same license key with different public keys, the second request is rejected with a generic client error (`Invalid or inactive license key`).
- **Idempotency**: Repeat activation requests from the *same* installation public key succeed idempotently, refreshing the active binding.

---

## 4. Environment Variables & Enforcement Modes

```bash
# Deployment Role
LICENSE_ROLE=installation # or "authority"

# Enforcement Switch
LICENSE_ENFORCEMENT=on # "on" | "off"

# Authority Signing Keys (Authority needs Private, Installation needs Public)
LICENSE_SIGNING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
LICENSE_SIGNING_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
LICENSE_SIGNING_PREVIOUS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Installation Identity & Keys (Installation only)
LICENSE_INSTALLATION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
LICENSE_INSTALLATION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
LICENSE_AUTHORITY_URL="https://licenses.yourdomain.com"
LICENSE_KEY="ncms_lic_..."
```

### Production Enforcement Guarantee (R242 / L5-05)

- In `development` and `test` environments (`NODE_ENV !== 'production'`), setting `LICENSE_ENFORCEMENT=off` allows local development without an active license.
- In `production` (`NODE_ENV === 'production'`), **`LICENSE_ENFORCEMENT=off` is strictly ignored** by `requireLicense()`. The dashboard and mutations fail closed if a valid active license token is missing.

---

## 5. Offline Grace Period & Expiration Handling

- **Token Expiry**: License tokens are short-lived (default: `heartbeatIntervalSeconds + gracePeriodSeconds`).
- **Offline Leeway**: If an installation loses internet connectivity to the authority, it continues operating during the grace period (default 3 days, hard-coded ceiling of **7 days / 604,800 seconds** in code).
- **Fail Closed**: Once the token and grace period expire, or if the authority issues a status of `suspended` or `revoked`, the installation fails closed.
- **Public Site Resilience**: Even when unlicensed or expired, **published public GET pages stay available** without interruption. Only admin dashboard access, content mutations, publish cron, and API write endpoints are blocked.

---

## 6. HTTP API Specification

All authority routes live under `/api/licenses/`:

### 1. `POST /api/licenses/activate` (R234 / L4-01)
- **Request**:
  ```json
  {
    "licenseKey": "ncms_lic_...",
    "installationPublicKey": "-----BEGIN PUBLIC KEY-----\n..."
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "token": "header.payload.signature",
    "installationPublicId": "inst_12345678..."
  }
  ```
- **Error** (400 Bad Request):
  ```json
  { "error": "Invalid or inactive license key" }
  ```
  *(Generic error returned to prevent enumeration or information leakage).*

### 2. `POST /api/licenses/validate` & `POST /api/licenses/heartbeat` (R235 / L4-02)
- Signed request from installation with timestamp and nonce.
- Updates `last_validated_at` and `last_validation_result`.
- Returns fresh short-lived token.

### 3. `POST /api/licenses/deactivate` (R236 / L4-03)
- Signed request from bound installation.
- Deactivates installation binding and clears `current_installation_id`.

### 4. `GET /api/licenses/status` (R237 / L4-04)
- Signed request from installation.
- Returns `status`, `expiresAt`, `issuedAt`, `activatedAt`, and `boundInstallationPublicId`.
- Omits key hash, prefix, and owner email for privacy.

---

## 7. Administration & Governance (L6)

On authority deployments, the dashboard provides a full license management suite at `/dashboard/licenses`:

- **Issue License** (`licenses.manage`): Generates a new license key with prefix `ncms_lic_`. Plaintext key is displayed **once** in an alert banner with a copy button.
- **License Detail**: Inspects status, owner, bound installation public ID and key, and complete audit event history from `license_events`.
- **Administrative Actions**:
  - **Suspend**: Temporarily disables token refresh.
  - **Revoke**: Permanently revokes the license.
  - **Renew**: Extends the validity period by configured days.
  - **Reassign**: Transfers binding to a new installation Ed25519 public key with cooldown and maximum reassignment policy checks.
  - **Deactivate**: Disconnects the active installation binding.
- **Policy Settings** (`/dashboard/settings`): Configures heartbeat interval, grace period, rate limits, reassignment limits, and notification policies. Max installations is locked to 1 and cannot be modified.

---

## 8. Known Boundaries & Limitations

1. **Source Code Access**: Because Next CMS is self-hosted on customer hardware, a user who can directly modify source files could remove the `requireLicense()` guard locally. However, they cannot forge authority-signed tokens, and modified installs cannot activate against the vendor authority or pass verification on unmodified hosts.
2. **Push Channel Absence**: Token revocation applies at the next online heartbeat/validate request; disconnected instances remain operational until their current token and grace period elapse.
3. **Identity Basis**: Installation identity is strictly cryptographic (Ed25519 public key). IP addresses, user agents, and hostnames are not used as installation identity.
