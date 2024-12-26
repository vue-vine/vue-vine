import type TS from 'typescript'
import type { FileSystem } from './types'
import { dirname } from 'node:path'
import process from 'node:process'
import { minimatch as isMatch } from 'minimatch'
import { tsConfigCache, tsConfigRefMap } from './cache'
import { createGetCanonicalFileName, joinPaths, normalizePath } from './utils'

let ts: typeof TS | undefined
let loadTS: (() => typeof TS) | undefined

/**
 * Register TypeScript loader function
 */
export function registerTS(_loadTS: () => typeof TS): void {
  loadTS = () => {
    try {
      return _loadTS()
    }
    catch (err: any) {
      if (
        typeof err.message === 'string'
        && err.message.includes('Cannot find module')
      ) {
        throw new Error(
          'Failed to load TypeScript, which is required for resolving imported types. '
          + 'Please make sure "typescript" is installed as a project dependency.',
        )
      }
      else {
        throw new Error(
          'Failed to load TypeScript for resolving imported types.',
        )
      }
    }
  }
}

/**
 * Resolve module using TypeScript's module resolution
 */
export function resolveWithTS(
  containingFile: string,
  source: string,
  fs: FileSystem,
): string | undefined {
  if (!ts && loadTS) {
    ts = loadTS()
  }
  if (!ts) {
    return undefined
  }

  // 1. resolve tsconfig.json
  const configPath = ts.findConfigFile(containingFile, fs.fileExists)

  // 2. load tsconfig.json
  let tsCompilerOptions: TS.CompilerOptions = {}
  let tsResolveCache: TS.ModuleResolutionCache | undefined

  if (configPath) {
    const normalizedConfigPath = normalizePath(configPath)
    const cached = tsConfigCache.get(normalizedConfigPath)
    const configs = cached || loadTSConfig(configPath, ts, fs).map(config => ({ config }))

    if (!cached) {
      tsConfigCache.set(normalizedConfigPath, configs)
    }

    const matchedConfig = findMatchedConfig(configs, containingFile)
    tsCompilerOptions = matchedConfig.config.options
    tsResolveCache = matchedConfig.cache || (matchedConfig.cache = ts.createModuleResolutionCache(
      process.cwd(),
      createGetCanonicalFileName(ts.sys.useCaseSensitiveFileNames),
      matchedConfig.config.options,
    ))
  }

  // 3. resolve module
  const res = ts.resolveModuleName(
    source,
    containingFile,
    tsCompilerOptions,
    fs,
    tsResolveCache,
  )

  if (res.resolvedModule) {
    let filename = res.resolvedModule.resolvedFileName
    return fs.realpath ? fs.realpath(filename) : filename
  }
}

/**
 * Load and parse TSConfig
 */
function loadTSConfig(
  configPath: string,
  ts: typeof TS,
  fs: FileSystem,
  visited = new Set<string>(),
): TS.ParsedCommandLine[] {
  const parseConfigHost = {
    fileExists: fs.fileExists,
    readFile: fs.readFile,
    readDirectory: () => [],
    useCaseSensitiveFileNames: true,
  }

  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, fs.readFile).config,
    parseConfigHost,
    dirname(configPath),
    undefined,
    configPath,
  )

  const res = [config]
  visited.add(configPath)

  // Handle project references
  if (config.projectReferences) {
    for (const ref of config.projectReferences) {
      const refPath = ts.resolveProjectReferencePath(ref)
      if (visited.has(refPath) || !fs.fileExists(refPath)) {
        continue
      }
      tsConfigRefMap.set(refPath, configPath)
      res.unshift(...loadTSConfig(refPath, ts, fs, visited))
    }
  }

  return res
}

/**
 * Find matching config for a file
 */
function findMatchedConfig(
  configs: {
    config: TS.ParsedCommandLine
    cache?: TS.ModuleResolutionCache
  }[],
  containingFile: string,
) {
  if (configs.length === 1) {
    return configs[0]
  }

  // Try to find the config that matches the file
  for (const c of configs) {
    const base = normalizePath(
      (c.config.options.pathsBasePath as string)
      || dirname(c.config.options.configFilePath as string),
    )
    const included: string[] | undefined = c.config.raw?.include
    const excluded: string[] | undefined = c.config.raw?.exclude

    if (
      (!included && (!base || containingFile.startsWith(base)))
      || included?.some(p => isMatch(containingFile, joinPaths(base, p)))
    ) {
      if (
        excluded
        && excluded.some(p => isMatch(containingFile, joinPaths(base, p)))
      ) {
        continue
      }
      return c
    }
  }

  // Fallback to last config
  return configs[configs.length - 1]
}
