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
