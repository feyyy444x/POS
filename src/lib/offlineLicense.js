import { getOfflineMetadata, setOfflineMetadata } from './offlineDatabase.js'

const LICENSE_KEY = (storeId, userId) => 'license:' + storeId + ':' + userId
const CLOCK_KEY = (storeId, userId) => 'clock:' + storeId + ':' + userId
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000

function fromBase64(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function configuredPublicKey() {
  return String(import.meta.env?.VITE_ACOPOS_LICENSE_PUBLIC_KEY || '').trim()
}

export async function verifyOfflineLicenseEnvelope(envelope, pinnedPublicKey = configuredPublicKey()) {
  const publicKey = String(pinnedPublicKey || '').trim()
  if (!publicKey) throw new Error('Kunci verifikasi lisensi offline belum dikonfigurasi.')
  if (!envelope?.signedPayload || !envelope?.signature) throw new Error('Lisensi offline tidak lengkap.')
  const key = await crypto.subtle.importKey(
    'spki',
    fromBase64(publicKey),
    { name: 'Ed25519' },
    false,
    ['verify'],
  )
  const signedBytes = fromBase64(envelope.signedPayload)
  const valid = await crypto.subtle.verify(
    { name: 'Ed25519' },
    key,
    fromBase64(envelope.signature),
    signedBytes,
  )
  if (!valid) throw new Error('Tanda tangan lisensi offline tidak valid.')
  const payload = JSON.parse(new TextDecoder().decode(signedBytes))
  if (payload?.schema !== 1 || !payload.storeId || !payload.userId || !payload.serverIssuedAt) {
    throw new Error('Struktur lisensi offline tidak valid.')
  }
  return payload
}

export async function validateAndStoreOfflineLicense(envelope, { storeId, userId }) {
  const payload = await verifyOfflineLicenseEnvelope(envelope)
  if (payload.storeId !== storeId || payload.userId !== userId) {
    throw new Error('Lisensi offline bukan milik akun dan toko yang sedang dibuka.')
  }
  if (payload.status !== 'active') throw new Error('Toko atau perusahaan tidak aktif. Mode offline hanya-baca.')
  await setOfflineMetadata(LICENSE_KEY(storeId, userId), envelope)
  await setOfflineMetadata(CLOCK_KEY(storeId, userId), { lastSeenAt: Date.now() })
  return payload
}

export function evaluateOfflineLicense(payload, { lastSeenAt = 0, now = Date.now() } = {}) {
  const previousSeen = Number(lastSeenAt || 0)
  if (previousSeen && now + CLOCK_SKEW_TOLERANCE_MS < previousSeen) {
    return { valid: false, writable: false, clockRollback: true, reason: 'Perubahan jam perangkat terdeteksi. Sambungkan internet untuk validasi ulang.' }
  }
  const issuedAt = Date.parse(payload?.serverIssuedAt)
  const graceHours = Number(payload?.offlineGraceHours)
  const subscriptionExpiry = payload?.subscriptionExpiresAt ? Date.parse(payload.subscriptionExpiresAt) : Infinity
  if (!Number.isFinite(issuedAt) || !Number.isInteger(graceHours) || graceHours < 0 || graceHours > 168 ||
      (payload?.subscriptionExpiresAt && !Number.isFinite(subscriptionExpiry))) {
    return { valid: false, writable: false, reason: 'Data masa tenggang lisensi tidak valid.' }
  }
  const graceExpiry = issuedAt + graceHours * 60 * 60 * 1000
  const validUntil = Math.min(graceExpiry, subscriptionExpiry)
  if (now >= validUntil) {
    return { valid: true, writable: false, payload, validUntil, reason: 'Masa offline berakhir. Sambungkan internet untuk mengaktifkan kembali operasi.' }
  }
  return { valid: true, writable: true, payload, validUntil, reason: '' }
}

export async function getOfflineLicenseStatus({ storeId, userId, now = Date.now() }) {
  const envelope = await getOfflineMetadata(LICENSE_KEY(storeId, userId))
  if (!envelope) return { valid: false, writable: false, reason: 'Lisensi offline belum pernah divalidasi saat online.' }
  let payload
  try {
    payload = await verifyOfflineLicenseEnvelope(envelope)
  } catch (error) {
    return { valid: false, writable: false, reason: error?.message || 'Lisensi offline tidak dapat diverifikasi.' }
  }
  if (payload.storeId !== storeId || payload.userId !== userId) {
    return { valid: false, writable: false, reason: 'Lisensi offline tidak cocok dengan akun atau toko.' }
  }
  const clock = await getOfflineMetadata(CLOCK_KEY(storeId, userId))
  const lastSeenAt = Number(clock?.lastSeenAt || 0)
  const evaluation = evaluateOfflineLicense(payload, { lastSeenAt, now })
  if (evaluation.valid && !evaluation.clockRollback) {
    await setOfflineMetadata(CLOCK_KEY(storeId, userId), { lastSeenAt: Math.max(now, lastSeenAt) })
  }
  return evaluation
}
