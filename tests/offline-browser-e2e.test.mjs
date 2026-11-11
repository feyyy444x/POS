import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const enabled = process.env.ACOPOS_RUN_OFFLINE_BROWSER_E2E === '1'

async function waitForServer(url, processHandle, label) {
  let lastError
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (processHandle.exitCode != null) throw new Error(label + ' exited before becoming ready.')
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw lastError || new Error(label + ' did not become ready.')
}

function startNpm(args) {
  return spawn('npm', args, { stdio: 'ignore', env: process.env })
}

test('Chromium keeps offline POS data across reload/restart and serves the cached PWA shell offline', { skip: !enabled }, async t => {
  const profile = await mkdtemp(join(tmpdir(), 'acopos-offline-chromium-'))
  const devServer = startNpm(['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'])
  const previewServer = startNpm(['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174', '--strictPort'])
  let context

  t.after(async () => {
    if (context) await context.close().catch(() => {})
    devServer.kill('SIGTERM')
    previewServer.kill('SIGTERM')
    await rm(profile, { recursive: true, force: true })
  })

  await Promise.all([
    waitForServer('http://127.0.0.1:4173/tests/offline-browser-fixture.html', devServer, 'Vite dev server'),
    waitForServer('http://127.0.0.1:4174/', previewServer, 'Vite preview server'),
  ])

  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    viewport: { width: 1280, height: 900 },
  })
  let page = context.pages()[0] || await context.newPage()
  await page.goto('http://127.0.0.1:4173/tests/offline-browser-fixture.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.offlineDatabaseReady === true)

  const seeded = await page.evaluate(async () => {
    const db = window.offlineDatabase
    const storeId = crypto.randomUUID()
    const userId = crypto.randomUUID()
    const productId = crypto.randomUUID()
    const requestId = crypto.randomUUID()
    await db.saveOfflineStoreSnapshot({
      storeId,
      userId,
      store: { id: storeId, status: 'active' },
      membership: { user_id: userId, role: 'cashier', is_active: true },
      products: [{ id: productId, name: 'Produk Browser', price: 15000, stock: 4, is_active: true }],
      settings: { store_id: storeId, queue_enabled: false },
      activeShift: { id: crypto.randomUUID(), cashier_id: userId, closed_at: null },
      shiftBreak: null,
      serverValidatedAt: new Date().toISOString(),
    })
    await db.enqueueOfflineCashSale({
      storeId,
      userId,
      requestId,
      items: [{ product_id: productId, quantity: 1, unit_price: 15000, product_name: 'Produk Browser' }],
      discount: 0,
      paidAmount: 15000,
      estimatedTotal: 15000,
      createQueue: false,
    })
    return { storeId, userId, requestId, productId }
  })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.offlineDatabaseReady === true)
  const afterReload = await page.evaluate(async ids => {
    const snapshot = await window.offlineDatabase.getOfflineStoreSnapshot(ids.storeId, ids.userId)
    const rows = await window.offlineDatabase.listOfflineOutbox({ storeId: ids.storeId, userId: ids.userId })
    return { stock: snapshot?.products?.find(item => item.id === ids.productId)?.stock, rows }
  }, seeded)
  assert.equal(afterReload.stock, 3, 'local stock reservation must survive a page reload')
  assert.equal(afterReload.rows.length, 1, 'pending sale must survive a page reload')
  assert.equal(afterReload.rows[0].requestId, seeded.requestId)

  await context.close()
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    viewport: { width: 1280, height: 900 },
  })
  page = context.pages()[0] || await context.newPage()
  await page.goto('http://127.0.0.1:4173/tests/offline-browser-fixture.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.offlineDatabaseReady === true)
  const afterRestart = await page.evaluate(async ids => {
    const snapshot = await window.offlineDatabase.getOfflineStoreSnapshot(ids.storeId, ids.userId)
    const rows = await window.offlineDatabase.listOfflineOutbox({ storeId: ids.storeId, userId: ids.userId })
    return { stock: snapshot?.products?.find(item => item.id === ids.productId)?.stock, count: rows.length }
  }, seeded)
  assert.equal(afterRestart.stock, 3, 'local stock reservation must survive a Chromium profile restart')
  assert.equal(afterRestart.count, 1, 'pending sale must survive a Chromium profile restart')

  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready
  })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 20000 })
  await context.setOffline(true)
  const offlineResponse = await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  assert.equal(offlineResponse?.status(), 200, 'cached SPA navigation should return HTTP 200 while offline')
  assert.equal(await page.locator('#root').count(), 1, 'cached app shell should remain available while offline')
})
