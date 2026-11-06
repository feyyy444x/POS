import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage free registration CTA opens the public registration route', async () => {
  const homepage = await read('../src/Homepage.jsx')
  const app = await read('../src/App.jsx')
  assert.match(homepage, /href="\/\?screen=register"/)
  assert.match(app, /if\(screen==='register'\)return <AuthScreen\/>/)
})

test('email confirmation returns to a dedicated completion route and creates the workspace', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const app = await read('../src/App.jsx')
  assert.match(portal, /emailRedirectTo: `\$\{window\.location\.origin\}\/\?screen=complete-free-registration`/)
  assert.match(app, /if\(screen==='complete-free-registration'\)return <FreeRegistrationCompletion\/>/)
  assert.match(portal, /supabase\.auth\.onAuthStateChange/)
  assert.match(portal, /fetch\('\/\.netlify\/functions\/complete-free-registration'/)
  assert.match(portal, /window\.location\.replace\('\/'\)/)
})

test('verified pending free registration is resumed when the customer signs in manually', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  assert.match(portal, /user_metadata\?\.free_workspace_pending === true/)
  assert.match(portal, /result\.data\?\.session\?\.access_token/)
  assert.match(portal, /complete-free-registration/)
})

test('registration success is not shown before the registration intent is prepared', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const registration = portal.slice(portal.indexOf("} else if (mode === 'register') {"), portal.indexOf("} else {", portal.indexOf("} else if (mode === 'register') {") + 1))
  assert.ok(registration.indexOf('if (!prepareResponse.ok)') < registration.indexOf('setSuccess(true)'))
  assert.match(registration, /register-free/)
})

test('interrupted public signups can resume without creating a duplicate auth account', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  assert.match(portal, /data\.user\.identities\?\.length === 0/)
  assert.match(portal, /supabase\.auth\.signInWithPassword\(\{ email: email\.trim\(\), password \}\)/)
  assert.match(portal, /supabase\.auth\.resend\(\{ type: 'signup', email: email\.trim\(\) \}\)/)
  assert.match(portal, /existing\.data\?\.user\?\.user_metadata\?\.free_workspace_pending !== true/)
  assert.match(portal, /userId: registrationUser\.id/)
})
