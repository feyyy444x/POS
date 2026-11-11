import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../supabase/migrations/20261111150000_enforce_readonly_storage_and_self_order_writes.sql', import.meta.url), 'utf8')

test('logo upload, replacement and deletion require an operational tenant and verified PIN', () => {
  for (const action of ['upload','update','delete']) {
    assert.match(migration, new RegExp('Store managers can ' + action + ' store logos'))
  }
  assert.equal((migration.match(/private\.is_store_operational\(sm\.store_id\)/g) || []).length, 4)
  assert.equal((migration.match(/private\.is_pin_verified\(\)/g) || []).length, 4)
})

test('public payment-proof upload and attachment require active tenant, active company and enabled Self Order', () => {
  assert.match(migration, /create or replace function private\.can_upload_self_service_proof/)
  assert.match(migration, /private\.is_store_publicly_available\(p_store_id\)/)
  assert.match(migration, /s\.status = 'active'/)
  assert.match(migration, /settings\.self_order_enabled is true/)
  assert.match(migration, /create or replace function public\.attach_self_service_payment_proof/)
  assert.match(migration, /Perusahaan atau tenant sedang nonaktif/)
  assert.match(migration, /private\.is_store_publicly_available\(s\.id\)/)
})
