import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Self Order is available in the tenant workspace and public QR route', async () => {
  const app = await read('../src/App.jsx')
  assert.match(app, /\['self-order','Self Order',ShoppingBag\]/)
  assert.match(app, /page==='self-order'&&<SelfOrderManager/)
  assert.match(app, /if\(screen==='self-order'\)return <SelfOrderPublic\/>/)
  assert.match(app, /'self-order':'Self Order'/)
  assert.match(app, /'self-order'/)
})

test('Customer ordering reads public catalog and sends server-validated product IDs and quantities', async () => {
  const ui = await read('../src/SelfOrder.jsx')
  assert.match(ui, /rpc\('get_public_self_order_catalog'/)
  assert.match(ui, /rpc\('create_self_service_order'/)
  assert.match(ui, /rpc\('attach_self_service_payment_proof'/)
  assert.match(ui, /storage\.from\('self-order-proofs'\)\.upload/)
  assert.match(ui, /proof\.size>5\*1024\*1024/)
  assert.doesNotMatch(ui, /select\('stock'\)/)
})

test('Tenant staff can verify and progress orders through the guarded status RPC', async () => {
  const ui = await read('../src/SelfOrder.jsx')
  assert.match(ui, /rpc\('update_self_service_order_status'/)
  assert.match(ui, /'approve'/)
  assert.match(ui, /'reject'/)
  assert.match(ui, /'preparing'/)
  assert.match(ui, /'ready'/)
  assert.match(ui, /'completed'/)
  assert.match(ui, /createSignedUrl\(row\.payment_proof_path,900\)/)
  assert.match(ui, /QRCode\.toDataURL/)
})

test('Self Order migration enforces tenant isolation, private proofs, stock reservations and POS settlement', async () => {
  const sql = await read('../supabase/migrations/20261101083205_self_order_module.sql')
  assert.match(sql, /alter table public\.self_service_orders enable row level security/i)
  assert.match(sql, /private\.is_store_member\(store_id\)/)
  assert.match(sql, /create policy "public customers upload self order payment proof"/)
  assert.match(sql, /values\('self-order-proofs','self-order-proofs',false/)
  assert.match(sql, /grant execute on function public\.create_self_service_order\(uuid,text,text,text,jsonb\) to anon, authenticated/i)
  assert.match(sql, /grant execute on function public\.attach_self_service_payment_proof\(uuid,uuid,text\) to anon, authenticated/i)
  assert.match(sql, /for update/)
  assert.match(sql, /stock=stock-v_item\.quantity/)
  assert.match(sql, /stock=p\.stock\+i\.quantity/)
  assert.match(sql, /insert into public\.orders/)
  assert.match(sql, /insert into public\.order_items/)
  assert.match(sql, /insert into public\.queue_tickets/)
  assert.match(sql, /private\.is_pin_verified\(\)/)
  assert.match(sql, /capture_self_service_order_audit/)
  assert.match(sql, /alter publication supabase_realtime add table public\.self_service_orders/)
  assert.match(sql, /revoke all on public\.self_service_orders from anon, authenticated/i)
})
