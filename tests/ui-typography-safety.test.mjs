import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const safety = await readFile(new URL('../src/chillpos-layout-safety.css', import.meta.url), 'utf8')
const designSystem = await readFile(new URL('../src/chillpos-design-system.css', import.meta.url), 'utf8')
const homepage = await readFile(new URL('../src/homepage.css', import.meta.url), 'utf8')
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('global safety stylesheet loads after design system and prevents text clipping', () => {
  assert.ok(entry.indexOf("import './chillpos-design-system.css'") < entry.indexOf("import './chillpos-layout-safety.css'"))
  assert.match(safety, /text-overflow:clip/)
  assert.match(safety, /overflow-wrap:anywhere/)
  assert.match(safety, /white-space:normal/)
  assert.match(safety, /table\{\s*white-space:normal/)
})

test('mobile workspace header is allowed to grow and wrap instead of clipping content', () => {
  assert.match(safety, /\.topbar\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important;[\s\S]*?flex-wrap:wrap!important/)
  assert.match(safety, /\.topbar-actions\{[\s\S]*?flex-wrap:wrap!important/)
  assert.match(homepage, /@media\(max-width:560px\)/)
})

test('homepage explanatory text and plan details have readable minimum sizes', () => {
  assert.match(safety, /living-feature-copy p[\s\S]*?font-size:clamp\(11px, \.9vw, 14px\)!important/)
  assert.match(safety, /living-plan li[\s\S]*?font-size:clamp\(11px, \.9vw, 14px\)!important/)
  assert.match(safety, /living-story-tabs>button>b[\s\S]*?font-size:11px!important/)
  assert.match(safety, /living-faq-item>p[\s\S]*?font-size:clamp\(11px, \.9vw, 14px\)!important/)
})


const accessCss = await readFile(new URL('../src/access-portal.css', import.meta.url), 'utf8')
const accessPortal = await readFile(new URL('../src/AccessPortal.jsx', import.meta.url), 'utf8')

test('access portal page-specific styles load after shared design system', () => {
  assert.ok(accessPortal.indexOf("import './chillpos-design-system.css'") < accessPortal.indexOf("import './access-portal.css'"))
})

test('access headline highlight no longer paints over the heading text', () => {
  assert.match(accessCss, /\.nx-access-portal \.access-heading h1 em\{[\s\S]*?background:transparent!important/)
  assert.match(accessCss, /\.nx-access-portal \.access-kicker\{[\s\S]*?background:transparent!important/)
})

test('login and registration form labels, inputs and helper text use compact aligned spacing on mobile', () => {
  assert.match(accessCss, /\.nx-access-portal \.access-form label\{[\s\S]*?text-align:left/)
  assert.match(accessCss, /\.nx-access-portal \.access-field\{[\s\S]*?height:54px/)
  assert.match(accessCss, /@media\(max-width:640px\)[\s\S]*?\.nx-access-portal \.access-form\{[\s\S]*?padding:19px 17px!important/)
  assert.match(accessCss, /\.nx-access-portal \.access-mode-switch\{[\s\S]*?text-align:center/)
})
