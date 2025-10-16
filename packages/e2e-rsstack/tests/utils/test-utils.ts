import type { E2EPlaywrightContext } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRsbuild, loadConfig } from '@rsbuild/core'
import { chromium } from 'playwright-chromium'
import { createEvaluator } from './evaluator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Test server URL
const rsbuildTestUrl = 'http://localhost:15080'

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

async function startRspackServer(e2eTestCtx: E2EPlaywrightContext): Promise<void> {
  const { content: userConfig } = await loadConfig({
    cwd: e2eRoot,
    path: path.resolve(e2eRoot, 'rsbuild.config.ts'),
  })

  // In test environment, NODE_ENV is 'test', but we need 'development' for HMR
  const rsbuild = await createRsbuild({
    cwd: e2eRoot,
    rsbuildConfig: userConfig,
  })

  const server = await rsbuild.createDevServer({
    // Silent mode: suppress console output but keep error capturing
    getPortSilently: true,
  })
  const { urls } = await server.listen()
  const serverUrl = urls[0] || rsbuildTestUrl

  e2eTestCtx.rsbuildServer = server
  e2eTestCtx.rsbuildTestUrl = serverUrl
}

async function stopRspackServer(e2eTestCtx: E2EPlaywrightContext): Promise<void> {
  if (e2eTestCtx.rsbuildServer) {
    await e2eTestCtx.rsbuildServer.close()
    e2eTestCtx.rsbuildServer = undefined
  }
}

export async function createBrowserContext(): Promise<E2EPlaywrightContext> {
  const e2eTestCtx: E2EPlaywrightContext = {
    browser: undefined,
    page: undefined,
    rsbuildServer: undefined,
    rsbuildTestUrl,
  }

  await startRspackServer(e2eTestCtx)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  if (e2eTestCtx.rsbuildTestUrl) {
    await page.goto(e2eTestCtx.rsbuildTestUrl)
    await wait(1000)
  }

  e2eTestCtx.browser = browser
  e2eTestCtx.page = page

  return e2eTestCtx
}

export async function freeBrowserContext(ctx: E2EPlaywrightContext): Promise<void> {
  if (ctx.page && !ctx.page.isClosed()) {
    await ctx.page.close().catch(() => {})
  }

  if (ctx.browser) {
    await ctx.browser.close().catch(() => {})
  }

  await stopRspackServer(ctx)
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
  page: string,
  browserCtx: E2EPlaywrightContext,
  testRunner: () => Promise<void>,
) {
  return async () => {
    await browserCtx.page?.goto(`${browserCtx.rsbuildTestUrl}${page}`)
    await wait(800)
    await testRunner()
  }
}

// Export evaluator creator
export { createEvaluator }
