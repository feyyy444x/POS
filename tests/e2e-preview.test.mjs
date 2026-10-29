import test from 'node:test'
import assert from 'node:assert/strict'

const baseUrl = (process.env.NEXAPOS_E2E_BASE_URL || 'https://deploy-preview-15--posfeyyy.netlify.app').replace(/\/$/, '')
const activationUrl = new URL('/.netlify/functions/activate-invitation', baseUrl)

async function getReachableApp() {
  let lastError
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
      if (response.ok) return response
      lastError = new Error(`Homepage returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
  throw lastError || new Error('Preview did not become reachable')
}

test('deployed preview serves the NexaPos entry page and application bundle', async () => {
  const response = await getReachableApp()
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /<div id="root">|id="root"/i)
  assert.match(html, /<script[^>]+type="module"[^>]+src=/i)
  const scriptPath = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)?.[1]
  assert.ok(scriptPath, 'Expected a Vite module entry script')
  const scriptResponse = await fetch(new URL(scriptPath, baseUrl), { signal: AbortSignal.timeout(15000) })
  assert.equal(scriptResponse.status, 200, 'Application entry script should be served')
})

test('deployed preview sends baseline browser security headers', async () => {
  const requiredHeaders = [
    ['x-content-type-options', /nosniff/i],
    ['x-frame-options', /deny|sameorigin/i],
    ['referrer-policy', /strict-origin-when-cross-origin|no-referrer/i],
    ['strict-transport-security', /max-age=\d+/i],
    ['permissions-policy', /camera=\(\)/i],
  ]
  let response
  let missing = requiredHeaders.map(([name]) => name)
  // Netlify deploy previews update asynchronously after the GitHub push. Poll for
  // the new deployment rather than failing immediately against the previous build.
  for (let attempt = 0; attempt < 9; attempt += 1) {
    response = await getReachableApp()
    missing = requiredHeaders
      .filter(([name, pattern]) => !pattern.test(response.headers.get(name) || ''))
      .map(([name]) => name)
    if (missing.length === 0) break
    if (attempt < 8) await new Promise(resolve => setTimeout(resolve, 10000))
  }
  assert.deepEqual(missing, [], `Preview is missing browser security headers: ${missing.join(', ')}`)
})

test('activation endpoint rejects GET without touching invitation data', async () => {
  const response = await fetch(activationUrl, { method: 'GET', signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 405)
  assert.match(response.headers.get('content-type') || '', /application\/json/i)
  assert.match(await response.text(), /Metode tidak didukung/i)
})

test('activation endpoint rejects malformed JSON', async () => {
  const response = await fetch(activationUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid-json',
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 400)
  assert.match(await response.text(), /Permintaan tidak valid/i)
})

test('activation endpoint denies a nonexistent invitation without creating an account', async () => {
  const response = await fetch(activationUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'nexapos-e2e-no-invite@example.invalid',
      password: 'E2E-only-password-NotARealAccount-2026',
      activationCode: '00000000000000000000000000000000',
    }),
    signal: AbortSignal.timeout(20000),
  })
  assert.equal(response.status, 403)
  assert.match(await response.text(), /undangan|kode aktivasi/i)
})


test('deployed preview bundle includes the NexaPos FAQ bot and human handoff UI', async () => {
  const expectedStrings = [
    'NexaPos Bot',
    'Hubungi Admin NexaPos',
    'submit_support_message',
    'request_support_handoff',
    'admin_reply_support_message',
    'set_support_conversation_status',
  ]
  let lastBundle = ''
  let lastError
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}`)
      const html = await response.text()
      const scriptPath = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)?.[1]
      assert.ok(scriptPath, 'Expected a Vite module entry script')
      const scriptResponse = await fetch(new URL(scriptPath, baseUrl), { signal: AbortSignal.timeout(15000) })
      assert.equal(scriptResponse.status, 200, 'Application bundle should be served')
      lastBundle = await scriptResponse.text()
      if (expectedStrings.every(value => lastBundle.includes(value))) return
      lastError = new Error('Latest preview bundle does not include all support UI/RPC labels yet')
    } catch (error) {
      lastError = error
    }
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 5000))
  }
  assert.ok(expectedStrings.every(value => lastBundle.includes(value)), lastError?.message || 'Support UI strings missing from deployed preview bundle')
})
