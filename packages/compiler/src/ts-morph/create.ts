import type { TsMorphCache } from '../types'
import { dirname, resolve } from 'node:path'
import { getTsconfig } from 'get-tsconfig'
import { Project } from 'ts-morph'

function createByConfigFile(fileId: string) {
  const tsconfig = getTsconfig(dirname(fileId))

  if (!tsconfig) {
    throw new Error('Cannot locate project\'s tsconfig.json')
  }

  const project = new Project({
    tsConfigFilePath: tsconfig.path,
    compilerOptions: {
      strict: true, // Ensure more accurate type analysis
    },
  })

  // Read the reference configurations
  tsconfig.config.references?.forEach((ref) => {
    project.addSourceFilesFromTsConfig(resolve(tsconfig.path, '..', ref.path))
  })

  return project
}

export function createTsMorph(fileId: string): TsMorphCache {
  const project = (
    fileId
      ? createByConfigFile(fileId)
      : new Project()
  )

  const typeChecker = project.getTypeChecker()
  return {
    project,
    typeChecker,
  }
}
