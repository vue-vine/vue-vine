// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { Rspack } from '@rsbuild/core'

/**
 * Extract import paths from webpack entry point values
 */
export function extractImports(
  entryValue: Iterable<string | string[] | Rspack.EntryDescription>,
): string[] {
  const imports: string[] = []

  for (const item of entryValue) {
    if (typeof item === 'string') {
      imports.push(item)
    }
    else if (Array.isArray(item)) {
      imports.push(...item)
    }
    else if (item && typeof item === 'object' && 'import' in item) {
      if (Array.isArray(item.import)) {
        imports.push(...item.import)
      }
      else if (typeof item.import === 'string') {
        imports.push(item.import)
      }
    }
  }

  return imports
}

export interface EntryPaths {
  mainThreadEntry: string
  backgroundEntry: string
  mainThreadFilename: string
  backgroundFilename: string
}

/**
 * Generate entry names and filenames for an entry
 */
export function generateEntryPaths(
  entryName: string,
  intermediatePath: string,
  pathModule: typeof import('node:path'),
): EntryPaths {
  return {
    mainThreadEntry: `${entryName}__main-thread`,
    backgroundEntry: entryName,
    mainThreadFilename: pathModule.posix.join(intermediatePath, `${entryName}/main-thread.js`),
    backgroundFilename: pathModule.posix.join(intermediatePath, `${entryName}/background.js`),
  }
}
