import {
  listOfflineOutbox,
  updateOfflineOutboxRecord,
  OFFLINE_OUTBOX_STATUS,
} from './offlineDatabase'

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function errorMessage(error) {
  return String(error?.message || error?.details || 'Sinkronisasi belum berhasil.')
}

export async function syncOfflineCashOutbox({
  supabase,
  storeId,
  userId,
  onRecordUpdate,
} = {}) {
  if (!supabase?.rpc) throw new Error('Koneksi server acoPos belum siap.')
  if (!storeId || !userId) throw new Error('Identitas toko dan pengguna wajib tersedia.')
  if (!isOnline()) {
    return { processed: 0, accepted: 0, needsReview: 0, pending: 0, offline: true }
  }

  const records = await listOfflineOutbox({
    storeId,
    userId,
    statuses: [OFFLINE_OUTBOX_STATUS.PENDING, OFFLINE_OUTBOX_STATUS.SYNCING],
  })

  const summary = { processed: 0, accepted: 0, needsReview: 0, pending: 0, offline: false }

  for (const record of records) {
    if (!isOnline()) {
      summary.pending += records.length - summary.processed
      break
    }

    summary.processed += 1
    const attempts = Number(record.attempts || 0) + 1
    await updateOfflineOutboxRecord(record.requestId, userId, {
      status: OFFLINE_OUTBOX_STATUS.SYNCING,
      attempts,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })

    let response
    try {
      response = await supabase.rpc('complete_sale_idempotent', {
        p_store_id: record.storeId,
        p_items: record.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        p_discount: record.discount,
        p_payment_method: 'cash',
        p_paid_amount: record.paidAmount,
        p_customer_name: record.customerName,
        p_create_queue: record.createQueue !== false,
        p_request_id: record.requestId,
      })
    } catch (error) {
      const pending = !error?.code
      await updateOfflineOutboxRecord(record.requestId, userId, {
        status: pending ? OFFLINE_OUTBOX_STATUS.PENDING : OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW,
        lastError: errorMessage(error),
        updatedAt: new Date().toISOString(),
      })
      if (pending) summary.pending += 1
      else summary.needsReview += 1
      onRecordUpdate?.(record.requestId, pending ? 'pending_sync' : 'needs_review')
      continue
    }

    if (response.error) {
      // A database rejection is not retried blindly: it may be a shift, tenant,
      // product, price, or stock conflict that needs a human decision.
      const needsReview = Boolean(response.error.code)
      await updateOfflineOutboxRecord(record.requestId, userId, {
        status: needsReview ? OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW : OFFLINE_OUTBOX_STATUS.PENDING,
        lastError: errorMessage(response.error),
        updatedAt: new Date().toISOString(),
      })
      if (needsReview) summary.needsReview += 1
      else summary.pending += 1
      onRecordUpdate?.(record.requestId, needsReview ? 'needs_review' : 'pending_sync')
      continue
    }

    const order = response.data?.order || response.data
    if (!order?.id) {
      await updateOfflineOutboxRecord(record.requestId, userId, {
        status: OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW,
        lastError: 'Server tidak mengembalikan identitas transaksi yang dapat diverifikasi.',
        updatedAt: new Date().toISOString(),
      })
      summary.needsReview += 1
      onRecordUpdate?.(record.requestId, 'needs_review')
      continue
    }

    const serverTotal = Number(order.total)
    const estimatedTotal = Number(record.estimatedTotal)
    const totalMatches = Number.isFinite(serverTotal) && Math.abs(serverTotal - estimatedTotal) < 0.01
    const status = totalMatches ? OFFLINE_OUTBOX_STATUS.ACCEPTED : OFFLINE_OUTBOX_STATUS.NEEDS_REVIEW

    await updateOfflineOutboxRecord(record.requestId, userId, {
      status,
      serverOrderId: order.id,
      serverReceiptNumber: order.receipt_number || null,
      serverTotal: Number.isFinite(serverTotal) ? serverTotal : null,
      lastError: totalMatches
        ? null
        : 'Total server berbeda dari perkiraan lokal. Periksa transaksi dan struk sebelum menutup rekonsiliasi.',
      updatedAt: new Date().toISOString(),
    })

    if (totalMatches) summary.accepted += 1
    else summary.needsReview += 1
    onRecordUpdate?.(record.requestId, status)
  }

  return summary
}
