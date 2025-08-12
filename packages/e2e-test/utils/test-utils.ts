import type { InlineConfig } from 'vite'
import type { E2EPlaywrightContext, Nil } from './types'
import fs from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import {
  chromium,
} from 'playwright-chromium'
import {
  createServer,
  loadConfigFromFile,
  mergeConfig,
} from 'vite'
import { expect } from 'vitest'
import { createTestEvaluator } from './evaluator'

export const wait = (n: number) => new Promise(resolve => setTimeout(resolve, n))

async function startDefaultServe(e2eTestCtx: E2EPlaywrightContext) {
  const e2eRoot = resolve(import.meta.dirname, '..')
  const options: InlineConfig = {
    logLevel: 'silent',
    configFile: false,
    server: {
      watch: {
        // During tests we edit the files too fast and sometimes chokidar
        // misses change events, so enforce polling for consistency
        usePolling: true,
        interval: 1e2,
      },
      host: true,
      fs: {
        strict: true,
      },
    },
    build: {
      // esbuild do not minify ES lib output since that would remove pure annotations and break tree-shaking
      // skip transpilation during tests to make it faster
      target: 'esnext',
      // tests are flaky when `emptyOutDir` is `true`
      emptyOutDir: false,
    },
  }

  const res = await loadConfigFromFile(
    {
      command: 'serve',
      mode: 'development',
    },
    undefined,
    e2eRoot,
  )

  process.env.VITE_INLINE = 'inline-serve'
  const testConfig = mergeConfig(options, res?.config || {})
  e2eTestCtx.viteServer = await (await createServer(testConfig)).listen()
  // use resolved port/base from server
  const devBase = e2eTestCtx.viteServer.config.base
  e2eTestCtx.viteTestUrl = `http://localhost:${
    e2eTestCtx.viteServer.config.server.port
  }${
    devBase === '/' ? '' : devBase
  }${
    e2eTestCtx.targetRoute ?? ''
  }`
}

export async function createBrowserContext(context: Partial<E2EPlaywrightContext> = {}) {
  const e2eBrowserCtx: E2EPlaywrightContext = {
    browser: undefined,
    browserCtx: undefined,
    page: undefined,
    viteServer: undefined,
    viteTestUrl: '',
    ...context,
  }
  e2eBrowserCtx.browser = await chromium.launch()
  e2eBrowserCtx.browserCtx = await e2eBrowserCtx.browser.newContext()
  e2eBrowserCtx.page = await e2eBrowserCtx.browserCtx.newPage()
  await startDefaultServe(e2eBrowserCtx)
  await e2eBrowserCtx.page?.goto(e2eBrowserCtx.viteTestUrl)
  return e2eBrowserCtx
}

export async function freeBrowserContext(ctx: E2EPlaywrightContext) {
  try {
    await ctx.page?.close()
    if (ctx.browserCtx) {
      await ctx.browserCtx.close()
    }
    if (ctx.browser) {
      await ctx.browser.close()
    }
    if (ctx.viteServer) {
      await ctx.viteServer.close()
    }
  }
  catch (error) {
    console.error('Error closing resources:', error)
  }
}

export async function untilUpdated(
  poll: () => (string | Nil) | Promise<(string | Nil)>,
  expected: string,
) {
  const maxTries = process.env.CI ? 200 : 50
  let consecutiveErrors = 0
  const maxConsecutiveErrors = 5

  for (let tries = 0; tries < maxTries; tries++) {
    try {
      const actual = (await poll()) ?? ''
      consecutiveErrors = 0 // Reset error count on successful poll

      if (actual.includes(expected) || tries === maxTries - 1) {
        expect(actual).toMatch(expected)
        break
      }
      else {
        // Dynamic wait time: longer delays early on (for HMR/page reload), shorter delays later (for fast polling)
        const waitTime = tries < 10 ? 200 : tries < 30 ? 100 : 50
        await wait(waitTime)
      }
    }
    catch (error) {
      consecutiveErrors++

      // If execution context is destroyed, wait longer for page reload
      if ((error as Error).message?.includes('Execution context was destroyed')) {
        console.warn(`Execution context destroyed on try ${tries}, waiting longer...`)
        await wait(1500) // Wait for page reload to complete

        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Too many consecutive execution context errors (${consecutiveErrors})`)
        }
        continue
      }

      // Re-throw other errors immediately
      throw error
    }
  }
}

/**
 * Create an evaluator instance for page element property and style evaluation
 * @param e2eTestCtx - E2E test context
 * @returns Evaluator instance
 */
export function createEvaluator(e2eTestCtx: E2EPlaywrightContext) {
  return createTestEvaluator(e2eTestCtx)
}

export function createBrowserCtxEnvironment(
  testRunner: (browserCtx: E2EPlaywrightContext) => Promise<void>,
  context: Partial<E2EPlaywrightContext> = {},
) {
  return async () => {
    const browserCtx = await createBrowserContext(context)
    try {
      await testRunner(browserCtx)
    }
    catch (error) {
      console.error('Test execution error:', error)
      throw error
    }
    finally {
      await freeBrowserContext(browserCtx)
    }
  }
}

export function editFile(
  filename: string,
  replacer: (str: string) => string,
): void {
  const filePath = resolve(import.meta.dirname, '../src/fixtures', filename)
  const content = fs.readFileSync(filePath, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filePath, modified)
}

export function createFile(filename: string, content: string): void {
  const filePath = resolve(import.meta.dirname, '../src/fixtures', filename)
  fs.writeFileSync(filePath, content)
}

export function deleteFile(filename: string): void {
  const filePath = resolve(import.meta.dirname, '../src/fixtures', filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export function runTestAtPage(
  page: string,
  browserCtx: E2EPlaywrightContext,
  testRunner: () => Promise<void>,
) {
  return async () => {
    await browserCtx.page?.goto(`${browserCtx.viteTestUrl}${page}`)
    await wait(800)
    await testRunner()
  }
}
