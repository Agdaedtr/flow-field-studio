// Copies the web app's source files from the repo root into ./app so the
// Electron build is fully self-contained. Run automatically before packaging.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const out = join(here, 'app')
mkdirSync(out, { recursive: true })

for (const f of ['index.html', 'styles.css', 'app.js', 'icon.png']) {
  copyFileSync(join(root, f), join(out, f))
  console.log('copied', f)
}
