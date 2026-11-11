import test from 'node:test'
import assert from 'node:assert/strict'
import { syncOfflineCashOutbox } from '../src/lib/offlineSync.js'
import { OFFLINE_OUTBOX_STATUS as STATUS } from '../src/lib/offlineDatabase.js'

const baseRecord = () => ({
  requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  storeId: '11111111-1111-4111-8111-111111111111',
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  items: [{ product_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', quantity: 2 }],
  discount: 0,
  paymentMethod: 'cash',
  paidAmount: 20000,
  customerName: null,
  createQueue: false,
  estimatedTotal: 20000,
  createdAt: '2026-11-11T10:00:00.000Z',
  status: STATUS.PENDING,
  attempts: 0,
})

function memoryStorage(initial = [baseRecord()]) {
  const rows = new Map(initial.map(row => [row.requestId, structuredClone(row)]))
  return {
    rows,
    async listOfflineOutbox({ storeId, userId, statuses }) {
      return [...rows.values()].filter(row =>
        row.storeId === storeId && row.userId === userId && statuses.includes(row.status),
      ).map(structuredClone)
    },
    async updateOfflineOutboxRecord(id, userId, patch) {
      const row = rows.get(id)
      if (!row || row.userId !== userId) throw new Error('record scope mismatch')
      const updated = { ...row, ...patch }
      rows.set(id, updated)
      return updated
    },
  }
}

const scope = {
  storeId: '11111111-1111-4111-8111-111111111111',
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
}

test('sync sends cash transactions through the idempotent RPC and retains server acknowledgement', async () => {
  const storage = memoryStorage()
  let rpcArgs
  const supabase = { rpc: async (name, args) => {
    assert.equal(name, 'complete_sale_idempotent')
    rpcArgs = args
    return { data: { order: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', total: 20000, receipt_number: 'AP-001' } }, error: null }
  } }

  const result = await syncOfflineCashOutbox({ supabase, ...scope, storage })
  const saved = storage.rows.get(baseRecord().requestId)
  assert.equal(rpcArgs.p_request_id, baseRecord().requestId)
  assert.equal(rpcArgs.p_payment_method, 'cash')
  assert.equal(result.accepted, 1)
  assert.equal(saved.status, STATUS.ACCEPTED)
  assert.equal(saved.serverReceiptNumber, 'AP-001')
  assert.equal(saved.serverOrderId, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
})

test('server total mismatch is recorded as needs-review, not accepted', async () => {
  const storage = memoryStorage()
  const supabase = { rpc: async () => ({
    data: { order: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', total: 18000 } },
    error: null,
  }) }
  const result = await syncOfflineCashOutbox({ supabase, ...scope, storage })
  assert.equal(result.needsReview, 1)
  assert.equal(storage.rows.get(baseRecord().requestId).status, STATUS.NEEDS_REVIEW)
})

test('database authorization, shift, and stock errors are retained for human review', async () => {
  const storage = memoryStorage()
  const supabase = { rpc: async () => ({ data: null, error: { code: 'P0001', message: 'Shift kasir tidak aktif' } }) }
  const result = await syncOfflineCashOutbox({ supabase, ...scope, storage })
  assert.equal(result.needsReview, 1)
  assert.match(storage.rows.get(baseRecord().requestId).lastError, /Shift kasir/)
})

test('network failure returns the transaction to pending for safe idempotent retry', async () => {
  const storage = memoryStorage()
  const supabase = { rpc: async () => { throw new TypeError('Failed to fetch') } }
  const result = await syncOfflineCashOutbox({ supabase, ...scope, storage })
  const saved = storage.rows.get(baseRecord().requestId)
  assert.equal(result.pending, 1)
  assert.equal(saved.status, STATUS.PENDING)
  assert.equal(saved.attempts, 1)
})

test('sync rejects a missing authenticated server client before touching the outbox', async () => {
  const storage = memoryStorage()
  await assert.rejects(
    syncOfflineCashOutbox({ ...scope, storage }),
    /Koneksi server/,
  )
  assert.equal(storage.rows.get(baseRecord().requestId).status, STATUS.PENDING)
})
