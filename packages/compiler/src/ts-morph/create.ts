import type { TsMorphCache } from '../types'
import { dirname, extname, isAbsolute, resolve } from 'node:path'
import { getTsconfig } from 'get-tsconfig'
import { Project } from 'ts-morph'

interface CreateTsMorphOptions {
  fileId?: string
  tsConfigPath?: string
}

function resolveTsConfigResult(options: CreateTsMorphOptions) {
  const { fileId, tsConfigPath } = options
  try {
    if (tsConfigPath) {
      // If it's a file path (has extension), use dirname; otherwise use as-is
      const searchPath = extname(tsConfigPath) ? dirname(tsConfigPath) : tsConfigPath
      return getTsconfig(searchPath)
    }
    if (fileId) {
      // If it's a file path (has extension), use dirname; otherwise use as-is (directory)
      const searchPath = extname(fileId) ? dirname(fileId) : fileId
      return getTsconfig(searchPath)
    }
    return undefined
  }
  catch (err) {
    console.error(err)
    return undefined
  }
}

function createByConfigFile(options: CreateTsMorphOptions) {
  const tsconfig = resolveTsConfigResult(options)
  if (!tsconfig) {
    return
  }

  const project = new Project({
    tsConfigFilePath: tsconfig.path,
    compilerOptions: {
      strict: true, // Ensure more accurate type analysis
    },
  })

  // Read the reference configurations
  const tsconfigDir = dirname(tsconfig.path)
  tsconfig.config.references?.forEach((ref) => {
    project.addSourceFilesFromTsConfig(
      isAbsolute(ref.path)
        ? ref.path
        : resolve(tsconfigDir, ref.path),
    )
  })

  return project
}

export function createTsMorph(options: CreateTsMorphOptions): TsMorphCache {
  const project = createByConfigFile(options)
  if (!project) {
    throw new Error('[Vue Vine] Failed to create ts-morph project')
  }

  const typeChecker = project.getTypeChecker()
  return {
    project,
    typeChecker,
  }
}
