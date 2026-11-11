import test from 'node:test'
import assert from 'node:assert/strict'
import { IDBFactory } from 'fake-indexeddb'

globalThis.indexedDB = new IDBFactory()

const STORE = '11111111-1111-4111-8111-111111111111'
const USER = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const OTHER_USER = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const PRODUCT = 'cccccccc-3333-4333-8333-cccccccccccc'

// Seed the v1 schema to exercise the real upgrade path: snapshots are a
// disposable cache, but outbox rows and metadata must survive the v2 upgrade.
await new Promise((resolve, reject) => {
  const request = indexedDB.open('acopos-offline-pos', 1)
  request.onupgradeneeded = () => {
    const snapshots = request.result.createObjectStore('store_snapshots', { keyPath: 'storeId' })
    const outbox = request.result.createObjectStore('transaction_outbox', { keyPath: 'requestId' })
    outbox.createIndex('by_store', 'storeId', { unique: false })
    outbox.createIndex('by_store_status_created', ['storeId', 'status', 'createdAt'], { unique: false })
    outbox.createIndex('by_user', 'userId', { unique: false })
    request.result.createObjectStore('metadata', { keyPath: 'key' })
  }
  request.onerror = () => reject(request.error)
  request.onsuccess = () => {
    const database = request.result
    const transaction = database.transaction(['store_snapshots', 'transaction_outbox', 'metadata'], 'readwrite')
    transaction.objectStore('store_snapshots').put({ storeId: STORE, userId: USER, products: [{ id: PRODUCT, stock: 4 }] })
    transaction.objectStore('transaction_outbox').put({
      requestId: 'legacy-v1-outbox-record',
      storeId: STORE,
      userId: USER,
      status: 'pending_sync',
      createdAt: '2026-11-11T09:00:00.000Z',
      items: [{ product_id: PRODUCT, quantity: 1 }],
    })
    transaction.objectStore('metadata').put({ key: 'migration-check', value: 'preserved' })
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  }
})

const db = await import('../src/lib/offlineDatabase.js')

async function seedSnapshot({ storeId = STORE, userId = USER, stock = 10 } = {}) {
  await db.saveOfflineStoreSnapshot({
    storeId,
    userId,
    store: { id: storeId, status: 'active' },
    membership: { user_id: userId, role: 'cashier', is_active: true },
    products: [{ id: PRODUCT, name: 'Produk Uji', price: 10000, stock, is_active: true }],
    settings: { store_id: storeId, queue_enabled: false },
    activeShift: { id: 'shift-open', cashier_id: userId, closed_at: null },
    shiftBreak: null,
    serverValidatedAt: '2026-11-11T10:00:00.000Z',
  })
}

function sale(requestId, quantity = 2) {
  return {
    storeId: STORE,
    userId: USER,
    requestId,
    items: [{ product_id: PRODUCT, quantity, unit_price: 10000, product_name: 'Produk Uji' }],
    discount: 0,
    paidAmount: quantity * 10000,
    createQueue: false,
    estimatedTotal: quantity * 10000,
  }
}

test('real IndexedDB stores snapshots by store and user and commits a cash outbox sale atomically', async () => {
  await seedSnapshot()
  const requestId = 'dddddddd-4444-4444-8444-dddddddddddd'
  await db.enqueueOfflineCashSale(sale(requestId))
  const snapshot = await db.getOfflineStoreSnapshot(STORE, USER)
  const records = await db.listOfflineOutbox({ storeId: STORE, userId: USER })

  assert.equal(snapshot.products[0].stock, 8)
  assert.equal(records.length, 2)
  assert.ok(records.some(record => record.requestId === requestId))
  assert.ok(records.some(record => record.requestId === 'legacy-v1-outbox-record'))
  assert.equal(await db.getOfflineMetadata('migration-check'), 'preserved')
  const queuedSale = records.find(record => record.requestId === requestId)
  assert.equal(queuedSale.paymentMethod, 'cash')
  assert.equal(queuedSale.status, db.OFFLINE_OUTBOX_STATUS.PENDING)
  assert.equal(await db.getOfflineStoreSnapshot(STORE, OTHER_USER), null)
  assert.equal((await db.listOfflineOutbox({ storeId: STORE, userId: OTHER_USER })).length, 0)
})

test('re-enqueueing the same request ID does not reserve stock or create a second row', async () => {
  await seedSnapshot({ storeId: '22222222-2222-4222-8222-222222222222', userId: OTHER_USER })
  const requestId = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee'
  const payload = { ...sale(requestId), storeId: '22222222-2222-4222-8222-222222222222', userId: OTHER_USER }
  await db.enqueueOfflineCashSale(payload)
  await db.enqueueOfflineCashSale(payload)
  const snapshot = await db.getOfflineStoreSnapshot(payload.storeId, payload.userId)
  const records = await db.listOfflineOutbox({ storeId: payload.storeId, userId: payload.userId })
  assert.equal(snapshot.products[0].stock, 8)
  assert.equal(records.length, 1)
})

test('insufficient cached stock aborts both the snapshot reservation and outbox insert', async () => {
  const storeId = '33333333-3333-4333-8333-333333333333'
  await seedSnapshot({ storeId, userId: OTHER_USER, stock: 1 })
  const requestId = 'ffffffff-6666-4666-8666-ffffffffffff'
  await assert.rejects(
    db.enqueueOfflineCashSale({ ...sale(requestId, 2), storeId, userId: OTHER_USER }),
  )
  const snapshot = await db.getOfflineStoreSnapshot(storeId, OTHER_USER)
  const records = await db.listOfflineOutbox({ storeId, userId: OTHER_USER })
  assert.equal(snapshot.products[0].stock, 1)
  assert.equal(records.length, 0)
})

test('rejecting a server-rejected local sale restores provisional stock in the same IndexedDB transaction', async () => {
  const storeId = '44444444-4444-4444-8444-444444444444'
  await seedSnapshot({ storeId, userId: OTHER_USER })
  const requestId = '99999999-7777-4777-8777-999999999999'
  await db.enqueueOfflineCashSale({ ...sale(requestId), storeId, userId: OTHER_USER })
  await db.updateOfflineOutboxRecord(requestId, OTHER_USER, {
    status: db.OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW,
    lastError: 'Stock server berubah',
  })
  const rejected = await db.rejectOfflineOutboxRecord(requestId, OTHER_USER)
  const snapshot = await db.getOfflineStoreSnapshot(storeId, OTHER_USER)
  const records = await db.listOfflineOutbox({ storeId, userId: OTHER_USER })
  assert.equal(rejected.record.status, db.OFFLINE_OUTBOX_STATUS.REJECTED)
  assert.equal(rejected.stockRestored, true)
  assert.equal(snapshot.products[0].stock, 10)
  assert.equal(records[0].status, db.OFFLINE_OUTBOX_STATUS.REJECTED)
})

test('a sale already acknowledged by the server cannot be marked rejected locally', async () => {
  const storeId = '55555555-5555-4555-8555-555555555555'
  await seedSnapshot({ storeId, userId: OTHER_USER })
  const requestId = '88888888-8888-4888-8888-888888888888'
  await db.enqueueOfflineCashSale({ ...sale(requestId), storeId, userId: OTHER_USER })
  await db.updateOfflineOutboxRecord(requestId, OTHER_USER, {
    status: db.OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW,
    serverOrderId: '77777777-7777-4777-8777-777777777777',
  })
  await assert.rejects(db.rejectOfflineOutboxRecord(requestId, OTHER_USER))
  const records = await db.listOfflineOutbox({ storeId, userId: OTHER_USER })
  const snapshot = await db.getOfflineStoreSnapshot(storeId, OTHER_USER)
  assert.equal(records[0].status, db.OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW)
  assert.equal(snapshot.products[0].stock, 8)
})

test('manual rejection does not add provisional stock to a newer server snapshot', async () => {
  const storeId = '66666666-6666-4666-8666-666666666666'
  await seedSnapshot({ storeId, userId: OTHER_USER })
  const requestId = '12121212-1212-4212-8212-121212121212'
  await db.enqueueOfflineCashSale({ ...sale(requestId), storeId, userId: OTHER_USER })
  // The browser reconnects and replaces its cached stock with a newer,
  // authoritative server snapshot before the cashier rejects the old sale.
  await db.saveOfflineStoreSnapshot({
    storeId,
    userId: OTHER_USER,
    store: { id: storeId, status: 'active' },
    membership: { user_id: OTHER_USER, role: 'cashier', is_active: true },
    products: [{ id: PRODUCT, name: 'Produk Uji', price: 10000, stock: 6, is_active: true }],
    settings: { store_id: storeId, queue_enabled: false },
    activeShift: { id: 'shift-open', cashier_id: OTHER_USER, closed_at: null },
    shiftBreak: null,
    serverValidatedAt: '2026-11-11T11:00:00.000Z',
  })
  await db.updateOfflineOutboxRecord(requestId, OTHER_USER, {
    status: db.OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW,
    lastError: 'Server menolak transaksi',
  })
  const rejected = await db.rejectOfflineOutboxRecord(requestId, OTHER_USER)
  const snapshot = await db.getOfflineStoreSnapshot(storeId, OTHER_USER)
  assert.equal(rejected.stockRestored, false)
  assert.equal(snapshot.products[0].stock, 6, 'new server stock must not be inflated by a stale local reservation')
})
