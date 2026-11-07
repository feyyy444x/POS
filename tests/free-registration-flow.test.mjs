import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage free registration CTA opens the public registration route', async () => {
  const homepage = await read('../src/Homepage.jsx')
  const app = await read('../src/App.jsx')
  assert.ok(homepage.includes('href="/?screen=register"'))
  assert.ok(app.includes("if(screen==='register')return <AuthScreen/>"))
})

test('free registration preparation requires a bearer token and verifies the token owner', async () => {
  const endpoint = await read('../netlify/functions/register-free.mjs')
  assert.ok(endpoint.includes("request.headers.get('authorization')"))
  assert.ok(endpoint.includes("admin.auth.getUser(token)"))
  assert.ok(endpoint.includes("user.user_metadata?.free_workspace_pending !== true"))
  assert.ok(!endpoint.includes('payload?.userId'))
})

test('email verification resumes setup without storing the PIN in user metadata', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const completion = await read('../netlify/functions/complete-free-registration.mjs')
  for (const field of ['free_workspace_owner_name','free_workspace_company_name','free_workspace_workspace_name','free_workspace_business_category']) {
    assert.ok(portal.includes(field), 'missing signup metadata field: ' + field)
  }
  assert.ok(portal.includes('completed.needs_setup'))
  assert.ok(portal.includes('Buat PIN pribadi'))
  assert.ok(completion.includes('needs_setup: true'))
  assert.ok(!portal.includes('free_workspace_pin'))
})

test('PIN and workspace intent are submitted only after a verified session exists', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const completion = portal.slice(portal.indexOf('export function FreeRegistrationCompletion()'), portal.indexOf('export function PinGate'))
  assert.ok(completion.includes('session?.access_token'))
  assert.ok(completion.includes("Authorization: 'Bearer ' + session.access_token"))
  assert.ok(completion.includes("fetch('/.netlify/functions/register-free'"))
  assert.ok(completion.includes("fetch('/.netlify/functions/complete-free-registration'"))
  assert.ok(completion.includes('Verifikasi email berhasil'))
})

test('verified pending registration can be resumed through manual login', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  assert.ok(portal.includes('user_metadata?.free_workspace_pending === true'))
  assert.ok(portal.includes("screen=complete-free-registration"))
})

test('registration intent is prepared only with a session and success is not shown after a failed preparation', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const registrationStart = portal.indexOf("} else if (mode === 'register') {")
  const registrationEnd = portal.indexOf("\n      } else {", registrationStart)
  const registration = portal.slice(registrationStart, registrationEnd)
  assert.ok(registration.includes("Authorization: 'Bearer ' + registrationSession.access_token"))
  assert.ok(registration.indexOf('if (!prepareResponse.ok)') < registration.indexOf('setSuccess(true)'))
})
