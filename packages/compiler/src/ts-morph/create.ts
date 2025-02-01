import type { TsMorphCache } from '../types'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Project } from 'ts-morph'
import { findConfigFile } from 'typescript'

export function createTsMorph(fileId?: string): TsMorphCache {
  let project: Project

  if (fileId) {
    const tsConfigFilePath = findConfigFile(
      dirname(fileId),
      existsSync,
    )
    if (!tsConfigFilePath) {
      throw new Error('Cannot locate project\'s tsconfig.json')
    }

    project = new Project({
      tsConfigFilePath,
      compilerOptions: {
        strict: true, // Ensure more accurate type analysis
      },
    })

    // Read the reference configurations
    const tsconfigJsonData = JSON.parse(
      readFileSync(tsConfigFilePath, { encoding: 'utf-8' }),
    )
    const tsconfigDir = dirname(tsConfigFilePath)
    const references = (tsconfigJsonData.references ?? []) as Array<{ path: string }>
    for (const ref of references) {
      project.addSourceFilesFromTsConfig(resolve(tsconfigDir, ref.path))
    }
  }
  else {
    project = new Project()
  }

  const typeChecker = project.getTypeChecker()
  return {
    project,
    typeChecker,
  }
}
