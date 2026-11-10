import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'

const baseUrl = 'http://127.0.0.1:4173'

test('built NexaPos app serves homepage, landing, login and registration routes', async t => {
  const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
  t.after(() => server.kill('SIGTERM'))

  let response
  let lastError
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) })
      if (response.ok) break
      lastError = new Error('Preview returned HTTP ' + response.status)
    } catch (error) { lastError = error }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  assert.ok(response?.ok, lastError?.message || 'Local Vite preview did not start')
  const html = await response.text()
  assert.match(html, /<div id="root">|id="root"/i)
  assert.match(html, /NexaPos/i)

  for (const route of ['/landing', '/login', '/?screen=register']) {
    const routeResponse = await fetch(new URL(route, baseUrl))
    assert.equal(routeResponse.status, 200, route + ' should resolve through the SPA fallback')
    assert.match(await routeResponse.text(), /id="root"/i)
  }
})

test('built app serves NexaPos brand assets and compiled feature modules', async () => {
  const logo = await fetch(new URL('/nexapos-mark.svg', baseUrl))
  assert.equal(logo.status, 200)
  assert.match(await logo.text(), /<svg/i)

  const assetNames = await readdir(new URL('../dist/assets/', import.meta.url))
  const jsFiles = assetNames.filter(name => name.endsWith('.js'))
  assert.ok(jsFiles.length > 0, 'Expected compiled JavaScript chunks')
  const bundles = (await Promise.all(jsFiles.map(name => readFile(new URL('../dist/assets/' + name, import.meta.url), 'utf8')))).join('\n')
  for (const marker of ['NexaPos', 'Joeclyn', 'Hubungi Admin NexaPos', 'single_workspace']) {
    assert.ok(bundles.includes(marker), 'Missing compiled application marker: ' + marker)
  }
})
