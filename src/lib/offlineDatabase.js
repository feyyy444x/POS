const DB_NAME = 'acopos-offline-pos'
const DB_VERSION = 2

const SNAPSHOTS = 'store_snapshots'
const OUTBOX = 'transaction_outbox'
const META = 'metadata'

export const OFFLINE_OUTBOX_STATUS = Object.freeze({
  PENDING: 'pending_sync',
  SYNCING: 'syncing',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  NEEDS_REVIEW: 'needs_review',
})

const VALID_STATUSES = new Set(Object.values(OFFLINE_OUTBOX_STATUS))
let databasePromise

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'))
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'))
  })
}

export function isOfflineStorageAvailable() {
  return typeof indexedDB !== 'undefined'
}

export async function requestOfflineStoragePersistence() {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { supported: false, granted: false }
  }
  try {
    const alreadyPersistent = typeof navigator.storage.persisted === 'function'
      ? await navigator.storage.persisted()
      : false
    if (alreadyPersistent) return { supported: true, granted: true }
    if (typeof navigator.storage.persist !== 'function') {
      return { supported: false, granted: false }
    }
    return { supported: true, granted: Boolean(await navigator.storage.persist()) }
  } catch {
    return { supported: true, granted: false }
  }
}

export function openOfflineDatabase() {
  if (!isOfflineStorageAvailable()) {
    return Promise.reject(new Error('Penyimpanan offline tidak tersedia pada browser ini.'))
  }
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      // Snapshot data is a cache, so v1 snapshots can be safely rebuilt. Keep
      // the durable transaction outbox untouched during this key migration.
      if (request.oldVersion < 2 && db.objectStoreNames.contains(SNAPSHOTS)) {
        db.deleteObjectStore(SNAPSHOTS)
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS)) {
        const snapshots = db.createObjectStore(SNAPSHOTS, { keyPath: ['storeId', 'userId'] })
        snapshots.createIndex('by_user', 'userId', { unique: false })
        snapshots.createIndex('by_store', 'storeId', { unique: false })
      }

      if (!db.objectStoreNames.contains(OUTBOX)) {
        const outbox = db.createObjectStore(OUTBOX, { keyPath: 'requestId' })
        outbox.createIndex('by_store', 'storeId', { unique: false })
        outbox.createIndex('by_store_status_created', ['storeId', 'status', 'createdAt'], { unique: false })
        outbox.createIndex('by_user', 'userId', { unique: false })
      }

      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        databasePromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      databasePromise = null
      reject(request.error || new Error('Gagal membuka penyimpanan offline.'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('Pembaruan penyimpanan offline tertahan oleh tab acoPos lain. Tutup tab lain lalu coba lagi.'))
    }
  })

  return databasePromise
}

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(label + ' wajib tersedia untuk penyimpanan offline.')
  }
}

export async function saveOfflineStoreSnapshot({ storeId, userId, store, membership, products, settings, activeShift, shiftBreak, orders, queue, orderItems, serverValidatedAt }) {
  requireText(storeId, 'ID toko')
  requireText(userId, 'ID pengguna')
  if (!Array.isArray(products)) throw new Error('Daftar produk offline tidak valid.')
  if (!serverValidatedAt || Number.isNaN(Date.parse(serverValidatedAt))) {
    throw new Error('Waktu validasi server tidak valid.')
  }

  const db = await openOfflineDatabase()
  const transaction = db.transaction([SNAPSHOTS], 'readwrite')
  const done = transactionResult(transaction)
  transaction.objectStore(SNAPSHOTS).put({
    storeId,
    userId,
    store: store || null,
    membership: membership || null,
    products,
    settings: settings || null,
    activeShift: activeShift || null,
    shiftBreak: shiftBreak || null,
    orders: Array.isArray(orders) ? orders : [],
    queue: Array.isArray(queue) ? queue : [],
    orderItems: Array.isArray(orderItems) ? orderItems : [],
    serverValidatedAt,
    capturedAt: new Date().toISOString(),
    schemaVersion: DB_VERSION,
  })
  await done
}

export async function getOfflineStoreSnapshot(storeId, userId) {
  requireText(storeId, 'ID toko')
  requireText(userId, 'ID pengguna')
  const db = await openOfflineDatabase()
  const transaction = db.transaction([SNAPSHOTS], 'readonly')
  const done = transactionResult(transaction)
  const request = transaction.objectStore(SNAPSHOTS).get([storeId, userId])
  const snapshot = await requestResult(request)
  await done
  if (!snapshot || snapshot.userId !== userId) return null
  return snapshot
}

export async function enqueueOfflineCashSale({
  storeId,
  userId,
  requestId,
  items,
  discount = 0,
  paidAmount,
  customerName = null,
  createQueue = true,
  estimatedTotal,
  createdAt = new Date().toISOString(),
}) {
  requireText(storeId, 'ID toko')
  requireText(userId, 'ID pengguna')
  requireText(requestId, 'ID transaksi')
  if (!Array.isArray(items) || items.length === 0) throw new Error('Keranjang transaksi kosong.')
  if (items.some(item => !item || typeof item.product_id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new Error('Rincian produk transaksi offline tidak valid.')
  }
  if (items.some(item => item.unit_price != null && (!Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0))) {
    throw new Error('Harga perkiraan produk tidak valid.')
  }
  if (!Number.isFinite(Number(discount)) || Number(discount) < 0) throw new Error('Diskon tidak valid.')
  if (!Number.isFinite(Number(paidAmount)) || Number(paidAmount) < 0) throw new Error('Nominal pembayaran tidak valid.')
  if (!Number.isFinite(Number(estimatedTotal)) || Number(estimatedTotal) < 0) throw new Error('Total perkiraan tidak valid.')
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) throw new Error('Waktu transaksi tidak valid.')

  const record = {
    requestId,
    storeId,
    userId,
    items: items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price == null ? null : Number(item.unit_price),
      product_name: item.product_name == null ? null : String(item.product_name),
    })),
    discount: Number(discount),
    paymentMethod: 'cash',
    paidAmount: Number(paidAmount),
    customerName: customerName == null ? null : String(customerName),
    createQueue: createQueue !== false,
    estimatedTotal: Number(estimatedTotal),
    createdAt,
    updatedAt: createdAt,
    status: OFFLINE_OUTBOX_STATUS.PENDING,
    serverOrderId: null,
    serverReceiptNumber: null,
    serverTotal: null,
    lastError: null,
    attempts: 0,
    nextAttemptAt: null,
    schemaVersion: DB_VERSION,
  }

  const db = await openOfflineDatabase()
  const transaction = db.transaction([OUTBOX, SNAPSHOTS], 'readwrite')
  const done = transactionResult(transaction)
  const outboxStore = transaction.objectStore(OUTBOX)
  const snapshotStore = transaction.objectStore(SNAPSHOTS)
  const existingRequest = outboxStore.get(requestId)
  const snapshotRequest = snapshotStore.get([storeId, userId])

  let result
  let existingReady = false
  let snapshotReady = false
  let existing = null
  let snapshot = null
  const commitWhenReady = () => {
    if (!existingReady || !snapshotReady) return
    if (existing) {
      if (existing.storeId !== storeId || existing.userId !== userId) transaction.abort()
      else result = existing
      return
    }
    if (!snapshot || !Array.isArray(snapshot.products)) {
      transaction.abort()
      return
    }
    let stockInvalid = false
    const nextProducts = snapshot.products.map(product => {
      const saleItem = record.items.find(item => item.product_id === product.id)
      if (!saleItem) return product
      const stock = Number(product.stock)
      if (!Number.isFinite(stock) || stock < saleItem.quantity) {
        stockInvalid = true
        return product
      }
      return { ...product, stock: stock - saleItem.quantity }
    })
    if (stockInvalid || record.items.some(item => !snapshot.products.some(product => product.id === item.product_id))) {
      transaction.abort()
      return
    }
    outboxStore.add(record)
    snapshotStore.put({ ...snapshot, products: nextProducts, capturedAt: new Date().toISOString() })
    result = record
  }
  existingRequest.onsuccess = () => { existing = existingRequest.result; existingReady = true; commitWhenReady() }
  snapshotRequest.onsuccess = () => { snapshot = snapshotRequest.result; snapshotReady = true; commitWhenReady() }

  await done
  return result
}

export async function listOfflineOutbox({ storeId, userId, statuses } = {}) {
  requireText(storeId, 'ID toko')
  requireText(userId, 'ID pengguna')
  const db = await openOfflineDatabase()
  const transaction = db.transaction([OUTBOX], 'readonly')
  const done = transactionResult(transaction)
  const request = transaction.objectStore(OUTBOX).index('by_store').getAll(storeId)
  const records = await requestResult(request)
  await done
  const allowed = statuses ? new Set(statuses) : null
  return records
    .filter(record => record.userId === userId && (!allowed || allowed.has(record.status)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateOfflineOutboxRecord(requestId, userId, patch) {
  requireText(requestId, 'ID transaksi')
  requireText(userId, 'ID pengguna')
  if (!patch || typeof patch !== 'object') throw new Error('Perubahan status offline tidak valid.')
  if (patch.status && !VALID_STATUSES.has(patch.status)) throw new Error('Status transaksi offline tidak dikenal.')

  const allowedKeys = new Set([
    'status', 'updatedAt', 'serverOrderId', 'serverReceiptNumber',
    'serverTotal', 'lastError', 'attempts', 'nextAttemptAt',
  ])
  if (Object.keys(patch).some(key => !allowedKeys.has(key))) {
    throw new Error('Payload transaksi offline bersifat tetap dan tidak dapat diubah.')
  }

  const db = await openOfflineDatabase()
  const transaction = db.transaction([OUTBOX], 'readwrite')
  const done = transactionResult(transaction)
  const store = transaction.objectStore(OUTBOX)
  const request = store.get(requestId)
  let updated = null

  request.onsuccess = () => {
    const current = request.result
    if (!current || current.userId !== userId) {
      transaction.abort()
      return
    }
    updated = { ...current, ...patch, updatedAt: patch.updatedAt || new Date().toISOString() }
    store.put(updated)
  }

  await done
  return updated
}

export async function setOfflineMetadata(key, value) {
  requireText(key, 'Kunci metadata')
  const db = await openOfflineDatabase()
  const transaction = db.transaction([META], 'readwrite')
  const done = transactionResult(transaction)
  transaction.objectStore(META).put({ key, value, updatedAt: new Date().toISOString() })
  await done
}

export async function getOfflineMetadata(key) {
  requireText(key, 'Kunci metadata')
  const db = await openOfflineDatabase()
  const transaction = db.transaction([META], 'readonly')
  const done = transactionResult(transaction)
  const request = transaction.objectStore(META).get(key)
  const result = await requestResult(request)
  await done
  return result?.value ?? null
}

export async function rejectOfflineOutboxRecord(requestId, userId) {
  requireText(requestId, 'ID transaksi')
  requireText(userId, 'ID pengguna')
  const db = await openOfflineDatabase()
  const transaction = db.transaction([OUTBOX, SNAPSHOTS], 'readwrite')
  const done = transactionResult(transaction)
  const outboxStore = transaction.objectStore(OUTBOX)
  const snapshotStore = transaction.objectStore(SNAPSHOTS)
  const recordRequest = outboxStore.get(requestId)
  let recordReady = false
  let snapshotReady = false
  let record = null
  let snapshot = null
  let result = null

  const commitRejection = () => {
    if (!recordReady || !snapshotReady) return
    if (!record || record.userId !== userId || record.serverOrderId ||
        record.status !== OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW) {
      transaction.abort()
      return
    }

    let stockRestored = false
    const snapshotMatches = snapshot && snapshot.userId === userId && snapshot.storeId === record.storeId
    const allProductsPresent = snapshotMatches && record.items.every(item =>
      snapshot.products.some(product => product.id === item.product_id),
    )
    if (allProductsPresent) {
      const products = snapshot.products.map(product => {
        const rejectedItem = record.items.find(item => item.product_id === product.id)
        return rejectedItem
          ? { ...product, stock: Number(product.stock || 0) + rejectedItem.quantity }
          : product
      })
      snapshotStore.put({ ...snapshot, products, capturedAt: new Date().toISOString() })
      stockRestored = true
    }

    result = {
      ...record,
      status: OFFLINE_OUTBOX_STATUS.REJECTED,
      localStockRestored: stockRestored,
      lastError: 'Ditandai ditolak setelah pemeriksaan manual.',
      updatedAt: new Date().toISOString(),
    }
    outboxStore.put(result)
  }

  recordRequest.onsuccess = () => {
    record = recordRequest.result
    recordReady = true
    if (!record || record.userId !== userId || record.serverOrderId ||
        record.status !== OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW) {
      snapshotReady = true
      commitRejection()
      return
    }
    const snapshotRequest = snapshotStore.get([record.storeId, userId])
    snapshotRequest.onsuccess = () => {
      snapshot = snapshotRequest.result
      snapshotReady = true
      commitRejection()
    }
  }

  await done
  return result
}
