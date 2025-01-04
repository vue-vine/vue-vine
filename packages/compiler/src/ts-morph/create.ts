import type { TsMorphCache } from '../types'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { Project } from 'ts-morph'
import { findConfigFile } from 'typescript'

export function createTsMorph(fileId?: string): TsMorphCache {
  let project: Project

  if (fileId) {
    const tsConfigFilePath = findConfigFile(
      dirname(fileId),
      f => existsSync(f),
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
  }
  else {
    fileId ??= 'vine.ts'
    project = new Project()
  }

  const typeChecker = project.getTypeChecker()
  return {
    project,
    typeChecker,
  }
}
