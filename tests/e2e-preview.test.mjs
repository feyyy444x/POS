import test from 'node:test'
import assert from 'node:assert/strict'

const baseUrl = (process.env.acoPos_E2E_BASE_URL || 'https://acopos-rebrand-preview--acopos.netlify.app').replace(/\/$/, '')
const activationUrl = new URL('/.netlify/functions/activate-invitation', baseUrl)
const freeRegistrationUrl = new URL('/.netlify/functions/register-free', baseUrl)
const completeRegistrationUrl = new URL('/.netlify/functions/complete-free-registration', baseUrl)

async function fetchWithRetry(url, options, attempts = 4) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await fetch(url, options) } catch (error) {
      lastError = error
      if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, 1200))
    }
  }
  throw lastError || new Error('Preview endpoint did not respond')
}

async function fetchApplicationBundleGraph(entryPath) {
  const queue = [new URL(entryPath, baseUrl)]
  const visited = new Set()
  const bundles = []

  while (queue.length && visited.size < 80) {
    const url = queue.shift()
    if (visited.has(url.href) || url.origin !== new URL(baseUrl).origin) continue
    visited.add(url.href)
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) continue
    const source = await response.text()
    bundles.push(source)

    const imports = [...source.matchAll(/(?:import\(\s*|from\s*|import\s*)["']([^"']+\.js(?:\?[^"']*)?)["']/g)]
    for (const match of imports) {
      try {
        const asset = new URL(match[1], url)
        if (asset.origin === new URL(baseUrl).origin && !visited.has(asset.href)) queue.push(asset)
      } catch {}
    }
  }

  return bundles.join('\n')
}

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

test('deployed preview serves the acoPos entry page and application bundle', async () => {
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
  const response = await fetchWithRetry(activationUrl, { method: 'GET', signal: AbortSignal.timeout(15000) })
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
      email: 'acoPos-e2e-no-invite@example.invalid',
      password: 'E2E-only-password-NotARealAccount-2026',
      activationCode: '00000000000000000000000000000000',
    }),
    signal: AbortSignal.timeout(20000),
  })
  assert.equal(response.status, 403)
  assert.match(await response.text(), /undangan|kode aktivasi/i)
})



test('free registration preparation endpoint rejects unsupported methods and malformed payloads', async () => {
  const getResponse = await fetchWithRetry(freeRegistrationUrl, { method: 'GET', signal: AbortSignal.timeout(15000) })
  assert.equal(getResponse.status, 405)
  const postResponse = await fetchWithRetry(freeRegistrationUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid-json',
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(postResponse.status, 400)
})

test('free registration completion requires an authenticated session', async () => {
  const response = await fetchWithRetry(completeRegistrationUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 401)
})

test('deployed preview bundle includes the acoPos Joeclyn assistant and human handoff UI', async () => {
  const expectedStrings = [
    'Joeclyn',
    'Hubungi Admin acoPos',
    'submit_support_message',
    'request_support_handoff',
    'admin_reply_support_message',
    'set_support_conversation_status',
    'set_support_typing_status',
    'Admin acoPos sedang mengetik...',
    'Joeclyn sedang mengetik...',
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
      lastBundle = await fetchApplicationBundleGraph(scriptPath)
      assert.ok(lastBundle.length > 0, 'Application entry and lazy-loaded JavaScript chunks should be served')
      if (expectedStrings.every(value => lastBundle.includes(value))) return
      lastError = new Error('Latest preview bundle does not include all support UI/RPC labels yet')
    } catch (error) {
      lastError = error
    }
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 5000))
  }
  assert.ok(expectedStrings.every(value => lastBundle.includes(value)), lastError?.message || 'Support UI strings missing from deployed preview bundle')
})
