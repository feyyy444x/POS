import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Single Workspace is a distinct store mode and bypasses Owner organization creation', async () => {
  const sql = await read('../supabase/migrations/20261101140000_single_workspace_subscription.sql')
  assert.match(sql, /workspace_mode in \('nexaspace', 'single_workspace'\)/)
  assert.match(sql, /if new\.workspace_mode = 'single_workspace' then[\s\S]*?new\.organization_id := null[\s\S]*?return new/i)
  const registration = sql.slice(sql.indexOf('create or replace function public.register_single_workspace'), sql.indexOf('revoke all on function public.register_single_workspace'))
  assert.match(registration, /workspace_mode[\s\S]*?'single_workspace'/)
  assert.doesNotMatch(registration, /insert into public\.owner_organizations/i)
})

test('Single Workspace activation is independent of organization package quota and expiry', async () => {
  const sql = await read('../supabase/migrations/20261101140000_single_workspace_subscription.sql')
  const activation = sql.slice(sql.indexOf('create or replace function public.activate_single_workspace'), sql.indexOf('revoke all on function public.activate_single_workspace'))
  assert.match(activation, /private\.is_super_admin\(\)/)
  assert.match(activation, /private\.is_pin_verified\(\)/)
  assert.match(activation, /workspace_mode = 'single_workspace'/)
  assert.match(activation, /organization_id = null/)
  assert.match(activation, /activation_package_key = 'single_workspace'/)
  assert.match(activation, /expires_at = now\(\) \+ make_interval\(days => p_duration_days\)/)
  assert.doesNotMatch(activation, /owner_organizations|location_limit/i)
})

test('Single Workspace Owner is registered through the normal owner membership and routed straight to POS workspace', async () => {
  const app = await read('../src/App.jsx')
  assert.match(app, /register_single_workspace/)
  assert.match(app, /activate_single_workspace/)
  assert.match(app, /workspace_mode==='single_workspace'/)
  assert.match(app, /if \(ownerOrganization && !isOwnerTenantWorkspace\) return <OwnerOrganizationCenter/)
  assert.match(app, /registrationModel==='single_workspace'/)
})

test('Single Workspace subscription is configurable in Admin and only public when activated there', async () => {
  const manager = await read('../src/SubscriptionPlanManager.jsx')
  const homepage = await read('../src/Homepage.jsx')
  const migration = await read('../supabase/migrations/20261101140000_single_workspace_subscription.sql')
  assert.match(manager, /package_key: 'single_workspace'/)
  assert.match(manager, /plan\.package_key==='single_workspace'\?1/)
  assert.match(homepage, /'single_workspace'\]\.includes/)
  assert.match(homepage, /plan\.key==='single_workspace'/)
  assert.match(migration, /'single_workspace'[\s\S]*?false, false, 0\)/)
})
