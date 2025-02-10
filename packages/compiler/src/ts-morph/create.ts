import type { TsMorphCache } from '../types'
import { dirname, resolve } from 'node:path'
import { getTsconfig } from 'get-tsconfig'
import { Project } from 'ts-morph'

export function createTsMorph(fileId: string): TsMorphCache {
  let project = new Project()

  if (fileId) {
    const tsconfig = getTsconfig(dirname(fileId))

    if (!tsconfig) {
      throw new Error('Cannot locate project\'s tsconfig.json')
    }

    project = new Project({
      tsConfigFilePath: tsconfig.path,
      compilerOptions: {
        strict: true, // Ensure more accurate type analysis
      },
    })

    // Read the reference configurations
    tsconfig.config.references?.forEach((ref) => {
      project.addSourceFilesFromTsConfig(resolve(tsconfig.path, '..', ref.path))
    })
  }

  const typeChecker = project.getTypeChecker()
  return {
    project,
    typeChecker,
  }
}
