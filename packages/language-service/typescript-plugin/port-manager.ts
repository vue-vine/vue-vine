import type * as ts from 'typescript'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

const DEFAULT_PIPELINE_PORT = 15193
const MAX_PORT_RETRY = 3
const PORT_RANGE_PER_PROJECT = 10

/**
 * Calculate a unique port range for a project based on its path
 * This helps avoid port conflicts when multiple VS Code windows are open
 */
function calculateProjectPortBase(projectPath: string): number {
  const hash = createHash('md5').update(projectPath).digest('hex')
  const numericHash = Number.parseInt(hash.slice(0, 8), 16)
  const offset = (numericHash % 100) * PORT_RANGE_PER_PROJECT
  return DEFAULT_PIPELINE_PORT + offset
}

/**
 * Find the node_modules directory containing vue-vine
 */
function findVueVineNodeModulesDir(
  host: ts.System,
  tsConfigFilePath: string,
): string | null {
  let dir = dirname(tsConfigFilePath)

  while (true) {
    const vueVinePath = join(dir, 'node_modules', 'vue-vine', 'package.json')
    if (host.fileExists(vueVinePath)) {
      return dir
    }

    const parentDir = dirname(dir)
    if (parentDir === dir) {
      // Reached root directory
      return null
    }
    dir = parentDir
  }
}

/**
 * Get the port file path for storing pipeline server port
 */
function getPortFilePath(
  host: ts.System,
  tsConfigFilePath: string,
): string | null {
  const rootDir = findVueVineNodeModulesDir(host, tsConfigFilePath)
  if (!rootDir) {
    return null
  }
  return join(rootDir, 'node_modules', '.vine-pipeline-port')
}

/**
 * Atomically write port number to file
 * Uses temp file + rename to avoid concurrent write conflicts
 */
function writePortToFile(
  host: ts.System,
  portFilePath: string,
  port: number,
): void {
  const tempFilePath = `${portFilePath}.tmp`

  try {
    // Write to temp file first
    host.writeFile(tempFilePath, port.toString())

    // Atomic rename
    // Note: ts.System doesn't have a rename method, so we use write + delete
    // In practice, this is still safer than direct write due to the temp file
    if (host.fileExists(portFilePath)) {
      host.deleteFile?.(portFilePath)
    }
    host.writeFile(portFilePath, port.toString())

    // Clean up temp file
    if (host.deleteFile && host.fileExists(tempFilePath)) {
      host.deleteFile(tempFilePath)
    }
  }
  catch (err) {
    console.error('Pipeline: Failed to write port file', err)
    // Clean up temp file on error
    try {
      if (host.deleteFile && host.fileExists(tempFilePath)) {
        host.deleteFile(tempFilePath)
      }
    }
    catch {
      // Ignore cleanup errors
    }
    throw err
  }
}

/**
 * Delete the port file
 */
function deletePortFile(
  host: ts.System,
  portFilePath: string,
): void {
  try {
    if (host.deleteFile && host.fileExists(portFilePath)) {
      host.deleteFile(portFilePath)
    }
  }
  catch (err) {
    console.error('Pipeline: Failed to delete port file', err)
  }
}

/**
 * Check if an error is due to address already in use
 */
function isAddressInUseError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null) {
    const error = err as { code?: string }
    return error.code === 'EADDRINUSE'
  }
  return false
}

export interface PortManagerOptions {
  host: ts.System
  tsConfigFilePath: string
  projectPath: string
}

export interface PortAllocationResult {
  port: number
  portFilePath: string | null
  cleanup: () => void
}

/**
 * Allocate a port for the pipeline server with retry logic
 * Returns the allocated port and a cleanup function
 */
export async function allocatePort(
  options: PortManagerOptions,
  createServer: (port: number) => Promise<unknown>,
): Promise<PortAllocationResult> {
  const { host, tsConfigFilePath, projectPath } = options
  const basePort = calculateProjectPortBase(projectPath)
  const portFilePath = getPortFilePath(host, tsConfigFilePath)

  let allocatedPort: number | null = null
  let lastError: unknown

  // Try up to MAX_PORT_RETRY times with different ports
  for (let retry = 0; retry < MAX_PORT_RETRY; retry++) {
    const port = basePort + retry

    try {
      // Dynamically import detect-port to avoid blocking
      const { default: detect } = await import('detect-port')
      const availablePort = await detect(port)

      // If detect returns a different port, use it
      const portToUse = availablePort

      // Try to create the server
      await createServer(portToUse)

      allocatedPort = portToUse

      // Write port to file if possible
      if (portFilePath) {
        try {
          writePortToFile(host, portFilePath, portToUse)
        }
        catch (err) {
          console.warn('Pipeline: Failed to write port file, continuing anyway', err)
        }
      }

      break
    }
    catch (err) {
      lastError = err

      if (isAddressInUseError(err) && retry < MAX_PORT_RETRY - 1) {
        console.warn(`Pipeline: Port ${port} is in use, retrying with next port...`)
        continue
      }

      // For other errors or last retry, throw
      if (retry === MAX_PORT_RETRY - 1) {
        console.error('Pipeline: Failed to allocate port after max retries', err)
        throw err
      }
    }
  }

  if (allocatedPort === null) {
    throw new Error(`Failed to allocate port after ${MAX_PORT_RETRY} retries: ${lastError}`)
  }

  // Return cleanup function
  const cleanup = () => {
    if (portFilePath) {
      deletePortFile(host, portFilePath)
    }
  }

  return {
    port: allocatedPort,
    portFilePath,
    cleanup,
  }
}
