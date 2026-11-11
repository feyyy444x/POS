import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL('../supabase/migrations/20261111143000_fix_disabled_staff_account_deletion.sql', import.meta.url),
  'utf8'
)

test('disabled staff deletion is restricted to inactive non-owner accounts', () => {
  assert.match(migration, /private\.is_super_admin\(\)/)
  assert.match(migration, /public\.super_admins[\s\S]*?user_id = p_user_id/)
  assert.match(migration, /private\.is_platform_staff_user\(p_user_id\)/)
  assert.match(migration, /m\.is_active = false[\s\S]*?m\.role <> 'owner'/)
  assert.match(migration, /m\.user_id = p_user_id and m\.is_active = true/)
  assert.match(migration, /cs\.cashier_id = p_user_id and cs\.closed_at is null/)
})

test('deletion removes invitations and memberships before the auth login', () => {
  const inviteDelete = migration.indexOf('delete from public.store_invites')
  const membershipDelete = migration.indexOf('delete from public.store_members')
  const authDelete = migration.indexOf('delete from auth.users')
  assert.ok(inviteDelete >= 0 && membershipDelete > inviteDelete && authDelete > membershipDelete)
})

test('support history is detached from auth users instead of cascading away', () => {
  assert.match(migration, /user_email_snapshot text/)
  assert.match(migration, /support_conversations_user_id_fkey[\s\S]*?on delete set null/i)
  assert.match(migration, /support_messages_user_id_fkey[\s\S]*?on delete set null/i)
  assert.match(migration, /support_messages_sender_id_fkey[\s\S]*?on delete set null/i)
  assert.match(migration, /alter column user_id drop not null/)
  assert.match(migration, /alter column sender_id drop not null/)
})

test('historical orders, completed shifts, and audit logs are not deleted by this migration', () => {
  assert.doesNotMatch(migration, /delete from public\.(orders|cashier_shifts|platform_audit_logs)/i)
})
