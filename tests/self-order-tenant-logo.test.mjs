import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const component = await readFile(new URL('src/SelfOrder.jsx', root), 'utf8')
const styles = await readFile(new URL('src/SelfOrder.css', root), 'utf8')
const migration = await readFile(new URL('supabase/migrations/20261111203000_self_order_public_tenant_logo.sql', root), 'utf8')

test('public Self Order renders the current tenant logo with a safe initial fallback', () => {
  assert.match(component, /catalog\.logo_url\?/)
  assert.match(component, /src=\{catalog\.logo_url\}/)
  assert.match(component, /catalog\.store_name\|\|"a"/)
  assert.match(styles, /\.so-brand-mark img/)
})

test('public catalog RPC returns only the selected store settings logo URL', () => {
  assert.match(migration, /'logo_url',\s*v_settings\.logo_url/)
  assert.match(migration, /where store_id = p_store_id/)
  assert.match(migration, /private\.is_store_publicly_available\(p_store_id\)/)
})
