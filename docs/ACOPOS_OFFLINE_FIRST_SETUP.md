# acoPos Offline License Setup (PR #27)

This setup is intentionally not applied to the production Netlify environment by this PR.

## Required secrets and public configuration

The license issuer is a Netlify Function and requires:
- `SUPABASE_URL` (or the existing `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose it to Vite/client code)
- `ACOPOS_LICENSE_PRIVATE_KEY` (Ed25519 PEM private key; server-only)

The browser verifier requires:
- `VITE_ACOPOS_LICENSE_PUBLIC_KEY` (base64-encoded DER SubjectPublicKeyInfo public key)

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
