import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const entry = await read('../src/main.jsx')
const css = await read('../src/acopos-pos-category-fit.css')
const app = await read('../src/App.jsx')

test('responsive POS category styles load globally after shared table styles', () => {
  assert.ok(entry.indexOf("import './acopos-table-surface.css'") < entry.indexOf("import './acopos-pos-category-fit.css'"))
})

test('POS category chips wrap instead of overflowing their catalog container', () => {
  assert.match(app, /className="category-pills"/)
  assert.match(css, /\.app-shell \.category-pills\s*\{[^}]*flex-wrap:\s*wrap/s)
  assert.match(css, /\.app-shell \.category-pills\s*\{[^}]*overflow:\s*visible/s)
  assert.match(css, /\.app-shell \.category-pills button\s*\{[^}]*white-space:\s*normal/s)
  assert.match(css, /\.app-shell \.category-pills button\s*\{[^}]*overflow-wrap:\s*anywhere/s)
  assert.match(css, /\.app-shell \.category-pills button\s*\{[^}]*max-width:\s*100%/s)
})

test('POS category filter and catalog are constrained to available width on mobile', () => {
  assert.match(css, /\.app-shell \.pos-catalog,[\s\S]*?max-width:\s*100%/)
  assert.match(css, /@media\s*\(max-width:\s*600px\)/)
})
