import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const headers = await readFile(new URL('public/_headers', root), 'utf8')
const activation = await readFile(new URL('netlify/functions/activate-invitation.mjs', root), 'utf8')
const createPlatformStaff = await readFile(new URL('netlify/functions/create-platform-staff.mjs', root), 'utf8')
const app = await readFile(new URL('src/App.jsx', root), 'utf8')
const appStyles = await readFile(new URL('src/styles.css', root), 'utf8')
const queueMigration = await readFile(new URL('supabase/migrations/20261029140000_enforce_store_queue_enabled.sql', root), 'utf8')
const writeHardeningMigration = await readFile(new URL('supabase/migrations/20261029150000_tighten_mutable_column_grants_and_queue_policy.sql', root), 'utf8')
const queueCompatibilityMigration = await readFile(new URL('supabase/migrations/20261029151000_queue_update_compatibility_guard.sql', root), 'utf8')
const privilegedRlsMigration = await readFile(new URL('supabase/migrations/20261029152000_require_pin_for_privileged_rls.sql', root), 'utf8')
const queueTimestampGuardMigration = await readFile(new URL('supabase/migrations/20261029153000_refine_queue_timestamp_guard.sql', root), 'utf8')
const foreignKeyIndexesMigration = await readFile(new URL('supabase/migrations/20261029160000_add_missing_foreign_key_indexes.sql', root), 'utf8')
const cashierAlertRlsMigration = await readFile(new URL('supabase/migrations/20261029161000_optimize_cashier_alert_rls.sql', root), 'utf8')
const platformAdminParityMigration = await readFile(new URL('supabase/migrations/20261029163000_platform_admin_super_admin_parity.sql', root), 'utf8')
const removeCustomerServiceRoleMigration = await readFile(new URL('supabase/migrations/20261029174500_remove_customer_service_platform_role.sql', root), 'utf8')
const platformStaffEndpoint = await readFile(new URL('netlify/functions/platform-staff-workspace.mjs', root), 'utf8')
const platformStaffManagerUi = await readFile(new URL('src/PlatformStaffManager.jsx', root), 'utf8')
const promotionManagerUi = await readFile(new URL('src/PromotionManager.jsx', root), 'utf8')
const subscriptionPlanManagerUi = await readFile(new URL('src/SubscriptionPlanManager.jsx', root), 'utf8')

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
  assert.match(app, /m\.email&&<>.*member-email-visible.*\{m\.email\}/s)
  assert.match(app, /<small className="member-email-visible">\{i\.email\}<\/small>/)
  assert.match(appStyles, /\.member-email-visible\{[^}]*overflow-wrap:anywhere/)
})

test('invitation activation rejects unsupported methods and malformed credentials', () => {
  assert.match(activation, /request\.method !== 'POST'/)
  assert.match(activation, /password\.length < 6/)
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


test('internal platform Admin uses the Super Admin workspace and server-side PIN-gated privileges', () => {
  assert.match(app, /const isPlatformAdmin=!staffResult\\.error&&staffData\\?\\.role==='admin'/)
  assert.match(app, /setIsSuperAdmin\\(Boolean\\(adminResult\\.data\\)\\|\\|isPlatformAdmin\\)/)
  assert.match(app, /setIsPlatformAdmin\\(isPlatformAdmin\\)/)
  assert.match(app, /platformAdmin=\\{isPlatformAdmin\\}/)
  assert.match(app, /platformAdmin \\? 'Admin NEXAPOS' : 'Super Admin'/)
  assert.match(app, /platformAdmin \\? 'ADMIN NEXAPOS' : 'SUPER ADMIN'/)
  assert.match(platformStaffManagerUi, /<div id="platform-staff-role" className="text-input" aria-readonly="true">Admin NEXAPOS — FULL AKSES<\\/div>/)
  assert.doesNotMatch(platformStaffManagerUi, /Customer Service|customer_service/)
  assert.match(platformAdminParityMigration, /private\\.is_pin_verified\\(\\)/)
  assert.match(platformAdminParityMigration, /platform_staff_roles/)
  assert.match(platformAdminParityMigration, /role = 'admin'/)
  assert.match(platformAdminParityMigration, /is_active = true/)
})


test('platform Admin can create staff only with active role and verified PIN', () => {
  assert.match(createPlatformStaff, /authClient\.rpc\('get_my_pin_status'\)/)
  assert.match(createPlatformStaff, /pinStatus\?\.is_verified !== true/)
  assert.match(createPlatformStaff, /staffRole\?\.role === 'admin'/)
  assert.match(createPlatformStaff, /staffRole\?\.is_active === true/)
  assert.match(createPlatformStaff, /if \(!authorized\) return json/)
})


test('platform staff endpoints and creation only accept the Admin role', () => {
  assert.match(platformStaffEndpoint, /assignment\\.role !== 'admin' && assignment\\.permissions\\?\\./)
  assert.match(platformStaffEndpoint, /assignment\\.permissions\\?\\.\\[requiredPermission\\] !== true/)
  assert.match(platformStaffEndpoint, /if \\(!assignment \\|\\| !assignment\\.is_active\\)/)
  assert.match(createPlatformStaff, /if \\(role !== 'admin'\\) return json/)
  assert.doesNotMatch(createPlatformStaff, /customer_service|CS_KEYS/)
})


test('workspace data loaders surface query failures instead of presenting failed queries as empty data', () => {
  assert.match(app, /error: storeLoadError/)
  assert.match(app, /if \(storeLoadError \|\| !storeData\)/)
  assert.match(app, /error: productLoadError/)
  assert.match(app, /error: orderLoadError/)
  assert.match(app, /error: queueLoadError/)
  assert.match(app, /Sebagian data gagal dimuat/)
  assert.match(app, /error:itemError/)
  assert.match(platformStaffEndpoint, /failedSources/)
  assert.match(platformStaffEndpoint, /Laporan tidak dapat dimuat lengkap/)
  assert.match(platformStaffEndpoint, /store_count_limited/)
  assert.match(platformStaffEndpoint, /order_count_limited/)
})


test('admin managers clear stale data on load failures and prevent editing fallback plan data', () => {
  assert.match(platformStaffManagerUi, /if \(error\) \{\s*setStaff\(\[\]\)/)
  assert.match(platformStaffManagerUi, /catch \(error\) \{\s*setStaff\(\[\]\)/)
  assert.match(platformStaffManagerUi, /Status akses staf belum berhasil diubah/)
  assert.match(platformStaffManagerUi, /Penugasan role belum berhasil dihapus/)
  assert.match(promotionManagerUi, /if \(queryError\) \{\s*setPromos\(\[\]\)/)
  assert.match(subscriptionPlanManagerUi, /if \(queryError\) \{\s*setPlans\(\[\]\)/)
  assert.match(subscriptionPlanManagerUi, /setPlansReady\(missingKeys\.length === 0\)/)
  assert.match(subscriptionPlanManagerUi, /disabled=\{!plansReady \|\| savingKey===plan\.plan_key\}/)
  assert.match(subscriptionPlanManagerUi, /Data paket belum tersedia/)
})


test('Customer Service role and workspace are fully retired', () => {
  assert.doesNotMatch(app, /PlatformStaffWorkspace|platformStaffRole/)
  assert.doesNotMatch(platformStaffManagerUi, /Customer Service|customer_service/)
  assert.match(removeCustomerServiceRoleMigration, /DELETE FROM public\\.platform_staff_roles/)
  assert.match(removeCustomerServiceRoleMigration, /role = 'customer_service'/)
  assert.match(removeCustomerServiceRoleMigration, /CHECK \\(role = 'admin'\\)/)
})


test('active Admin NexaPos is routed into the exact Super Admin workspace', () => {
  assert.match(app, /staffData\\?\\.role==='admin';setIsPlatformAdmin\\(isPlatformAdmin\\);setIsSuperAdmin\\(Boolean\\(adminResult\\.data\\)\\|\\|isPlatformAdmin\\)/)
  assert.match(app, /if\\(isSuperAdmin\\)return <SuperAdminScreen session=\\{session\\} syncStatus=\\{syncStatus\\} setSyncStatus=\\{setSyncStatus\\} onSignOut=\\{\\(\\)=>supabase\\.auth\\.signOut\\(\\)\\} platformAdmin=\\{isPlatformAdmin\\} \\/>/)
  assert.doesNotMatch(app, /PlatformStaffWorkspace|platformStaffRole/)
})


test('Tim & Hak Akses offers only full-access Admin NexaPos role', () => {
  assert.match(platformStaffManagerUi, /Hanya ada satu role staf platform: Admin NEXAPOS/)
  assert.match(platformStaffManagerUi, /FULL AKSES — setara Super Admin/)
  assert.match(platformStaffManagerUi, /member\\.role === 'admin' \\? 'FULL AKSES · Setara Super Admin'/)
  assert.doesNotMatch(platformStaffManagerUi, /Customer Service|customer_service|CS_PERMISSIONS/)
  assert.doesNotMatch(createPlatformStaff, /customer_service|CS_KEYS/)
  assert.match(removeCustomerServiceRoleMigration, /platform_staff_roles_admin_only_check/)
  assert.match(platformStaffEndpoint, /users: 'users', users_toggle_login: 'users'/)
  assert.match(platformStaffEndpoint, /support_inbox: 'support', support_reply: 'support'/)
})
