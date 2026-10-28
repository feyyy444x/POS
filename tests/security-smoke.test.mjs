import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8')
const activation = await readFile(new URL('../netlify/functions/activate-invitation.mjs', import.meta.url), 'utf8')

test('Netlify headers include baseline browser security protections', () => {
  for (const directive of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'X-Frame-Options: DENY',
    'Permissions-Policy:',
    'Cross-Origin-Opener-Policy: same-origin',
    'Strict-Transport-Security:',
  ]) {
    assert.ok(headers.includes(directive), `Missing security header: ${directive}`)
  }
})

test('invitation activation rejects unsupported methods and malformed credentials', () => {
  assert.match(activation, /request\.method !== 'POST'/)
  assert.match(activation, /password\.length < 8/)
  assert.match(activation, /password\.length > 128/)
  assert.match(activation, /\[a-f0-9\]\{32\}/)
})

test('invitation activation compares hashed codes in constant time and disables response caching', () => {
  assert.match(activation, /timingSafeEqual/)
  assert.match(activation, /createHash\('sha256'\)/)
  assert.match(activation, /Cache-Control': 'no-store'/)
})

test('service-role credential is read only by the server-side Netlify function', () => {
  assert.match(activation, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(activation, /VITE_SUPABASE_SERVICE_ROLE_KEY/)
})
