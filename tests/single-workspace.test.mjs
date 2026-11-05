import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Single Workspace is a distinct store mode and bypasses Owner organization creation', async () => {
  const sql = await read('../supabase/migrations/20261102051423_single_workspace_subscription.sql')
  assert.match(sql, /workspace_mode in \('nexaspace', 'single_workspace'\)/)
  assert.match(sql, /if new\.workspace_mode = 'single_workspace' then[\s\S]*?new\.organization_id := null[\s\S]*?return new/i)
  assert.match(sql, /v_has_primary/)
  assert.match(sql, /is_primary_workspace = false/)
  assert.match(sql, /new\.is_primary_workspace := not v_has_primary/)
  const registration = sql.slice(sql.indexOf('create or replace function public.register_single_workspace'), sql.indexOf('revoke all on function public.register_single_workspace'))
  assert.match(registration, /workspace_mode[\s\S]*?'single_workspace'/)
  assert.doesNotMatch(registration, /insert into public\.owner_organizations/i)
})

test('Adding Single Workspace preserves the existing Khusus custom-tenant quota activation path', async () => {
  const sql = await read('../supabase/migrations/20261102051423_single_workspace_subscription.sql')
  const activation = sql.slice(sql.indexOf('create or replace function public.activate_store_tenant('), sql.indexOf('revoke all on function public.activate_store_tenant(uuid, integer, text, integer)'))
  assert.match(activation, /p_package_key in \('custom', 'special'\)/)
  assert.match(activation, /where package_key = p_package_key/)
  assert.match(activation, /v_location_limit := p_location_limit/)
  assert.match(activation, /p_location_limit < 1 or p_location_limit > 1000/)
  assert.match(activation, /Paket Khusus sedang nonaktif/)
})

test('Single Workspace activation is independent of organization package quota and expiry', async () => {
  const sql = await read('../supabase/migrations/20261102051423_single_workspace_subscription.sql')
  const activation = sql.slice(sql.indexOf('create or replace function public.activate_single_workspace'), sql.indexOf('revoke all on function public.activate_single_workspace'))
  assert.match(activation, /private\.is_super_admin\(\)/)
  assert.match(activation, /private\.is_pin_verified\(\)/)
  assert.match(activation, /workspace_mode = 'single_workspace'/)
  assert.match(activation, /organization_id = null/)
  assert.match(activation, /activation_package_key = 'single_workspace'/)
  assert.match(activation, /expires_at = now\(\) \+ make_interval\(days => p_duration_days\)/)
  assert.doesNotMatch(activation, /owner_organizations|p_location_limit|v_location_limit/i)
})

test('Single Workspace Owner is registered through the normal owner membership and routed straight to POS workspace', async () => {
  const app = await read('../src/App.jsx')
  assert.match(app, /register_single_workspace/)
  assert.match(app, /activate_single_workspace/)
  assert.match(app, /workspace_mode==='single_workspace'/)
  assert.match(app, /if \(ownerOrganization && !isOwnerTenantWorkspace\) return <OwnerOrganizationCenter/)
  assert.match(app, /registrationModel==='single_workspace'/)
  assert.match(app, /Single Workspace — mandiri/)
  assert.match(app, /Durasi aktivasi Single Workspace/)
  assert.match(app, /Perpanjang masa sewa Single Workspace/)
  assert.match(app, /member\.role === 'owner' && storeData\.workspace_mode !== 'single_workspace'/)
})

test('Single Workspace subscription is configurable in Admin and only public when activated there', async () => {
  const manager = await read('../src/SubscriptionPlanManager.jsx')
  const homepage = await read('../src/Homepage.jsx')
  const migration = await read('../supabase/migrations/20261102051423_single_workspace_subscription.sql')
  assert.match(manager, /package_key: 'single_workspace'/)
  assert.match(manager, /plan\.package_key==='single_workspace'\?1/)
  assert.match(manager, /Require Single Workspace prices before publishing the package|Isi harga harian, mingguan, bulanan, dan tahunan Single Workspace/)
  assert.match(homepage, /'single_workspace'\]\.includes/)
  assert.match(homepage, /key:\s*plan\.package_key/)
  assert.match(migration, /'single_workspace'[\s\S]*?false, false, 0\)/)
})


test('Public free registration provisions a standalone workspace with mandatory password and four-digit PIN', async () => {
  const migration = await read('../supabase/migrations/20261106100000_public_free_single_workspace_registration.sql')
  const handler = await read('../netlify/functions/register-free.mjs')
  const portal = await read('../src/AccessPortal.jsx')
  const app = await read('../src/App.jsx')
  const homepage = await read('../src/Homepage.jsx')
  assert.match(migration, /'free_workspace'/)
  assert.match(migration, /workspace_mode[\\s\\S]*?'single_workspace'/)
  assert.match(migration, /extensions\\.crypt\\(p_pin, extensions\\.gen_salt\\('bf'\\)\\)/)
  assert.match(migration, /grant execute on function public\\.create_free_single_workspace_registration\\(uuid,text,text,text,text\\) to service_role/)
  assert.doesNotMatch(migration, /grant execute on function public\\.create_free_single_workspace_registration[^;]* to anon/i)
  assert.match(handler, /password.length < 8/)
  assert.match(handler, /\\^\\\\d\\{4\\}\\$/)
  assert.match(handler, /create_free_single_workspace_registration/)
  assert.match(portal, /Pendaftaran Gratis/)
  assert.match(portal, /Konfirmasi password/)
  assert.match(portal, /Konfirmasi PIN/)
  assert.match(portal, /screen\\) === 'register'.*window.location\\.assign\\('\\/login'\\)/)
  assert.match(app, /if\\(screen==='register'\\)return <AuthScreen\\/>/)
  assert.match(homepage, /href="\\/\\?screen=register">Pendaftaran Gratis/)
})
