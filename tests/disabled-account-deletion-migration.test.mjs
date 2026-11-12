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

test('deletion locks the Auth account and its memberships before eligibility checks', () => {
  assert.match(migration, /from auth\.users u[\s\S]*?for update/i)
  assert.match(migration, /from public\.store_members m[\s\S]*?for update/i)
  assert.match(migration, /from public\.owner_organizations o[\s\S]*?for update/i)
})

test('deletion removes invitations and memberships before the auth login', () => {
  const inviteDelete = migration.indexOf('delete from public.store_invites')
  const membershipDelete = migration.indexOf('delete from public.store_members')
  const auditInsert = migration.indexOf('insert into public.platform_audit_logs')
  const authDelete = migration.indexOf('delete from auth.users')
  assert.ok(inviteDelete >= 0 && membershipDelete > inviteDelete)
  assert.ok(auditInsert > membershipDelete && authDelete > auditInsert)
})

test('support history keeps its original thread and message identifiers after account deletion', () => {
  assert.match(migration, /user_email_snapshot text/)
  assert.match(migration, /drop constraint if exists support_conversations_user_id_fkey/i)
  assert.match(migration, /drop constraint if exists support_messages_user_id_fkey/i)
  assert.match(migration, /drop constraint if exists support_messages_sender_id_fkey/i)
  assert.doesNotMatch(migration, /alter column (user_id|sender_id) drop not null/i)
  assert.doesNotMatch(migration, /on delete set null/i)
})

test('storage objects are never deleted by SQL and account deletion reports owned files clearly', () => {
  assert.match(migration, /from storage\.objects so[\s\S]*?so\.owner_id = p_user_id::text[\s\S]*?so\.owner = p_user_id/i)
  assert.match(migration, /Pindahkan kepemilikan file melalui Storage/i)
  assert.doesNotMatch(migration, /delete from storage\.objects/i)
})

test('historical orders, shifts, and audit logs are not deleted', () => {
  assert.doesNotMatch(migration, /delete from public\.(orders|cashier_shifts|platform_audit_logs)/i)
  assert.match(migration, /insert into public\.platform_audit_logs/i)
})
