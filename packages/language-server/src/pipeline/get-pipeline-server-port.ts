import type * as ts from 'typescript'
import { dirname, join } from 'node:path'

const DEFAULT_PIPELINE_SERVER_PORT = 15193

export function getPipelineServerPort(
  tsConfigFileName: string,
  tsHost: ts.System,
): number {
  // Find `node_modules/.vine-pipeline-port` file
  // and read the port number from it
  let dir = dirname(tsConfigFileName)
  while (!tsHost.fileExists(join(dir, 'node_modules', '.vine-pipeline-port'))) {
    const parentDir = dirname(dir)
    if (parentDir === dir) {
      // Failed to find `node_modules` directory
      return DEFAULT_PIPELINE_SERVER_PORT
    }
    dir = parentDir
  }

  const portFilePath = join(dir, 'node_modules', '.vine-pipeline-port')
  if (tsHost.fileExists(portFilePath)) {
    const portStr = tsHost.readFile(portFilePath, 'utf-8')
    const portNum = Number(portStr)
    return (
      Number.isNaN(portNum)
        ? DEFAULT_PIPELINE_SERVER_PORT
        : portNum
    )
  }

  return DEFAULT_PIPELINE_SERVER_PORT
}
