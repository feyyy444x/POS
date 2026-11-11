import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage free registration CTA opens the dedicated public registration path', async () => {
  const homepage = await read('../src/Homepage.jsx')
  const app = await read('../src/App.jsx')
  assert.match(homepage, /href="\/daftar-gratis"/)
  assert.match(homepage, /Coba Gratis 30 Hari/)
  assert.match(app, /window\.location\.pathname === '\/daftar-gratis' \? 'register' : 'login'/)
})

test('free registration creates and confirms the account server-side without an email verification link', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const handler = await read('../netlify/functions/register-free.mjs')
  const completion = await read('../netlify/functions/complete-free-registration.mjs')
  assert.match(portal, /fetch\('\/api\/register-free'/)
  assert.match(portal, /supabase\.auth\.signInWithPassword/)
  assert.match(portal, /window\.location\.assign\('\/'\)/)
  assert.doesNotMatch(portal, /emailRedirectTo|auth\.resend|supabase\.auth\.signUp/)
  assert.match(handler, /email_confirm: true/)
  assert.match(handler, /prepare_free_single_workspace_registration/)
  assert.match(handler, /complete_free_single_workspace_registration/)
  assert.match(completion, /complete_free_single_workspace_registration/)
  assert.match(completion, /email_confirmed_at/)
})

test('registration validates and prepares the workspace before signing the new Owner in', async () => {
  const portal = await read('../src/AccessPortal.jsx')
  const start = portal.indexOf("} else if (mode === 'register') {")
  const end = portal.indexOf("\n      } else {", start + 20)
  assert.ok(start >= 0 && end > start)
  const registration = portal.slice(start, end)
  const preparedCheck = registration.indexOf('if (!prepareResponse.ok)')
  const signIn = registration.indexOf('supabase.auth.signInWithPassword')
  assert.ok(preparedCheck >= 0 && signIn > preparedCheck)
  assert.ok(registration.indexOf("fetch('/api/register-free'") >= 0)
  assert.ok(registration.indexOf("window.location.assign('/')") > signIn)
  assert.doesNotMatch(registration, /setSuccess\(true\)/)
})

test('an interrupted registration can finish idempotently after the Owner signs in', async () => {
  const app = await read('../src/App.jsx')
  const completion = await read('../netlify/functions/complete-free-registration.mjs')
  const handler = await read('../netlify/functions/register-free.mjs')
  assert.match(app, /free_workspace_pending/)
  assert.match(app, /fetch\('\/api\/complete-free-registration'/)
  assert.match(app, /Authorization:'Bearer '\+session\.access_token/)
  assert.match(completion, /auth\.getUser\(token\)/)
  assert.match(completion, /complete_free_single_workspace_registration/)
  assert.match(completion, /existingOwnerMembership/)
  assert.match(handler, /already\|registered\|exists/i)
})
