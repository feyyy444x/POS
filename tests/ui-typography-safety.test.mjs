import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const safety = await read('../src/chillpos-layout-safety.css')
const styles = await read('../src/styles.css')
const design = await read('../src/chillpos-design-system.css')
const entry = await read('../src/main.jsx')
const app = await read('../src/App.jsx')

test('shared layout safety loads after the design system', () => {
  assert.ok(entry.indexOf("import './chillpos-design-system.css'") < entry.indexOf("import './chillpos-layout-safety.css'"))
  assert.match(safety, /overflow-wrap:break-word/)
  assert.match(safety, /text-overflow:clip/)
})

test('mobile headers keep identity and utilities in one horizontal row', () => {
  assert.match(safety, /flex-flow:row nowrap/)
  assert.match(safety, /flex-wrap:nowrap!important/)
  assert.match(safety, /\.topbar-actions,.owner-topbar-actions\{flex:0 0 auto/)
  assert.match(app, /className="topbar-title-group"/)
  assert.match(app, /className="owner-heading"/)
  assert.match(app, /className="topbar-actions"/)
  assert.match(app, /className="owner-topbar-actions"/)
  assert.ok(!styles.includes('/* ChillPos global header alignment:'))
})

test('all operational headers retain live sync, WIB clock/date and icon refresh controls', () => {
  assert.match(app, /<WibClock showDate\/>/)
  assert.match(app, /className="live-status"/)
  assert.match(app, /className="icon-button refresh-btn"/)
  assert.match(app, /className="owner-refresh-button"/)
  assert.match(safety, /\.wib-digital-clock/)
  assert.match(safety, /\.refresh-btn,.owner-refresh-button/)
})

test('tables use a scroll wrapper without forcing every table to max-content width', () => {
  assert.match(safety, /\.table-wrap,.table-scroll,.table-container,.table-responsive/)
  assert.match(safety, /overflow-x:auto/)
  assert.match(safety, /width:100%;min-width:100%;max-width:none;table-layout:auto/)
  assert.doesNotMatch(safety, /min-width:\\s*max-content/)
  assert.doesNotMatch(safety, /width:\\s*max-content/)
  assert.match(safety, /overflow-wrap:break-word/)
})

test('common table wrapper variants are covered across Center Control and admin modules', async () => {
  const operations = await read('../src/OrganizationOperations.jsx')
  const staff = await read('../src/PlatformStaffManager.jsx')
  const store = await read('../src/StoreControlCenter.jsx')
  const reports = await read('../src/OrganizationReports.jsx')
  assert.match(operations, /owner-table-wrap/)
  assert.match(staff, /staff-table-wrap/)
  assert.match(store, /table-wrap/)
  assert.match(reports, /table-wrap/)
  for (const wrapper of ['.owner-table-wrap','.staff-table-wrap','.table-wrap']) assert.ok(safety.includes(wrapper))
})

test('responsive typography is scoped across Admin, Center Control and Workspace', () => {
  for (const scope of ['.app-shell','.super-admin-shell','.nx-owner-shell','.owner-shell','.owner-center-shell','.owner-workspace','.tenant-operations-shell','.store-control-shell','.control-center-shell','.workspace-shell','.owner-console']) {
    assert.ok(safety.includes(scope), 'Missing responsive scope: ' + scope)
  }
  assert.match(safety, /@media\\(max-width:640px\\)/)
  assert.match(safety, /font-size:clamp\\(19px,5vw,22px\\)/)
})

test('homepage explanatory text retains its dedicated readable typography', () => {
  assert.match(safety, /living-feature-copy p/)
  assert.match(safety, /living-plan li/)
  assert.match(safety, /living-faq-item>p/)
})

const accessCss = await read('../src/access-portal.css')
const accessPortal = await read('../src/AccessPortal.jsx')

test('access portal page-specific styles remain independently loaded', () => {
  assert.ok(accessPortal.indexOf("import './chillpos-design-system.css'") < accessPortal.indexOf("import './access-portal.css'"))
  assert.match(accessCss, /\.nx-access-portal \.access-heading h1 em/)
})
