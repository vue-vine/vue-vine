import type { VineESLintParserOptions } from '../types'
import type { BasicParserObject } from './parser-object'

import path from 'node:path'
import process from 'node:process'
// @ts-expect-error -- ignore
import * as dependencyEspree from 'espree'
import { lt, lte } from 'semver'

import { createRequire } from './create-require'
import { getLinterRequire } from './linter-require'

type Espree = BasicParserObject & {
  latestEcmaVersion?: number
  version: string
}
let espreeCache: Espree | null = null

/**
 * Gets the espree that the given ecmaVersion can parse.
 */
export function getEspreeFromEcmaVersion(
  ecmaVersion: VineESLintParserOptions['ecmaVersion'],
): Espree {
  const linterEspree = getEspreeFromLinter()
  if (ecmaVersion == null) {
    return linterEspree
  }
  if (ecmaVersion === 'latest') {
    return getNewestEspree()
  }
  if (
    normalizeEcmaVersion(ecmaVersion) <= getLatestEcmaVersion(linterEspree)
  ) {
    return linterEspree
  }
  const userEspree = getEspreeFromUser()
  if (normalizeEcmaVersion(ecmaVersion) <= getLatestEcmaVersion(userEspree)) {
    return userEspree
  }
  return linterEspree
}

/**
 * Load `espree` from the user dir.
 */
export function getEspreeFromUser(): Espree {
  try {
    const cwd = process.cwd()
    const relativeTo = path.join(cwd, '__placeholder__.js')
    return createRequire(relativeTo)('espree')
  }
  catch {
    return getEspreeFromLinter()
  }
}

/**
 * Load `espree` from the loaded ESLint.
 * If the loaded ESLint was not found, just returns `require("espree")`.
 */
export function getEspreeFromLinter(): Espree {
  if (!espreeCache) {
    espreeCache = getLinterRequire()?.('espree')
    if (!espreeCache) {
      espreeCache = dependencyEspree
    }
  }

  return espreeCache!
}

/**
 * Load the newest `espree` from the loaded ESLint or dependency.
 */
function getNewestEspree(): Espree {
  let newest = dependencyEspree
  const linterEspree = getEspreeFromLinter()
  if (
    linterEspree.version != null
    && lte(newest.version, linterEspree.version)
  ) {
    newest = linterEspree
  }
  const userEspree = getEspreeFromUser()
  if (userEspree.version != null && lte(newest.version, userEspree.version)) {
    newest = userEspree
  }
  return newest
}

export function getEcmaVersionIfUseEspree(
  parserOptions: VineESLintParserOptions,
  getDefault?: (defaultVer: number) => number,
): number | undefined {
  if (parserOptions.parser != null && parserOptions.parser !== 'espree') {
    return undefined
  }

  if (parserOptions.ecmaVersion === 'latest') {
    return normalizeEcmaVersion(getLatestEcmaVersion(getNewestEspree()))
  }
  if (parserOptions.ecmaVersion == null) {
    const defVer = getDefaultEcmaVersion()
    return getDefault?.(defVer) ?? defVer
  }
  return normalizeEcmaVersion(parserOptions.ecmaVersion)
}

function getDefaultEcmaVersion(): number {
  if (lt(getEspreeFromLinter().version, '9.0.0')) {
    return 5
  }
  // Perhaps the version 9 will change the default to "latest".
  return normalizeEcmaVersion(getLatestEcmaVersion(getNewestEspree()))
}

/**
 * Normalize ECMAScript version
 */
function normalizeEcmaVersion(version: number) {
  if (version > 5 && version < 2015) {
    return version + 2009
  }
  return version
}

function getLatestEcmaVersion(espree: Espree) {
  if (espree.latestEcmaVersion == null) {
    for (const { v, latest } of [
      { v: '6.1.0', latest: 2020 },
      { v: '4.0.0', latest: 2019 },
    ]) {
      if (lte(v, espree.version)) {
        return latest
      }
    }
    return 2018
  }
  return normalizeEcmaVersion(espree.latestEcmaVersion)
}
