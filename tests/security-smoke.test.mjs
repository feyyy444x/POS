import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const headers = await readFile(new URL('public/_headers', root), 'utf8')
const activation = await readFile(new URL('netlify/functions/activate-invitation.mjs', root), 'utf8')
const createPlatformStaff = await readFile(new URL('netlify/functions/create-platform-staff.mjs', root), 'utf8')
const app = await readFile(new URL('src/App.jsx', root), 'utf8')
const homepageUi = await readFile(new URL('src/Homepage.jsx', root), 'utf8')
const appStyles = await readFile(new URL('src/styles.css', root), 'utf8')
const queueMigration = await readFile(new URL('supabase/migrations/20261029140000_enforce_store_queue_enabled.sql', root), 'utf8')
const writeHardeningMigration = await readFile(new URL('supabase/migrations/20261029150000_tighten_mutable_column_grants_and_queue_policy.sql', root), 'utf8')
const queueCompatibilityMigration = await readFile(new URL('supabase/migrations/20261029151000_queue_update_compatibility_guard.sql', root), 'utf8')
const privilegedRlsMigration = await readFile(new URL('supabase/migrations/20261029152000_require_pin_for_privileged_rls.sql', root), 'utf8')
const queueTimestampGuardMigration = await readFile(new URL('supabase/migrations/20261029153000_refine_queue_timestamp_guard.sql', root), 'utf8')
const foreignKeyIndexesMigration = await readFile(new URL('supabase/migrations/20261029160000_add_missing_foreign_key_indexes.sql', root), 'utf8')
const platformStaffIndexesMigration = await readFile(new URL('supabase/migrations/20261029190000_add_platform_staff_actor_indexes.sql', root), 'utf8')
const cashierAlertRlsMigration = await readFile(new URL('supabase/migrations/20261029161000_optimize_cashier_alert_rls.sql', root), 'utf8')
const platformAdminParityMigration = await readFile(new URL('supabase/migrations/20261029163000_platform_admin_super_admin_parity.sql', root), 'utf8')
const removeCustomerServiceRoleMigration = await readFile(new URL('supabase/migrations/20261029174500_remove_customer_service_platform_role.sql', root), 'utf8')
const platformStaffEndpoint = await readFile(new URL('netlify/functions/platform-staff-workspace.mjs', root), 'utf8')
const platformStaffManagerUi = await readFile(new URL('src/PlatformStaffManager.jsx', root), 'utf8')
const promotionManagerUi = await readFile(new URL('src/PromotionManager.jsx', root), 'utf8')
const subscriptionPlanManagerUi = await readFile(new URL('src/SubscriptionPlanManager.jsx', root), 'utf8')
const storeControlCenterUi = await readFile(new URL('src/StoreControlCenter.jsx', root), 'utf8')
const queueSettingsUi = await readFile(new URL('src/TvDisplaySettings.jsx', root), 'utf8')
const publicQueueMigration = await readFile(new URL('supabase/migrations/20261029200000_simplify_public_queue_rpc.sql', root), 'utf8')
const activationPackagesMigration = await readFile(new URL('supabase/migrations/20261029140200_activation_packages_pricing.sql', root), 'utf8')
const ownerOrganizationsMigration = await readFile(new URL('supabase/migrations/20261030200000_owner_organizations_and_tenant_quotas.sql', root), 'utf8')
const auditLogsMigration = await readFile(new URL('supabase/migrations/20261030210000_platform_audit_logs.sql', root), 'utf8')
const auditLogUi = await readFile(new URL('src/AuditLogPanel.jsx', root), 'utf8')
const serverPromoQuoteMigration = await readFile(new URL('supabase/migrations/20261030220000_server_validate_activation_promotions.sql', root), 'utf8')
const idempotentCheckoutMigration = await readFile(new URL('supabase/migrations/20261030230000_idempotent_checkout.sql', root), 'utf8')
const tenantRoleMigration = await readFile(new URL('supabase/migrations/20261030240000_standardize_tenant_roles.sql', root), 'utf8')
const organizationReportsUi = await readFile(new URL('src/OrganizationReports.jsx', root), 'utf8')
const accountDeletionMigration = await readFile(new URL('supabase/migrations/20261030250000_preserve_cashier_identity_on_user_delete.sql', root), 'utf8')

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
  assert.match(app, /const isPlatformAdmin=!staffResult\.error&&staffData\?\.role==='admin'/)
  assert.match(app, /setIsSuperAdmin\(Boolean\(adminResult\.data\)\|\|isPlatformAdmin\)/)
  assert.match(app, /setIsPlatformAdmin\(isPlatformAdmin\)/)
  assert.match(app, /platformAdmin=\{isPlatformAdmin\}/)
  assert.match(app, /platformAdmin \? 'Admin NEXAPOS' : 'Super Admin'/)
  assert.match(app, /platformAdmin \? 'ADMIN NEXAPOS' : 'SUPER ADMIN'/)
  assert.match(platformStaffManagerUi, /<div id="platform-staff-role" className="text-input" aria-readonly="true">Admin NEXAPOS — FULL AKSES<\/div>/)
  assert.doesNotMatch(platformStaffManagerUi, /Customer Service|customer_service/)
  assert.match(platformAdminParityMigration, /private\.is_pin_verified\(\)/)
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
  assert.match(platformStaffEndpoint, /assignment\.role !== 'admin' && assignment\.permissions\?\./)
  assert.match(platformStaffEndpoint, /assignment\.permissions\?\.\[requiredPermission\] !== true/)
  assert.match(platformStaffEndpoint, /if \(!assignment \|\| !assignment\.is_active\)/)
  assert.match(createPlatformStaff, /if \(role !== 'admin'\) return json/)
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
  assert.match(subscriptionPlanManagerUi, /disabled=\{!plansReady \|\| savingKey===plan\.package_key\}/)
  assert.match(subscriptionPlanManagerUi, /Data paket belum tersedia/)
})


test('Customer Service role and workspace are fully retired', () => {
  assert.doesNotMatch(app, /PlatformStaffWorkspace|platformStaffRole/)
  assert.doesNotMatch(platformStaffManagerUi, /Customer Service|customer_service/)
  assert.match(removeCustomerServiceRoleMigration, /DELETE FROM public\.platform_staff_roles/)
  assert.match(removeCustomerServiceRoleMigration, /role = 'customer_service'/)
  assert.match(removeCustomerServiceRoleMigration, /CHECK \(role = 'admin'\)/)
})


test('active Admin NexaPos is routed into the exact Super Admin workspace', () => {
  assert.match(app, /staffData\?\.role==='admin';setIsPlatformAdmin\(isPlatformAdmin\);setIsSuperAdmin\(Boolean\(adminResult\.data\)\|\|isPlatformAdmin\)/)
  assert.match(app, /if\(isSuperAdmin\)return <SuperAdminScreen session=\{session\} syncStatus=\{syncStatus\} setSyncStatus=\{setSyncStatus\} onSignOut=\{\(\)=>supabase\.auth\.signOut\(\)\} platformAdmin=\{isPlatformAdmin\} ?\/>/)
  assert.doesNotMatch(app, /PlatformStaffWorkspace|platformStaffRole/)
})


test('Tim & Hak Akses offers only full-access Admin NexaPos role', () => {
  assert.match(platformStaffManagerUi, /Hanya ada satu role staf platform: Admin NEXAPOS/)
  assert.match(platformStaffManagerUi, /FULL AKSES — setara Super Admin/)
  assert.match(platformStaffManagerUi, /FULL AKSES · Setara Super Admin/)
  assert.doesNotMatch(platformStaffManagerUi, /Customer Service|customer_service|CS_PERMISSIONS/)
  assert.doesNotMatch(createPlatformStaff, /customer_service|CS_KEYS/)
  assert.match(removeCustomerServiceRoleMigration, /platform_staff_roles_admin_only_check/)
  assert.match(platformStaffEndpoint, /users: 'users', users_toggle_login: 'users'/)
  assert.match(platformStaffEndpoint, /support_inbox: 'support', support_reply: 'support'/)
})


const supportMigration = await readFile(new URL('supabase/migrations/20261029183000_nexapos_free_ai_support.sql', root), 'utf8')
const supportLockdownMigration = await readFile(new URL('supabase/migrations/20261029183500_lock_down_support_rpc.sql', root), 'utf8')
const supportHandoffMigration = await readFile(new URL('supabase/migrations/20261029184000_refine_support_bot_handoff.sql', root), 'utf8')
const supportHardenMigration = await readFile(new URL('supabase/migrations/20261029185000_harden_support_handoff_and_admin_reply.sql', root), 'utf8')
const supportWritesMigration = await readFile(new URL('supabase/migrations/20261029185500_route_support_writes_through_rpc.sql', root), 'utf8')
const supportCenter = await readFile(new URL('src/SupportCenter.jsx', root), 'utf8')

test('free NexaPos support bot is FAQ-only and never calls a paid external AI provider', () => {
  assert.match(supportMigration, /CREATE TABLE IF NOT EXISTS public\.support_knowledge_base/)
  assert.match(supportMigration, /INSERT INTO public\.support_knowledge_base/)
  assert.match(supportHandoffMigration, /v_answer := 'Maaf, saya belum memiliki jawaban terverifikasi/)
  assert.doesNotMatch(supportMigration + supportHandoffMigration, /fetch\s*\(|https:\/\/api\.|OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY/i)
  assert.match(supportCenter, /submit_support_message/)
  assert.match(supportCenter, /Joeclyn/)
})

test('support RPCs validate customer input, require authenticated sessions, and rate-limit messages', () => {
  assert.match(supportMigration, /char_length\(v_message\) < 1 OR char_length\(v_message\) > 3000/)
  assert.match(supportMigration, /v_is_anonymous boolean/)
  assert.match(supportMigration, /NOT v_is_anonymous AND NOT private\.is_pin_verified\(\)/)
  assert.match(supportMigration, /created_at > now\(\) - interval '1 hour'\) >= 40/)
  assert.match(supportMigration, /CREATE OR REPLACE FUNCTION public\.submit_support_message/)
  assert.match(supportLockdownMigration, /REVOKE ALL ON FUNCTION public\.submit_support_message\(text, text\) FROM PUBLIC, anon/)
  assert.match(supportLockdownMigration, /GRANT EXECUTE ON FUNCTION public\.submit_support_message\(text, text\) TO authenticated/)
})

test('customer RLS isolates support messages and conversations while Admin NexaPos is PIN-gated', () => {
  assert.match(supportMigration, /ALTER TABLE public\.support_conversations ENABLE ROW LEVEL SECURITY/)
  assert.match(supportMigration, /ALTER TABLE public\.support_knowledge_base ENABLE ROW LEVEL SECURITY/)
  assert.match(supportMigration, /user_id = \(SELECT auth\.uid\(\)\)/)
  assert.match(supportMigration, /private\.is_super_admin\(\)/)
  assert.match(supportMigration, /private\.is_pin_verified\(\)/)
  assert.match(supportMigration, /USING \(private\.is_super_admin\(\)\)/)
  assert.match(supportMigration, /WITH CHECK \(private\.is_super_admin\(\)\)/)
  assert.match(supportMigration, /CREATE OR REPLACE FUNCTION public\.admin_reply_support_message/)
  assert.match(supportMigration, /IF NOT private\.is_super_admin\(\) THEN RAISE EXCEPTION 'Admin NexaPos access required'/)
})

test('human handoff stops bot replies until Admin takes over or reactivates bot', () => {
  assert.match(supportHandoffMigration, /komplain|keluhan|hubungi admin/)
  assert.match(supportHandoffMigration, /'waiting_admin'/)
  assert.match(supportMigration, /IF v_status IN \('waiting_admin', 'admin_active'\) THEN/)
  assert.match(supportMigration, /CREATE OR REPLACE FUNCTION public\.request_support_handoff/)
  assert.match(supportMigration, /CREATE OR REPLACE FUNCTION public\.set_support_conversation_status/)
  assert.match(supportMigration, /p_status NOT IN \('ai_active', 'admin_active', 'resolved'\)/)
  assert.match(supportCenter, /request_support_handoff/)
  assert.match(supportCenter, /admin_reply_support_message/)
  assert.match(supportCenter, /set_support_conversation_status/)
  assert.match(supportCenter, /Hubungi Admin NexaPos/)
  assert.match(supportCenter, /Menunggu admin/)
  assert.match(supportCenter, /table: 'support_conversations'/)
})


test('handoff recognizes natural requests to speak with a human and validates admin targets', () => {
  assert.match(supportHardenMigration, /bicara \(dengan\|sama\) \(admin\|manusia\|petugas\)/)
  assert.match(supportHardenMigration, /IF NOT FOUND THEN RAISE EXCEPTION 'Percakapan tidak ditemukan'/)
  assert.match(supportHardenMigration, /IF NOT private\.is_super_admin\(\) THEN RAISE EXCEPTION 'Admin NexaPos access required'/)
})


test('direct table inserts cannot bypass the support RPC validation and rate limit', () => {
  assert.match(supportWritesMigration, /REVOKE INSERT ON TABLE public\.support_messages FROM PUBLIC, anon, authenticated/)
  assert.match(supportWritesMigration, /GRANT SELECT ON TABLE public\.support_messages TO authenticated/)
  assert.match(supportCenter, /supabase\.rpc\('submit_support_message'/)
  assert.doesNotMatch(supportCenter, /from\('support_messages'\)\.insert\(/)
})


test('promotion editor preserves local wall-clock time when editing UTC timestamps', () => {
  assert.match(promotionManagerUi, /const toLocalInput = \(value\) => \{/)
  assert.match(promotionManagerUi, /date\.getFullYear\(\).*date\.getMonth\(\).*date\.getDate\(\).*date\.getHours\(\).*date\.getMinutes\(\)/s)
  assert.match(promotionManagerUi, /const dateValue = \(value\) => value \? new Date\(value\)\.toISOString\(\) : null/)
  assert.doesNotMatch(promotionManagerUi, /const toLocalInput = \(value\) => value \? new Date\(value\)\.toISOString\(\)\.slice\(0, 16\)/)
})

test('foreign-key index migration covers all staff and platform actor references flagged by the database advisor', () => {
  assert.ok(platformStaffIndexesMigration.includes('create index if not exists platform_staff_roles_created_by_idx'))
  assert.ok(platformStaffIndexesMigration.includes('on public.platform_staff_roles (created_by)'))
  assert.ok(platformStaffIndexesMigration.includes('create index if not exists platform_staff_roles_updated_by_idx'))
  assert.ok(platformStaffIndexesMigration.includes('on public.platform_staff_roles (updated_by)'))
  assert.match(platformStaffIndexesMigration, /if not exists/i)
})

test('Pusat Kendali Toko scopes operational reads to the selected store and labels timeline limitations honestly', () => {
  assert.match(app, /import StoreControlCenter from '\.\/StoreControlCenter\.jsx'/)
  assert.match(app, /setSelectedTenant\(t\);setSection\('store-control'\)/)
  assert.match(app, /section==='store-control'&&<StoreControlCenter tenant=\{selectedTenant\}/)
  assert.match(storeControlCenterUi, /\.eq\('store_id', tenant\.id\)/)
  assert.match(storeControlCenterUi, /\.in\('user_id', userIds\)/)
  assert.match(storeControlCenterUi, /order\('created_at', \{ ascending: false \}\)\.limit\(12\)/)
  assert.match(storeControlCenterUi, /bukan audit log lengkap untuk setiap perubahan admin/)
  assert.match(storeControlCenterUi, /Tidak tersedia pada data tenant saat ini/)
  assert.match(storeControlCenterUi, /Hak akses database mungkin membatasi sebagian data/)
})


test('form draft restoration is scoped to the signed-in user and active tenant', () => {
  assert.match(app, /const tenantScope = store\?\.id \|\| selectedStoreId \|\| 'no-store'/)
  assert.match(app, /encodeURIComponent\(tenantScope\)/)
  assert.match(app, /const sameIdentityForms = Array\.from\(document\.forms\)/)
})

test('form draft restoration handles conditional fields without overwriting fields already restored', () => {
  assert.match(app, /draftRestoredKeys/)
  assert.match(app, /restoredKeys\.has\(fieldKey\)/)
  assert.match(app, /Array\.from\(document\.forms\)\.forEach\(restoreForm\)/)
})

test('form draft preservation excludes credentials, activation codes, PINs, and file inputs', () => {
  assert.match(app, /\['password', 'hidden', 'file', 'submit', 'button', 'reset', 'image'\]/)
  assert.match(app, /password\|passwd\|pin\|activation\.\?code\|invite\.\?code\|token\|secret/)
})


test('public queue screen is token-gated, tenant-scoped, and stops exposing media/template data', () => {
  assert.match(publicQueueMigration, /p_token IS NULL OR length\(p_token\) < 32/)
  assert.match(publicQueueMigration, /WHERE cfg\.public_token = p_token/)
  assert.match(publicQueueMigration, /'queue_enabled', coalesce\(ss\.queue_enabled, true\)/)
  assert.match(publicQueueMigration, /CASE WHEN coalesce\(ss\.queue_enabled, true\) THEN/)
  assert.doesNotMatch(publicQueueMigration, /'media'|'template'|'playlist'|'video'/)
  assert.match(app, /new URLSearchParams\(window\.location\.search\)\.get\('token'\)/)
  assert.match(app, /supabase\.rpc\('get_public_tv_display',\{p_token:token\}\)/)
})

test('queue settings contain no media upload or template controls and require owner/admin for writes', () => {
  assert.match(queueSettingsUi, /\['owner', 'admin'\]\.includes\(membership\?\.role\)/)
  assert.match(queueSettingsUi, /store_settings'\)\.upsert/)
  assert.match(queueSettingsUi, /crypto\.getRandomValues/)
  assert.doesNotMatch(queueSettingsUi, /store_tv_media|type=[\"']file[\"']|media_volume|selectedTemplate|uploadMedia|playlistItems/i)
})

test('password minimum is six characters in profile forms and admin reset endpoint', async () => {
  assert.match(app, /Masukkan password sementara baru \(minimal 6 karakter\)/)
  assert.match(app, /if\(nextPassword\.length<6\)\{setNotice\('Password minimal 6 karakter\.'\);return\}/)
  const profileAndAuthForms = app
  const passwordReset = await readFile(new URL('../netlify/functions/manage-user-password.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(profileAndAuthForms, /minLength=\{8\}/)
  assert.match(profileAndAuthForms, /minLength=\{6\}/)
  assert.match(passwordReset, /password\.length < 6/)
})


test('activation package defaults match the NexaPos master specification', () => {
  assert.match(activationPackagesMigration, /\('daily','Harian',3,1,true\)/)
  assert.match(activationPackagesMigration, /\('weekly','Mingguan',7,2,true\)/)
  assert.match(activationPackagesMigration, /\('monthly','Bulanan',30,3,true\)/)
  assert.match(activationPackagesMigration, /\('yearly','Tahunan',365,4,true\)/)
  assert.match(activationPackagesMigration, /\('starter','Starter',3,/)
  assert.match(activationPackagesMigration, /\('growth','Growth',5,/)
  assert.match(activationPackagesMigration, /\('business','Business',10,/)
  assert.match(activationPackagesMigration, /\('enterprise','Enterprise',15,/)
})

test('activation package administration is protected and validates active packages and duration bounds', () => {
  assert.match(activationPackagesMigration, /enable row level security/i)
  assert.match(activationPackagesMigration, /private\.is_super_admin\(\)/)
  assert.match(activationPackagesMigration, /p_duration_days < 1 or p_duration_days > 36500/i)
  assert.match(activationPackagesMigration, /where package_key = p_package_key and is_active = true/i)
  assert.match(app, /supabase\.rpc\('activate_store_tenant',\{p_store_id:tenant\.id,p_duration_days:days,p_package_key:activationPackage\}\)/)
})

test('Super Admin can configure custom activation durations and package-specific pricing', () => {
  assert.match(subscriptionPlanManagerUi, /features: \(Array\.isArray\(plan\.features\) \? plan\.features : featureDefaults\)/)
  assert.doesNotMatch(subscriptionPlanManagerUi, /Produk dan stok per cabang/)
  assert.match(subscriptionPlanManagerUi, /savingKey===plan\.package_key/)
  assert.match(subscriptionPlanManagerUi, /supabase\.from\('site_activation_durations'\)\.upsert/)
  assert.match(subscriptionPlanManagerUi, /const addCustomDuration = async/)
  assert.match(subscriptionPlanManagerUi, /updatePrice\(plan\.package_key,duration\.duration_key/)
  assert.match(subscriptionPlanManagerUi, /supabase\.from\('site_activation_packages'\)\.upsert/)
})


test('homepage pricing fallback matches package defaults and does not fabricate promotions', () => {
  assert.doesNotMatch(homepageUi, /\bupcomingPromo\b/)

  assert.match(homepageUi, /duration_key: 'daily', name: 'Harian', duration_days: 3/)
  assert.match(homepageUi, /key: 'starter', name: 'Starter', location_limit: 3/)
  assert.match(homepageUi, /key: 'growth', name: 'Growth', location_limit: 5/)
  assert.match(homepageUi, /key: 'business', name: 'Business', location_limit: 10/)
  assert.match(homepageUi, /key: 'enterprise', name: 'Enterprise', location_limit: 15/)
  assert.doesNotMatch(homepageUi, /fallbackPromo|DISKON BARU CUYYY|nexapos-new-customer-80/)
  assert.match(homepageUi, /p\.starts_at.*p\.ends_at/)
  assert.match(homepageUi, /const availablePromos = promos/)
  assert.match(homepageUi, /if \(error\) \{ setPromos\(\[\]\); return \}/)
  assert.match(homepageUi, /features: Array\.isArray\(plan\.features\) \? plan\.features : defaultFeatures/)
})


test('owner organizations and tenant quotas are enforced by the database, not only by the UI', () => {
  assert.match(ownerOrganizationsMigration, /create table if not exists public\.owner_organizations/i)
  assert.match(ownerOrganizationsMigration, /add column if not exists organization_id uuid/i)
  assert.match(ownerOrganizationsMigration, /create or replace function public\.owner_create_store_tenant/i)
  assert.match(ownerOrganizationsMigration, /v_count >= v_org\.activation_location_limit/i)
  assert.match(ownerOrganizationsMigration, /for update/i)
  assert.match(ownerOrganizationsMigration, /owner_user_id = v_user_id/i)
  assert.match(ownerOrganizationsMigration, /private\.is_pin_verified\(\)/i)
  assert.match(ownerOrganizationsMigration, /grant execute on function public\.owner_create_store_tenant\(text\) to authenticated/i)
  assert.match(app, /supabase\.rpc\('owner_create_store_tenant'/)
  assert.match(app, /page==='tenants'&&membership\.role==='owner'/)
})

test('owner tenant management lists only stores linked to the authenticated owner organization', () => {
  assert.match(app, /from\('owner_organizations'\)/)
  assert.match(app, /eq\('owner_user_id', session\.user\.id\)/)
  assert.match(app, /rpc\('owner_list_organization_tenant_profiles'\)/)
  assert.match(ownerOrganizationsMigration, /where s\.organization_id = v_org_id/i)
  assert.match(ownerOrganizationsMigration, /has_membership boolean/i)
  assert.match(app, /ownerTenants\.filter\(item=>item\.status!=='deleted'&&!item\.deleted_at\)/)
})


test('audit events are recorded server-side with scoped read policies and redacted secrets', () => {
  assert.match(auditLogsMigration, /create table if not exists public\.platform_audit_logs/i)
  assert.match(auditLogsMigration, /create or replace function private\.capture_nexapos_audit_event/i)
  assert.match(auditLogsMigration, /v_before := v_before - 'activation_code_hash' - 'pin_hash'/)
  assert.match(auditLogsMigration, /v_after := v_after - 'activation_code_hash' - 'pin_hash'/)
  assert.match(auditLogsMigration, /Owner reads organization audit logs/)
  assert.match(auditLogsMigration, /Super Admin reads platform audit logs/)
  assert.match(auditLogsMigration, /revoke all on public\.platform_audit_logs from public, anon/i)
  assert.match(auditLogUi, /from\('platform_audit_logs'\)/)
  assert.match(app, /section==='audit'&&<AuditLogPanel scope="platform"\/>/)
  assert.match(app, /page==='audit'&&membership\.role==='owner'&&<AuditLogPanel scope="organization"/)
})


test('activation discounts and vouchers are calculated against active server-side package, duration, and promotion rows', () => {
  assert.match(serverPromoQuoteMigration, /security invoker/i)
  assert.match(serverPromoQuoteMigration, /p\.is_active = true/i)
  assert.match(serverPromoQuoteMigration, /d\.duration_key = p_duration_key and d\.is_active = true/i)
  assert.match(serverPromoQuoteMigration, /upper\(trim\(p\.promo_code\)\) = v_code/i)
  assert.match(serverPromoQuoteMigration, /p\.starts_at is null or p\.starts_at <= now\(\)/i)
  assert.match(serverPromoQuoteMigration, /p\.ends_at is null or p\.ends_at >= now\(\)/i)
  assert.match(serverPromoQuoteMigration, /p_duration_key = any\(p\.eligible_periods\)/i)
  assert.match(homepageUi, /supabase\.rpc\('get_activation_quote'/)
  assert.match(homepageUi, /serverQuotes\[plan\.key\]/)
  assert.match(homepageUi, /serverQuotes\[selectedPlan\]\?\.promo_id/)
  assert.doesNotMatch(homepageUi, /function discountFor\(/)
})

test('workspace browser history restores prior pages without clearing current tenant state', () => {
  assert.match(app, /nexaposWorkspaceNav/)
  assert.match(app, /nexaposSuperAdminNav/)
  assert.match(app, /window\.addEventListener\('popstate'/)
  assert.match(app, /setPage\(state\.page \|\| 'dashboard'\)/)
  assert.match(app, /setSelectedTenant\(state\.superSelectedTenant \|\| null\)/)
  assert.match(app, /nexapos-selected-store-v1:/)
  assert.match(app, /nexapos-workspace-page-v1:/)
  assert.match(app, /nexapos-scroll-v1:/)
  assert.match(app, /Ada perubahan formulir yang belum dikonfirmasi/)
  assert.match(app, /window\.addEventListener\('beforeunload', onBeforeUnload\)/)
})


test('Owner consolidated reports aggregate only tenant IDs visible in the owner organization', () => {
  assert.match(organizationReportsUi, /tenants\.filter\(t => t\.status !== 'deleted' && !t\.deleted_at\)\.map\(t => t\.id\)/)
  assert.match(organizationReportsUi, /from\('orders'\)\.select\('\*'\)/)
  assert.match(organizationReportsUi, /\.in\('store_id', tenantIds\)/)
  assert.match(organizationReportsUi, /from\('products'\)\.select\('id,store_id,cost_price'\)/)
  assert.match(organizationReportsUi, /\.in\('id', ids\)/)
  assert.match(organizationReportsUi, /paidOrders\.reduce/)
  assert.match(organizationReportsUi, /\.gte\('created_at', startBoundary\)\.lt\('created_at', endBoundary\)/)
  assert.match(organizationReportsUi, /offset < 10000; offset \+= 1000/)
  assert.match(organizationReportsUi, /order_item.*select/)
  assert.match(app, /page==='reports-org'&&membership\.role==='owner'&&<OrganizationReports/)
  assert.match(app, /\['reports-org','Laporan perusahaan',Store\]/)
})


test('checkout retries use a tenant-scoped idempotency key to prevent duplicate sales after reconnect', () => {
  assert.match(idempotentCheckoutMigration, /add column if not exists idempotency_key uuid/i)
  assert.match(idempotentCheckoutMigration, /unique index if not exists orders_store_idempotency_key_uidx/i)
  assert.match(idempotentCheckoutMigration, /pg_advisory_xact_lock\(hashtextextended\(/i)
  assert.match(idempotentCheckoutMigration, /where store_id = p_store_id and idempotency_key = p_request_id/i)
  assert.match(idempotentCheckoutMigration, /revoke all on function public\.complete_sale\(uuid, jsonb, numeric, text, numeric, text, boolean\) from public, anon, authenticated/i)
  assert.match(app, /supabase\.rpc\('complete_sale_idempotent'/)
  assert.match(app, /p_request_id:checkoutRequestIdRef\.current/)
  assert.match(app, /checkoutRequestIdRef\.current = null/)
  assert.doesNotMatch(app, /supabase\.rpc\('complete_sale',/)
})


test('tenant roles are standardized and legacy manager memberships retain access as Admin Tenant', () => {
  assert.match(tenantRoleMigration, /update public\.store_members set role = 'admin' where role = 'manager'/i)
  assert.match(tenantRoleMigration, /check \(role in \('owner','admin','cashier'\)\)/i)
  assert.match(tenantRoleMigration, /m\.role in \('owner','admin'\)/i)
  assert.match(tenantRoleMigration, /p_target_role not in \('admin','cashier'\)/i)
  assert.doesNotMatch(app, /\['owner','admin','manager'\]/)
  assert.doesNotMatch(app, /Pilih admin, manager, atau cashier/)
})


test('account deletion keeps historical cashier shift attribution and requires typed confirmation card', () => {
  assert.match(app, /cashier_name_snapshot/)
  assert.match(app, /deleteConfirmTarget/)
  assert.match(app, /navigator\.clipboard\.writeText\('HAPUS'\)/)
  assert.match(app, /deleteConfirmText\.trim\(\)!=='HAPUS'/)
  assert.match(app, /super_admin_delete_disabled_account/)
  assert.match(app, /super_admin_delete_user/)
  assert.match(app, /Akun belum berhasil dihapus/)
})


test('account deletion migration preserves all cashier and alert attribution foreign keys', () => {
  assert.match(accountDeletionMigration, /cashier_shifts_cashier_id_fkey[\s\S]*?on delete set null/i)
  assert.match(accountDeletionMigration, /cashier_shift_breaks_cashier_id_fkey[\s\S]*?on delete set null/i)
  assert.match(accountDeletionMigration, /cashier_manual_alerts_sent_by_fkey[\s\S]*?on delete set null/i)
  assert.match(accountDeletionMigration, /cashier_name_snapshot/)
  assert.match(accountDeletionMigration, /sent_by_name_snapshot/)
})


test('account deletion requires exact uppercase confirmation and protects open cashier sessions', async () => {
  assert.match(app, /setDeleteConfirmText\(e\.target\.value\)/)
  assert.match(app, /deleteConfirmText\.trim\(\)!=='HAPUS'/)
  assert.match(app, /cashier_name_snapshot/)
  const migration = await readFile(new URL('../supabase/migrations/20261030260000_block_deletion_with_open_cashier_shift.sql', import.meta.url), 'utf8')
  assert.match(migration, /closed_at is null/)
  assert.match(migration, /Tutup sesi kasir terlebih dahulu/)
})


test('Owner staff deletion uses typed HAPUS confirmation instead of browser prompt', () => {
  assert.match(app, /ownerMemberDeleteTarget/)
  assert.match(app, /ownerMemberDeleteText\.trim\(\)!=='HAPUS'/)
  assert.match(app, /owner_delete_store_member/)
  assert.match(app, /Salin HAPUS/)
})


test('Owner registration safely retains the form reference across async RPC and quota copy excludes home workspace', async () => {
  assert.match(app, /const formElement=event\.currentTarget/)
  assert.match(app, /formElement\.reset\(\)/)
  assert.match(app, /register_store_tenant/)
  assert.match(app, /Pendaftaran Owner belum berhasil/)
  const migration = await readFile(new URL('../supabase/migrations/20261030270000_owner_additional_tenant_quota.sql', import.meta.url), 'utf8')
  assert.match(migration, /is_primary_workspace/)
  assert.match(migration, /s\.is_primary_workspace = false/)
  assert.match(migration, /Kuota tenant tambahan/)
  assert.match(homepageUi, /tenant tambahan di luar workspace utama/)
  assert.doesNotMatch(homepageUi, /termasuk tenant pusat/)
})

test('Platform staff manager has a working back callback and audit migration failures are actionable', async () => {
  const staff = await readFile(new URL('../src/PlatformStaffManager.jsx', import.meta.url), 'utf8')
  const audit = await readFile(new URL('../src/AuditLogPanel.jsx', import.meta.url), 'utf8')
  assert.match(staff, /onBack/)
  assert.match(staff, /onClick=\{onBack\}/)
  assert.match(app, /PlatformStaffManager onBack/)
  assert.match(audit, /Tabel audit log belum tersedia di database ini/)
})


test('account deletion surfaces the exact known historical cashier FK migration blocker', async () => {
  const errors = await readFile(new URL('../src/lib/userFacingError.js', import.meta.url), 'utf8')
  assert.match(errors, /cashier_shifts_cashier_id_fkey/)
  assert.match(errors, /Migrasi perbaikan penghapusan akun belum diterapkan/)
  assert.match(errors, /riwayat transaksi tidak dihapus/)
})


test('Super Admin protected actions explain PIN verification failures', async () => {
  const errors = await readFile(new URL('../src/lib/userFacingError.js', import.meta.url), 'utf8')
  assert.match(errors, /Verifikasi PIN Super Admin diperlukan/)
  assert.match(errors, /super admin access required/i)
})


test('Owner organization settings persist a separate organization name and refresh the shared UI state', async () => {
  const settings = await readFile(new URL('../src/OrganizationSettings.jsx', import.meta.url), 'utf8')
  const profileMigration = await readFile(new URL('../supabase/migrations/20261030320000_owner_organization_profile.sql', import.meta.url), 'utf8')
  assert.match(settings, /rpc\('owner_update_organization_profile'/)
  assert.match(settings, /onSaved\?\.\(data\)/)
  assert.match(profileMigration, /add column if not exists organization_name text/i)
  assert.match(profileMigration, /where owner_user_id = v_user_id/)
})

test('Owner organization operations can invite employees and update tenant roles safely', async () => {
  const operations = await readFile(new URL('../src/OrganizationOperations.jsx', import.meta.url), 'utf8')
  assert.match(operations, /rpc\('invite_store_member'/)
  assert.match(operations, /rpc\('owner_update_store_member'/)
  assert.match(operations, /Tambah karyawan/)
  assert.match(operations, /Edit akses/)
  assert.match(operations, /p_store_id: inviteTenant/)
})

test('Owner tenant creation, entry, organization identity and Admin tenant classification remain connected', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const adminMigration = await readFile(new URL('../supabase/migrations/20261030380000_admin_owner_display_name_fallback.sql', import.meta.url), 'utf8')
  const expiryMigration = await readFile(new URL('../supabase/migrations/20261030370000_owner_tenant_entry_and_expiry_sync.sql', import.meta.url), 'utf8')
  const displayNameMigration = await readFile(new URL('../supabase/migrations/20261030380000_admin_owner_display_name_fallback.sql', import.meta.url), 'utf8')
  const ownerRegistrationMigration = await readFile(new URL('../supabase/migrations/20261030400000_owner_organization_name_registration_sync.sql', import.meta.url), 'utf8')
  assert.match(app, /rpc\('owner_create_store_tenant'/)
  assert.match(app, /rpc\('owner_enter_store_tenant'/)
  assert.match(app, /await loadWorkspace\(tenantId, true\)/)
  assert.match(app, /await loadWorkspace\(data\.id, true\)/)
  assert.match(app, /rpc\('owner_list_organization_tenant_profiles'/)
  assert.match(app, /organization_name,activation_package_key/)
  assert.match(app, /organizationIds=\[\.\.\.new Set/)
  assert.match(app, /Perusahaan: \{t\.organization_name/)
  assert.match(app, /Workspace utama/)
  assert.match(app, /super-admin-organization-profile-sync/)
  assert.match(app, /table:'owner_organizations'/)
  assert.match(app, /Pusat perusahaan/)
  assert.match(adminMigration, /filter \(where m\.role <> 'owner'/i)
  assert.match(adminMigration, /organization_names text/i)
  assert.match(displayNameMigration, /o2\.owner_name/i)
  assert.match(ownerRegistrationMigration, /create trigger store_members_attach_owner_organization/i)
  assert.match(ownerRegistrationMigration, /organization_name = coalesce/i)
  const organizationWorkspaceMigration = await readFile(new URL('../supabase/migrations/20261030420000_separate_owner_organization_and_workspace_names.sql', import.meta.url), 'utf8')
  assert.match(app, /name="organization_name"/)
  assert.match(app, /p_organization_name:organizationName/)
  assert.match(app, /Manajemen NexaSpace/)
  assert.match(app, /Manajemen Tenant/)
  assert.match(app, /Daftar Tenant Perusahaan/)
  assert.match(app, /tenant_rows\.map\(tenant/)
  assert.match(app, /employee_count:new Set\(orgMembers\.filter/)
  assert.match(organizationWorkspaceMigration, /p_organization_name text/i)
  assert.match(organizationWorkspaceMigration, /organization_name = v_organization_name/i)
  assert.match(organizationWorkspaceMigration, /register_store_tenant\(text,text,text,text\)/i)
  assert.match(expiryMigration, /v_store_expires_at <= now\(\)/i)
  assert.match(expiryMigration, /v_org_expires_at <= now\(\)/i)
})


test('Owner employee invitations require server-side PIN verification and manager checks reject disabled memberships', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261030410000_harden_owner_invites_and_manager_auth.sql', import.meta.url), 'utf8')
  assert.match(migration, /if not private\.is_pin_verified\(\) then[\s\S]*?Verifikasi PIN diperlukan untuk mengundang karyawan/i)
  assert.match(migration, /m\.disabled_at is null/i)
  assert.match(migration, /revoke all on function public\.invite_store_member[\s\S]*?from public, anon/i)
  assert.match(migration, /grant execute on function public\.invite_store_member[\s\S]*?to authenticated/i)
})

test('Owner tenant switching never silently falls back to a different workspace', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /const loadWorkspace = useCallback\(async \(preferredStoreId = selectedStoreId, strictSelection = false\)/)
  assert.match(app, /strictSelection && preferredStoreId && !resolvedMembers\.some/)
  assert.match(app, /Tenant lain tidak akan dibuka otomatis/)
  assert.match(app, /await loadWorkspace\(tenantId, true\)/)
})


test('Owner and Manager can securely manage employees, while cashiers can only insert products', async () => {
  const managerMigration = await readFile(new URL('../supabase/migrations/20261030430000_manager_team_controls_and_cashier_product_insert.sql', import.meta.url), 'utf8')
  const superAdminMigration = await readFile(new URL('../supabase/migrations/20261030440000_super_admin_store_member_controls.sql', import.meta.url), 'utf8')
  const organization = await readFile(new URL('../src/OrganizationOperations.jsx', import.meta.url), 'utf8')
  const tenantCenter = await readFile(new URL('../src/StoreControlCenter.jsx', import.meta.url), 'utf8')
  assert.match(managerMigration, /private\.is_store_manager\(p_store_id\)/)
  assert.match(managerMigration, /private\.is_store_manager\(v_member\.store_id\)/)
  assert.match(managerMigration, /manager_reset_store_member_pin/)
  assert.match(managerMigration, /private\.is_store_member\(store_id\)/)
  assert.match(managerMigration, /revoke all on function public\.manager_reset_store_member_pin/)
  assert.match(superAdminMigration, /private\.is_super_admin\(\)/)
  assert.match(superAdminMigration, /super_admin_delete_store_member_assignment/)
  assert.match(organization, /Reset PIN/)
  assert.match(organization, /manage-store-member-password/)
  assert.match(tenantCenter, /super_admin_update_store_member/)
  assert.match(tenantCenter, /super_admin_delete_store_member_assignment/)
})


test('Platform actions stay scoped to the selected company or tenant, and registration activation settings stay in NexaPos', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const tenantStart = app.indexOf("{section==='stores'&&")
  const companyStart = app.indexOf("{section==='nexaspace'&&", tenantStart)
  const tenantSection = app.slice(tenantStart, companyStart)
  const companySection = app.slice(companyStart, app.indexOf("{section==='users'&&", companyStart))
  const tenantCenter = await readFile(new URL('../src/StoreControlCenter.jsx', import.meta.url), 'utf8')
  const activationManager = await readFile(new URL('../src/SubscriptionPlanManager.jsx', import.meta.url), 'utf8')
  const lifecycleMigration = await readFile(new URL('../supabase/migrations/20261030460000_tenant_lifecycle_quota_and_owner_delete.sql', import.meta.url), 'utf8')

  assert.ok(tenantStart >= 0 && companyStart > tenantStart)
  assert.doesNotMatch(tenantSection, /activate\\(t\\)|activateOrganization|regenerateOwnerInvite|activation-toolbar|Kode aktivasi|Masa sewa perusahaan/)
  assert.match(tenantSection, /changeStatus\\(t,'suspended'\\)/)
  assert.match(tenantSection, /changeStatus\\(t,'active'\\)/)
  assert.match(tenantSection, /changeStatus\\(t,'deleted'\\)/)
  assert.match(tenantSection, /Kendali tenant/)
  assert.match(companySection, /activateOrganization\\(org\\)/)
  assert.match(companySection, /changeOrganizationStatus\\(org,'suspended'\\)/)
  assert.match(companySection, /changeOrganizationStatus\\(org,'active'\\)/)
  assert.match(companySection, /deleteOrganization\\(org\\)/)
  assert.match(app, /rpc\\('super_admin_delete_user',\\{p_user_id:org\\.owner_user_id\\}\\)/)
  assert.doesNotMatch(app, /super_admin_delete_owner_organization/)
  assert.match(app, /Masa sewa perusahaan sudah berakhir[\\s\\S]*?Aktivasi \\/ perpanjang masa sewa perusahaan/)
  assert.match(companySection, /regenerateOwnerInvite\\(primary\\)/)
  assert.match(companySection, /Hapus NexaSpace/)
  assert.match(tenantCenter, /Aktifkan workspace/)
  assert.match(tenantCenter, /Nonaktifkan workspace/)
  assert.doesNotMatch(tenantCenter, /onActivate|Perpanjang aktivasi|Aktivasi & masa berlaku/)
  assert.match(activationManager, /Paket aktivasi & harga/)
  assert.match(lifecycleMigration, /update public\\.owner_organizations[\\s\\S]*?set activation_package_key/)
  assert.match(lifecycleMigration, /public\\.super_admin_delete_store_tenant/)
})
