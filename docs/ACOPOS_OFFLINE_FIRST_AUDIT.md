# acoPos Offline-First — Baseline Flow & Security Audit

Audit target: `main` (read-only inspection)  
Audit branch: `feature/acopos-offline-first-isolated`  
Audit date: 2026-11-11  
Scope: authentication/session, workspace access, checkout, stock, cashier shifts, tenant operational status, and offline readiness.

> This is a source/migration audit, not a live penetration test. No production database, customer data, or deployment was changed. Runtime behavior and deployed migration state still require separate verification.

## Executive summary

The current application is an online-first POS with an installable PWA shell. It is not yet an offline POS. The existing server checkout has useful protections (tenant membership/operational checks, product row locks, aggregate stock validation, and a request-ID wrapper), but the migration history exposes two checkout hardening gaps that must be resolved before offline transaction ingestion is designed.

## Findings

### F-01 — Legacy non-idempotent checkout RPC is revoked in the final migration state

**Resolved in migration history; keep regression coverage.**

**Correction after reviewing the complete migration sequence:**

- `20261030032837_idempotent_checkout.sql` creates `complete_sale_idempotent(..., p_request_id)` and revokes authenticated execution of the legacy `complete_sale(...)` RPC.
- `20261030033109_legacy_checkout_compatibility.sql` temporarily restores the legacy grant for compatibility.
- The later `20261030142837_readonly_suspended_tenants.sql` migration revokes that legacy grant again. The final source migration state therefore does not leave the non-idempotent RPC executable by authenticated clients.
- The offline branch adds a regression assertion to prevent a future migration from reopening that path.

**Remaining verification:** confirm the production migration ledger and live function privileges before any release. Source history alone is not proof of the deployed database state.

### F-02 — Open-shift enforcement for normal POS checkout

**Severity: High — source-level fix added in isolated PR; runtime verification still required.**

Baseline evidence:
- `src/App.jsx` checks `activeShift` and `shiftBreak` before calling checkout.
- The original `complete_sale` implementation did not enforce an open shift at the database boundary.
- `complete_sale_idempotent` delegates to `complete_sale`.

Change in this isolated branch:
- Migration `20261111130000_enforce_cashier_shift_on_checkout.sql` redefines the authoritative checkout function.
- It locks only an open shift belonging to `auth.uid()` in the requested `p_store_id`.
- It rejects checkout when no matching open shift exists or when that shift has an unfinished break.
- The public legacy checkout RPC remains revoked; authenticated clients execute only the idempotent wrapper.

**Still required before release:** run the migration and pgTAP/runtime tests against a disposable database for no shift, another employee's shift, wrong tenant, closed shift, active break, and successful checkout. Confirm the function signature and grants against the deployed schema before any production migration. The source-level contract test is not a substitute for these database tests.

### F-03 — Offline transaction persistence and synchronization do not exist in the inspected baseline

**Severity: High — blocks offline POS capability**

Evidence:
- `src/main.jsx` registers the public service worker in production.
- `public/sw.js` caches the app shell and same-origin static resources; it deliberately skips API/auth traffic.
- `src/lib/supabase.js` configures Supabase Auth session persistence and automatic token refresh.
- `src/App.jsx` checkout sends a live RPC and then fetches `order_items` from Supabase before presenting the receipt.
- The checkout request ID is held in a React ref and is reset when cart/payment context changes; it is not a durable offline transaction queue.

Risk:
- When offline, checkout cannot complete through the current server RPC.
- The current service worker can display a cached shell but does not guarantee that all route chunks, authenticated data, or transaction state are available offline.
- Treating a locally displayed sale as complete without durable persistence and later server acknowledgement would risk lost or duplicated transactions.

Required before offline:
- IndexedDB schema + atomic durable outbox.
- Persist request ID and immutable transaction payload before showing a pending-sale confirmation.
- Explicit `pending_sync / accepted / rejected / needs_review` states.
- Idempotent server ingestion and durable acknowledgement before deleting local pending data.
- Never cache authenticated API responses in the generic service-worker cache.

### F-04 — Server-side operational status guard is present for the main checkout function

**Severity: Positive control; retain and test**

Evidence:
- `complete_sale` checks `private.is_store_operational(p_store_id)`.
- `private.is_store_operational` in `20261030142837_readonly_suspended_tenants.sql` requires active membership, active store status, unexpired store lease, and (when linked) active/unexpired organization status.
- The same migration retains read access to tenant products/orders/queue while restricting several operational writes to operational tenants.

Implication:
- Offline licence enforcement must not weaken the online server guard.
- The server must re-check status when an offline batch reconnects; a client-signed local licence is not authority to override a revoked server status.

### F-05 — Stock validation is transactionally stronger than a client-only check

**Severity: Positive control; retain and test**

Evidence:
- `20261028172202_validate_aggregated_stock_during_sale.sql` aggregates duplicate product IDs, locks product rows in stable ID order, validates active products and stock, calculates prices from database product records, writes order items, and decrements stock under the transaction.
- The checkout path does not trust the client-supplied price in its item payload; it uses the current server-side product price.

Implication:
- Offline cart prices/stock are only a cached estimate.
- Server reconciliation must revalidate product existence/activity, current prices and stock. Define deterministic policy for price changes and insufficient stock before implementing sync; never silently force stale local stock values onto the server.

## Flow map (current online path)

1. Supabase Auth restores/refreshes the browser session.
2. App loads tenant membership and workspace data through Supabase.
3. Cashier opens a personal shift (direct table insert constrained by RLS policy to own user, active membership, operational store, and open-shift fields).
4. UI checks active shift and break state.
5. UI creates a request UUID in memory and calls `complete_sale_idempotent`.
6. Server wrapper checks tenant membership, serializes the request ID, and calls `complete_sale`.
7. Checkout server validates operational status and stock, writes order/items, decrements stock, optionally creates queue ticket.
8. Client fetches order items, shows receipt, clears cart and reloads workspace.

Offline mode cannot simply replace step 5 with local success; it requires a durable local transaction state and an authenticated, idempotent server acceptance flow.

## Required design decisions before implementation

1. **Offline eligibility:** only an already authenticated, previously validated device/store may enter offline POS. First login and tenant switching require connectivity.
2. **Offline licence:** signed server entitlement; 72-hour grace from last successful validation as the default. Client public key only; no signing secret in browser bundle.
3. **Shift continuity:** decide whether a shift can remain open across disconnect/restart and how local shift opening/closing is represented and reconciled.
4. **Break policy:** determine whether break blocks checkout server-side and how to represent offline break transitions.
5. **Payment:** start with cash-only offline. QRIS/payment-proof verification remains online.
6. **Price conflicts:** freeze displayed cached price at sale time for audit, but server policy must decide whether to accept, reject, or require manager review if current price changed.
7. **Stock conflicts:** server stock remains authoritative; offline sales may be rejected/flagged on reconnect if concurrent devices consumed stock.
8. **Revocation:** fully disconnected devices cannot receive immediate disable commands. On reconnect, status validation must occur before accepting queued writes.
9. **Shared-device privacy:** local data must be partitioned by tenant/user/device, with explicit sign-out and secure local purge policy.

## Verification status

| Check | Result |
|---|---|
| Source inspection of current checkout handler | Completed |
| Migration history inspection for checkout/idempotency | Completed |
| Tenant operational guard inspection | Completed |
| Self Order shift guard comparison | Completed |
| Live production RPC privilege check | Not performed |
| Live production migration ledger check | Not performed |
| Automated test suite / build / browser E2E | Not run in this source-only audit |
| Real offline device test | Not run |

## Next safe implementation order

1. Resolve F-01 and F-02 in an isolated database migration proposal and automated tests.
2. Verify the proposal against a disposable local/test database (never production by default).
3. Audit all write-capable flows that could be queued offline (product edits, shifts, Self Order, refunds/voids, queue actions).
4. Implement PWA asset/offline shell improvements separately from transaction storage.
5. Implement durable IndexedDB cash-sale outbox only after the server acceptance contract is approved.


## Follow-up audit and isolated hardening (2026-11-11)

### F-01 re-evaluated — legacy RPC grant is revoked by a later migration

The initial finding is **not an active gap in the current source migration sequence**. The compatibility migration 20261030033109_legacy_checkout_compatibility.sql grants the legacy function, but the later 20261030142837_readonly_suspended_tenants.sql recreates the idempotent wrapper and explicitly revokes execution of public.complete_sale(...) from public, anon, and authenticated. A complete listing of the branch's migration directory confirms no later migration re-grants it.

The new isolated hardening migration reasserts this least-privilege boundary. supabase/tests/checkout_rpc_privileges.test.sql adds pgTAP assertions that authenticated can execute only the idempotent wrapper and anon cannot execute it.

**Runtime caveat:** the source sequence does not prove the production database has applied every migration in order or retained the expected ACL. Live production privilege and migration-ledger checks remain intentionally unperformed.

### F-02 confirmed and hardened — checkout now validates the employee's own open shift

New migration: 20261111130000_enforce_cashier_shift_on_checkout.sql.

The authoritative public.complete_sale function now:
- rejects unauthenticated calls;
- retains the tenant operational-status check;
- locks an open shift for the exact p_store_id and auth.uid();
- rejects checkout when that employee has no personal open shift;
- rejects checkout while an unended break exists for that exact shift;
- retains server-side product, stock, price, payment, order-item, and queue handling;
- keeps direct authenticated execution revoked on the legacy non-idempotent RPC and grants the authenticated role only the idempotent wrapper.

The row lock is intended to serialize checkout with shift closure. The break record check is tenant-, shift-, and cashier-scoped. The frontend checks remain for user experience; the database function is now authoritative.

### Required integration test matrix before marking F-02 fully verified

Run against a disposable local/test database with real authenticated fixtures:
1. Same cashier + same store + open shift + not on break: checkout succeeds.
2. No open shift: checkout is rejected and no order/stock mutation remains.
3. Another employee has an open shift but caller does not: checkout is rejected.
4. Caller has a shift in another tenant only: checkout is rejected.
5. Shift is closed: checkout is rejected.
6. Caller is on an active break: checkout is rejected.
7. Break ended: checkout succeeds.
8. Store inactive/expired or organization inactive/expired: checkout is rejected.
9. Duplicate request ID through idempotent wrapper: exactly one order and one stock decrement.
10. Legacy RPC called directly by authenticated role: permission denied.

The pgTAP ACL test is committed, but neither it nor the integration matrix has been executed in this environment. No production migration was applied.

## Updated verification status

| Check | Result |
|---|---|
| Full source migration listing for later checkout grants/revokes | Completed; later migration revokes legacy RPC |
| Reassert legacy RPC privilege boundary in isolated migration | Committed to PR branch |
| Server-side cashier open-shift + break enforcement | Committed to PR branch |
| pgTAP checkout RPC privilege assertions | Added; not executed |
| Authenticated fixture integration tests | Not executed |
| Production migration ledger / live function ACL | Not checked |
| Build / browser E2E / real offline-device test | Not run |


## CI follow-up

The GitHub Actions runs associated with commit ee5fe5398a48a3e61ac15c0ffb24c5397750672c completed with failure:
- acoPos CI: regression-test step failed (44 passed, 9 failed); production build step was skipped.
- Security smoke checks: static security regression-test step failed; build and deployed-preview smoke steps were skipped.

The captured failures include stale test expectations for public registration routes and Single Workspace migration content, an invalid regular expression in a homepage cinematic test, and tests trying to read paths that do not exist in the current tree (including src/acoPos-layout-safety.css and a migration filename whose current checked-in name still contains the older support-conversation identifier). These failing checks do not touch the new checkout migration directly, but the red CI means the branch is not release-ready. A new focused static regression test for the offline checkout guard has been added at tests/offline-checkout-guard.test.mjs; it has not yet been executed by CI.

No successful build result is available because the workflow skipped the build after the regression-test failure. Do not treat the CI run as a pass.


## Offline storage, sync, license, and application integration (updated 2026-11-11)

### Implemented on this isolated branch

- `src/lib/offlineDatabase.js`: IndexedDB v2 with store + user compound snapshot key, durable cash-only outbox, immutable sale payload, explicit reconciliation statuses, atomic stock reservation in the local snapshot, and request for persistent browser storage.
- Schema upgrade from v1 rebuilds the disposable snapshot cache while retaining any existing outbox and metadata stores.
- `src/lib/offlineSync.js`: injectable storage adapter, idempotent replay through `complete_sale_idempotent`, retained local acknowledgement records, retry of transport failures, and explicit `needs_review` for server rejection or local/server total mismatch.
- Checkout UI: offline cash sale is saved before showing a temporary unverified receipt; QRIS/transfer remain online-only; pending, accepted, rejected, and review states remain visible; local stock is reserved provisionally.
- Reconnect safety: online event clears offline write mode. The client must obtain and verify a fresh signed license before syncing any pending outbox rows. This prevents a stale offline license from replaying after the tenant/company was disabled while disconnected.
- `netlify/functions/offline-license.mjs`: server-side Ed25519 issuer validates bearer session, active membership, store, organization, expiry, and package grace policy.
- `src/lib/offlineLicense.js`: Ed25519 signature verification, store/user binding, absolute signed grace expiry, subscription expiry, and clock rollback detection against both the last local observation and signed issuance time.
- `SubscriptionPlanManager.jsx` and migration `20261111150000_offline_license_grace_period.sql`: Super Admin can set 0–168 hours per package; default is 72 hours.
- Documentation includes private/public key setup, secret-handling boundaries, local data retention, reconnect checks, and browser-storage limitations.
- Automated runtime sync tests cover accepted acknowledgement, server total mismatch, business/shift rejection, network retry, and missing server client.

### Verification already completed

- GitHub Actions on commit `63347a75bb9330c11cc72b0cc0eea8995eeccb09` passed both acoPos CI and Security smoke checks.
- The CI disposable PostgreSQL job executed the isolated shift/license migration fixture successfully. It exercised no shift, another employee's shift, wrong tenant, closed shift, active break, successful sale, stock decrement, legacy RPC denial, idempotent RPC grant, and 72-hour grace default / bounds.
- The application regression suite and production bundle build passed on that commit.
- Static security regression checks, dependency audit, and deployed-preview HTTP/bundle smoke checks passed on that commit.

### Verification still pending on the latest commits

- The newest commits add behavioral sync tests, persistent-storage request behavior, and fresh-license-before-sync gating. Their GitHub Actions runs must finish before those changes can be called green.
- The disposable PostgreSQL fixture is a focused schema harness, not a full Supabase clone. It does not prove every migration applies cleanly to the current Supabase production schema.
- The separate pgTAP privilege file has not been run by CI; privilege boundaries are also asserted in the disposable runtime fixture.
- No live production migration ledger, production RPC ACL, or production data was inspected or modified.
- No production deploy was performed.
- No physical Android/Windows device, printer, barcode scanner, cash drawer, or customer display was available for hands-on testing.
- Browser IndexedDB eviction, device profile loss, and local-storage tampering cannot be made impossible by a PWA. Persistent-storage permission is requested, but not guaranteed by every browser.

### Release gates remaining

1. Wait for and inspect GitHub Actions on the latest PR head, including the new sync behavior tests.
2. Run the full ordered Supabase migration chain against a disposable Supabase project (not the production project) and run pgTAP + authenticated-role fixtures.
3. Configure a separate preview/test Supabase URL and service-role secret before configuring Netlify preview signing secrets. The current site has shared environment values pointing to the production Supabase project; do not add a preview signing key until the preview database is isolated.
4. Add browser-level tests using real IndexedDB in supported Chromium/Android browsers, including reload, browser restart, interrupted sync, duplicate retry, and conflict review.
5. Test named physical printer/scanner/cash-drawer/customer-display models before claiming compatibility.
6. Keep this PR Draft and isolated until a separate review and explicit approval for merge/deploy.

The offline implementation is integrated in the PR branch but is **not production-ready**. Do not merge, deploy, or apply its migrations to production yet.
