import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/lib/offlineSync.js', import.meta.url),
  'utf8',
)

test('sync replays each durable request through the idempotent server RPC', () => {
  assert.match(source, /complete_sale_idempotent/)
  assert.match(source, /p_request_id:\s*record\.requestId/)
  assert.match(source, /p_payment_method:\s*'cash'/)
})

test('sync does not delete local outbox records after server acknowledgement', () => {
  assert.match(source, /updateOfflineOutboxRecord/)
  assert.doesNotMatch(source, /deleteOfflineOutboxRecord|\.delete\(/)
  assert.match(source, /serverOrderId:\s*order\.id/)
})

test('sync retains network failures for retry and flags database rejections for review', () => {
  assert.match(source, /const pending = !error\?\.code/)
  assert.match(source, /OFFLINE_OUTBOX_STATUS\.PENDING/)
  assert.match(source, /OFFLINE_OUTBOX_STATUS\.NEEDS_REVIEW/)
})

test('sync flags a server total mismatch instead of silently accepting it', () => {
  assert.match(source, /Math\.abs\(serverTotal - estimatedTotal\)/)
  assert.match(source, /Total server berbeda dari perkiraan lokal/)
})
