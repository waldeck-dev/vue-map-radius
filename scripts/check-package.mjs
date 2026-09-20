// v2.0.0 nearly shipped with every "types" path pointing at dist/src/, a
// directory the build stopped producing. Nothing failed — consumers would just
// have got no types. So: walk what package.json promises, and check it exists.
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const missing = []

function check(path, where) {
  if (typeof path !== 'string' || !path.startsWith('./')) return
  if (!existsSync(new URL('../' + path.slice(2), import.meta.url))) missing.push(`${where} → ${path}`)
}

function walk(node, where) {
  if (typeof node === 'string') return check(node, where)
  for (const [key, value] of Object.entries(node ?? {})) walk(value, `${where}.${key}`)
}

for (const field of ['main', 'module', 'types']) check(pkg[field], field)
walk(pkg.exports, 'exports')

if (missing.length) {
  console.error(`package.json points at ${missing.length} file(s) the build did not produce:`)
  for (const entry of missing) console.error('  ' + entry)
  process.exit(1)
}
console.log(`package.json: every declared entry point exists (${pkg.name}@${pkg.version})`)
