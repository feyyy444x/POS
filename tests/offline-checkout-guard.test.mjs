import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../supabase/migrations/20261111130000_enforce_cashier_shift_on_checkout.sql', import.meta.url),
  'utf8',
)

test('checkout enforces an authenticated cashier-owned open shift in the requested store', () => {
  assert.match(migration, /auth\.uid\(\)/)
  assert.match(migration, /s\.store_id\s*=\s*p_store_id/)
  assert.match(migration, /s\.cashier_id\s*=\s*\(select auth\.uid\(\)\)/)
  assert.match(migration, /s\.closed_at\s+is\s+null/)
  assert.match(migration, /for update/i)
})

test('checkout rejects an active break on the same cashier shift', () => {
  assert.match(migration, /public\.cashier_shift_breaks/)
  assert.match(migration, /b\.shift_id\s*=\s*v_shift_id/)
  assert.match(migration, /b\.cashier_id\s*=\s*\(select auth\.uid\(\)\)/)
  assert.match(migration, /b\.ended_at\s+is\s+null/)
})

test('checkout keeps tenant operational and server-side stock checks', () => {
  assert.match(migration, /private\.is_store_operational\(p_store_id\)/)
  assert.match(migration, /public\.products/)
  assert.match(migration, /stock\s*>=\s*v_qty/)
  assert.match(migration, /public\.order_items/)
})

test('only the idempotent checkout RPC remains executable by authenticated clients', () => {
  assert.match(migration, /revoke all on function public\.complete_sale\([\s\S]*?from public, anon, authenticated/i)
  assert.match(migration, /grant execute on function public\.complete_sale_idempotent[\s\S]*?to authenticated/i)
})
