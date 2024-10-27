import { createRequire as NodeCreateRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire as createRequireWithPolyfill } from './create-require'

function isLinterPath(p: string): boolean {
  return (
    // ESLint 6 and above
    p.includes(
      `eslint${path.sep}lib${path.sep}linter${path.sep}linter.js`,
    )
    // ESLint 5
    || p.includes(`eslint${path.sep}lib${path.sep}linter.js`)
  )
}

export function getLinterRequire() {
  // Lookup the loaded eslint
  const __require = NodeCreateRequire(
    fileURLToPath(import.meta.url),
  )
  const linterPath = Object.keys(__require.cache).find(isLinterPath)
  if (linterPath) {
    try {
      return createRequireWithPolyfill(linterPath)
    }
    catch {
      // ignore
    }
  }
  return null
}
