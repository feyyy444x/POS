import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../supabase/migrations/20261106120000_convert_free_workspace_to_company_subscription.sql', import.meta.url), 'utf8')
const modal = await readFile(new URL('../src/WorkspaceConversionModal.jsx', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('conversion is a PIN-verified platform-admin RPC and excludes free workspace package keys', () => {
  assert.match(migration, /if not private\.is_super_admin\(\) then/i)
  assert.match(migration, /if not private\.is_pin_verified\(\) then/i)
  assert.match(migration, /Workspace Only Gratis Permanen tidak dapat diaktivasi ulang/i)
  assert.match(migration, /'single_workspace', 'free_workspace'/i)
  assert.match(migration, /for update;/i)
  assert.match(migration, /grant execute on function public\.convert_single_workspace_to_company[\s\S]*to authenticated/i)
})

test('conversion keeps the same store row and promotes it to the company primary workspace', () => {
  assert.match(migration, /update public\.stores[\s\S]*workspace_mode = 'nexaspace'[\s\S]*organization_id = v_org_id[\s\S]*is_primary_workspace = true/i)
  assert.match(migration, /insert into public\.platform_audit_logs/i)
  assert.doesNotMatch(migration, /delete from public\.(stores|products|orders|store_members)/i)
})

test('Admin conversion UI calls the guarded RPC and verifies returned store identity', () => {
  assert.match(modal, /convert_single_workspace_to_company/)
  assert.match(modal, /result\.store_id !== tenant\.id/)
  assert.match(app, /WorkspaceConversionModal/)
  assert.match(app, /setConversionTarget\(t\)/)
})
