import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const safety = await read('../src/chillpos-layout-safety.css')
const styles = await read('../src/styles.css')
const entry = await read('../src/main.jsx')
const app = await read('../src/App.jsx')

test('shared layout safety loads after the design system', () => {
  assert.ok(entry.indexOf("import './chillpos-design-system.css'") < entry.indexOf("import './chillpos-layout-safety.css'"))
  assert.ok(safety.includes('overflow-wrap:break-word'))
  assert.ok(safety.includes('text-overflow:clip'))
})

test('mobile headers keep identity and utilities in one horizontal row', () => {
  assert.ok(safety.includes('flex-flow:row nowrap'))
  assert.ok(safety.includes('flex-wrap:nowrap!important'))
  assert.ok(safety.includes(':where(.topbar-title-group .breadcrumb,.owner-breadcrumb){display:none}'))
  assert.ok(safety.includes('content:"SYNC"'))
  assert.ok(safety.includes('wib-digital-clock em'))
  assert.ok(safety.includes(':where(.topbar-actions,.owner-topbar-actions){flex:0 0 auto'))
  for (const selector of ['className="topbar-title-group"','className="owner-heading"','className="topbar-actions"','className="owner-topbar-actions"']) assert.ok(app.includes(selector))
  assert.ok(!styles.includes('ChillPos global header alignment:'))
})

test('all operational headers retain live sync, WIB clock/date and icon refresh controls', () => {
  assert.ok(app.includes('<WibClock showDate/>'))
  assert.ok(app.includes('className="live-status"'))
  assert.ok(app.includes('className="icon-button refresh-btn"'))
  assert.ok(app.includes('className="owner-refresh-button"'))
  assert.ok(safety.includes('.wib-digital-clock'))
  assert.ok(safety.includes('.refresh-btn,.owner-refresh-button'))
})

test('tables use a scroll wrapper without forcing every table to max-content width', () => {
  assert.ok(safety.includes('.table-wrap,.table-scroll,.table-container,.table-responsive'))
  assert.ok(safety.includes('overflow-x:auto'))
  assert.ok(safety.includes('width:100%;min-width:100%;max-width:none;table-layout:auto'))
  assert.ok(!safety.includes('min-width:max-content'))
  assert.ok(!safety.includes('width:max-content'))
  assert.ok(safety.includes('overflow-wrap:break-word'))
})

test('common table wrapper variants are covered across Center Control and admin modules', async () => {
  const operations = await read('../src/OrganizationOperations.jsx')
  const staff = await read('../src/PlatformStaffManager.jsx')
  const store = await read('../src/StoreControlCenter.jsx')
  const reports = await read('../src/OrganizationReports.jsx')
  assert.ok(operations.includes('owner-table-wrap'))
  assert.ok(staff.includes('staff-table-wrap'))
  assert.ok(store.includes('table-wrap'))
  assert.ok(reports.includes('table-wrap'))
  for (const wrapper of ['.owner-table-wrap','.staff-table-wrap','.table-wrap']) assert.ok(safety.includes(wrapper))
})

test('responsive typography covers Admin, Center Control and Workspace', () => {
  for (const scope of ['.app-shell','.super-admin-shell','.nx-owner-shell','.owner-shell','.owner-center-shell','.owner-workspace','.tenant-operations-shell','.store-control-shell','.control-center-shell','.workspace-shell','.owner-console']) {
    assert.ok(safety.includes(scope), 'Missing responsive scope: ' + scope)
  }
  assert.ok(safety.includes('@media(max-width:640px)'))
  assert.ok(safety.includes('font-size:clamp(19px,5vw,22px)'))
})

test('homepage explanatory text retains dedicated readable typography', () => {
  assert.ok(safety.includes('living-feature-copy p'))
  assert.ok(safety.includes('living-plan li'))
  assert.ok(safety.includes('living-faq-item>p'))
})

const accessCss = await read('../src/access-portal.css')
const accessPortal = await read('../src/AccessPortal.jsx')

test('access portal page-specific styles remain independently loaded', () => {
  assert.ok(accessPortal.indexOf("import './chillpos-design-system.css'") < accessPortal.indexOf("import './access-portal.css'"))
  assert.ok(accessCss.includes('.nx-access-portal .access-heading h1 em'))
})
