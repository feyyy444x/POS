import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const privilegedFunctions = [
  'activate-invitation.mjs',
  'complete-free-registration.mjs',
  'create-platform-staff.mjs',
  'manage-store-member-password.mjs',
  'manage-user-password.mjs',
  'platform-staff-workspace.mjs',
  'register-free.mjs',
]

test('server functions that use production service-role credentials are unavailable on public preview deploys', async () => {
  for (const filename of privilegedFunctions) {
    const source = await readFile(new URL('netlify/functions/' + filename, root), 'utf8')
    assert.match(
      source,
      /process\.env\.NETLIFY_CONTEXT !== 'production'/,
      filename + ' must reject preview contexts before processing a request',
    )
  }
})

test('preview isolation guard runs before request parsing or privileged Supabase access', async () => {
  for (const filename of privilegedFunctions) {
    const source = await readFile(new URL('netlify/functions/' + filename, root), 'utf8')
    const guard = source.indexOf("process.env.NETLIFY_CONTEXT !== 'production'")
    const parse = source.search(/request\.json\(\)|createClient\(/)
    assert.ok(guard >= 0 && parse > guard, filename + ' must check deployment context first')
  }
})
