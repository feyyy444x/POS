import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage free registration CTA opens the dedicated public registration route', async () => {
  const homepage = await read('../src/Homepage.jsx')
  const app = await read('../src/App.jsx')
  assert.match(homepage, /href="\/daftar-gratis"/)
  assert.match(app, /window\.location\.pathname === '\/daftar-gratis' \? 'register' : 'login'/)
  assert.match(app, /<AuthScreen initialMode=/)
})

test('registration prepares the server-side workspace before creating the authenticated session', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const handler = await read('../netlify/functions/register-free.mjs')
  const registration = portal.slice(portal.indexOf("} else if (mode === 'register') {"), portal.indexOf("} else {", portal.indexOf("} else if (mode === 'register') {") + 1))
  assert.match(registration, /fetch\('\/api\/register-free'/)
  assert.ok(registration.indexOf('if (!prepareResponse.ok)') < registration.indexOf('supabase.auth.signInWithPassword'))
  assert.match(registration, /companyName: companyName\.trim\(\)/)
  assert.match(registration, /businessCategory/)
  assert.match(handler, /prepare_free_single_workspace_registration/)
  assert.match(handler, /payload\?\.businessCategory/)
})

test('registration validates password, PIN and business identity before sending the request', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  assert.match(portal, /password\.length < 8/)
  assert.match(portal, /!\^\\d\{4\}\$/.test(portal) ? /$^/ : /!\^\\d\{4\}\$./)
  assert.match(portal, /password !== passwordConfirm/)
  assert.match(portal, /pin !== pinConfirm/)
  assert.match(portal, /businessCategory/)
  assert.match(portal, /ownerName, companyName, workspaceName/)
})

test('a pending free registration is completed after a successful manual sign-in', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  assert.match(portal, /user_metadata\?\.free_workspace_pending === true/)
  assert.match(portal, /result\.data\?\.session\?\.access_token/)
  assert.match(portal, /fetch\('\/api\/complete-free-registration'/)
  assert.ok(portal.indexOf('if (!completion.ok)') < portal.indexOf("window.location.assign('/')"))
})
