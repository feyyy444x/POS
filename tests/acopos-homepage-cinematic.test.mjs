import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const homepage = await read('../src/Homepage.jsx')
const enhancements = await read('../src/HomepageEnhancements.jsx')
const styles = await read('../src/homepage-acopos-spatial.css')
const blueprint = await read('../docs/ACOPOS_CINEMATIC_DIGITAL_SHOWROOM_BLUEPRINT.md')
const completeHomepage = homepage + enhancements

test('homepage contains the complete 17-part acoPos spatial experience',()=>{
 for(const marker of ['cinema-home','cinema-pos','cinema-inventory','cinema-self-order','cinema-data','cinema-team','id="cerita"','id="fitur"','id="feature-explorer"','id="device-experience"','id="security-access"','id="why-acopos"','id="support-center"','id="harga"','id="faq"','QR Menu & Self Ordering'])assert.ok(completeHomepage.includes(marker),'Missing homepage marker: '+marker)
 assert.equal((completeHomepage.match(/<section\b/g)||[]).length+2,17,'Expected 17 homepage parts including navigation and footer')
 assert.match(homepage,/cinema-marquee/)
 assert.match(blueprint,/## Struktur 17 bagian/)
 assert.doesNotMatch(completeHomepage,/NexaSpace|NexaPos|Nexa[A-Z]?/i,'Legacy platform branding must not appear on the acoPos homepage')
})
test('pricing remains connected to existing live package, duration, promotion, and quote sources',()=>{
 for(const marker of ['site_activation_packages','site_activation_durations','site_promotions','get_activation_quote','single_workspace','Paket Khusus'])assert.ok(homepage.includes(marker),'Missing pricing integration: '+marker)
})
test('QR Menu & Self Ordering explains cashier-approved payment flow',()=>{
 assert.match(homepage,/QR MENU & SELF ORDERING/)
 assert.match(homepage,/unggah bukti pembayaran dan persetujuan kasir/)
 assert.match(enhancements,/Persetujuan kasir sebelum diproses/)
 assert.doesNotMatch(homepage,/SELF ORDER \/ PREVIEW|THE SELF ORDER EXPERIENCE/)
})
test('showcase simulations remain illustrative and do not create real transactions',()=>{
 assert.match(homepage,/SIMULASI ANTARMUKA/)
 assert.match(homepage,/tidak menyimpan transaksi/)
 assert.match(homepage,/DEMO • BUKAN PESANAN NYATA/)
 assert.match(homepage,/bukan klaim performa pelanggan/)
 assert.match(enhancements,/Pratinjau bersifat ilustratif/)
})
test('silver spatial design and responsive motion safeguards are present',()=>{
 assert.match(styles,/--aco-silver:#c7ced7/)
 assert.match(styles,/radial-gradient/)
 assert.doesNotMatch(styles,/neon|cyberpunk/i)
 assert.match(styles,/@media\(max-width:900px\)/)
 assert.match(styles,/@media\(max-width:640px\)/)
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/)
})
