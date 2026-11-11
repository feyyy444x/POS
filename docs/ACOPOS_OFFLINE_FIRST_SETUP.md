# acoPos Offline License Setup (PR #27)

This setup is intentionally not applied to the production Netlify environment by this PR.

## Required secrets and public configuration

The license issuer is a Netlify Function and requires:
- `SUPABASE_URL` (or the existing `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose it to Vite/client code)
- `ACOPOS_LICENSE_PRIVATE_KEY` (Ed25519 PEM private key; server-only)

The browser verifier requires:
- `VITE_ACOPOS_LICENSE_PUBLIC_KEY` (base64-encoded DER SubjectPublicKeyInfo public key)

For this isolated PR, configure both values in Netlify **Deploy Preview context only** until the implementation is approved:
- `ACOPOS_LICENSE_PRIVATE_KEY`: Secret = true; scope = Functions/Runtime; context = Deploy Preview.
- `VITE_ACOPOS_LICENSE_PUBLIC_KEY`: Secret = false; scope = Builds; context = Deploy Preview.

Do not use the `all` or `production` context for this PR. Existing production runtime configuration must remain untouched. The Supabase URL and server service-role key are already configured for the deploy-preview environment.

The private and public keys must be a matched Ed25519 pair. Do not commit either private key or put it in any `VITE_*` variable.

## Generate a key pair

Run this locally on a trusted machine:
```sh
openssl genpkey -algorithm Ed25519 -out acopos-license-private.pem
openssl pkey -in acopos-license-private.pem -pubout -outform DER | base64 -w0
```

Copy the base64 output into `VITE_ACOPOS_LICENSE_PUBLIC_KEY`. Store the contents of `acopos-license-private.pem` only in Netlify environment variable `ACOPOS_LICENSE_PRIVATE_KEY`. If entering a multiline PEM in the Netlify UI, preserve newlines; the function also accepts escaped `\\n`.

Use the same matched pair for the deployed site and its trusted preview context. Never use a public key from a response as a trust anchor; the browser pins the build-time public key.

## Database

Apply migrations to a disposable Supabase project first, in timestamp order, including:
- `20261111130000_enforce_cashier_shift_on_checkout.sql`
- `20261111150000_offline_license_grace_period.sql`

Then verify the package table has `offline_grace_hours` and the checkout RPC privilege/shift tests pass. Do not run these migrations against production as part of this PR.

## Offline behavior and limitations

- A signed license is issued only after the server verifies the user's active store membership, store status, organization status (when present), subscription expiry, and package grace setting.
- The default grace period is 72 hours; Super Admin can set 0–168 hours per package.
- The browser checks Ed25519 signature, user/store binding, subscription expiry, grace expiry, and clock rollback against the last observed local timestamp.
- This browser clock check is best-effort. A user with full control of the device/browser profile can clear or alter local storage; a browser-only PWA cannot provide hardware-backed anti-tamper guarantees.
- A disconnected device cannot receive a remote suspension until it reconnects. Server-side checks reject queued transactions when the device reconnects if the tenant, membership, shift, products, or stock are no longer valid.
- Only cash sales can enter the offline outbox. QRIS, transfers, Self Order, product edits, stock edits, staff changes, and other operational writes remain online-only.
- An offline receipt is explicitly marked pending and is not a server-confirmed receipt. Pending records remain stored after sync and require review if the server total or state conflicts.

## Automated database regression coverage

The PR's GitHub Actions workflow runs `supabase/tests/offline_shift_checkout_runtime.sql` against a fresh ephemeral PostgreSQL 16 service. The fixture applies the isolated checkout migration and exercises:
- no open shift,
- another employee's shift,
- a shift belonging to another tenant,
- a closed shift,
- an active break,
- a valid open shift, including exact stock decrement,
- direct legacy RPC privilege denial and idempotent RPC privilege availability.

This is a disposable schema fixture for the migration's checkout boundary. It is not a full clone of the production Supabase project; production schema/migration-ledger verification remains a separate release gate.

## Manual QA checklist after keys and disposable migrations are ready

1. Sign in to a tenant that has an active membership and active subscription. Open a cashier shift and wait for the license validation and workspace snapshot to finish.
2. In browser developer tools, switch the network profile to Offline. Confirm the POS shows **MODE OFFLINE** and that only local POS cart/catalog actions and cash checkout remain usable.
3. Create a cash sale. The printed/displayed receipt must say **BUKTI SEMENTARA · BELUM TERVERIFIKASI SERVER** and the outbox must show `pending_sync`.
4. Reload the page while still offline. Confirm the store, products, cached shift/break state, pending sale, and locally reserved stock are restored for the same user and store.
5. Try a QRIS/transfer sale, Self Order action, product edit, stock edit, staff action, and store settings save. These must remain blocked while offline.
6. Try to sell more than the cached stock. The atomic IndexedDB reservation must reject the second sale without losing the first outbox record.
7. Reconnect. Confirm pending records replay with the same request ID. Accepted records must show the server receipt number; changed totals, closed shifts, active breaks, and stock conflicts must become `needs_review`, not be silently retried.
8. For a record with a server order, compare the server receipt and payment evidence before typing `COCOK` to complete manual review. For a rejected record, mark it rejected without deleting the local payload.
9. Set a test package grace period to 0 hours in a disposable database and confirm the workspace becomes read-only. Test subscription expiry and a system-clock rollback greater than five minutes.
10. Print the provisional receipt to the actual thermal printer used at the counter. Verify 58/80 mm layout, paper cut behavior, and that the pending watermark remains visible. A browser build cannot certify physical printer compatibility without this device test.

## Trigger the disposable database test

Open GitHub Actions → **acoPos CI** → **Run workflow** on `feature/acopos-offline-first-isolated`. The `Offline checkout database runtime tests` job creates an ephemeral PostgreSQL 16 service, applies the two PR migrations to its fixture schema, and runs shift/grace constraints. It does not connect to Supabase or production.
