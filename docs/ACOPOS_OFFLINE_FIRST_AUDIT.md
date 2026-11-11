# acoPos Offline-First — Baseline Flow & Security Audit

Audit target: `main` (read-only inspection)  
Audit branch: `feature/acopos-offline-first-isolated`  
Audit date: 2026-11-11  
Scope: authentication/session, workspace access, checkout, stock, cashier shifts, tenant operational status, and offline readiness.

> This is a source/migration audit, not a live penetration test. No production database, customer data, or deployment was changed. Runtime behavior and deployed migration state still require separate verification.

## Executive summary

The current application is an online-first POS with an installable PWA shell. It is not yet an offline POS. The existing server checkout has useful protections (tenant membership/operational checks, product row locks, aggregate stock validation, and a request-ID wrapper), but the migration history exposes two checkout hardening gaps that must be resolved before offline transaction ingestion is designed.

## Findings

### F-01 — Legacy checkout RPC grant appears to reopen a non-idempotent path

**Severity: High — must resolve before offline checkout**

Evidence:
- `20261030032837_idempotent_checkout.sql` creates `complete_sale_idempotent(..., p_request_id)`, serializes retries by store/request ID, and revokes authenticated execution from `complete_sale(...)`.
- Later migration `20261030033109_legacy_checkout_compatibility.sql` explicitly grants `EXECUTE` on `public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)` back to `authenticated`.
- The frontend checkout currently calls `complete_sale_idempotent` (src/App.jsx, checkout handler), but the legacy RPC grant remains a callable path for authenticated clients unless a later deployed migration revokes it again.

Risk:
- A modified/stale client or direct RPC caller can invoke the non-idempotent legacy checkout path, potentially creating duplicate sales on retries.
- The unique index on `orders(store_id,idempotency_key)` does not protect legacy calls that do not attach an idempotency key.

Required before offline:
- Verify actual production function privileges and migration ledger.
- Revoke authenticated/public/anon execution of the legacy function after confirming no supported client still depends on it.
- Ensure only the idempotent server entry point is executable by application clients.
- Add a database privilege regression test.

### F-02 — Open-shift enforcement for normal POS checkout is client-side, not in the checkout function

**Severity: High — must resolve before offline checkout**

Evidence:
- src/App.jsx checks `activeShift` and `shiftBreak` before calling checkout (around lines 1093–1096).
- `complete_sale` in `20261028172202_validate_aggregated_stock_during_sale.sql` checks authenticated user, store operational status, payment, product activity, and stock, but does not verify an open cashier shift for `auth.uid()`.
- `complete_sale_idempotent` delegates to `complete_sale`.
- In contrast, `update_self_service_order_status` in `20261101105710_require_open_shift_for_self_order_actions.sql` explicitly checks an open shift belonging to the authenticated employee in the exact store.

Risk:
- Direct RPC invocation can bypass the UI's open-shift and break checks.
- An offline outbox must not become a second route around cashier/shift rules.

Required before offline:
- Add server-side open-shift ownership validation to the authoritative POS checkout RPC.
- Define how a break affects checkout at the server boundary (if policy requires blocking sales during break, persist/check break state server-side).
- Keep the check tenant-scoped and bound to `auth.uid()`.
- Add tests for no shift, another employee's shift, wrong tenant, closed shift, and break state.

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


## Offline storage and sync foundation added (source-only)

- src/lib/offlineDatabase.js adds a versioned IndexedDB database with store/user-partitioned store snapshots, a durable transaction outbox, metadata storage, immutable transaction payloads, and explicit pending/syncing/accepted/rejected/needs_review states.
- Offline enqueue is cash-only and persists the client request ID plus product identifiers, quantities, estimated unit prices, estimated total, cashier identity, and queue policy before any later sync can occur.
- src/lib/offlineSync.js replays outbox records through complete_sale_idempotent, preserves records after acknowledgement, retries transport failures, flags database/business rejections for review, and flags server/local total mismatches.
- Static contract tests were added for the shift guard, IndexedDB contract, and sync contract under tests/.

**Important:** these modules are not wired into the checkout UI yet. No transaction can currently be completed offline through the application. The outbox has not been exercised in a browser or tested against a disposable database. Do not enable offline checkout until signed entitlement, store snapshot lifecycle, session/shift continuity, UI pending states, reconciliation UX, and real IndexedDB tests are complete.
