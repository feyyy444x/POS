# acoPos Offline-First & App Roadmap

> Status: Draft proposal and implementation boundary. This branch is intentionally isolated from the main application release path.

## Purpose

Make acoPos installable as a Progressive Web App (PWA), then progressively support safe POS operation during internet outages, while keeping subscription enforcement and server data integrity intact.

## Isolation and release safety

- Work only on `feature/acopos-offline-first-isolated`.
- Keep this work in its own Draft Pull Request targeting `main`.
- Do not merge this PR, deploy it to production, or apply production Supabase migrations as part of this work.
- Do not change PR #22 or unrelated open pull requests.
- All offline behavior must remain opt-in / unavailable to production users until separately reviewed, tested, and approved.
- Closing this PR and deleting its branch must leave the production application unchanged.

## Existing baseline verified on `main`

- Vite + React application.
- `public/manifest.webmanifest` is linked from `index.html`.
- `public/sw.js` caches the app shell and same-origin static assets; API/auth traffic is deliberately not cached.
- `src/main.jsx` registers the service worker in production.
- `src/PwaInstallPrompt.jsx` provides install guidance.
- Capacitor Android and Tauri CLI dependencies/configuration are present.
- No offline transaction database, durable transaction outbox, offline sync engine, or offline licence validation was found in the inspected baseline files.

The existing service worker is an app-shell cache only. It must not be described as full offline POS support.

## Product rollout

### Phase 0 — Isolated foundation and compatibility audit

- Keep all work on this branch.
- Map the existing authentication, tenant/store selection, product/price reads, checkout flow, stock mutation RPCs, receipt generation, cashier shifts, and role/status gates.
- Identify which operations are safe to queue locally and which must require a live server.
- Add automated tests before enabling offline checkout.
- Do not modify production data or schema.

### Phase 1 — PWA completeness

- Validate manifest fields, installability, icons, and standalone behavior across supported browsers.
- Provide a predictable offline fallback and versioned asset cache.
- Never cache authenticated API responses or private tenant data in the generic app-shell cache.
- Ensure service-worker updates do not silently discard pending local transactions.

### Phase 2 — Single-device offline POS

- Use IndexedDB for an explicit, versioned local data model.
- Cache only the signed-in store's minimum required product, price, tax, and configuration snapshot.
- Persist each offline transaction and its line items atomically in a durable outbox before showing success.
- Generate globally unique transaction IDs on-device; make server ingestion idempotent.
- Clearly label transactions as pending sync until the server confirms them.
- Start with cash transactions. QRIS and payment-proof verification remain online-only.
- Keep offline transaction scope limited to the current authorized store and device.
- Preserve cashier/shift rules where the existing product requires them; do not bypass a required open shift.
- Treat stock as provisional while offline. On reconnect, the server is authoritative and must apply an explicit conflict/oversell policy; never silently overwrite stock.

### Phase 3 — Sync and recovery

- Retry with bounded backoff and resumable batches.
- Use idempotency keys and server-side authorization for every accepted transaction.
- Handle duplicate submission, partial upload, expired sessions, revoked memberships, changed prices, deleted products, and stock conflicts.
- Do not delete local pending records until the server acknowledges durable acceptance.
- Surface sync state and actionable errors to the cashier.
- Audit sync acceptance/rejection server-side.

### Phase 4 — Offline subscription licence

- Server signs a licence payload containing store/tenant identity, activation status, expiry timestamp, issue time, and policy version.
- Client verifies the signature using a pinned public key; never embed a signing secret in the app.
- Standard offline grace period: **72 hours since last successful server validation**.
- Super Admin may configure the allowed offline grace period per activation package; 72 hours is the initial default.
- Enforce subscription expiry using the signed absolute expiry timestamp, not by extending validity when internet is disabled.
- Track last trusted server time and detect clock rollback or suspicious time discontinuities.
- Browser/PWA clock and storage checks are tamper signals, not tamper-proof hardware security. Stronger device-bound storage/attestation can be evaluated for Android/Windows packaging.
- After grace expires, require online validation before new operational writes; keep permitted read-only access and pending local data visible/exportable.
- A server-side deactivation cannot reach a fully disconnected device immediately. The bounded grace period limits this unavoidable exposure; the next successful connection must revalidate status before sync or writes.

### Phase 5 — Android and Windows packaging

- Evaluate Capacitor Android and Tauri Windows from the existing scaffold.
- Use platform secure storage for device-bound licence state where available.
- Test printers, barcode scanners, cash drawers, and customer-facing second displays on actual hardware.
- Do not claim peripheral compatibility until tested on named device models.

### Phase 6 — Local-network multi-cashier

- Separate future phase; not part of the initial single-device offline guarantee.
- Design a trusted local coordinator/server and LAN protocol before implementation.
- Define cashier concurrency, transaction IDs, stock reservation, coordinator failure, and reconciliation.
- Internet-independent multi-cashier operation requires local network connectivity and cannot be promised by a standalone PWA alone.

## Offline behavior matrix

| Capability | Offline policy |
|---|---|
| Open cached app shell | Allowed |
| View locally cached catalogue | Allowed while local licence/session policy remains valid |
| Cash sale on one device | Planned, pending implementation and tests |
| Print receipt | Hardware/browser dependent; must be tested |
| QRIS verification / payment proof validation | Online only |
| Public Self Order and remote customer updates | Online only |
| Owner realtime monitoring / central administration | Online only |
| Subscription or activation changes | Online only |
| Server-side disable received by device | Enforced immediately after next successful validation; not deliverable during total disconnection |

## Data and security invariants

- Supabase production remains the online source of truth.
- Offline data must be tenant-scoped and must never cross stores/accounts.
- Do not cache access tokens or authenticated API responses in the generic service-worker cache.
- Do not trust client-supplied role, price, expiry, or stock values during server ingestion.
- Server revalidates membership, store status, subscription, transaction shape, and idempotency.
- Company/store inactive remains read-only; offline mode must not weaken that policy.
- No silent data loss: pending transactions survive reloads, app updates, and recoverable crashes.
- Define explicit retention, device sign-out, local-data purge, and shared-device protections before enabling production use.

## Acceptance gates

1. Existing online POS behavior and production data remain unchanged.
2. PWA installability passes supported-browser checks.
3. Offline transactions survive reload, browser restart, and interrupted sync.
4. Duplicate retries never create duplicate sales.
5. Tenant isolation and server authorization tests pass.
6. Stock conflict behavior is deterministic and visible.
7. Licence expiry, 72-hour grace, clock rollback, revoked status, and reconnect cases pass automated tests.
8. Real-device tests cover Android/Windows and selected printer/scanner hardware.
9. No production migration, merge, or deploy occurs without separate explicit approval.

## Cost posture

- PWA, Service Worker, IndexedDB, Capacitor, and Tauri have no required framework licence fee.
- Store distribution, signing, hardware, hosting/monitoring, and engineering/testing may introduce costs.
- Initial validation can use installable PWA previews; paid app-store distribution is not required for the first phase.


## Current isolated implementation status (2026-11-11)

- Completed source audit of the full migration filename sequence for the legacy checkout RPC ACL. The later read-only tenant migration revokes direct access to the legacy non-idempotent RPC; this is retained as a regression test, not reported as an active source gap.
- Added 20261111130000_enforce_cashier_shift_on_checkout.sql. The authoritative checkout function now requires the authenticated employee's own open shift in the exact store and rejects an active break. The legacy RPC remains inaccessible to authenticated clients; the idempotent wrapper remains the application entry point.
- Added supabase/tests/checkout_rpc_privileges.test.sql with pgTAP checks for legacy RPC denial, idempotent RPC access for authenticated, and anon denial.
- Updated docs/ACOPOS_OFFLINE_FIRST_AUDIT.md with the corrected finding and required authenticated-fixture integration matrix.
- These migrations and tests exist only in this draft PR branch. They have not been applied to production or executed against a local/test database. Do not mark the shift guard as runtime-verified until the matrix in the audit document passes.

## Remaining work before this PR can be considered complete

1. Confirm GitHub Actions passes on the latest PR head, including behavioral sync and storage-persistence tests.
2. Run the full ordered Supabase migration chain and pgTAP against a disposable Supabase project, with authenticated role fixtures. The current ephemeral PostgreSQL CI harness covers the new shift/license migration behavior but is not a full Supabase clone.
3. Configure an isolated preview/test Supabase URL and service-role secret before setting any Netlify preview signing keys. The existing Netlify site has shared environment values that point to the production Supabase project; do not enable preview license issuance against production data.
4. Add browser-level real IndexedDB E2E coverage for offline reload, browser restart, interrupted sync, duplicate retry, and conflict review.
5. Test Android/Windows packaging and actual printer/scanner/cash-drawer/customer-display models. Do not claim compatibility until those physical tests pass.
6. Keep the PR Draft and isolated. No merge, production deploy, or production migration without separate explicit approval.

## Offline license key setup (required before any preview or release can issue licenses)

The signing key is intentionally not committed to this repository.

1. Generate a dedicated Ed25519 key pair in a secure operator environment:
   ```sh
   openssl genpkey -algorithm ED25519 -out acopos-license-private.pem
   openssl pkey -in acopos-license-private.pem -pubout -outform DER | base64 -w0
   ```
2. Store the complete private PEM only as the Netlify environment variable `ACOPOS_LICENSE_PRIVATE_KEY`. Never place it in Git, a frontend variable, build artifact, issue, or chat.
3. Set the DER public-key Base64 output as `VITE_ACOPOS_LICENSE_PUBLIC_KEY` for the matching deploy context. The public key is safe to ship in the client bundle.
4. Set the variables for a disposable preview context first. Verify that the issuer rejects missing/invalid bearer tokens, inactive memberships, inactive/expired stores, inactive/expired organizations, missing package policy, and invalid signatures.
5. Rotate keys only with an explicit key-version/overlap migration. Replacing the public key without a planned overlap invalidates every locally cached license signed by the previous key.

**Current configuration status:** the source code and key-generation instructions are present, but no private key or public key has been generated or installed in Netlify. The issuer therefore fails closed until an operator configures these values. No production secret was changed by this PR.

## Offline local-data lifecycle and device controls

- Outbox rows are scoped to both authenticated user and store and remain on-device after server acceptance/rejection for audit/reconciliation.
- Signing out does not erase unresolved local sales. The next user cannot list or sync another user's records.
- Do not add a "clear offline data" action that can erase pending rows. A future device-management screen must first export/reconcile pending transactions and require an explicit owner/admin confirmation.
- Browser IndexedDB is not encrypted against a person with access to the device profile. Use OS account protection/full-disk encryption and lock the cashier session; native Android/Windows packaging should add platform secure storage before broader rollout.
- A signed timestamp bounds grace to the absolute signed expiry. Local clock rollback is detected against both the last observed clock and the signed issuance time. Browser storage/clock controls remain best-effort signals, not hardware-backed tamper proofing.

## Reconnect safety

- A reconnect event immediately clears the offline write allowance.
- The client must obtain and verify a fresh server-signed license before replaying any pending offline sale.
- The server still revalidates store operational status, membership, shift, current prices, and stock during each idempotent replay. A rejected or changed sale remains visible for human review; no silent acceptance or deletion.

## Additional implementation progress (2026-11-11)

- IndexedDB v2, store/user-scoped snapshots, atomic cash outbox, persistent-storage permission request, immutable payload, and provisional local stock reservation are implemented.
- Offline cash checkout is connected to the UI and creates a clearly marked temporary receipt; QRIS/transfer remain online-only.
- Idempotent sync, durable acknowledgement retention, pending retry, needs-review handling, and manual reconciliation controls are connected.
- Server-signed Ed25519 license issuer/verifier, 72-hour default grace, per-package Super Admin setting, subscription expiry enforcement, and best-effort clock rollback detection are implemented in the isolated branch.
- Reconnect clears offline write mode and now blocks queued-sale replay until a fresh signed server license is verified.
- CI previously passed application regression tests, production build, security checks, dependency audit, deployed-preview smoke checks, and the isolated PostgreSQL shift/license fixture. The newest changes add runtime sync tests and persistent-storage handling; their CI runs must complete before the latest head can be marked green.
- Physical device/peripheral tests, full disposable Supabase migration-chain validation, Netlify preview signing-key configuration, and real-browser IndexedDB E2E remain pending. The Netlify site currently shares Supabase configuration that points to production, so no preview signing secrets will be enabled until an isolated test database is configured.
- Offline functionality is integrated in this Draft PR branch, but not yet production-ready.