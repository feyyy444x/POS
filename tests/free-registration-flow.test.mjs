import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage free registration CTA opens the public registration route', async () => {
  const homepage = await read('../src/Homepage.jsx')
  const app = await read('../src/App.jsx')
  assert.match(homepage, /href="\\/\\?screen=register"/)
  assert.match(app, /if\\(screen==='register'\\)return <AuthScreen\\/>/)
})

test('free registration preparation requires a bearer token and verifies the token owner', async () => {
  const endpoint = await read('../netlify/functions/register-free.mjs')
  assert.match(endpoint, /Authorization/)
  assert.match(endpoint, /Bearer\\s/)
  assert.match(endpoint, /admin\\.auth\\.getUser\\(token\\)/)
  assert.match(endpoint, /user\\.user_metadata\\?\\.free_workspace_pending !== true/)
  assert.doesNotMatch(endpoint, /payload\\?\\.userId/)
})

test('email verification resumes setup without storing the PIN in user metadata', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const completion = await read('../netlify/functions/complete-free-registration.mjs')
  assert.match(portal, /free_workspace_owner_name/)
  assert.match(portal, /free_workspace_company_name/)
  assert.match(portal, /free_workspace_workspace_name/)
  assert.match(portal, /free_workspace_business_category/)
  assert.match(portal, /if \\(completed\\.needs_setup\\)/)
  assert.match(portal, /Buat PIN pribadi/)
  assert.match(completion, /needs_setup: true/)
  assert.doesNotMatch(portal, /free_workspace_pin/)
})

test('PIN and workspace intent are submitted only after a verified session exists', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const completion = portal.slice(portal.indexOf('export function FreeRegistrationCompletion()'), portal.indexOf('export function PinGate'))
  assert.match(completion, /session\\?\\.access_token/)
  assert.match(completion, /Authorization: 'Bearer ' \\+ session\\.access_token/)
  assert.match(completion, /register-free/)
  assert.match(completion, /complete-free-registration/)
  assert.match(completion, /pembuatan Workspace Gratis/)
})

test('verified pending registration can be resumed through manual login', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  assert.match(portal, /user_metadata\\?\\.free_workspace_pending === true/)
  assert.match(portal, /complete-free-registration/)
  assert.match(portal, /screen=complete-free-registration/)
})

test('registration success is not shown before preparation and completion succeed', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const registration = portal.slice(portal.indexOf("} else if (mode === 'register') {"), portal.indexOf("} else {", portal.indexOf("} else if (mode === 'register') {") + 1))
  assert.ok(registration.indexOf('if (!prepareResponse.ok)') < registration.indexOf('setSuccess(true)'))
  assert.match(registration, /Authorization: 'Bearer ' \\+ registrationSession\\.access_token/)
})
