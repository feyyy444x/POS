import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const app = await readFile(new URL('src/App.jsx', root), 'utf8')
const mirror = await readFile(new URL('src/CustomerOrderMirror.jsx', root), 'utf8')
const migration = await readFile(new URL('supabase/migrations/20261111170000_pos_order_customer_mirror_and_notes.sql', root), 'utf8')
const styles = await readFile(new URL('src/styles.css', root), 'utf8')

test('cashier can open a separate customer mirror screen for the active tenant', () => {
  assert.match(app, /screen=order-mirror&store=/)
  assert.match(app, /if\(screen==='order-mirror'\)return <CustomerOrderMirror\/>/)
  assert.match(mirror, /new URLSearchParams\(window\.location\.search\)\.get\('store'\)/)
})

test('cashier draft updates are shared with the mirror without exposing authenticated data', () => {
  assert.match(app, /new BroadcastChannel\('acopos-order-mirror-'\+store\.id\)/)
  assert.match(app, /acoPos-order-mirror-v1:/)
  assert.match(mirror, /channel\.onmessage/)
  assert.match(mirror, /window\.addEventListener\('storage'/)
})

test('POS supports optional per-item notes and a whole-order note', () => {
  assert.match(app, /updateCartNote/)
  assert.match(app, /p_items:cart\.map\(i=>\(\{product_id:i\.id,quantity:i\.quantity,note:i\.note\|\|''\}\)\)/)
  assert.match(app, /p_customer_note:orderNote\.trim\(\)\|\|null/)
  assert.match(mirror, /item\.note\?\.trim\(\)/)
  assert.match(mirror, /draft\?\.orderNote\?\.trim\(\)/)
})

test('order notes are persisted with bounded lengths and displayed on receipts', () => {
  assert.match(migration, /add column if not exists note text not null default ''/)
  assert.match(migration, /add column if not exists customer_note text/)
  assert.match(migration, /left\(trim\(coalesce\(v_item->>'note',''\)\),300\)/)
  assert.match(migration, /length\(coalesce\(p_customer_note,''\)\) > 500/)
  assert.match(migration, /customer_note = nullif\(v_customer_note,''\)/)
  assert.match(app, /i\.note\?\.trim\(\).*Catatan:/s)
  assert.match(app, /order\.customer_note\?\.trim\(\).*CATATAN PESANAN/s)
})

test('authentication forms are excluded from draft persistence and beforeunload warnings', () => {
  assert.match(app, /const isDraftEligibleForm = \(form\) =>/)
  assert.match(app, /input\[type="password"\]/)
  assert.match(app, /if \(form && isDraftEligibleForm\(form\) && !isSensitive\(field\)\) saveForm\(form\)/)
  assert.match(app, /isDraftEligibleForm\(form\) && form\.dataset\.acoPosDirty === 'true'/)
})

test('dual-screen mode detects a second monitor and falls back safely when unavailable', () => {
  assert.match(app, /window\.getScreenDetails\(\)/)
  assert.match(app, /displayWindow\.moveTo\(target\.availLeft, target\.availTop\)/)
  assert.match(app, /displayWindow\.resizeTo\(target\.availWidth/)
  assert.match(app, /Browser belum mendukung deteksi monitor otomatis/)
  assert.match(app, /Browser memblokir jendela layar pelanggan/)
  assert.match(app, /onClick=\{openCustomerDisplay\}/)
})

test('customer display supports fullscreen mode for a customer-facing monitor', () => {
  assert.match(mirror, /requestFullscreen\(\)/)
  assert.match(mirror, /exitFullscreen\(\)/)
  assert.match(mirror, /Layar penuh/)
})

test('customer mirror has responsive styling and live status indicators', () => {
  assert.match(styles, /\.pos-heading-actions/)
  assert.match(styles, /\.cart-item-note/)
  assert.match(mirror, /TERHUBUNG/)
  assert.match(mirror, /order-mirror-grand/)
})
