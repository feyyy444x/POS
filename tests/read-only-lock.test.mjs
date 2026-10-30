import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const app = await readFile(new URL('src/App.jsx', root), 'utf8')
const migration = await readFile(new URL('supabase/migrations/20261030450000_readonly_suspended_tenants.sql', root), 'utf8')

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
