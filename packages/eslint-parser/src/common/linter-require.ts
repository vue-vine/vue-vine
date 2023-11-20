import path from 'node:path'
import { createRequire } from './create-require'

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
  const linterPath = Object.keys(require.cache).find(isLinterPath)
  if (linterPath) {
    try {
      return createRequire(linterPath)
    }
    catch {
      // ignore
    }
  }
  return null
}
