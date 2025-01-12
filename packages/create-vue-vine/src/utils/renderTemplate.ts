import fs from 'node:fs'
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import deepMerge from './deepMerge'
import sortDependencies from './sortDependencies'

export async function renderTemplate(src: string, dest: string) {
  const stats = await stat(src)

  if (stats.isDirectory()) {
    await mkdir(dest, { recursive: true })
    const files = await readdir(src)
    await Promise.all(
      files.map(file =>
        renderTemplate(
          path.resolve(src, file),
          path.resolve(dest, file),
        ),
      ),
    )
    return
  }

  const filename = path.basename(src)

  if (filename.startsWith('_')) {
    // rename `_file` to `.file`
    dest = path.resolve(path.dirname(dest), `.${filename.slice(1)}`)
  }

  if (filename === 'package.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'))
    const newPackage = JSON.parse(fs.readFileSync(src, 'utf8'))
    const pkg = sortDependencies(deepMerge(existing, newPackage))
    fs.writeFileSync(dest, `${JSON.stringify(pkg, null, 2)}\n`)
    return
  }

  await copyFile(src, dest)
}
