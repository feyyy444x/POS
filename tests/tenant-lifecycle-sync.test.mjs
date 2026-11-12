import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const errorMap = await readFile(new URL('../src/lib/userFacingError.js', import.meta.url), 'utf8')
const lifecycle = await readFile(new URL('../supabase/migrations/20261030172447_tenant_lifecycle_quota_and_owner_delete.sql', import.meta.url), 'utf8')

test('package activation is blocked until active tenant count fits the new package quota', () => {
  assert.match(lifecycle, /v_active_tenants > v_package\.location_limit/)
  assert.match(lifecycle, /Admin\/Super Admin harus menonaktifkan tenant yang tidak dipilih/)
  assert.match(lifecycle, /status = 'active'/)
})

test('Outdated production activation RPC errors explain the missing migration', () => {
  assert.match(errorMap, /status tidak diizinkan; gunakan aktivasi untuk mengaktifkan tenant/i)
  assert.match(errorMap, /Migrasi aktivasi tenant perlu diterapkan terlebih dahulu/)
})

test('Admin acoPos and Super Admin can reactivate one tenant only within organization quota', () => {
  assert.match(lifecycle, /if not private\.is_super_admin\(\) then/)
  assert.match(lifecycle, /if not private\.is_pin_verified\(\) then/)
  assert.match(lifecycle, /p_status not in \('active','pending','suspended'\)/)
  assert.match(lifecycle, /v_active_tenants >= v_org\.activation_location_limit/)
  assert.match(app, /changeStatus\(t,'active'\)/)
  assert.match(app, /Aktifkan workspace/)
})

test('Owner can delete only an inactive tenant and cannot delete the Owner organization through tenant removal', () => {
  assert.match(lifecycle, /owner_user_id = \(select auth\.uid\(\)\)/)
  assert.match(lifecycle, /if not private\.is_pin_verified\(\) then/)
  assert.match(lifecycle, /Tenant masih aktif\. Minta Admin\/Super Admin menonaktifkan tenant terlebih dahulu/)
  assert.match(lifecycle, /private\.delete_store_tenant_data\(p_store_id\)/)
  assert.match(app, /Tenant aktif harus dinonaktifkan Admin\/Super Admin terlebih dahulu sebelum dihapus/)
  assert.match(app, /owner_delete_store_tenant/)
  assert.match(app, /Hapus tenant nonaktif secara permanen/)
  assert.match(app, /const ownerCenterLockStatus = organizationEntitlementStatus/)
  assert.match(app, /owner-delete-tenant-button/)
})

test('Pusat Kendali lists active tenants first and inactive tenants last', () => {
  assert.match(app, /const isTenantOperational=item=>organization\.status==='active'.*item\.status==='active'/)
  assert.match(app, /sort\(\(a,b\)=>Number\(isTenantOperational\(b\)\)-Number\(isTenantOperational\(a\)\)/)
})

test('Admin, Owner, and tenant workspace subscribe to shared lifecycle changes', () => {
  assert.match(app, /table:'stores'},\(\)=>\{load\(\);loadUsers\(\)\}/)
  assert.match(app, /table:'owner_organizations'},refreshOwnerData/)
  assert.match(app, /table:'store_members'},refreshOwnerData/)
  assert.match(app, /acoPos-tenant-lifecycle-sync-/)
  assert.match(app, /table:'store_settings'},payload=>/)
  assert.match(app, /table:'store_members'},payload=>/)
  assert.match(lifecycle, /alter publication supabase_realtime add table public\.%I/)
})


const reactivation = await readFile(new URL('../supabase/migrations/20261030172454_reactivate_suspended_tenant_independently.sql', import.meta.url), 'utf8')

test('tenant reactivation RPC accepts active status while preserving organization, expiry, and package quota guards', () => {
  assert.ok(reactivation.includes("p_status not in ('active', 'pending', 'suspended')"))
  assert.match(reactivation, /v_org\.status <> 'active'/)
  assert.match(reactivation, /v_org\.expires_at/)
  assert.match(reactivation, /v_store\.expires_at/)
  assert.doesNotMatch(reactivation, /updated_at/)
  assert.match(reactivation, /v_active_tenants >= v_org\.activation_location_limit/)
  assert.match(reactivation, /private\.is_super_admin\(\)/)
  assert.match(reactivation, /private\.is_pin_verified\(\)/)
  assert.match(app, /supabase\.rpc\('set_store_tenant_status',\{p_store_id:tenant\.id,p_status:nextStatus\}\)/)
})


const lifecycleHardening = await readFile(new URL('../supabase/migrations/20261112001000_harden_account_tenant_lifecycle.sql', import.meta.url), 'utf8')
const subscriptionManager = await readFile(new URL('../src/SubscriptionPlanManager.jsx', import.meta.url), 'utf8')
const organizationSettings = await readFile(new URL('../src/OrganizationSettings.jsx', import.meta.url), 'utf8')

test('Custom duration is normalized to the exact Custom label without changing its configured day count', () => {
  assert.match(lifecycleHardening, /set name = 'Custom'[\s\S]*where duration_key = 'custom'/)
  assert.match(subscriptionManager, /name: item\.duration_key === 'custom' \? 'Custom'/)
  assert.match(subscriptionManager, /duration\.duration_key === 'custom' \? 'Custom'/)
  assert.match(subscriptionManager, /readOnly=\{duration\.duration_key==='custom'\}/)
  assert.match(app, /name:item\.duration_key==='custom'\?'Custom'/)
  assert.match(lifecycleHardening, /where duration_key = 'custom'[\s\S]*name is distinct from 'Custom'/)
})

test('Package save feedback uses the same package key as the disabled state', () => {
  assert.match(subscriptionManager, /disabled=\{!plansReady \|\| savingKey===plan\.package_key\}/)
  assert.match(subscriptionManager, /savingKey===plan\.package_key\?/)
})

test('Employee transfer accepts only an active, unexpired target in the backend and UI', () => {
  assert.match(lifecycleHardening, /v_target_status <> 'active'/)
  assert.match(lifecycleHardening, /v_target_expires_at <= now\(\)/)
  assert.match(lifecycleHardening, /v_org_status <> 'active'/)
  assert.match(lifecycleHardening, /closed_at is null/)
  assert.match(app, /const availableTargets=tenants\.filter\(t=>t\.id!==source\.store_id&&t\.status==='active'/)
  assert.match(app, /Pindahkan akun/)
})

test('Permanent account deletion stops when the account still owns Storage objects', () => {
  assert.match(lifecycleHardening, /storage\.objects/)
  assert.match(lifecycleHardening, /owner_id = \$1/)
  assert.match(lifecycleHardening, /Akun masih memiliki file Storage/)
  assert.match(lifecycleHardening, /Pindahkan atau hapus file melalui Storage API/)
})

test('Disabled-account deletion RPC exists and requires Super Admin, PIN, and no active memberships', () => {
  assert.match(lifecycleHardening, /function public\.super_admin_delete_disabled_account\(p_user_id uuid\)/)
  assert.match(lifecycleHardening, /if not private\.is_super_admin\(\) then/)
  assert.match(lifecycleHardening, /if not private\.is_pin_verified\(\) then/)
  assert.match(lifecycleHardening, /Akun masih memiliki keanggotaan tenant aktif/)
  assert.match(lifecycleHardening, /perform public\.super_admin_delete_user\(p_user_id\)/)
  assert.match(app, /super_admin_delete_disabled_account/)
})

test('Permanent Super Admin tenant deletion requires verified PIN', () => {
  assert.match(lifecycleHardening, /public\.super_admin_delete_store_tenant/)
  assert.match(lifecycleHardening, /if not private\.is_pin_verified\(\) then/)
  assert.match(lifecycleHardening, /Verifikasi PIN diperlukan sebelum menghapus tenant secara permanen/)
})

test('Organization profile save reports success only after the protected RPC succeeds', () => {
  assert.match(organizationSettings, /supabase\.rpc\('owner_update_organization_profile'/)
  assert.match(organizationSettings, /if \(error\) \{[\s\S]*Nama perusahaan belum berhasil disimpan/)
  assert.match(organizationSettings, /Nama perusahaan berhasil diperbarui dan tersimpan di database/)
})
