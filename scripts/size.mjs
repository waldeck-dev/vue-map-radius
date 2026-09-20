// Gzipped size of the built bundle, in the decimal kB npm and bundlephobia
// report. The README quotes these numbers; keep them in step.
import { gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'

for (const file of ['vue-map-radius.js', 'vue-map-radius.css']) {
  const raw = await readFile(new URL(`../dist/${file}`, import.meta.url))
  const gzipped = gzipSync(raw, { level: 9 }).length
  console.log(`${file.padEnd(20)} ${(raw.length / 1000).toFixed(1).padStart(6)} kB  →  ${(gzipped / 1000).toFixed(1)} kB gzipped`)
}
