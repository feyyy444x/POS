import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const client = read('../src/lib/offlineLicense.js')
const server = read('../netlify/functions/offline-license.mjs')
const migration = read('../supabase/migrations/20261111150000_offline_license_grace_period.sql')
const admin = read('../src/SubscriptionPlanManager.jsx')

test('offline licenses are verified with the pinned Ed25519 public key', () => {
  assert.match(client, /VITE_ACOPOS_LICENSE_PUBLIC_KEY/)
  assert.match(client, /crypto\.subtle\.importKey/)
  assert.match(client, /crypto\.subtle\.verify/)
  assert.match(client, /Ed25519/)
  assert.doesNotMatch(client, /ACOPOS_LICENSE_PRIVATE_KEY/)
})

test('offline license issuer validates user membership and active subscription server-side', () => {
  assert.match(server, /admin\.auth\.getUser\(token\)/)
  assert.match(server, /replace\(\/\^Bearer\\s\+\/i/)
  assert.match(server, /membership\.disabled_at/)
  assert.match(server, /\['owner', 'admin', 'cashier'\]/)
  assert.match(server, /store_members/)
  assert.match(server, /membership\?\.is_active/)
  assert.match(server, /membership\.disabled_at/)
  assert.match(server, /owner_organizations/)
  assert.match(server, /site_activation_packages/)
  assert.match(server, /ACOPOS_LICENSE_PRIVATE_KEY/)
  assert.match(server, /asymmetricKeyType !== 'ed25519'/)
})

test('offline grace is bounded and defaults to 72 hours per activation package', () => {
  assert.match(migration, /offline_grace_hours integer not null default 72/)
  assert.match(migration, /between 0 and 168/)
  assert.match(admin, /offline_grace_hours/)
  assert.match(admin, /Grace period offline \(jam\)/)
})

test('offline license detects clock rollback and subscription/grace expiry', () => {
  assert.match(client, /CLOCK_SKEW_TOLERANCE_MS/)
  assert.match(client, /now \+ CLOCK_SKEW_TOLERANCE_MS < previousSeen/)
  assert.match(client, /subscriptionExpiresAt/)
  assert.match(client, /graceExpiry/)
  assert.match(client, /writable: false/)
})
