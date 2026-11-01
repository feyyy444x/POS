import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Self Order customer QR route remains public while staff settings and inbox stay in their proper locations', async () => {
  const app = await read('../src/App.jsx')
  assert.ok(app.includes("if(screen==='self-order')return <SelfOrderPublic/>"))
  assert.ok(app.includes('<SelfOrderSettings store={store} settings={settings}'))
  assert.ok(app.includes('<SelfOrderManager store={store} onNotice={setNotice} embedded/>'))
  assert.ok(!app.includes("['self-order','Self Order'"))
  assert.ok(!app.includes("page==='self-order'&&<SelfOrderManager"))
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

test('Self Order manager controls and QRIS upload follow tenant storage permissions', async () => {
  const ui = await read('../src/SelfOrder.jsx')
  assert.match(ui, /export function SelfOrderSettings/)
  assert.match(ui, /self-order-qris-/)
  assert.match(ui, /Simpan pengaturan Self Order/)
  assert.match(ui, /QR Code pemesanan toko/)
  assert.match(ui, /upsert:false/)
  assert.match(ui, /storage\.from\('store-logos'\)\.upload/)
  assert.match(ui, /storage\.from\('store-logos'\)\.remove/)
})

test('Self Order staff status RPC is not executable by anonymous customers and foreign keys are indexed', async () => {
  const permissions = await read('../supabase/migrations/20261101083230_self_order_status_rpc_revoke_anon.sql')
  assert.match(permissions, /revoke execute on function public\.update_self_service_order_status\(uuid,text,text\) from anon/i)
  const indexes = await read('../supabase/migrations/20261101083319_self_order_foreign_key_indexes.sql')
  assert.match(indexes, /self_service_order_items_product_id_idx/)
  assert.match(indexes, /self_service_orders_pos_order_id_idx/)
  assert.match(indexes, /self_service_orders_queue_ticket_id_idx/)
  assert.match(indexes, /self_service_orders_verified_by_idx/)
})

test('Public Self Order catalog and checkout validate activation without requiring tenant membership', async () => {
  const fix = await read('../supabase/migrations/20261101100000_self_order_public_store_access_fix.sql')
  assert.ok(fix.includes('create or replace function private.is_store_publicly_available(target_store uuid)'))
  assert.ok(fix.includes("o.status = 'active'"))
  assert.ok(fix.includes('o.expires_at is null or o.expires_at > now()'))
  assert.ok(fix.includes('private.is_store_operational(p_store_id)'))
  assert.ok(fix.includes('private.is_store_publicly_available(p_store_id)'))
  assert.ok(fix.includes('replaced_count <> 2'))
})


test('Self Order settings live in Store Settings while cashier POS has a realtime inbox', async () => {
  const app = await read('../src/App.jsx')
  const ui = await read('../src/SelfOrder.jsx')
  assert.match(app, /SelfOrderSettings store=\{store\} settings=\{settings\}/)
  assert.match(app, /SelfOrderManager store=\{store\} onNotice=\{setNotice\} embedded/)
  assert.match(ui, /so-inbox-embedded/)
  assert.match(ui, /table:'self_service_orders'/)
  assert.match(ui, /setExpanded/)
})

test('Self Order order list uses pagination and keeps the rendered page bounded', async () => {
  const ui = await read('../src/SelfOrder.jsx')
  assert.match(ui, /const ORDER_PAGE_SIZE = 8/)
  assert.match(ui, /filtered\.slice\(\(page-1\)\*ORDER_PAGE_SIZE,page\*ORDER_PAGE_SIZE\)/)
  assert.match(ui, /so-pagination/)
  assert.match(ui, /Halaman \{page\} \/ \{pages\}/)
})


test('Customer Self Order product catalog is paginated to avoid a long stacked menu', async () => {
  const ui = await read('../src/SelfOrder.jsx')
  assert.match(ui, /const PRODUCT_PAGE_SIZE = 6/)
  assert.match(ui, /visibleProducts=selected\.slice\(\(productPage-1\)\*PRODUCT_PAGE_SIZE,productPage\*PRODUCT_PAGE_SIZE\)/)
  assert.match(ui, /so-product-pagination/)
  assert.match(ui, /setProductPage\(1\)/)
})


test('Self Order staff actions require the authenticated employee own open shift in the same tenant', async () => {
  const sql = await read('../supabase/migrations/20261101110000_require_open_shift_for_self_order_actions.sql')
  assert.ok(sql.includes('from public.cashier_shifts s'))
  assert.ok(sql.includes('s.store_id = v_order.store_id'))
  assert.ok(sql.includes('s.cashier_id = (select auth.uid())'))
  assert.ok(sql.includes('s.closed_at is null'))
  assert.ok(sql.includes('Buka shift kasir pribadi terlebih dahulu'))
  assert.ok(sql.includes('grant execute on function public.update_self_service_order_status(uuid, text, text)'))
  assert.ok(sql.includes('to authenticated'))
  assert.ok(sql.includes('from public, anon'))
  assert.doesNotMatch(sql, /grant execute[^;]*to anon/i)
})


test('homepage exposes a quote-based Paket Khusus without public price or tenant quota', async () => {
  const homepage = await read('../src/Homepage.jsx')
  const styles = await read('../src/homepage.css')
  assert.match(homepage, /Paket Khusus/)
  assert.match(homepage, /Masa aktif dapat disesuaikan/)
  assert.match(homepage, /Jumlah tenant sesuai kebutuhan/)
  assert.match(homepage, /contactCustom/)
  assert.match(styles, /living-plan-custom/)
  const customCard = homepage.slice(homepage.indexOf('className="living-plan living-plan-redesign living-plan-custom'), homepage.indexOf('{!activePromo && <div className="living-no-promo">'))
  assert.doesNotMatch(customCard, /money\(|location_limit|Kuota [0-9]/)
})

test('Super Admin activation supports Paket Khusus with a custom tenant quota', async () => {
  const app = await read('../src/App.jsx')
  assert.ok(app.includes("package_key: 'special', name: 'Khusus'"))
  assert.ok(app.includes("activationPackage==='special'"))
  assert.ok(app.includes("const packageKey=activationQuotaMode==='custom'?'custom':activationPackage"))
  assert.ok(app.includes('p_package_key:packageKey'))
  assert.ok(app.includes('Jumlah kuota tenant Paket Khusus'))
})

test('Khusus package activation accepts its own per-organization quota in backend', async () => {
  const sql = await read('../supabase/migrations/20261101120000_support_special_activation_package.sql')
  assert.ok(sql.includes("p_package_key in ('custom', 'special')"))
  assert.ok(sql.includes("set activation_package_key = p_package_key"))
  assert.ok(sql.includes("set activation_location_limit = v_location_limit"))
  assert.ok(sql.includes('p_location_limit > 1000'))
})
