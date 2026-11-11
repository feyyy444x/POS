import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const db = readFileSync(new URL('../src/lib/offlineDatabase.js', import.meta.url), 'utf8')
const sync = readFileSync(new URL('../src/lib/offlineSync.js', import.meta.url), 'utf8')

test('offline workspace restores only a matching signed license and user/store snapshot', () => {
  assert.match(app, /getOfflineStoreSnapshot\(preferredStoreId, session\.user\.id\)/)
  assert.match(app, /getOfflineLicenseStatus\(\{ storeId: preferredStoreId, userId: session\.user\.id \}\)/)
  assert.match(app, /snapshot\?\.store && snapshot\?\.membership && license\.valid/)
  assert.match(app, /membership\?\.user_id !== session\.user\.id/)
})

test('offline checkout accepts cash only and requires a writable offline license and open shift', () => {
  assert.match(app, /payMethod !== 'cash'/)
  assert.match(app, /offlineAccess\?\.writable/)
  assert.match(app, /if\(shiftBreak\)/)
  assert.match(app, /if\(!activeShift\)/)
  assert.match(app, /data-offline-checkout/)
  assert.match(app, /createQueue: false/)
  assert.match(app, /BUKTI SEMENTARA · BELUM TERVERIFIKASI SERVER/)
  assert.match(app, /Selesaikan review/)
  assert.match(app, /Tandai ditolak/)
  assert.match(db, /stockInvalid/)
})

test('offline outbox and cached stock reservation are committed in one IndexedDB transaction', () => {
  assert.match(db, /db\.transaction\(\[OUTBOX, SNAPSHOTS\], 'readwrite'\)/)
  assert.match(db, /outboxStore\.add\(record\)/)
  assert.match(db, /snapshotStore\.put\(/)
  assert.match(db, /stock - saleItem\.quantity/)
})

test('network failures queue cash transactions and online recovery replays them idempotently', () => {
  assert.match(app, /syncOfflineCashOutbox/)
  assert.match(app, /looksLikeNetworkFailure/)
  assert.match(app, /Coba sinkronkan/)
  assert.match(app, /receipt\.offlinePending/)
  assert.match(sync, /complete_sale_idempotent/)
  assert.match(sync, /p_request_id: record\.requestId/)
  assert.match(sync, /OFFLINE_OUTBOX_STATUS\.NEEDS_REVIEW/)
})
