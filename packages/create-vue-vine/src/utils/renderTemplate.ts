import fs from 'node:fs'
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import deepMerge from './deepMerge'
import sortDependencies from './sortDependencies'

export async function renderTemplate(src: string, dest: string): Promise<void> {
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

  // Handle template file prefixes to prevent IDE from treating them as project config
  // - `__tpl_dot_` prefix: convert to `.` prefix (e.g., `__tpl_dot_gitignore` -> `.gitignore`)
  // - `__tpl_` prefix: remove prefix (e.g., `__tpl_tsconfig.json` -> `tsconfig.json`)
  if (filename.startsWith('__tpl_dot_')) {
    const actualFilename = `.${filename.slice(10)}` // Remove '__tpl_dot_' and add '.'
    dest = path.resolve(path.dirname(dest), actualFilename)
  }
  else if (filename.startsWith('__tpl_')) {
    const actualFilename = filename.slice(6) // Remove '__tpl_'
    dest = path.resolve(path.dirname(dest), actualFilename)
  }

  if (filename === 'package.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'))
    const newPackage = JSON.parse(fs.readFileSync(src, 'utf8'))
    const pkg = sortDependencies(deepMerge(existing, newPackage))

    // vue-vine will only appear once,
    // so you don't need to query the coverage every time.
    if (src.endsWith('shared/base/package.json')) {
      await setLatestVineVersion(pkg, 'vue-vine')
    }
    else if (src.endsWith('ts/package.json')) {
      await setLatestVineVersion(pkg, 'vue-vine-tsc')
    }
    else if (src.endsWith('rsbuild-plugin')) {
      await setLatestVineVersion(pkg, '@vue-vine/rsbuild-plugin')
    }

    fs.writeFileSync(dest, `${JSON.stringify(pkg, null, 2)}\n`)
    return
  }

  await copyFile(src, dest)
}

let isLastFetchTimeout = false

async function getLatestVineVersion(dep: string): Promise<string | undefined> {
  // If the last query has timed out,
  // all subsequent queries will not go through the server.
  if (isLastFetchTimeout) {
    return
  }

  const controller = new AbortController()

  // If no response is received within 3 seconds, cancel the query,
  // Avoid some areas where the network is too bad to access services.
  const timeout = setTimeout(() => {
    isLastFetchTimeout = true
    controller.abort()
  }, 3000)

  try {
    const res = await fetch(`https://npm.antfu.dev/${dep}@latest`, {
      signal: controller.signal,
    })
    const pkg = await res.json()
    return pkg.version
  }
  finally {
    clearTimeout(timeout)
  }
}

async function setLatestVineVersion(pkg: Record<string, any>, dep: string): Promise<void> {
  try {
    const latestVersion = await getLatestVineVersion(dep)

    if (!latestVersion) {
      return
    }

    pkg.devDependencies[dep] = `^${latestVersion}`
  }
  catch { }
}
