import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { verifyOfflineLicenseEnvelope, evaluateOfflineLicense } from '../src/lib/offlineLicense.js'

const issuedAt = '2026-11-11T10:00:00.000Z'
const payload = {
  schema: 1,
  storeId: '11111111-1111-4111-8111-111111111111',
  userId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  role: 'cashier',
  packageKey: 'starter',
  status: 'active',
  serverIssuedAt: issuedAt,
  subscriptionExpiresAt: '2026-12-11T10:00:00.000Z',
  offlineGraceHours: 72,
}

function signedEnvelope(value = payload) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const bytes = Buffer.from(JSON.stringify(value), 'utf8')
  const publicKeyBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  return {
    publicKeyBase64,
    envelope: {
      signedPayload: bytes.toString('base64'),
      signature: sign(null, bytes, privateKey).toString('base64'),
    },
  }
}

test('Ed25519 verifier accepts a valid server-signed license', async () => {
  const signed = signedEnvelope()
  const verified = await verifyOfflineLicenseEnvelope(signed.envelope, signed.publicKeyBase64)
  assert.equal(verified.storeId, payload.storeId)
  assert.equal(verified.userId, payload.userId)
  assert.equal(verified.offlineGraceHours, 72)
})

test('Ed25519 verifier rejects tampered payload bytes', async () => {
  const signed = signedEnvelope()
  const tampered = {
    ...signed.envelope,
    signedPayload: Buffer.from(JSON.stringify({ ...payload, status: 'active', offlineGraceHours: 168 })).toString('base64'),
  }
  await assert.rejects(
    verifyOfflineLicenseEnvelope(tampered, signed.publicKeyBase64),
    /tidak valid/i,
  )
})

test('offline license allows writes within the 72-hour grace window', () => {
  const now = Date.parse(issuedAt) + 71 * 60 * 60 * 1000
  const result = evaluateOfflineLicense(payload, { now })
  assert.equal(result.valid, true)
  assert.equal(result.writable, true)
})

test('offline license switches to read-only exactly at grace expiry', () => {
  const now = Date.parse(issuedAt) + 72 * 60 * 60 * 1000
  const result = evaluateOfflineLicense(payload, { now })
  assert.equal(result.valid, true)
  assert.equal(result.writable, false)
})

test('subscription expiry wins when it occurs before the offline grace period', () => {
  const expiring = { ...payload, subscriptionExpiresAt: '2026-11-11T11:00:00.000Z' }
  const result = evaluateOfflineLicense(expiring, { now: Date.parse('2026-11-11T11:00:00.000Z') })
  assert.equal(result.valid, true)
  assert.equal(result.writable, false)
})

test('offline license fails closed on clock rollback or malformed expiry', () => {
  const rollback = evaluateOfflineLicense(payload, { lastSeenAt: Date.parse(issuedAt) + 60 * 60 * 1000, now: Date.parse(issuedAt) })
  assert.equal(rollback.valid, false)
  assert.equal(rollback.clockRollback, true)
  const malformed = evaluateOfflineLicense({ ...payload, subscriptionExpiresAt: 'not-a-date' }, { now: Date.parse(issuedAt) })
  assert.equal(malformed.valid, false)
})
