import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/lib/offlineDatabase.js', import.meta.url),
  'utf8',
)

test('offline storage uses versioned IndexedDB stores for snapshots, outbox, and metadata', () => {
  assert.match(source, /DB_NAME\s*=\s*'acopos-offline-pos'/)
  assert.match(source, /DB_VERSION\s*=\s*2/)
  assert.match(source, /store_snapshots/)
  assert.match(source, /keyPath: \['storeId', 'userId'\]/)
  assert.match(source, /get\(\[storeId, userId\]\)/)
  assert.match(source, /transaction_outbox/)
  assert.match(source, /metadata/)
})

test('offline outbox is cash-only and persists a request ID before sync', () => {
  assert.match(source, /export async function enqueueOfflineCashSale/)
  assert.match(source, /paymentMethod:\s*'cash'/)
  assert.match(source, /status:\s*OFFLINE_OUTBOX_STATUS\.PENDING/)
  assert.match(source, /store\.add\(record\)/)
  assert.match(source, /requestId,/)
})

test('offline transaction payload is immutable after it enters the outbox', () => {
  assert.match(source, /Payload transaksi offline bersifat tetap/)
  assert.match(source, /const allowedKeys = new Set\(/)
  assert.doesNotMatch(source, /allowedKeys[\s\S]{0,250}items/)
})

test('offline records are partitioned by both store and authenticated user', () => {
  assert.match(source, /snapshot\.userId !== userId/)
  assert.match(source, /request\.oldVersion < 2[\s\S]*?db\.deleteObjectStore\(SNAPSHOTS\)/)
  assert.match(source, /record\.userId === userId/)
  assert.match(source, /existing\.storeId !== storeId \|\| existing\.userId !== userId/)
})
