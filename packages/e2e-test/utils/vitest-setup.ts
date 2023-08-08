import { fileURLToPath } from 'node:url'
import { beforeAll } from 'vitest'
import { chromium } from 'playwright-chromium'
import type { Browser, BrowserContext, Page } from 'playwright-chromium'
import type { InlineConfig, ViteDevServer } from 'vite'
import type { File } from 'vitest'
import {
  createServer,
  loadConfigFromFile,
  mergeConfig,
} from 'vite'

let server: ViteDevServer
/**
 * Vite Dev Server when testing serve
 */
export const e2eTestCtx: {
  viteServer: ViteDevServer | undefined
  browser: Browser | undefined
  browserCtx: BrowserContext | undefined
  page: Page | undefined
  viteTestUrl: string
} = {
  viteServer: undefined,
  browser: undefined,
  browserCtx: undefined,
  page: undefined,
  viteTestUrl: 'http://localhost:5173',
}

beforeAll(async (s) => {
  const suite = s as File
  // skip browser setup for non-[vue-vine/test] tests
  if (!suite.filepath.includes('e2e-test')) {
    return
  }

  e2eTestCtx.browser = await chromium.launch()
  e2eTestCtx.browserCtx = await e2eTestCtx.browser.newContext()
  e2eTestCtx.page = await e2eTestCtx.browserCtx.newPage()

  try {
    await startDefaultServe()
  }
  catch (e) {
    await e2eTestCtx.page.close()
    throw e
  }

  return async () => {
    await e2eTestCtx.page?.close()
    if (e2eTestCtx.browser) {
      await e2eTestCtx.browser.close()
    }
  }
})

async function startDefaultServe() {
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
  e2eTestCtx.viteServer = server = await (await createServer(testConfig)).listen()
  // use resolved port/base from server
  const devBase = server.config.base
  e2eTestCtx.viteTestUrl = `http://localhost:${server.config.server.port}${
     devBase === '/' ? '' : devBase
   }`
  await e2eTestCtx.page?.goto(e2eTestCtx.viteTestUrl)
}
