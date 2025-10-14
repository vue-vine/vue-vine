import type { E2EPlaywrightContext } from './types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { chromium } from 'playwright-chromium'
import kill from 'tree-kill'
import { createEvaluator } from './evaluator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Test server URL
const rspackTestUrl = 'http://localhost:15080'

// Path to source files
const srcDir = path.resolve(__dirname, '../../src')
const e2eRoot = path.resolve(__dirname, '../..')

/**
 * Wait utility
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wait until a condition is met or value matches expected
 */
export async function untilUpdated(
  poll: () => Promise<string | null | undefined>,
  expected: string,
  timeout = 3000,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const actual = await poll()
    if (actual === expected) {
      return
    }
    await wait(100)
  }
  const actual = await poll()
  if (actual !== expected) {
    throw new Error(`Timeout waiting for update. Expected: ${expected}, Actual: ${actual}`)
  }
}

/**
 * Start Rspack dev server
 */
async function startRspackServer(e2eTestCtx: E2EPlaywrightContext): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting Rspack dev server...')

    // Start rspack dev server
    const serverProcess = execa('pnpm', ['dev'], {
      cwd: e2eRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    })

    e2eTestCtx.rspackServer = serverProcess

    let resolved = false

    // Listen for server ready
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log('[Rspack]', output.trim())

      // Check if server is ready - support multiple output formats
      if (!resolved && (
        output.includes('compiled successfully')
        || output.includes('Compiled successfully')
        || output.includes('Project is running at')
        || (output.toLowerCase().includes('rspack') && output.toLowerCase().includes('compiled'))
      )) {
        resolved = true
        console.log('Rspack dev server is ready!')
        // Give it a bit more time to be fully ready
        setTimeout(() => resolve(), 1000)
      }
    })

    serverProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      // Only log non-warning stderr
      if (!output.includes('webpack')) {
        console.error('[Rspack Error]', output.trim())
      }
    })

    serverProcess.on('error', (error) => {
      if (!resolved) {
        resolved = true
        reject(new Error(`Failed to start Rspack server: ${error.message}`))
      }
    })

    serverProcess.on('exit', (code) => {
      if (!resolved && code !== 0) {
        resolved = true
        reject(new Error(`Rspack server exited with code ${code}`))
      }
    })

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('Timeout waiting for Rspack server to start'))
      }
    }, 30000)
  })
}

/**
 * Stop Rspack dev server
 */
async function stopRspackServer(e2eTestCtx: E2EPlaywrightContext): Promise<void> {
  if (e2eTestCtx.rspackServer && e2eTestCtx.rspackServer.pid) {
    console.log('Stopping Rspack dev server...')
    return new Promise((resolve) => {
      kill(e2eTestCtx.rspackServer!.pid!, 'SIGTERM', (err) => {
        if (err) {
          console.error('Error stopping server:', err)
        }
        resolve()
      })
    })
  }
}

/**
 * Create browser context for testing
 */
export async function createBrowserContext(): Promise<E2EPlaywrightContext> {
  const e2eTestCtx: E2EPlaywrightContext = {
    browser: undefined,
    page: undefined,
    rspackServer: undefined,
  }

  // Start Rspack dev server
  await startRspackServer(e2eTestCtx)

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  })
  const page = await browser.newPage()

  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text())
    }
  })

  // Navigate to the app
  await page.goto(rspackTestUrl)
  await wait(2000) // Wait longer for initial load

  e2eTestCtx.browser = browser
  e2eTestCtx.page = page

  return e2eTestCtx
}

/**
 * Free browser context and stop server
 */
export async function freeBrowserContext(ctx: E2EPlaywrightContext): Promise<void> {
  try {
    if (ctx.page && !ctx.page.isClosed()) {
      await ctx.page.close()
    }
    if (ctx.browser) {
      await ctx.browser.close()
    }
    await stopRspackServer(ctx)
  }
  catch (error) {
    console.error('Error closing resources:', error)
  }
}

/**
 * Edit a file in the src directory
 */
export function editFile(filename: string, replacer: (code: string) => string): void {
  const filePath = path.resolve(srcDir, filename)
  const content = fs.readFileSync(filePath, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filePath, modified, 'utf-8')
}

/**
 * Helper to create a test runner with browser context
 */
export function runTestAtPage(
  browserCtx: E2EPlaywrightContext,
  testFn: (browserCtx: E2EPlaywrightContext) => Promise<void>,
): () => Promise<void> {
  return async () => {
    await testFn(browserCtx)
  }
}

// Export evaluator creator
export { createEvaluator }
