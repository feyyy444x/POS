import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const homepage = await read('../src/Homepage.jsx')
const styles = await read('../src/homepage-cinematic.css')
const blueprint = await read('../docs/CHILLPOS_CINEMATIC_DIGITAL_SHOWROOM_BLUEPRINT.md')

test('homepage contains the cinematic product storytelling and showroom sections', () => {
  for (const marker of [
    'cinema-home', 'cinema-pos', 'cinema-inventory', 'cinema-self-order',
    'cinema-data', 'cinema-team', 'id="gallery"', 'id="cerita"',
    'id="fitur"', 'id="harga"', 'id="faq"'
  ]) assert.ok(homepage.includes(marker), 'Missing homepage marker: ' + marker)
  assert.equal((homepage.match(/<section /g) || []).length + 2, 16, 'Expected 16 homepage parts including navigation and footer')
  assert.match(homepage, /cinema-marquee/)
  assert.match(blueprint, /## Struktur 16 bagian/)
})

test('pricing remains connected to the existing live package, duration, promotion, and quote sources', () => {
  assert.match(homepage, /site_activation_packages/)
  assert.match(homepage, /site_activation_durations/)
  assert.match(homepage, /site_promotions/)
  assert.match(homepage, /get_activation_quote/)
  assert.match(homepage, /single_workspace/)
  assert.match(homepage, /Paket Khusus/)
})

test('showcase simulations are explicitly illustrative and do not create real transactions', () => {
  assert.match(homepage, /SIMULASI ANTARMUKA/)
  assert.match(homepage, /tidak menyimpan transaksi/)
  assert.match(homepage, /DEMO • BUKAN PESANAN NYATA/)
  assert.match(homepage, /bukan klaim performa pelanggan/)
})

test('cinematic design uses ivory and navy and avoids neon/cyberpunk treatments', () => {
  assert.match(styles, /--cinema-ivory:#f4f0e8/)
  assert.match(styles, /--cinema-navy:#142936/)
  assert.doesNotMatch(styles, /neon|cyberpunk|text-shadow:\s*0 0 0/i)
})

test('responsive breakpoints and reduced-motion fallback are present', () => {
  assert.match(styles, /@media\(max-width:980px\)/)
  assert.match(styles, /@media\(max-width:640px\)/)
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(styles, /overflow:clip/)
})
