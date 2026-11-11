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

1. Run migration + pgTAP + authenticated-fixture integration tests against a disposable Supabase database.
2. Complete the write-path audit for shift open/close/break, product CRUD, queue transitions, Self Order, refunds/voids, and tenant inactive read-only enforcement.
3. Implement the versioned IndexedDB store snapshot and durable cash-only transaction outbox, with a server acknowledgement/reconciliation contract.
4. Implement reconnect sync with idempotent replay, rejected/needs-review states, and no deletion before durable acknowledgement.
5. Implement signed offline entitlement validation with the 72-hour default grace and Super Admin-configurable package policy; add clock rollback and expiry tests.
6. Complete PWA asset/route/offline fallback tests, build, browser E2E, and real device/peripheral tests.
7. Keep the PR draft and isolated until all gates pass and the user separately approves merge/deploy.


### Offline license key setup (required before any preview or release can issue licenses)

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

## Additional implementation progress

- Added versioned IndexedDB snapshot/outbox primitives in src/lib/offlineDatabase.js.
- Added cash-only idempotent replay engine in src/lib/offlineSync.js. It preserves local records after acknowledgement and routes server/local total mismatches to needs_review.
- Added static Node contract tests for the checkout guard, IndexedDB schema/immutability, and sync contract.
- These modules are not yet connected to the checkout UI, and the offline license verifier/issuer is not implemented. Therefore offline POS is still not available to users.
- GitHub CI on commit ee5fe5398a48a3e61ac15c0ffb24c5397750672c failed in existing regression/security test steps; build steps were skipped. See the audit document. A new focused test commit was added after that run and still needs a fresh CI execution.
