import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const lifecycle = await readFile(new URL('../supabase/migrations/20261030460000_tenant_lifecycle_quota_and_owner_delete.sql', import.meta.url), 'utf8')

test('package activation is blocked until active tenant count fits the new package quota', () => {
  assert.match(lifecycle, /v_active_tenants > v_package\.location_limit/)
  assert.match(lifecycle, /Admin\/Super Admin harus menonaktifkan tenant yang tidak dipilih/)
  assert.match(lifecycle, /status = 'active'/)
  assert.match(lifecycle, /status = 'active'/)
  assert.match(lifecycle, /p_status not in \\('active','pending','suspended'\\)/)
})

test('Admin NexaPos and Super Admin can reactivate one tenant only within organization quota', () => {
  assert.match(lifecycle, /if not private\.is_super_admin\(\) then/)
  assert.match(lifecycle, /if not private\.is_pin_verified\(\) then/)
  assert.match(lifecycle, /p_status not in \('active','pending','suspended'\)/)
  assert.match(lifecycle, /v_active_tenants >= v_org\.activation_location_limit/)
  assert.match(app, /changeStatus\(t,'active'\)/)
  assert.match(app, /> Aktifkan<\/button>/)
})

test('Owner can delete only an inactive tenant and cannot delete the Owner organization through tenant removal', () => {
  assert.match(lifecycle, /not private\.is_store_owner\(p_store_id\)/)
  assert.match(lifecycle, /Tenant masih aktif\. Minta Admin\/Super Admin menonaktifkan tenant terlebih dahulu/)
  assert.match(lifecycle, /private\.delete_store_tenant_data\(p_store_id\)/)
  assert.match(app, /Tenant aktif harus dinonaktifkan Admin\/Super Admin terlebih dahulu sebelum dihapus/)
  assert.match(app, /owner_delete_store_tenant/)
  assert.match(app, /Hapus tenant nonaktif secara permanen/)
})

test('NexaSpace lists active tenants first and inactive tenants last', () => {
  assert.match(app, /const isTenantOperational=item=>item\.status==='active'/)
  assert.match(app, /sort\(\(a,b\)=>Number\(isTenantOperational\(b\)\)-Number\(isTenantOperational\(a\)\)/)
})

test('Admin, Owner, and tenant workspace subscribe to shared lifecycle changes', () => {
  assert.match(app, /table:'stores'},\(\)=>\{load\(\);loadUsers\(\)\}/)
  assert.match(app, /table:'owner_organizations'},refreshOwnerData/)
  assert.match(app, /table:'store_members'},refreshOwnerData/)
  assert.match(app, /nexapos-tenant-lifecycle-sync-/)
  assert.match(lifecycle, /alter publication supabase_realtime add table public\.%I/)
})
