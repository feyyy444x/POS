# NexaPos — Master Specification Acceptance Matrix

This matrix is the release checklist for the 16-point NexaPos master specification. A code change or passing static test is not the same as passing authenticated end-to-end verification.

## Status key
- **Implemented in branch** — code/migration/UI exists in PR #20; still subject to database migration and integration verification.
- **Existing / verify** — functionality exists in the repository but requires regression and authenticated end-to-end testing.
- **Blocked for release** — requires a safe database migration run, authorized test tenant/account, or direct production-safe verification.

## 1. Existing repository, no regressions, honest status
**Status: Existing / verify.** Continue in the existing repository and PR #20. Keep changes scoped, retain working flows, and do not claim a feature is live solely because code exists. Production has not been merged or deployed from this PR.

## 2. Public site, Super Admin, Owner organization, tenant POS
**Status: Implemented in branch; integration pending.** Added an Owner organization model and organization_id linkage for stores. Owner organization entitlements now define package, quota, and expiry. No branch-management feature is introduced. Existing Super Admin registration and invitation flows still require migration and E2E validation against existing records.

## 3. Homepage visual preservation
**Status: Implemented in branch.** The homepage visual composition is retained. Changes are limited to pricing/features/promotion data behavior and the undefined upcomingPromo render crash. Confirm desktop/mobile visual regression in the current preview.

## 4. Super Admin CRUD and audit trail
**Status: Partial / verify.** Existing package, duration, promotion, tenant, user, and platform-staff managers remain. Package features are persisted per package. Added scoped platform/Owner audit log schema, redaction, RLS, realtime publication, and viewer UI. Verify every CRUD action persists and audit records are correctly scoped after migrations.

## 5. Package tenant quotas
**Status: Implemented in branch; migration pending.** Defaults are Starter 3, Growth 5, Business 10, Enterprise 15. The new owner_create_store_tenant RPC checks quota server-side while locking the organization row. Verify concurrent create requests cannot exceed the quota and that Super Admin package changes are applied correctly.

## 6. Activation duration, custom days, expiry
**Status: Existing / verify.** Defaults are daily 3 days, weekly 7, monthly 30, yearly 365; custom days remain admin-configurable. Activation is validated server-side and organization activation synchronizes package/quota/expiry across its tenants. Verify exact expiry boundaries and that expired access never deletes operational data.

## 7. Promotions and vouchers
**Status: Implemented in branch; migration pending.** Added get_activation_quote, a read-only SECURITY INVOKER RPC that validates active package/duration, promotion schedule, voucher code, eligible period, and discount calculation. Homepage pricing discounts use server quotes. There is no online payment checkout in this flow; activation remains a Super Admin process and the public CTA requests information through Telegram. Verify voucher behavior and displayed quotes after migration.

## 8. Owner workspace
**Status: Partial / verify.** Added tenant listing/switching, server-enforced tenant creation, organization package/quota/expiry summary, consolidated organization reports, and organization audit view. Existing employee, monitoring, and settings pages remain. Verify Owner access is restricted to its organization and reports aggregate only its tenants.

## 9. Employees, permissions, multi-tenant assignment, password/PIN, and safe account deletion
**Status: Existing / verify; deletion fix added to branch.** Existing invitation flow attaches the same authenticated account to each valid tenant invitation; reset flows remain. Admin password reset minimum is aligned to six characters. Permanent account deletion now uses a confirmation card with copyable `HAPUS` and typed confirmation. The deletion failure was traced to historical cashier foreign keys that used RESTRICT/CASCADE; a new migration snapshots cashier identity in shifts, break history, and manual alerts, then changes the auth references to nullable `ON DELETE SET NULL` so historical attribution is retained. Verify all roles, cross-tenant employee assignment, PIN/password reset, and account deletion using an authorized test user after the migration is tested/applied.

## 10. Tenant data isolation
**Status: Existing + new RLS; direct API tests pending.** Existing tenant-scoped policies remain; the new organization/audit tables have explicit RLS. Run direct API/RLS tests for products, prices, stock, orders, payments, cashier attribution, queue, reports, audit, search/export, and realtime across two unrelated organizations.

## 11. Concurrent cashiers, transactions, stock, receipts
**Status: Existing / verify.** Multi-cashier operation and cashier attribution remain in the existing implementation. Run two or more authenticated cashiers concurrently and verify stock consistency, transaction identity, receipt correctness, and report attribution.

## 12. Operational-only queue
**Status: Implemented in branch; integration pending.** Queue enable/disable is retained; checkout passes the queue-enabled state to the backend and receipts only render a queue number when a ticket exists. Public queue RPC no longer exposes media/template/player data. Media tables are intentionally not dropped until their dependencies/data impact are reviewed.

## 13. Back navigation
**Status: Implemented in branch; mobile verification pending.** Browser Back/Forward follows Owner workspace pages and Super Admin sections, including the selected tenant control center. Unsaved forms warn before selected navigation actions; non-sensitive form drafts are stored locally. Verify direct URLs, browser Back, mobile navigation, and completed transaction safety.

## 14. Realtime and app-switch state
**Status: Partial / verify.** Existing realtime subscriptions remain. Selected tenant, active page, scroll position, and non-sensitive form drafts are persisted locally; realtime audit log updates are enabled. Verify reconnect/reload behavior, stale update protection, duplicate-submit/idempotency, cart isolation across tenant switches, and search/filter/pagination state.

## 15. Required tests and release gates
**Status: Blocked for release.** GitHub CI and static security smoke checks must pass on the latest PR head. Authenticated E2E remains required for login/roles, direct API/RLS, tenant quota, activation/expiry, vouchers, password/PIN, multi-cashier, stock/receipt, queue on/off, back navigation, realtime/reconnect/idempotency, and public/mobile regression. Do not merge or deploy until these tests pass.

## 16. Current repository and deployment state
**Status: Recorded; re-verify before release.**
- Repository: feyyy444x/POS
- Active PR: #20, branch feature/queue-simplification-final
- Superseded PR: #19 (closed)
- Netlify site: posfeyyy
- Public domain: https://nexaposdigital.my.id
- Supabase project: zoplanjzcizvjhorsldm
- New migrations in this PR are not applied to production.
- Production deployment has not been performed by this work.
- The current Deploy Preview must be confirmed to match the latest PR head before testing.

## Release decision
**Not release-ready yet.** The implementation work in PR #20 is ongoing; migration compatibility, latest-preview verification, and authenticated E2E gates remain. Do not infer completion from this matrix alone.
