import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

export async function renderTemplate(src: string, dest: string) {
  const stats = await stat(src)

  if (stats.isDirectory()) {
    await mkdir(dest, { recursive: true })
    for (const file of await readdir(src)) {
      renderTemplate(path.resolve(src, file), path.resolve(dest, file))
    }
    return
  }

  const filename = path.basename(src)

  if (filename.startsWith('_')) {
    // rename `_file` to `.file`
    dest = path.resolve(path.dirname(dest), `.${filename.slice(1)}`)
  }

  await copyFile(src, dest)
}
