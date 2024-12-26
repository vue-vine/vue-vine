import type TS from 'typescript'
import type { FileSystem } from './types'
import { dirname } from 'node:path'
import { joinPaths } from './utils'

/**
 * Resolves a file system implementation
 */
export function resolveFS(
  fs?: FileSystem,
  ts?: typeof TS,
): FileSystem | undefined {
  if (fs) {
    return fs
  }

  // Fallback to TypeScript's system if available
  const tsSys = ts?.sys
  if (!tsSys) {
    return undefined
  }

  return {
    fileExists(file) {
      if (file.endsWith('.vue.ts')) {
        file = file.replace(/\.ts$/, '')
      }
      return tsSys.fileExists(file)
    },
    readFile(file) {
      if (file.endsWith('.vue.ts')) {
        file = file.replace(/\.ts$/, '')
      }
      return tsSys.readFile(file)
    },
    realpath: tsSys.realpath,
  }
}

/**
 * Resolves file extension by trying different possibilities
 */
export function resolveExt(filename: string, fs: FileSystem): string | undefined {
  // Remove .js extension for TypeScript resolution
  filename = filename.replace(/\.js$/, '')

  const tryResolve = (path: string) => {
    if (fs.fileExists(path))
      return path
  }

  // Try different extensions in priority order
  return (
    tryResolve(filename)
    || tryResolve(`${filename}.ts`)
    || tryResolve(`${filename}.tsx`)
    || tryResolve(`${filename}.d.ts`)
    || tryResolve(joinPaths(filename, 'index.ts'))
    || tryResolve(joinPaths(filename, 'index.tsx'))
    || tryResolve(joinPaths(filename, 'index.d.ts'))
  )
}

/**
 * Resolves an import source to its full path
 */
export function resolveImportPath(
  source: string,
  containingFile: string,
  fs: FileSystem,
): string | undefined {
  const resolvedPath = source.startsWith('..')
    ? joinPaths(dirname(containingFile), source)
    : source[0] === '.'
      ? joinPaths(dirname(containingFile), source)
      : undefined

  if (!resolvedPath) {
    return undefined
  }

  return resolveExt(resolvedPath, fs)
}

/**
 * Checks if a file exists and can be read
 */
export function canRead(file: string, fs: FileSystem): boolean {
  try {
    return fs.fileExists(file) && fs.readFile(file) != null
  }
  catch {
    return false
  }
}
