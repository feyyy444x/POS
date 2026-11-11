import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../supabase/migrations/20261111140000_expand_audit_coverage_and_redact_pii.sql', import.meta.url), 'utf8')

test('audit coverage includes tenant, transaction, platform, support and PIN security events', () => {
  for (const table of [
    'cashier_break_settings','cashier_manual_alerts','cashier_shift_breaks',
    'order_items','self_service_order_items','store_tv_settings',
    'site_subscription_plans','super_admins','support_channel_settings',
    'support_knowledge_base','support_messages','support_conversations',
    'user_security_pins','user_pin_attempt_limits',
  ]) {
    assert.match(migration, new RegExp('audit_' + table + '_'))
  }
  assert.match(migration, /public\.orders o[\s\S]*o\.id = coalesce[\s\S]*order_id/)
  assert.match(migration, /public\.self_service_orders o[\s\S]*self_service_order_id/)
})

test('audit snapshots redact personal data, message bodies, payment paths and credentials', () => {
  for (const field of [
    'pin_hash','password','activation_code_hash','public_token','access_token',
    'user_email','owner_email','full_name','phone','whatsapp_number',
    'telegram_username','address','customer_phone','customer_notes',
    'message','manual_alert_message','payment_proof_path','qris_image_url',
    'storage_path','source_url',
  ]) {
    assert.ok(migration.includes("- '" + field + "'"), 'Missing audit redaction: ' + field)
  }
  assert.match(migration, /v_actor_user_id/)
  assert.match(migration, /sender_id/)
})
