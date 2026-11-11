import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const app = await readFile(new URL('src/App.jsx', root), 'utf8')
const migration = await readFile(new URL('supabase/migrations/20261030142837_readonly_suspended_tenants.sql', root), 'utf8')

test('locked tenants retain read access and show a dismissible lock card', () => {
  assert.match(app, /const tenantReadOnly = effectiveStoreStatus !== 'active'/)
  assert.match(app, /onClickCapture=\{guardTenantAction\}/)
  assert.match(app, /onSubmitCapture=\{guardTenantSubmit\}/)
  assert.match(app, /tenant-readonly-banner/)
  assert.match(app, /OperationalLockNotice/)
  assert.match(app, /data-lock-dismiss/)
  assert.match(app, /owner-enter-button/)
})

test('database keeps inactive tenant reads while rejecting operational writes', () => {
  assert.match(migration, /create policy "members read tenant products"[\s\S]*?private\.is_store_member\(store_id\)/i)
  assert.match(migration, /create policy "members read tenant orders"[\s\S]*?private\.is_store_member\(store_id\)/i)
  assert.match(migration, /create policy "members read tenant queue"[\s\S]*?private\.is_store_member\(store_id\)/i)
  assert.match(migration, /private\.is_store_operational\(p_store_id\)/)
  assert.match(migration, /private\.is_store_operational\(v_shift\.store_id\)/)
  assert.match(migration, /private\.is_store_operational\(target\.store_id\)/)
  assert.match(migration, /owner_enter_store_tenant/)
})

test('cashier alert mutations are rejected when the tenant or organization is locked', () => {
  assert.ok(migration.includes('drop policy if exists "store managers send cashier alerts"'))
  assert.ok(migration.includes('drop policy if exists "cashier marks own alert read"'))
  assert.ok(migration.includes('drop policy if exists "store managers insert break alert settings"'))
  assert.ok(migration.includes('drop policy if exists "cashiers can open own shift"'))
  assert.ok(migration.includes('private.is_store_operational(store_id)'))
})

const pinRpcMigration = await readFile(new URL('supabase/migrations/20261030143000_secure_manager_reset_pin_rpc.sql', root), 'utf8')

test('manager PIN reset RPC is not executable by anonymous users', () => {
  assert.ok(pinRpcMigration.toLowerCase().includes('revoke all on function public.manager_reset_store_member_pin(uuid) from public, anon;'))
  assert.ok(pinRpcMigration.toLowerCase().includes('grant execute on function public.manager_reset_store_member_pin(uuid) to authenticated;'))
})

const tvMediaUpload = await readFile(new URL('../supabase/functions/tv-media-upload/index.ts', import.meta.url), 'utf8')

test('TV media upload enforces tenant, parent organization, and verified PIN before service-role writes', () => {
  assert.match(tvMediaUpload, /select\("id,status,expires_at,deleted_at,organization_id"\)/)
  assert.match(tvMediaUpload, /from\("owner_organizations"\)/)
  assert.match(tvMediaUpload, /organization\.status !== "active"/)
  assert.match(tvMediaUpload, /organization\.expires_at/)
  assert.match(tvMediaUpload, /pinStatus\?\.is_verified !== true/)
})

const ownerDeleteReadOnlyMigration = await readFile(new URL('supabase/migrations/20261111130000_owner_delete_tenant_respects_readonly_org.sql', root), 'utf8')

test('Owner cannot delete a tenant while its parent company is inactive or expired', () => {
  assert.match(ownerDeleteReadOnlyMigration, /if v_org\.status <> 'active'/)
  assert.match(ownerDeleteReadOnlyMigration, /v_org\.expires_at is not null and v_org\.expires_at <= now\(\)/)
  assert.match(ownerDeleteReadOnlyMigration, /Data hanya dapat dibaca/)
  assert.ok(ownerDeleteReadOnlyMigration.indexOf('if v_org.status') < ownerDeleteReadOnlyMigration.indexOf('perform private.delete_store_tenant_data'))
})
