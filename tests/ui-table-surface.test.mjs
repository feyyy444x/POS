import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const entry = await read('../src/main.jsx')
const tables = await read('../src/acopos-table-surface.css')
const app = await read('../src/App.jsx')
const operations = await read('../src/OrganizationOperations.jsx')
const staff = await read('../src/PlatformStaffManager.jsx')
const storeControl = await read('../src/StoreControlCenter.jsx')
const reports = await read('../src/OrganizationReports.jsx')

test('shared table and contrast layer loads after all legacy visual styles', () => {
  assert.ok(entry.indexOf("import './acopos-global-contrast.css'") < entry.indexOf("import './acopos-table-surface.css'"))
})

test('all known table wrapper variants receive a visible bordered surface and horizontal scrolling', () => {
  for (const selector of ['.table-wrap', '.table-scroll', '.table-container', '.table-responsive', '.owner-table-wrap', '.staff-table-wrap']) {
    assert.ok(tables.includes(selector), `Missing table wrapper selector: ${selector}`)
  }
  assert.match(tables, /overflow-x:\s*auto/)
  assert.match(tables, /border:\s*1px solid var\(--acopos-table-line\)/)
  assert.match(tables, /border-radius:\s*13px/)
  assert.match(tables, /min-width:\s*620px/)
})

test('table headers, cells, hover and alternating rows have explicit readable contrast', () => {
  assert.match(tables, /thead th[\s\S]*?background:\s*var\(--acopos-table-head\)[\s\S]*?color:\s*#263746/)
  assert.match(tables, /tbody td[\s\S]*?color:\s*#344452/)
  assert.match(tables, /nth-child\(even\) td[\s\S]*?background:\s*#f8fafb/)
  assert.match(tables, /tr:hover td[\s\S]*?background:\s*var\(--acopos-table-hover\)/)
})

test('contrast and no-clipping rules include Admin, Owner, Control Center and Workspace surfaces', () => {
  for (const scope of ['.app-shell', '.super-admin-shell', '.nx-owner-shell', '.owner-console', '.owner-shell', '.owner-center-shell', '.owner-workspace', '.store-control-shell', '.control-center-shell', '.workspace-shell']) {
    assert.ok(tables.includes(scope), `Missing contrast scope: ${scope}`)
  }
  assert.match(tables, /overflow-wrap:\s*anywhere/)
  assert.match(tables, /text-overflow:\s*clip/)
})

test('workspace, company, admin and tenant-control tables use standardized wrappers', () => {
  assert.match(app, /className="table-wrap"/)
  assert.match(reports, /className="table-wrap"/)
  assert.match(operations, /className="owner-table-wrap"/)
  assert.match(staff, /className="staff-table-wrap"/)
  assert.match(storeControl, /className="table-wrap"/)
})

test('mobile table surfaces remain scrollable and keep cell text readable', () => {
  assert.match(tables, /@media\s*\(max-width:\s*760px\)[\s\S]*?min-width:\s*600px/)
  assert.match(tables, /max-width:\s*240px/)
  assert.match(tables, /padding:\s*10px 11px/)
})


test('POS category chips stay inside a horizontal swipe scroller instead of overflowing or wrapping', () => {
  assert.match(tables, /\.category-pills\s*\{[\s\S]*?flex-wrap:\s*nowrap\s*!important/)
  assert.match(tables, /\.category-pills\s*\{[\s\S]*?width:\s*100%/)
  assert.match(tables, /\.category-pills\s*\{[\s\S]*?max-width:\s*100%/)
  assert.match(tables, /\.category-pills\s*\{[\s\S]*?overflow-x:\s*auto\s*!important/)
  assert.match(tables, /\.category-pills\s*>\s*button\s*\{[\s\S]*?flex:\s*0 0 auto\s*!important/)
  assert.match(tables, /touch-action:\s*pan-x/)
})


test('account name, email and role labels remain horizontal inside scrollable tables', () => {
  assert.match(tables, /\.owner-role-chip[\s\S]*?white-space:\s*nowrap\s*!important/)
  assert.match(tables, /\.staff-role-pill[\s\S]*?white-space:\s*nowrap\s*!important/)
  assert.match(tables, /tbody td:first-child[\s\S]*?white-space:\s*nowrap\s*!important/)
  assert.match(tables, /\.user-copy strong,[\s\S]*?white-space:\s*nowrap/)
  assert.match(tables, /min-width:\s*max-content/)
})
