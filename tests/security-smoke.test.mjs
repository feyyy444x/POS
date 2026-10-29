import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const headers = await readFile(new URL('public/_headers', root), 'utf8')
const activation = await readFile(new URL('netlify/functions/activate-invitation.mjs', root), 'utf8')
const app = await readFile(new URL('src/App.jsx', root), 'utf8')
const queueMigration = await readFile(new URL('supabase/migrations/20261029140000_enforce_store_queue_enabled.sql', root), 'utf8')
const writeHardeningMigration = await readFile(new URL('supabase/migrations/20261029150000_tighten_mutable_column_grants_and_queue_policy.sql', root), 'utf8')
const queueCompatibilityMigration = await readFile(new URL('supabase/migrations/20261029151000_queue_update_compatibility_guard.sql', root), 'utf8')
const privilegedRlsMigration = await readFile(new URL('supabase/migrations/20261029152000_require_pin_for_privileged_rls.sql', root), 'utf8')
const queueTimestampGuardMigration = await readFile(new URL('supabase/migrations/20261029153000_refine_queue_timestamp_guard.sql', root), 'utf8')
const foreignKeyIndexesMigration = await readFile(new URL('supabase/migrations/20261029160000_add_missing_foreign_key_indexes.sql', root), 'utf8')
const cashierAlertRlsMigration = await readFile(new URL('supabase/migrations/20261029161000_optimize_cashier_alert_rls.sql', root), 'utf8')

test('Netlify headers include baseline browser security protections', () => {
  for (const directive of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'X-Frame-Options: DENY',
    'Permissions-Policy:',
    'Cross-Origin-Opener-Policy: same-origin',
    'Strict-Transport-Security:',
  ]) {
    assert.ok(headers.includes(directive), `Missing security header: ${directive}`)
  }
})

test('tenant member list and invitation history render email addresses', () => {
  assert.match(app, /m\.email&&\{<>\s*<br\/>\s*<small className="member-email-visible">\{m\.email\}<\/small>\s*<\/>\}/)
  assert.match(app, /<small className="member-email-visible">\{i\.email\}<\/small>/)
})

test('invitation activation rejects unsupported methods and malformed credentials', () => {
  assert.match(activation, /request\.method !== 'POST'/)
  assert.match(activation, /password\.length < 8/)
  assert.match(activation, /password\.length > 128/)
  assert.match(activation, /\[a-f0-9\]\{32\}/)
})

test('invitation activation compares hashed codes in constant time and disables response caching', () => {
  assert.match(activation, /timingSafeEqual/)
  assert.match(activation, /createHash\('sha256'\)/)
  assert.match(activation, /Cache-Control': 'no-store'/)
})

test('service-role credential is read only by the server-side Netlify function', () => {
  assert.match(activation, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(activation, /VITE_SUPABASE_SERVICE_ROLE_KEY/)
})


test('invitation activation never resets an existing account password', () => {
  assert.match(activation, /const existingAccount = Boolean\(user\)/)
  assert.match(activation, /existing credentials/)
  assert.doesNotMatch(activation, /auth\.admin\.updateUserById/)
  assert.match(activation, /Use password|Gunakan password akun yang sudah ada/)
})

test('queue-off setting is authoritative in the database checkout and ticket RPCs', () => {
  assert.match(queueMigration, /ADD COLUMN IF NOT EXISTS queue_enabled boolean NOT NULL DEFAULT true/)
  assert.match(queueMigration, /SELECT coalesce\(ss\.queue_enabled, true\)/)
  assert.match(queueMigration, /IF v_queue_enabled AND coalesce\(p_create_queue,true\) THEN/)
  assert.match(queueMigration, /ss\.queue_enabled IS FALSE/)
  assert.match(queueMigration, /IF NOT private\.is_store_member\(p_store_id\) THEN/)
})

test('checkout aggregates repeated product IDs and locks tenant-scoped stock rows', () => {
  assert.match(queueMigration, /sum\(\(e\.value->>'quantity'\)::integer\)::integer AS qty/)
  assert.match(queueMigration, /GROUP BY \(e\.value->>'product_id'\)::uuid/)
  assert.match(queueMigration, /AND store_id=p_store_id AND is_active=true\s+FOR UPDATE/)
  assert.match(queueMigration, /UPDATE public\.products\s+SET stock=stock-v_qty/)
})

test('cashier passes the queue switch to checkout and receipt only prints a returned ticket', () => {
  assert.match(app, /p_create_queue:settings\?\.queue_enabled!==false/)
  assert.match(app, /\{ticket&&<div className="receipt-queue"/)
  assert.match(app, /settings\?\.queue_enabled===false\?null:/)
})


test('queue status updates use a guarded RPC instead of unrestricted table updates', () => {
  assert.match(app, /supabase\.rpc\('update_queue_ticket_status'/)
  assert.doesNotMatch(app, /from\('queue_tickets'\)\.update\(update\)/)
  assert.match(writeHardeningMigration, /REVOKE ALL ON TABLE public\.queue_tickets FROM PUBLIC, anon, authenticated/)
  assert.match(writeHardeningMigration, /private\.is_store_operational\(v_ticket\.store_id\)/)
  assert.match(writeHardeningMigration, /IF NOT v_queue_enabled THEN/)
  assert.match(writeHardeningMigration, /p_status = 'serving' AND v_ticket\.status <> 'called'/)
  assert.match(writeHardeningMigration, /p_status = 'done' AND v_ticket\.status NOT IN \('called', 'serving'\)/)
})

test('cashier alert and break writes are limited to intended columns', () => {
  assert.match(writeHardeningMigration, /GRANT UPDATE \(read_at\) ON TABLE public\.cashier_manual_alerts TO authenticated/)
  assert.match(writeHardeningMigration, /GRANT INSERT \(store_id, cashier_id, sent_by, title, message\)/)
  assert.match(writeHardeningMigration, /GRANT UPDATE \(ended_at\) ON TABLE public\.cashier_shift_breaks TO authenticated/)
  assert.match(writeHardeningMigration, /GRANT INSERT \(store_id, shift_id, cashier_id\)/)
  assert.match(writeHardeningMigration, /private\.is_store_member\(store_id\)/)
})


test('queue database guard preserves only valid status transitions and honors the queue switch', () => {
  assert.match(queueCompatibilityMigration, /GRANT UPDATE \(status, called_at, completed_at\)/)
  assert.match(queueCompatibilityMigration, /CREATE TRIGGER guard_queue_ticket_update/)
  assert.match(queueCompatibilityMigration, /NEW\.store_id IS DISTINCT FROM OLD\.store_id/)
  assert.match(queueCompatibilityMigration, /Perubahan status antrean tidak valid/)
  assert.match(queueCompatibilityMigration, /IF NOT v_queue_enabled THEN/)
  assert.match(queueCompatibilityMigration, /members update operational queue while enabled/)
})


test('privileged RLS mutations require PIN verification', () => {
  assert.match(privilegedRlsMigration, /USING \(private\.is_super_admin\(\)\)/)
  assert.match(privilegedRlsMigration, /WITH CHECK \(private\.is_super_admin\(\)\)/)
  assert.match(privilegedRlsMigration, /private\.is_store_operational\(store_id\)/)
  assert.match(privilegedRlsMigration, /support_messages_read_pin_verified/)
  assert.match(privilegedRlsMigration, /support_messages_insert_pin_verified/)
  assert.match(privilegedRlsMigration, /private\.is_pin_verified\(\)/)
  assert.match(privilegedRlsMigration, /Anyone can view active site promotions/)
})


test('performance migrations cover flagged foreign keys and cache auth identity in alert policies', () => {
  for (const indexName of [
    'cashier_manual_alerts_cashier_id_idx',
    'cashier_manual_alerts_sent_by_idx',
    'site_promotions_created_by_idx',
    'site_subscription_plans_updated_by_idx',
    'store_invites_invited_by_idx',
    'store_invites_store_id_idx',
    'store_members_disabled_by_idx',
    'support_messages_sender_id_idx',
  ]) assert.match(foreignKeyIndexesMigration, new RegExp(indexName))
  assert.match(cashierAlertRlsMigration, /cashier_id = \(select auth\.uid\(\)\)/)
  assert.match(cashierAlertRlsMigration, /sent_by = \(select auth\.uid\(\)\)/)
})

test('queue timestamps cannot be edited after the corresponding status transition', () => {
  assert.match(queueTimestampGuardMigration, /NEW\.status IS DISTINCT FROM OLD\.status/)
  assert.match(queueTimestampGuardMigration, /Waktu pemanggilan hanya dapat berubah saat status antrean berubah/)
  assert.match(queueTimestampGuardMigration, /Waktu penyelesaian hanya dapat berubah saat antrean selesai atau dilewati/)
})
