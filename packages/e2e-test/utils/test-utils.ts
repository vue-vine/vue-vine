import type { Browser, BrowserContext, Page } from 'playwright-chromium'
import type { InlineConfig, ViteDevServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {

  chromium,

} from 'playwright-chromium'
import {
  createServer,
  loadConfigFromFile,
  mergeConfig,
} from 'vite'
import { expect } from 'vitest'

type Nil = null | undefined

export interface E2EPlaywrightContext {
  browser: Browser | undefined
  browserCtx: BrowserContext | undefined
  page: Page | undefined
  viteServer: ViteDevServer | undefined
  viteTestUrl: string
  targetRoute?: string
}

const timeout = (n: number) => new Promise(resolve => setTimeout(resolve, n))

async function startDefaultServe(e2eTestCtx: E2EPlaywrightContext) {
  const __dirname = fileURLToPath(new URL('../../e2e-test', import.meta.url))
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
    __dirname,
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

export function editFile(
  filename: string,
  replacer: (str: string) => string,
): void {
  filename = path.resolve('./src', filename)
  const content = fs.readFileSync(filename, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filename, modified)
}

export async function untilUpdated(
  poll: () => (string | Nil) | Promise<(string | Nil)>,
  expected: string,
) {
  const maxTries = process.env.CI ? 200 : 50
  for (let tries = 0; tries < maxTries; tries++) {
    const actual = (await poll()) ?? ''
    if (actual.includes(expected) || tries === maxTries - 1) {
      expect(actual).toMatch(expected)
      break
    }
    else {
      await timeout(50)
    }
  }
}

export async function getColor(
  e2eTestCtx: E2EPlaywrightContext,
  selector: string,
  page?: Page,
) {
  const pageCtx = page ?? e2eTestCtx.page
  return await pageCtx?.evaluate(
    (selector: string) => {
      const el = document.querySelector(selector)
      if (!el) {
        return null
      }
      return getComputedStyle(el).color
    },
    selector,
  )
}

export async function getDisplayStyle(
  e2eTestCtx: E2EPlaywrightContext,
  selector: string,
  page?: Page,
) {
  const pageCtx = page ?? e2eTestCtx.page
  return await pageCtx?.evaluate(
    (selector: string) => {
      const el = document.querySelector(selector)
      if (!el) {
        return null
      }
      return getComputedStyle(el).display
    },
    selector,
  )
}

export async function getAssetUrl(
  e2eTestCtx: E2EPlaywrightContext,
  selector: string,
  page?: Page,
) {
  const pageCtx = page ?? e2eTestCtx.page
  return await pageCtx?.evaluate(
    (selector: string) => {
      const el = document.querySelector(selector)
      if (!el) {
        return null
      }
      return el.getAttribute('src')
    },
    selector,
  )
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
