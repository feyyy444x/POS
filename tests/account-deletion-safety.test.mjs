import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { userFacingError } from '../src/lib/userFacingError.js'

test('account deletion explains Supabase Auth and Storage ownership blockers', () => {
  const message = userFacingError(
    { message: 'Database error deleting user' },
    'generic fallback',
  )
  assert.match(message, /Supabase menolak penghapusan akun/i)
  assert.match(message, /Storage/i)
  assert.match(message, /riwayat transaksi tidak dihapus/i)
})

test('account deletion explains explicit Storage ownership errors without deleting files', () => {
  const message = userFacingError(
    { message: 'User still owns objects in storage.objects' },
    'generic fallback',
  )
  assert.match(message, /file di Storage/i)
  assert.match(message, /tidak dihapus otomatis/i)
})

test('account deletion migration checks both current and legacy Storage owner columns', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112001000_harden_account_tenant_lifecycle.sql', import.meta.url),
    'utf8',
  )
  assert.match(migration, /owner_id::text = \$1/)
  assert.match(migration, /owner::text = \$1/)
  assert.match(migration, /Akun masih memiliki file Storage/)
})

test('disabled-account deletion uses the same guarded permanent-deletion path', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112001000_harden_account_tenant_lifecycle.sql', import.meta.url),
    'utf8',
  )
  const disabledFunction = migration.slice(migration.indexOf('create or replace function public.super_admin_delete_disabled_account'))
  assert.match(disabledFunction, /private\.is_pin_verified\(\)/)
  assert.match(disabledFunction, /perform public\.super_admin_delete_user\(p_user_id\)/)
})


test('employee deletion removes active memberships atomically and revokes Auth sessions', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112001000_harden_account_tenant_lifecycle.sql', import.meta.url),
    'utf8',
  )
  const start = migration.indexOf('create or replace function public.super_admin_delete_user_before_storage_guard')
  const end = migration.indexOf('create or replace function public.super_admin_delete_user(p_user_id uuid)', start)
  assert.ok(start >= 0 && end > start, 'guarded employee deletion implementation exists')
  const employeeDelete = migration.slice(start, end)
  assert.match(employeeDelete, /from auth\.users u where u\.id = p_user_id for update/i)
  assert.match(employeeDelete, /from public\.store_members m[\s\S]*?for update/i)
  assert.match(employeeDelete, /from public\.cashier_shifts cs[\s\S]*?cs\.closed_at is null/i)
  assert.match(employeeDelete, /delete from auth\.sessions where user_id = p_user_id/i)
  assert.match(employeeDelete, /delete from public\.store_members where user_id = p_user_id/i)
  assert.match(employeeDelete, /delete from auth\.users where id = p_user_id/i)
  assert.doesNotMatch(employeeDelete, /Nonaktifkan atau hapus semua keanggotaan tenant aktif terlebih dahulu/)
  assert.match(employeeDelete, /private\.delete_owner_account_and_organization\(p_user_id\)/)
})

test('disabled employee account deletion no longer requires manual membership deactivation', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112001000_harden_account_tenant_lifecycle.sql', import.meta.url),
    'utf8',
  )
  const disabledFunction = migration.slice(migration.indexOf('create or replace function public.super_admin_delete_disabled_account'))
  assert.doesNotMatch(disabledFunction, /Akun masih memiliki keanggotaan tenant aktif/)
  assert.match(disabledFunction, /perform public\.super_admin_delete_user\(p_user_id\)/)
})
